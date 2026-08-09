export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}
export function formatDate(value: string | null | undefined): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium' }).format(date)
}
export function organizationTypeLabel(type: string): string {
  return ({ team: '팀', small_group: '순', club: '동아리', volunteer_team: '봉사팀' } as Record<string,string>)[type] ?? type
}
export function eventTypeLabel(type: string): string {
  return ({ worship:'예배', church_event:'교회 행사', retreat:'수련회', small_group:'순 모임', club:'동아리', volunteer:'봉사', other:'기타' } as Record<string,string>)[type] ?? type
}
export function attendanceLabel(status: string): string {
  return ({present:'출석',late:'지각',absent:'결석',excused:'사유결석',pending:'미처리'} as Record<string,string>)[status] ?? status
}
export function contentStatusLabel(status: string): string {
  return ({draft:'임시저장',published:'게시',archived:'보관'} as Record<string,string>)[status] ?? status
}
export function membershipStatusLabel(status: string): string {
  return ({active:'활성',pending:'대기',left:'탈퇴',removed:'제외'} as Record<string,string>)[status] ?? status
}
export function organizationStatusLabel(status: string): string {
  return ({active:'활성',inactive:'비활성',archived:'보관'} as Record<string,string>)[status] ?? status
}
export function eventStatusLabel(status: string): string {
  return ({draft:'임시저장',published:'게시',cancelled:'취소',completed:'종료'} as Record<string,string>)[status] ?? status
}
