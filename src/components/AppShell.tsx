import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../app/AuthProvider'
import { signOut } from '../services/auth'
import { Button } from './ui'
import { isAdmin } from '../lib/permissions'

const links = [
  ['/', '홈', '⌂'], ['/announcements', '공지', '▤'], ['/events', '일정', '◷'], ['/teams', '조직', '◎'],
  ['/attendance', '출석', '✓'], ['/prayer', '기도', '♡'], ['/media', '미디어', '▧'], ['/worship', '예배', '◉'],
  ['/notifications', '알림', '◌'], ['/profile', '프로필', '○'],
]

export function AppShell() {
  const { context } = useAuth()
  const navigate = useNavigate()
  const logout = async () => {
    try { await signOut() } finally { navigate('/login', { replace: true }) }
  }
  return <div className="app">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">W</div><div><strong>wearesdm</strong><small>청년부 플랫폼</small></div></div>
      <nav aria-label="주요 메뉴">
        {links.map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'}><span className="nav-icon" aria-hidden="true">{icon}</span><span>{label}</span></NavLink>)}
        {isAdmin(context) && <NavLink to="/admin"><span className="nav-icon" aria-hidden="true">◆</span><span>관리자</span></NavLink>}
      </nav>
      <div className="sidebar-bottom">
        <NavLink className="user-mini-link" to="/profile">
          <div className="user-mini"><div className="avatar">{context?.profile?.display_name?.slice(0,1) ?? '?'}</div><div><strong>{context?.profile?.display_name || '사용자'}</strong><small>{isAdmin(context) ? '관리자' : '회원'}</small></div></div>
        </NavLink>
        <Button variant="ghost" onClick={() => void logout()}>로그아웃</Button>
      </div>
    </aside>
    <main className="main">
      <header className="mobile-header"><div><strong>wearesdm</strong><small>{context?.profile?.display_name || '회원'}</small></div><Button variant="ghost" onClick={() => void logout()}>로그아웃</Button></header>
      <div className="page"><Outlet /></div>
    </main>
    <nav className="mobile-nav" aria-label="모바일 메뉴">
      {links.slice(0, 5).map(([to, label, icon]) => <NavLink key={to} to={to} end={to === '/'}><span>{icon}</span><small>{label}</small></NavLink>)}
    </nav>
  </div>
}
