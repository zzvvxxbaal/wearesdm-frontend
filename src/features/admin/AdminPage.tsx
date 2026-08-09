import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { useAuth } from '../../app/AuthProvider'
import {
  Button,
  Card,
  ErrorBox,
  Field,
  Input,
  Modal,
  Select,
  Spinner,
} from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { getErrorMessage } from '../../lib/errors'

export function AdminPage() {
  const { context } = useAuth()
  const qc = useQueryClient()

  const [tab, setTab] = useState<
    'roles' | 'audit' | 'notifications'
  >('roles')
  const [assign, setAssign] = useState(false)
  const [error, setError] = useState('')

  const {
    data: assignments = [],
    isLoading,
  } = useQuery({
    queryKey: ['all-role-assignments'],
    queryFn: api.roles.assignments,
    enabled: !!context,
  })

  const { data: audit = [] } = useQuery({
    queryKey: ['audit'],
    queryFn: api.audit.list,
    enabled: !!context,
  })

  const {
    data: notificationSettings = [],
    isLoading: settingsLoading,
  } = useQuery({
    queryKey: ['notification-settings'],
    queryFn: api.notificationSettings.list,
    enabled:
      !!context && tab === 'notifications',
  })

  if (!context) {
    return <Spinner />
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <span className="eyebrow">ADMIN</span>
          <h1>관리자</h1>
          <p>
            전체 역할 할당과 감사 로그를
            관리합니다.
          </p>
        </div>

        <Button
          onClick={() => setAssign(true)}
        >
          역할 할당
        </Button>
      </div>

      {error && <ErrorBox message={error} />}

      <div className="tabs">
        <Button
          variant={
            tab === 'roles'
              ? 'primary'
              : 'secondary'
          }
          onClick={() => setTab('roles')}
        >
          역할 할당
        </Button>

        <Button
          variant={
            tab === 'audit'
              ? 'primary'
              : 'secondary'
          }
          onClick={() => setTab('audit')}
        >
          감사 로그
        </Button>

        <Button
          variant={
            tab === 'notifications'
              ? 'primary'
              : 'secondary'
          }
          onClick={() =>
            setTab('notifications')
          }
        >
          알림 정책
        </Button>
      </div>

      {tab === 'roles' ? (
        isLoading ? (
          <Spinner />
        ) : (
          <Card>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>사용자</th>
                    <th>역할</th>
                    <th>조직</th>
                    <th>생성일</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {assignments.map(
                    (assignment) => (
                      <tr
                        key={assignment.id}
                      >
                        <td>
                          {assignment.user_id}
                        </td>

                        <td>
                          {context.roles.find(
                            (role) =>
                              role.id ===
                              assignment.role_id,
                          )?.name ||
                            assignment.role_id}
                        </td>

                        <td>
                          {assignment.organization_id
                            ? context.organizations.find(
                                (organization) =>
                                  organization.id ===
                                  assignment.organization_id,
                              )?.name ||
                              assignment.organization_id
                            : '전체'}
                        </td>

                        <td>
                          {formatDateTime(
                            assignment.created_at,
                          )}
                        </td>

                        <td>
                          <Button
                            variant="danger"
                            onClick={async () => {
                              if (
                                !confirm(
                                  '역할을 삭제할까요?',
                                )
                              ) {
                                return
                              }

                              try {
                                await api.roles.remove(
                                  assignment.id,
                                )

                                await qc.invalidateQueries(
                                  {
                                    queryKey: [
                                      'all-role-assignments',
                                    ],
                                  },
                                )

                                await qc.invalidateQueries(
                                  {
                                    queryKey: [
                                      'context',
                                    ],
                                  },
                                )
                              } catch (e) {
                                setError(
                                  getErrorMessage(e),
                                )
                              }
                            }}
                          >
                            삭제
                          </Button>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        )
      ) : tab === 'audit' ? (
        <Card>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>시간</th>
                  <th>행위</th>
                  <th>대상</th>
                  <th>조직</th>
                </tr>
              </thead>

              <tbody>
                {audit.map((item: any) => (
                  <tr key={item.id}>
                    <td>
                      {formatDateTime(
                        item.created_at,
                      )}
                    </td>

                    <td>{item.action}</td>

                    <td>
                      {item.entity_type}
                    </td>

                    <td>
                      {item.organization_id ||
                        '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ) : settingsLoading ? (
        <Spinner />
      ) : (
        <Card>
          <div className="list">
            {notificationSettings.map(
              (setting: any) => (
                <div
                  className="list-row"
                  key={setting.key}
                >
                  <div>
                    <strong>
                      {setting.key}
                    </strong>

                    <small>
                      마지막 변경:{' '}
                      {formatDateTime(
                        setting.updated_at,
                      )}
                    </small>
                  </div>

                  <Select
                    value={String(
                      setting.enabled,
                    )}
                    onChange={async (
                      event,
                    ) => {
                      try {
                        await api.notificationSettings.save(
                          setting.key,
                          event.target.value ===
                            'true',
                        )

                        await qc.invalidateQueries(
                          {
                            queryKey: [
                              'notification-settings',
                            ],
                          },
                        )
                      } catch (err) {
                        setError(
                          getErrorMessage(err),
                        )
                      }
                    }}
                  >
                    <option value="true">
                      사용
                    </option>

                    <option value="false">
                      사용 안 함
                    </option>
                  </Select>
                </div>
              ),
            )}
          </div>
        </Card>
      )}

      {assign && (
        <RoleModal
          roles={context.roles}
          organizations={
            context.organizations
          }
          onClose={() =>
            setAssign(false)
          }
          onSave={async (value) => {
            try {
              await api.roles.assign(
                value,
              )

              setAssign(false)

              await qc.invalidateQueries({
                queryKey: [
                  'all-role-assignments',
                ],
              })
            } catch (e) {
              setError(
                getErrorMessage(e),
              )
            }
          }}
        />
      )}
    </div>
  )
}

function RoleModal({
  roles,
  organizations,
  onClose,
  onSave,
}: {
  roles: any[]
  organizations: any[]
  onClose: () => void
  onSave: (
    value: any,
  ) => Promise<void>
}) {
  const [value, setValue] =
    useState({
      user_id: '',
      role_id:
        roles.find(
          (role) =>
            role.key ===
            'team_leader',
        )?.id ||
        roles[0]?.id ||
        '',
      organization_id:
        null as string | null,
    })

  const role = roles.find(
    (item) =>
      item.id === value.role_id,
  )

  const compatibleOrganizations =
    organizations.filter(
      (organization) => {
        if (
          role?.scope_type !==
          'organization'
        ) {
          return false
        }

        const organizationTypeByRole:
          Record<string, string> = {
            team: 'team',
            small_group:
              'small_group',
            club: 'club',
            volunteer_team:
              'volunteer_team',
          }

        return (
          organizationTypeByRole[
            role.key
          ] === organization.type ||
          role.key === 'pastor'
        )
      },
    )

  return (
    <Modal
      title="역할 할당"
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()
          void onSave(value)
        }}
      >
        <Field label="사용자 ID">
          <Input
            value={value.user_id}
            onChange={(event) =>
              setValue({
                ...value,
                user_id:
                  event.target.value,
              })
            }
            placeholder="UUID"
            required
          />
        </Field>

        <Field label="역할">
          <Select
            value={value.role_id}
            onChange={(event) =>
              setValue({
                ...value,
                role_id:
                  event.target.value,
                organization_id:
                  null,
              })
            }
          >
            {roles.map((item) => (
              <option
                key={item.id}
                value={item.id}
              >
                {item.name}
              </option>
            ))}
          </Select>
        </Field>

        {role?.scope_type ===
          'organization' && (
          <Field label="조직">
            <Select
              value={
                value.organization_id ||
                ''
              }
              onChange={(event) =>
                setValue({
                  ...value,
                  organization_id:
                    event.target.value,
                })
              }
              required
            >
              <option value="">
                선택
              </option>

              {compatibleOrganizations
                .filter(
                  (organization) =>
                    organization.status ===
                    'active',
                )
                .map(
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

        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>

          <Button>할당</Button>
        </div>
      </form>
    </Modal>
  )
}