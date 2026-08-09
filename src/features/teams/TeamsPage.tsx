import { useState } from 'react'
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { api } from '../../services/api'
import { useAuth } from '../../app/AuthProvider'
import {
  canPermission,
  isAdmin,
} from '../../lib/permissions'
import {
  Button,
  Card,
  Empty,
  ErrorBox,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
  Badge,
} from '../../components/ui'
import {
  organizationTypeLabel,
} from '../../lib/format'
import {
  getErrorMessage,
} from '../../lib/errors'

type Organization = {
  id: string
  name: string
  type: string
  status: string
  description?: string | null
}

type Member = {
  id: string
  display_name: string
  status: string
}

type Membership = {
  id: string
  user_id: string
  organization_id: string
  status: 'active' | 'pending' | 'removed'
  left_at?: string | null
}

type OrganizationFormValue = {
  type:
    | 'team'
    | 'small_group'
    | 'club'
    | 'volunteer_team'
  name: string
  description: string
  parent_organization_id:
    | string
    | null
}

type MembershipFormValue = {
  membership: true
  organization_id: string
  user_id: string
  status: 'active' | 'pending'
}

type CreateState =
  | false
  | OrganizationFormValue
  | MembershipFormValue

export function TeamsPage() {
  const {
    context,
    refresh,
  } = useAuth()

  const qc = useQueryClient()

  const organizations =
    (context?.organizations ??
      []) as Organization[]

  const orgs =
    organizations.filter(
      (organization) =>
        organization.status ===
        'active',
    )

  const initialOrganization =
    context?.memberships.find(
      (membership) =>
        membership.status ===
        'active',
    )?.organization_id

  const [
    selected,
    setSelected,
  ] = useState<
    string | undefined
  >(initialOrganization)

  const [
    create,
    setCreate,
  ] = useState<CreateState>(false)

  const [error, setError] =
    useState('')

  const selectedOrg =
    orgs.find(
      (organization) =>
        organization.id ===
        selected,
    )

  const {
    data: members = [],
    isLoading,
  } = useQuery<Member[], Error>({
    queryKey: [
      'members',
      selected,
    ],
    queryFn: async () => {
      if (!selected) {
        return []
      }

      const result =
        await Promise.resolve(
          api.profiles.visible(
            selected,
          ),
        )

      return result as Member[]
    },
    enabled: !!selected,
  })

  const {
    data: memberships = [],
  } = useQuery<Membership[], Error>({
    queryKey: [
      'memberships',
      selected,
    ],
    queryFn: async () => {
      if (!selected) {
        return []
      }

      const result =
        await Promise.resolve(
          api.memberships.list(
            selected,
          ),
        )

      return result as Membership[]
    },
    enabled: !!selected,
  })

  const saveOrganization =
    async (
      value: OrganizationFormValue,
    ) => {
      try {
        await api.organizations.create(
          value,
        )

        await refresh()

        await qc.invalidateQueries({
          queryKey: ['members'],
        })

        await qc.invalidateQueries({
          queryKey: ['memberships'],
        })

        setCreate(false)
      } catch (e) {
        setError(
          getErrorMessage(e),
        )
      }
    }

  const updateMembership =
    async (
      id: string,
      status:
        | 'active'
        | 'removed',
    ) => {
      try {
        await api.memberships.update(
          id,
          {
            status,
            left_at:
              status === 'removed'
                ? new Date().toISOString()
                : null,
          },
        )

        await qc.invalidateQueries({
          queryKey: [
            'memberships',
            selected,
          ],
        })

        await qc.invalidateQueries({
          queryKey: [
            'members',
            selected,
          ],
        })
      } catch (e) {
        setError(
          getErrorMessage(e),
        )
      }
    }

  const canManageMembership =
    selectedOrg
      ? isAdmin(context) ||
        canPermission(
          context,
          'membership.manage',
          selectedOrg.id,
        )
      : false

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1>조직 / 팀</h1>
          <p>
            팀, 순, 동아리,
            봉사팀의 소속과
            구성원을 확인합니다.
          </p>
        </div>

        {isAdmin(context) && (
          <Button
            onClick={() =>
              setCreate({
                type: 'team',
                name: '',
                description: '',
                parent_organization_id:
                  null,
              })
            }
          >
            조직 만들기
          </Button>
        )}
      </div>

      {error && (
        <ErrorBox
          message={error}
        />
      )}

      <div className="team-layout">
        <Card className="org-list">
          <h2>
            내가 접근 가능한 조직
          </h2>

          {orgs.length > 0 ? (
            <div className="list">
              {orgs.map(
                (organization) => (
                  <button
                    type="button"
                    className={`org-item ${
                      selected ===
                      organization.id
                        ? 'selected'
                        : ''
                    }`}
                    key={
                      organization.id
                    }
                    onClick={() =>
                      setSelected(
                        organization.id,
                      )
                    }
                  >
                    <div>
                      <strong>
                        {
                          organization.name
                        }
                      </strong>

                      <small>
                        {organizationTypeLabel(
                          organization.type,
                        )}
                      </small>
                    </div>

                    <Badge>
                      {
                        organization.status
                      }
                    </Badge>
                  </button>
                ),
              )}
            </div>
          ) : (
            <Empty>
              조직이 없습니다.
            </Empty>
          )}
        </Card>

        <Card>
          {selectedOrg ? (
            <>
              <div className="section-title">
                <div>
                  <h2>
                    {selectedOrg.name}
                  </h2>

                  <p>
                    {selectedOrg.description ||
                      '설명 없음'}
                  </p>
                </div>

                {canManageMembership && (
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setCreate({
                        membership:
                          true,
                        organization_id:
                          selectedOrg.id,
                        user_id: '',
                        status:
                          'active',
                      })
                    }
                  >
                    회원 추가
                  </Button>
                )}
              </div>

              <div className="badges">
                <Badge>
                  {organizationTypeLabel(
                    selectedOrg.type,
                  )}
                </Badge>

                <Badge tone="success">
                  {
                    selectedOrg.status
                  }
                </Badge>
              </div>

              {isLoading ? (
                <Spinner />
              ) : members.length > 0 ? (
                <div className="member-grid">
                  {members.map(
                    (member) => {
                      const membership =
                        memberships.find(
                          (item) =>
                            item.user_id ===
                            member.id,
                        )

                      return (
                        <div
                          className="member-card"
                          key={
                            member.id
                          }
                        >
                          <div className="avatar large">
                            {member.display_name
                              .trim()
                              .slice(
                                0,
                                1,
                              ) || '회'}
                          </div>

                          <div>
                            <strong>
                              {
                                member.display_name
                              }
                            </strong>

                            <small>
                              {
                                member.status
                              }
                            </small>
                          </div>

                          {membership &&
                            canManageMembership && (
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  void updateMembership(
                                    membership.id,
                                    membership.status ===
                                      'removed'
                                      ? 'active'
                                      : 'removed',
                                  )
                                }
                              >
                                {membership.status ===
                                'removed'
                                  ? '복구'
                                  : '내보내기'}
                              </Button>
                            )}
                        </div>
                      )
                    },
                  )}
                </div>
              ) : (
                <Empty>
                  구성원이 없습니다.
                </Empty>
              )}
            </>
          ) : (
            <Empty>
              조직을 선택하세요.
            </Empty>
          )}
        </Card>
      </div>

      {create &&
      'membership' in create ? (
        <MembershipModal
          value={create}
          onClose={() =>
            setCreate(false)
          }
          onSave={async (
            value,
          ) => {
            try {
              await api.memberships.add(
                value.organization_id,
                value.user_id,
                value.status,
              )

              await qc.invalidateQueries(
                {
                  queryKey: [
                    'memberships',
                    value.organization_id,
                  ],
                },
              )

              await qc.invalidateQueries(
                {
                  queryKey: [
                    'members',
                    value.organization_id,
                  ],
                },
              )

              setCreate(false)
            } catch (e) {
              setError(
                getErrorMessage(e),
              )
            }
          }}
        />
      ) : create ? (
        <OrganizationModal
          value={create}
          organizations={orgs}
          onClose={() =>
            setCreate(false)
          }
          onSave={saveOrganization}
        />
      ) : null}
    </div>
  )
}

function OrganizationModal({
  value,
  organizations,
  onClose,
  onSave,
}: {
  value: OrganizationFormValue
  organizations: Organization[]
  onClose: () => void
  onSave: (
    value: OrganizationFormValue,
  ) => Promise<void>
}) {
  const [state, setState] =
    useState<OrganizationFormValue>(
      value,
    )

  const teamOrganizations =
    organizations.filter(
      (organization) =>
        organization.type ===
        'team',
    )

  return (
    <Modal
      title="조직 만들기"
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave(state)
        }}
      >
        <Field label="유형">
          <Select
            value={state.type}
            onChange={(event) => {
              const type =
                event.target.value as OrganizationFormValue['type']

              setState(
                (current) => ({
                  ...current,
                  type,
                  parent_organization_id:
                    type ===
                    'small_group'
                      ? current.parent_organization_id
                      : null,
                }),
              )
            }}
          >
            <option value="team">
              {organizationTypeLabel(
                'team',
              )}
            </option>

            <option value="small_group">
              {organizationTypeLabel(
                'small_group',
              )}
            </option>

            <option value="club">
              {organizationTypeLabel(
                'club',
              )}
            </option>

            <option value="volunteer_team">
              {organizationTypeLabel(
                'volunteer_team',
              )}
            </option>
          </Select>
        </Field>

        {state.type ===
          'small_group' && (
          <Field label="상위 팀">
            <Select
              value={
                state.parent_organization_id ??
                ''
              }
              onChange={(event) =>
                setState(
                  (current) => ({
                    ...current,
                    parent_organization_id:
                      event.target
                        .value ||
                      null,
                  }),
                )
              }
              required
            >
              <option value="">
                선택
              </option>

              {teamOrganizations.map(
                (organization) => (
                  <option
                    key={
                      organization.id
                    }
                    value={
                      organization.id
                    }
                  >
                    {
                      organization.name
                    }
                  </option>
                ),
              )}
            </Select>
          </Field>
        )}

        <Field label="이름">
          <Input
            value={state.name}
            onChange={(event) =>
              setState(
                (current) => ({
                  ...current,
                  name:
                    event.target.value,
                }),
              )
            }
            required
            maxLength={100}
          />
        </Field>

        <Field label="설명">
          <Input
            value={
              state.description
            }
            onChange={(event) =>
              setState(
                (current) => ({
                  ...current,
                  description:
                    event.target.value,
                }),
              )
            }
            maxLength={500}
          />
        </Field>

        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>

          <Button type="submit">
            생성
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function MembershipModal({
  value,
  onClose,
  onSave,
}: {
  value: MembershipFormValue
  onClose: () => void
  onSave: (
    value: MembershipFormValue,
  ) => Promise<void>
}) {
  const [state, setState] =
    useState<MembershipFormValue>(
      value,
    )

  return (
    <Modal
      title="회원 추가"
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave(state)
        }}
      >
        <p className="muted">
          사용자의 Supabase Auth
          UUID를 입력하세요.
          관리자 화면에서는 이후
          검색 UI를 확장할 수
          있습니다.
        </p>

        <Field label="사용자 ID">
          <Input
            value={state.user_id}
            onChange={(event) =>
              setState(
                (current) => ({
                  ...current,
                  user_id:
                    event.target.value,
                }),
              )
            }
            required
            placeholder="UUID"
          />
        </Field>

        <Field label="상태">
          <Select
            value={state.status}
            onChange={(event) =>
              setState(
                (current) => ({
                  ...current,
                  status:
                    event.target
                      .value ===
                    'pending'
                      ? 'pending'
                      : 'active',
                }),
              )
            }
          >
            <option value="active">
              활성
            </option>

            <option value="pending">
              대기
            </option>
          </Select>
        </Field>

        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>

          <Button type="submit">
            추가
          </Button>
        </div>
      </form>
    </Modal>
  )
}