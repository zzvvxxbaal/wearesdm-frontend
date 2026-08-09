import { FormEvent, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../services/api'
import { useAuth } from '../../app/AuthProvider'
import { canPermission, isAdmin } from '../../lib/permissions'
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

export function PrayerPage() {
  const { context } = useAuth()

  const [orgId, setOrgId] = useState(
    context?.memberships.find(
      (membership) => membership.status === 'active',
    )?.organization_id || '',
  )

  const [create, setCreate] = useState(false)
  const [error, setError] = useState('')

  const qc = useQueryClient()

  const {
    data = [],
    isLoading,
  } = useQuery({
    queryKey: ['prayers', orgId],
    queryFn: () => api.prayers.list(orgId),
    enabled: !!orgId && !!context?.profile,
  })

  if (!context?.profile) {
    return <Spinner />
  }

  if (!orgId) {
    return (
      <Card>
        <Empty>기도제목을 볼 조직이 없습니다.</Empty>
      </Card>
    )
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1>기도제목</h1>
          <p>함께 기도하고 서로를 격려하세요.</p>
        </div>

        <Button onClick={() => setCreate(true)}>
          기도제목 작성
        </Button>
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <Field label="조직">
          <Select
            value={orgId}
            onChange={(event) =>
              setOrgId(event.target.value)
            }
          >
            {context.organizations
              .filter((organization) =>
                context.memberships.some(
                  (membership) =>
                    membership.organization_id ===
                      organization.id &&
                    membership.status === 'active',
                ),
              )
              .map((organization) => (
                <option
                  key={organization.id}
                  value={organization.id}
                >
                  {organization.name}
                </option>
              ))}
          </Select>
        </Field>
      </Card>

      {isLoading ? (
        <Spinner />
      ) : data.length ? (
        <div className="grid-2">
          {data.map((prayer) => (
            <PrayerCard
              key={prayer.id}
              prayer={prayer}
              userId={context.profile.id}
              onError={setError}
            />
          ))}
        </div>
      ) : (
        <Card>
          <Empty>게시된 기도제목이 없습니다.</Empty>
        </Card>
      )}

      {create && (
        <PrayerModal
          organizationId={orgId}
          userId={context.profile.id}
          onClose={() => setCreate(false)}
          onDone={async () => {
            setCreate(false)

            await qc.invalidateQueries({
              queryKey: ['prayers', orgId],
            })
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
  prayer: any
  userId: string
  onError: (message: string) => void
}) {
  const [reacted, setReacted] = useState(
    prayer.reacted_by_me,
  )

  const [count, setCount] = useState(
    prayer.reaction_count,
  )

  const [busy, setBusy] = useState(false)

  const toggle = async () => {
    setBusy(true)

    try {
      await api.prayers.react(
        prayer.id,
        userId,
        reacted,
      )

      setReacted(!reacted)
      setCount(count + (reacted ? -1 : 1))
    } catch (error) {
      onError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card>
      <div className="article-head">
        <div>
          <Badge>
            {prayer.visibility === 'public'
              ? '공개'
              : '나만 보기'}
          </Badge>

          <h2>{prayer.title || '기도제목'}</h2>

          <small>
            {prayer.is_anonymous
              ? '익명'
              : prayer.visible_author_name || '회원'}{' '}
            · {formatDateTime(prayer.created_at)}
          </small>
        </div>
      </div>

      <p className="article-body">{prayer.body}</p>

      {prayer.visibility === 'public' && (
        <Button
          variant={reacted ? 'primary' : 'secondary'}
          disabled={busy}
          onClick={() => void toggle()}
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
  onError: (message: string) => void
}) {
  const [value, setValue] = useState<{
    title: string
    body: string
    visibility: 'public' | 'private'
    is_anonymous: boolean
  }>({
    title: '',
    body: '',
    visibility: 'public',
    is_anonymous: false,
  })

  return (
    <Modal title="기도제목 작성" onClose={onClose}>
      <form
        className="stack"
        onSubmit={async (event) => {
          event.preventDefault()

          try {
            await api.prayers.create({
              ...value,
              organization_id: organizationId,
              author_id: userId,
              status: 'published',
            })

            await onDone()
          } catch (error) {
            onError(getErrorMessage(error))
          }
        }}
      >
        <Field label="제목">
          <Input
            value={value.title}
            onChange={(event) =>
              setValue({
                ...value,
                title: event.target.value,
              })
            }
          />
        </Field>

        <Field label="내용">
          <Textarea
            rows={8}
            value={value.body}
            onChange={(event) =>
              setValue({
                ...value,
                body: event.target.value,
              })
            }
            required
            maxLength={5000}
          />
        </Field>

        <div className="form-grid">
          <Field label="공개 범위">
            <Select
              value={value.visibility}
              onChange={(event) =>
                setValue({
                  ...value,
                  visibility:
                    event.target.value as
                      | 'public'
                      | 'private',
                })
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
              value={String(value.is_anonymous)}
              onChange={(event) =>
                setValue({
                  ...value,
                  is_anonymous:
                    event.target.value === 'true',
                })
              }
            >
              <option value="false">아니오</option>
              <option value="true">예</option>
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

          <Button>게시</Button>
        </div>
      </form>
    </Modal>
  )
}

export function MediaPage() {
  const { context } = useAuth()

  const [orgId, setOrgId] = useState('all')
  const [editing, setEditing] = useState<any>(null)
  const [error, setError] = useState('')

  const qc = useQueryClient()

  const {
    data = [],
    isLoading,
  } = useQuery({
    queryKey: ['media', orgId],
    queryFn: () =>
      api.media.list(
        orgId === 'all' ? undefined : orgId,
      ),
    enabled: !!context,
  })

  const manageable = (
    context?.organizations ?? []
  ).filter(
    (organization) =>
      isAdmin(context) ||
      canPermission(
        context,
        'media.manage',
        organization.id,
      ),
  )

  const save = async (value: any) => {
    try {
      if (value.id) {
        await api.media.update(value.id, value)
      } else {
        await api.media.create(value)
      }

      await qc.invalidateQueries({
        queryKey: ['media'],
      })

      setEditing(null)
    } catch (error) {
      setError(getErrorMessage(error))
    }
  }

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1>미디어</h1>
          <p>
            사진, 영상, 오디오, 문서를 관리합니다.
          </p>
        </div>

        {manageable.length > 0 && (
          <Button
            onClick={() =>
              setEditing({
                organization_id: manageable[0].id,
                type: 'document',
                title: '',
                description: '',
                external_url: '',
                status: 'published',
              })
            }
          >
            미디어 추가
          </Button>
        )}
      </div>

      {error && <ErrorBox message={error} />}

      <Card>
        <Field label="조직">
          <Select
            value={orgId}
            onChange={(event) =>
              setOrgId(event.target.value)
            }
          >
            <option value="all">전체</option>

            {context?.organizations.map(
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
      ) : data.length ? (
        <div className="grid-3">
          {data.map((media) => (
            <Card key={media.id}>
              <Badge>{media.type}</Badge>

              <h2>{media.title}</h2>

              <p>{media.description || ''}</p>

              {media.external_url && (
                <a
                  href={media.external_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-link"
                >
                  열기 ↗
                </a>
              )}

              {media.storage_path && (
                <p className="muted">
                  스토리지: {media.storage_path}
                </p>
              )}

              {(isAdmin(context) ||
                (media.organization_id &&
                  canPermission(
                    context,
                    'media.manage',
                    media.organization_id,
                  ))) && (
                <div className="actions">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      setEditing(media)
                    }
                  >
                    수정
                  </Button>

                  <Button
                    variant="danger"
                    onClick={async () => {
                      if (!confirm('삭제할까요?')) {
                        return
                      }

                      try {
                        await api.media.delete(
                          media.id,
                        )

                        await qc.invalidateQueries({
                          queryKey: ['media'],
                        })
                      } catch (error) {
                        setError(
                          getErrorMessage(error),
                        )
                      }
                    }}
                  >
                    삭제
                  </Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <Empty>미디어가 없습니다.</Empty>
        </Card>
      )}

      {editing && (
        <MediaModal
          value={editing}
          organizations={manageable}
          onClose={() => setEditing(null)}
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
  value: any
  organizations: any[]
  onClose: () => void
  onSave: (value: any) => Promise<void>
}) {
  const [state, setState] = useState(value)
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent) => {
    event.preventDefault()

    setBusy(true)
    setError('')

    let uploadedPath: string | null = null

    try {
      let next = { ...state }

      if (file) {
        if (file.size > 50 * 1024 * 1024) {
          throw new Error(
            '미디어 파일은 최대 50MB까지 업로드할 수 있습니다.',
          )
        }

        const uploaded =
          await api.storage.uploadMedia(
            state.organization_id,
            file,
          )

        uploadedPath = uploaded.path

        next = {
          ...next,
          ...uploaded,
          storage_path: uploaded.path,
          storage_bucket: uploaded.bucket,
          external_url: null,
          status: state.status || 'published',
        }
      }

      await onSave(next)
    } catch (error) {
      if (uploadedPath) {
        await api.storage
          .delete('sdm-media', uploadedPath)
          .catch(() => undefined)
      }

      setError(getErrorMessage(error))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal
      title={state.id ? '미디어 수정' : '미디어 추가'}
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={submit}
      >
        {error && <ErrorBox message={error} />}

        <Field label="조직">
          <Select
            value={state.organization_id || ''}
            onChange={(event) =>
              setState({
                ...state,
                organization_id:
                  event.target.value,
              })
            }
            required
          >
            {organizations.map((organization) => (
              <option
                key={organization.id}
                value={organization.id}
              >
                {organization.name}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="유형">
          <Select
            value={state.type}
            onChange={(event) =>
              setState({
                ...state,
                type: event.target.value,
              })
            }
          >
            {[
              'video',
              'photo',
              'audio',
              'document',
            ].map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="제목">
          <Input
            value={state.title}
            onChange={(event) =>
              setState({
                ...state,
                title: event.target.value,
              })
            }
            required
            maxLength={200}
          />
        </Field>

        <Field label="설명">
          <Textarea
            value={state.description || ''}
            onChange={(event) =>
              setState({
                ...state,
                description: event.target.value,
              })
            }
          />
        </Field>

        <Field label="외부 URL">
          <Input
            type="url"
            value={state.external_url || ''}
            onChange={(event) =>
              setState({
                ...state,
                external_url:
                  event.target.value,
                storage_path: null,
                storage_bucket: null,
              })
            }
            placeholder="https://..."
          />
        </Field>

        <Field label="파일 업로드">
          <Input
            type="file"
            onChange={(event) => {
              setFile(
                event.target.files?.[0] || null,
              )

              setState({
                ...state,
                external_url: null,
              })
            }}
          />
        </Field>

        <Field label="상태">
          <Select
            value={state.status}
            onChange={(event) =>
              setState({
                ...state,
                status: event.target.value,
              })
            }
          >
            <option value="published">게시</option>
            <option value="draft">임시저장</option>
            <option value="archived">보관</option>
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

          <Button disabled={busy}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  )
}