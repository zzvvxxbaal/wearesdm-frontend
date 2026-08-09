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
  Textarea,
  Badge,
} from '../../components/ui'
import { formatDateTime } from '../../lib/format'
import { getErrorMessage } from '../../lib/errors'
import type {
  MediaItem,
  PrayerRequest,
} from '../../types/domain'

type PrayerView = PrayerRequest & {
  reacted_by_me?: boolean
  reaction_count?: number
  visible_author_name?: string | null
  is_anonymous?: boolean
  visibility?: 'public' | 'private'
  title?: string | null
  body?: string
  created_at: string
}

type PrayerCreateValue = {
  title: string
  body: string
  visibility: 'public' | 'private'
  is_anonymous: boolean
  organization_id: string
  author_id: string
  status: 'published'
}

/*
 * MediaFormValue is deliberately based on MediaItem.
 *
 * The important point is that `type` must retain the
 * exact MediaItem type instead of becoming `string`.
 */
type MediaFormValue = Omit<
  Partial<MediaItem>,
  'type'
> & {
  type?: MediaItem['type']
}

/*
 * Convert the form value to exactly the type expected
 * by the media API.
 */
function toMediaItemInput(
  value: MediaFormValue,
): Partial<MediaItem> {
  return {
    ...value,
    type: value.type,
  }
}

export function PrayerPage() {
  const { context } = useAuth()

  const authContext = context

  const activeMemberships =
    authContext?.memberships.filter(
      (membership) =>
        membership.status === 'active',
    ) ?? []

  const organizations =
    authContext?.organizations.filter(
      (organization) =>
        activeMemberships.some(
          (membership) =>
            membership.organization_id ===
              organization.id,
        ),
    ) ?? []

  const [orgId, setOrgId] =
    useState('')

  const [create, setCreate] =
    useState(false)

  const [error, setError] =
    useState('')

  const qc = useQueryClient()

  const effectiveOrgId =
    orgId ||
    organizations[0]?.id ||
    ''

  const {
    data = [],
    isLoading,
  } = useQuery<PrayerView[]>({
    queryKey: [
      'prayers',
      effectiveOrgId,
    ],

    queryFn: async () => {
      if (!effectiveOrgId) {
        return []
      }

      const result =
        await api.prayers.list(
          effectiveOrgId,
        )

      return result as PrayerView[]
    },

    enabled:
      !!effectiveOrgId &&
      !!authContext?.profile,
  })

  /*
   * From this point downward, profile is guaranteed
   * to exist for this render.
   *
   * We intentionally extract the ID into a primitive
   * value so TypeScript does not have to reason about
   * nullable authContext.profile inside callbacks.
   */
  if (!authContext?.profile) {
    return <Spinner />
  }

  const profileId =
    authContext.profile.id

  if (!effectiveOrgId) {
    return (
      <Card>
        <Empty>
          기도제목을 볼 조직이
          없습니다.
        </Empty>
      </Card>
    )
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1>기도제목</h1>

          <p>
            함께 기도하고 서로를
            격려하세요.
          </p>
        </div>

        <Button
          onClick={() =>
            setCreate(true)
          }
        >
          기도제목 작성
        </Button>
      </div>

      {error && (
        <ErrorBox
          message={error}
        />
      )}

      <Card>
        <Field label="조직">
          <Select
            value={effectiveOrgId}
            onChange={(event) =>
              setOrgId(
                event.target.value,
              )
            }
          >
            {organizations.map(
              (organization) => (
                <option
                  key={organization.id}
                  value={organization.id}
                >
                  {organization.name}
                </option>
              ),
            )}
          </Select>
        </Field>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : data.length > 0 ? (
        <div className="grid-2">
          {data.map((prayer) => (
            <PrayerCard
              key={prayer.id}
              prayer={prayer}
              userId={profileId}
              onError={setError}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Empty>
            게시된 기도제목이
            없습니다.
          </Empty>
        </Card>
      )}

      {create && (
        <PrayerModal
          organizationId={
            effectiveOrgId
          }
          userId={profileId}
          onClose={() =>
            setCreate(false)
          }
          onDone={async () => {
            setCreate(false)

            await qc.invalidateQueries(
              {
                queryKey: [
                  'prayers',
                  effectiveOrgId,
                ],
              },
            )
          }}
          onError={setError}
        />
      )}
    </div>
  )
}

function PrayerCard({
  prayer,
  userId,
  onError,
}: {
  prayer: PrayerView
  userId: string
  onError: (
    message: string,
  ) => void
}) {
  const [
    reacted,
    setReacted,
  ] = useState(
    prayer.reacted_by_me ?? false,
  )

  const [
    count,
    setCount,
  ] = useState(
    prayer.reaction_count ?? 0,
  )

  const [
    busy,
    setBusy,
  ] = useState(false)

  const toggle = async () => {
    if (busy) {
      return
    }

    setBusy(true)

    try {
      await api.prayers.react(
        prayer.id,
        userId,
        reacted,
      )

      setReacted(!reacted)

      setCount(
        (current) =>
          current +
          (reacted ? -1 : 1),
      )
    } catch (error) {
      onError(
        getErrorMessage(error),
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="article-head">
        <div>
          <Badge>
            {prayer.visibility ===
            'public'
              ? '공개'
              : '나만 보기'}
          </Badge>

          <h2>
            {prayer.title ||
              '기도제목'}
          </h2>

          <small>
            {prayer.is_anonymous
              ? '익명'
              : prayer.visible_author_name ||
                '회원'}{' '}
            ·{' '}
            {formatDateTime(
              prayer.created_at,
            )}
          </small>
        </div>
      </div>

      <p className="article-body">
        {prayer.body}
      </p>

      {prayer.visibility ===
        'public' && (
        <Button
          variant={
            reacted
              ? 'primary'
              : 'secondary'
          }
          disabled={busy}
          onClick={() =>
            void toggle()
          }
        >
          🙏 {count}
        </Button>
      )}
    </Card>
  )
}

function PrayerModal({
  organizationId,
  userId,
  onClose,
  onDone,
  onError,
}: {
  organizationId: string
  userId: string
  onClose: () => void
  onDone: () => Promise<void>
  onError: (
    message: string,
  ) => void
}) {
  const [
    value,
    setValue,
  ] =
    useState<PrayerCreateValue>({
      title: '',
      body: '',
      visibility: 'public',
      is_anonymous: false,
      organization_id:
        organizationId,
      author_id: userId,
      status: 'published',
    })

  return (
    <Modal
      title="기도제목 작성"
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={async (
          event,
        ) => {
          event.preventDefault()

          try {
            await api.prayers.create(
              value,
            )

            await onDone()
          } catch (error) {
            onError(
              getErrorMessage(error),
            )
          }
        }}
      >
        <Field label="제목">
          <Input
            value={value.title}
            onChange={(event) =>
              setValue(
                (current) => ({
                  ...current,
                  title:
                    event.target.value,
                }),
              )
            }
          />
        </Field>

        <Field label="내용">
          <Textarea
            rows={8}
            value={value.body}
            onChange={(event) =>
              setValue(
                (current) => ({
                  ...current,
                  body:
                    event.target.value,
                }),
              )
            }
            required
            maxLength={5000}
          />
        </Field>

        <div className="form-grid">
          <Field label="공개 범위">
            <Select
              value={
                value.visibility
              }
              onChange={(event) =>
                setValue(
                  (current) => ({
                    ...current,
                    visibility:
                      event.target.value ===
                      'private'
                        ? 'private'
                        : 'public',
                  }),
                )
              }
            >
              <option value="public">
                조직 공개
              </option>

              <option value="private">
                나만 보기
              </option>
            </Select>
          </Field>

          <Field label="익명">
            <Select
              value={String(
                value.is_anonymous,
              )}
              onChange={(event) =>
                setValue(
                  (current) => ({
                    ...current,
                    is_anonymous:
                      event.target.value ===
                      'true',
                  }),
                )
              }
            >
              <option value="false">
                아니오
              </option>

              <option value="true">
                예
              </option>
            </Select>
          </Field>
        </div>

        <div className="modal-actions">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>

          <Button type="submit">
            게시
          </Button>
        </div>
      </form>
    </Modal>
  )
}

export function MediaPage() {
  const { context } = useAuth()

  const [orgId, setOrgId] =
    useState('all')

  const [
    editing,
    setEditing,
  ] =
    useState<MediaFormValue | null>(
      null,
    )

  const [error, setError] =
    useState('')

  const qc = useQueryClient()

  const {
    data = [],
    isLoading,
  } = useQuery<MediaItem[]>({
    queryKey: [
      'media',
      orgId,
    ],

    queryFn: async () => {
      const result =
        await api.media.list(
          orgId === 'all'
            ? undefined
            : orgId,
        )

      return result
    },

    enabled: !!context,
  })

  const organizations =
    context?.organizations ?? []

  const manageable =
    organizations.filter(
      (organization) =>
        isAdmin(context) ||
        canPermission(
          context,
          'media.manage',
          organization.id,
        ),
    )

  const save = async (
    value: MediaFormValue,
  ) => {
    try {
      const input =
        toMediaItemInput(value)

      if (value.id) {
        await api.media.update(
          value.id,
          input,
        )
      } else {
        await api.media.create(
          input,
        )
      }

      await qc.invalidateQueries(
        {
          queryKey: ['media'],
        },
      )

      setEditing(null)
    } catch (error) {
      setError(
        getErrorMessage(error),
      )
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1>미디어</h1>

          <p>
            사진, 영상, 오디오,
            문서를 관리합니다.
          </p>
        </div>

        {manageable.length >
          0 && (
          <Button
            onClick={() =>
              setEditing({
                organization_id:
                  manageable[0].id,
                type: 'document',
                title: '',
                description: '',
                external_url: '',
                status:
                  'published',
              })
            }
          >
            미디어 추가
          </Button>
        )}
      </div>

      {error && (
        <ErrorBox
          message={error}
        />
      )}

      <Card>
        <Field label="조직">
          <Select
            value={orgId}
            onChange={(event) =>
              setOrgId(
                event.target.value,
              )
            }
          >
            <option value="all">
              전체
            </option>

            {organizations.map(
              (organization) => (
                <option
                  key={organization.id}
                  value={organization.id}
                >
                  {organization.name}
                </option>
              ),
            )}
          </Select>
        </Field>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : data.length > 0 ? (
        <div className="grid-3">
          {data.map((media) => {
            const canManage =
              isAdmin(context) ||
              (!!media.organization_id &&
                canPermission(
                  context,
                  'media.manage',
                  media.organization_id,
                ))

            return (
              <Card key={media.id}>
                <Badge>
                  {media.type}
                </Badge>

                <h2>
                  {media.title}
                </h2>

                <p>
                  {media.description ||
                    ''}
                </p>

                {media.external_url && (
                  <a
                    href={
                      media.external_url
                    }
                    target="_blank"
                    rel="noreferrer"
                    className="text-link"
                  >
                    열기 ↗
                  </a>
                )}

                {media.storage_path && (
                  <p className="muted">
                    스토리지:{' '}
                    {
                      media.storage_path
                    }
                  </p>
                )}

                {canManage && (
                  <div className="actions">
                    <Button
                      variant="secondary"
                      onClick={() =>
                        setEditing({
                          ...media,
                        })
                      }
                    >
                      수정
                    </Button>

                    <Button
                      variant="danger"
                      onClick={async () => {
                        if (
                          !confirm(
                            '삭제할까요?',
                          )
                        ) {
                          return
                        }

                        try {
                          await api.media.delete(
                            media.id,
                          )

                          await qc.invalidateQueries(
                            {
                              queryKey: [
                                'media',
                              ],
                            },
                          )
                        } catch (error) {
                          setError(
                            getErrorMessage(
                              error,
                            ),
                          )
                        }
                      }}
                    >
                      삭제
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      ) : (
        <Card>
          <Empty>
            미디어가 없습니다.
          </Empty>
        </Card>
      )}

      {editing && (
        <MediaModal
          value={editing}
          organizations={
            organizations
          }
          onClose={() =>
            setEditing(null)
          }
          onSave={save}
        />
      )}
    </div>
  )
}

function MediaModal({
  value,
  organizations,
  onClose,
  onSave,
}: {
  value: MediaFormValue
  organizations: Array<{
    id: string
    name: string
  }>
  onClose: () => void
  onSave: (
    value: MediaFormValue,
  ) => Promise<void>
}) {
  const [
    state,
    setState,
  ] =
    useState<MediaFormValue>(
      value,
    )

  return (
    <Modal
      title={
        state.id
          ? '미디어 수정'
          : '미디어 추가'
      }
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={(event) => {
          event.preventDefault()

          void onSave(state)
        }}
      >
        <Field label="조직">
          <Select
            value={
              state.organization_id ??
              ''
            }
            onChange={(event) =>
              setState(
                (current) => ({
                  ...current,
                  organization_id:
                    event.target.value,
                }),
              )
            }
            required
          >
            <option value="">
              선택
            </option>

            {organizations.map(
              (organization) => (
                <option
                  key={organization.id}
                  value={organization.id}
                >
                  {organization.name}
                </option>
              ),
            )}
          </Select>
        </Field>

        <Field label="유형">
          <Select
            value={
              state.type ?? ''
            }
            onChange={(event) => {
              const nextType =
                event.target
                  .value as MediaItem['type']

              setState(
                (current) => ({
                  ...current,
                  type: nextType,
                }),
              )
            }}
          >
            <option value="photo">
              이미지
            </option>

            <option value="video">
              영상
            </option>

            <option value="audio">
              오디오
            </option>

            <option value="document">
              문서
            </option>
          </Select>
        </Field>

        <Field label="제목">
          <Input
            value={
              state.title ?? ''
            }
            onChange={(event) =>
              setState(
                (current) => ({
                  ...current,
                  title:
                    event.target.value,
                }),
              )
            }
            required
          />
        </Field>

        <Field label="설명">
          <Textarea
            value={
              state.description ??
              ''
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
          />
        </Field>

        <Field label="외부 URL">
          <Input
            value={
              state.external_url ??
              ''
            }
            onChange={(event) =>
              setState(
                (current) => ({
                  ...current,
                  external_url:
                    event.target.value,
                }),
              )
            }
            type="url"
          />
        </Field>

        <Field label="상태">
          <Select
            value={
              state.status ??
              'published'
            }
            onChange={(event) =>
              setState(
                (current) => ({
                  ...current,
                  status:
                    event.target.value as MediaItem['status'],
                }),
              )
            }
          >
            <option value="published">
              게시
            </option>

            <option value="draft">
              임시 저장
            </option>

            <option value="archived">
              보관
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
            저장
          </Button>
        </div>
      </form>
    </Modal>
  )
}