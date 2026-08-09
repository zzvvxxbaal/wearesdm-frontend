import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../../services/api'
import { useAuth } from '../../app/AuthProvider'
import { Card, Empty, Spinner, Badge } from '../../components/ui'
import { formatDateTime, organizationTypeLabel } from '../../lib/format'

export function DashboardPage(){
 const {context}=useAuth()
 const orgIds=context?.memberships.filter(m=>m.status==='active').map(m=>m.organization_id)??[]
 const {data:events=[],isLoading}=useQuery({queryKey:['dashboard-events',orgIds],queryFn:()=>api.events.list(),enabled:!!context})
 const {data:announcements=[]}=useQuery({queryKey:['dashboard-announcements',orgIds],queryFn:()=>api.announcements.list(),enabled:!!context})
 const upcoming=events.filter(e=>new Date(e.starts_at)>=new Date()).slice(0,4)
 const myOrgs=(context?.organizations??[]).filter(o=>orgIds.includes(o.id))
 return <div className="stack-lg">
  <div className="hero"><div><span className="eyebrow">WELCOME</span><h1>{context?.profile?.display_name||'회원'}님, 환영합니다.</h1><p>청년부의 일정과 공지, 팀 활동을 한 곳에서 관리하세요.</p></div></div>
  <div className="stats"><Card><strong>{myOrgs.length}</strong><span>내 소속</span></Card><Card><strong>{upcoming.length}</strong><span>다가오는 일정</span></Card><Card><strong>{announcements.length}</strong><span>확인 가능한 공지</span></Card></div>
  <div className="grid-2">
   <Card><div className="section-title"><h2>내 소속</h2><Link to="/teams">전체 보기</Link></div>{myOrgs.length?<div className="list">{myOrgs.map(o=><div className="list-row" key={o.id}><div><strong>{o.name}</strong><small>{organizationTypeLabel(o.type)}</small></div><Badge tone="success">{o.status}</Badge></div>)}</div>:<Empty>아직 소속된 조직이 없습니다.</Empty>}</Card>
   <Card><div className="section-title"><h2>다가오는 일정</h2><Link to="/events">전체 보기</Link></div>{isLoading?<Spinner/>:upcoming.length?<div className="list">{upcoming.map(e=><div className="list-row" key={e.id}><div><strong>{e.title}</strong><small>{formatDateTime(e.starts_at)} · {e.location||'장소 미정'}</small></div><Badge tone={e.status==='published'?'success':'neutral'}>{e.status}</Badge></div>)}</div>:<Empty/>}</Card>
  </div>
 </div>
}
