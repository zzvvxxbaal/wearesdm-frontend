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
  attendanceLabel,
  formatDateTime,
} from '../../lib/format'
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
import { getErrorMessage } from '../../lib/errors'

export function AttendancePage() {
  const { context } = useAuth()
  const qc = useQueryClient()

  const [mode, setMode] =
    useState<
      'records' | 'requests'
    >('records')

  const [selected, setSelected] =
    useState<any>(null)

  const [error, setError] = useState('')

  const canRead =
    !!context?.profile

  const {
    data: records = [],
    isLoading,
  } = useQuery({
    queryKey: ['attendance'],
    queryFn: () => api.attendance.list(),
    enabled: canRead,
  })

  const {
    data: requests = [],
    isLoading: requestsLoading,
  } = useQuery({
    queryKey: [
      'attendance-requests',
    ],
    queryFn: () => api.attendance.requests(),
    enabled: canRead,
  })

  return (
    <div className="stack-lg">
      <div className="page-header">
        <div>
          <h1>출석</h1>
          <p>
            출석 기록과 수정 요청을
            관리합니다.
          </p>
        </div>

        <div className="tabs">
          <Button
            variant={
              mode === 'records'
                ? 'primary'
                : 'secondary'
            }
            onClick={() =>
              setMode('records')
            }
          >
            기록
          </Button>

          <Button
            variant={
              mode === 'requests'
                ? 'primary'
                : 'secondary'
            }
            onClick={() =>
              setMode('requests')
            }
          >
            수정 요청
          </Button>
        </div>
      </div>

      {error && (
        <ErrorBox
          message={error}
        />
      )}

      {mode === 'records' ? (
        isLoading ? (
          <Spinner />
        ) : records.length ? (
          <Card>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>회원</th>
                    <th>대상</th>
                    <th>상태</th>
                    <th>처리일</th>
                    <th></th>
                  </tr>
                </thead>

                <tbody>
                  {records.map(
                    (record) => (
                      <tr
                        key={record.id}
                      >
                        <td>
                          {record.user_id}
                        </td>

                        <td>
                          {record.event_id
                            ? `행사 ${record.event_id}`
                            : `예배 ${record.worship_service_id}`}
                        </td>

                        <td>
                          <Badge
                            tone={
                              record.status ===
                              'present'
                                ? 'success'
                                : record.status ===
                                    'absent'
                                  ? 'danger'
                                  : 'warning'
                            }
                          >
                            {attendanceLabel(
                              record.status,
                            )}
                          </Badge>
                        </td>

                        <td>
                          {formatDateTime(
                            record.processed_at,
                          )}
                        </td>

                        <td>
                          <div className="actions">
                            {record.user_id ===
                              context?.profile
                                ?.id && (
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setSelected({
                                    ...record,
                                    requestCorrection:
                                      true,
                                  })
                                }
                              >
                                수정 요청
                              </Button>
                            )}

                            {(isAdmin(
                              context,
                            ) ||
                              context?.organizations.some(
                                (
                                  organization,
                                ) =>
                                  canPermission(
                                    context,
                                    'attendance.manage',
                                    organization.id,
                                  ),
                              )) && (
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setSelected(
                                    record,
                                  )
                                }
                              >
                                수정
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <Card>
            <Empty>
              출석 기록이 없습니다.
            </Empty>
          </Card>
        )
      ) : requestsLoading ? (
        <Spinner />
      ) : requests.length ? (
        <Card>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>요청자</th>
                  <th>기존</th>
                  <th>요청</th>
                  <th>사유</th>
                  <th>상태</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {requests.map(
                  (request) => (
                    <tr
                      key={request.id}
                    >
                      <td>
                        {
                          request.requester_id
                        }
                      </td>

                      <td>
                        {attendanceLabel(
                          request.original_status,
                        )}
                      </td>

                      <td>
                        {attendanceLabel(
                          request.requested_status,
                        )}
                      </td>

                      <td>
                        {request.reason}
                      </td>

                      <td>
                        <Badge
                          tone={
                            request.status ===
                            'approved'
                              ? 'success'
                              : request.status ===
                                  'rejected'
                                ? 'danger'
                                : 'warning'
                          }
                        >
                          {request.status}
                        </Badge>
                      </td>

                      <td>
                        {request.status ===
                          'pending' &&
                          request.requester_id !==
                            context?.profile
                              ?.id && (
                            <Button
                              onClick={() =>
                                setSelected(
                                  request,
                                )
                              }
                            >
                              검토
                            </Button>
                          )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card>
          <Empty>
            수정 요청이 없습니다.
          </Empty>
        </Card>
      )}

      {selected?.requestCorrection ? (
        <RequestCorrectionModal
          value={selected}
          onClose={() =>
            setSelected(null)
          }
          onDone={async () => {
            setSelected(null)

            await qc.invalidateQueries({
              queryKey: [
                'attendance',
              ],
            })

            await qc.invalidateQueries({
              queryKey: [
                'attendance-requests',
              ],
            })
          }}
          onError={setError}
        />
      ) : selected?.requested_status ? (
        <CorrectionModal
          value={selected}
          onClose={() =>
            setSelected(null)
          }
          onDone={async () => {
            setSelected(null)

            await qc.invalidateQueries({
              queryKey: [
                'attendance',
              ],
            })

            await qc.invalidateQueries({
              queryKey: [
                'attendance-requests',
              ],
            })
          }}
          onError={setError}
        />
      ) : (
        selected && (
          <AttendanceModal
            value={selected}
            onClose={() =>
              setSelected(null)
            }
            onDone={async () => {
              setSelected(null)

              await qc.invalidateQueries({
                queryKey: [
                  'attendance',
                ],
              })
            }}
            onError={setError}
          />
        )
      )}
    </div>
  )
}

function AttendanceModal({
  value,
  onClose,
  onDone,
  onError,
}: {
  value: any
  onClose: () => void
  onDone: () => Promise<void>
  onError: (
    message: string,
  ) => void
}) {
  const [status, setStatus] =
    useState(value.status)

  const [note, setNote] =
    useState(value.note || '')

  const [busy, setBusy] =
    useState(false)

  return (
    <Modal
      title="출석 수정"
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={async (
          event,
        ) => {
          event.preventDefault()
          setBusy(true)

          try {
            await api.attendance.set({
              userId:
                value.user_id,
              status,
              eventId:
                value.event_id ||
                undefined,
              worshipServiceId:
                value.worship_service_id ||
                undefined,
              note,
            })

            await onDone()
          } catch (err) {
            onError(
              getErrorMessage(err),
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="상태">
          <Select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value,
              )
            }
          >
            {[
              'present',
              'late',
              'absent',
              'excused',
              'pending',
            ].map(
              (statusValue) => (
                <option
                  key={statusValue}
                  value={
                    statusValue
                  }
                >
                  {attendanceLabel(
                    statusValue,
                  )}
                </option>
              ),
            )}
          </Select>
        </Field>

        <Field label="메모">
          <Textarea
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
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

          <Button disabled={busy}>
            저장
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function RequestCorrectionModal({
  value,
  onClose,
  onDone,
  onError,
}: {
  value: any
  onClose: () => void
  onDone: () => Promise<void>
  onError: (
    message: string,
  ) => void
}) {
  const [status, setStatus] =
    useState(value.status)

  const [reason, setReason] =
    useState('')

  const [busy, setBusy] =
    useState(false)

  return (
    <Modal
      title="출석 수정 요청"
      onClose={onClose}
    >
      <form
        className="stack"
        onSubmit={async (
          event,
        ) => {
          event.preventDefault()
          setBusy(true)

          try {
            await api.attendance.requestCorrection(
              value.id,
              status,
              reason,
            )

            await onDone()
          } catch (err) {
            onError(
              getErrorMessage(err),
            )
          } finally {
            setBusy(false)
          }
        }}
      >
        <Field label="요청 상태">
          <Select
            value={status}
            onChange={(event) =>
              setStatus(
                event.target.value,
              )
            }
          >
            {[
              'present',
              'late',
              'absent',
              'excused',
            ].map(
              (statusValue) => (
                <option
                  key={statusValue}
                  value={
                    statusValue
                  }
                >
                  {attendanceLabel(
                    statusValue,
                  )}
                </option>
              ),
            )}
          </Select>
        </Field>

        <Field label="사유">
          <Textarea
            value={reason}
            onChange={(event) =>
              setReason(
                event.target.value,
              )
            }
            required
            maxLength={1000}
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

          <Button disabled={busy}>
            요청 제출
          </Button>
        </div>
      </form>
    </Modal>
  )
}

function CorrectionModal({
  value,
  onClose,
  onDone,
  onError,
}: {
  value: any
  onClose: () => void
  onDone: () => Promise<void>
  onError: (
    message: string,
  ) => void
}) {
  const [note, setNote] =
    useState('')

  const [busy, setBusy] =
    useState(false)

  return (
    <Modal
      title="출석 수정 요청 검토"
      onClose={onClose}
    >
      <div className="stack">
        <p>
          요청 상태:{' '}
          <strong>
            {attendanceLabel(
              value.original_status,
            )}{' '}
            →{' '}
            {attendanceLabel(
              value.requested_status,
            )}
          </strong>
        </p>

        <p>
          사유: {value.reason}
        </p>

        <Field label="검토 메모">
          <Input
            value={note}
            onChange={(event) =>
              setNote(
                event.target.value,
              )
            }
          />
        </Field>

        <div className="actions">
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true)

              try {
                await api.attendance.reviewCorrection(
                  value.id,
                  'approved',
                  note,
                )

                await onDone()
              } catch (error) {
                onError(
                  getErrorMessage(
                    error,
                  ),
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            승인
          </Button>

          <Button
            variant="danger"
            disabled={busy}
            onClick={async () => {
              setBusy(true)

              try {
                await api.attendance.reviewCorrection(
                  value.id,
                  'rejected',
                  note,
                )

                await onDone()
              } catch (error) {
                onError(
                  getErrorMessage(
                    error,
                  ),
                )
              } finally {
                setBusy(false)
              }
            }}
          >
            거절
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
          >
            취소
          </Button>
        </div>
      </div>
    </Modal>
  )
}