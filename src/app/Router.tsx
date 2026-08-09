import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './AuthProvider'
import { AppShell } from '../components/AppShell'
import { LoginPage,SignupPage,ForgotPasswordPage,ResetPasswordPage } from '../features/auth/AuthPages'
import { DashboardPage } from '../features/dashboard/DashboardPage'
import { AnnouncementsPage } from '../features/announcements/AnnouncementsPage'
import { EventsPage } from '../features/events/EventsPage'
import { TeamsPage } from '../features/teams/TeamsPage'
import { AttendancePage } from '../features/attendance/AttendancePage'
import { PrayerPage,MediaPage } from '../features/content/ContentPages'
import { WorshipPage } from '../features/worship/WorshipPage'
import { NotificationsPage,ProfilePage } from '../features/account/AccountPages'
import { AdminPage } from '../features/admin/AdminPage'
import { ErrorBox, Spinner } from '../components/ui'
import { isAdmin } from '../lib/permissions'

function RequireAuth(){
 const {session,context,loading,error}=useAuth();const location=useLocation()
 if(loading)return <div className="full-loading"><Spinner/></div>
 if(!session)return <Navigate to="/login" replace state={{from:location.pathname}}/>
 if(session && !context && error) return <div className="full-loading"><div className="stack error-state"><h1>사용자 정보를 불러오지 못했습니다.</h1><ErrorBox message={error}/><button className="btn btn-primary" onClick={() => window.location.reload()}>새로고침</button></div></div>
 return <Outlet/>
}
function AdminOnly(){
 const {context,loading}=useAuth()
 if(loading)return <div className="full-loading"><Spinner/></div>
 if(!isAdmin(context))return <Navigate to="/" replace/>
 return <AdminPage/>
}
export function Router(){
 return <Routes>
  <Route path="/login" element={<LoginPage/>}/><Route path="/signup" element={<SignupPage/>}/><Route path="/forgot-password" element={<ForgotPasswordPage/>}/><Route path="/reset-password" element={<ResetPasswordPage/>}/>
  <Route element={<RequireAuth/>}><Route element={<AppShell/>}>
   <Route index element={<DashboardPage/>}/><Route path="announcements" element={<AnnouncementsPage/>}/><Route path="events" element={<EventsPage/>}/><Route path="worship" element={<WorshipPage/>}/><Route path="teams" element={<TeamsPage/>}/><Route path="attendance" element={<AttendancePage/>}/><Route path="prayer" element={<PrayerPage/>}/><Route path="media" element={<MediaPage/>}/><Route path="notifications" element={<NotificationsPage/>}/><Route path="profile" element={<ProfilePage/>}/><Route path="admin" element={<AdminOnly/>}/>
  </Route></Route>
  <Route path="*" element={<Navigate to="/" replace/>}/>
 </Routes>
}
