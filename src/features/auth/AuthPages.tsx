import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { Navigate, useLocation, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../app/AuthProvider'
import { sendPasswordReset, signIn, signUp, updatePassword } from '../../services/auth'
import { Button, Card, ErrorBox, Field, Input } from '../../components/ui'
import { getErrorMessage } from '../../lib/errors'

export function LoginPage() {
  const { session, loading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [error,setError]=useState(''); const [busy,setBusy]=useState(false)
  if (!loading && session) return <Navigate to={(location.state as {from?:string})?.from || '/'} replace />
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{await signIn(email,password);navigate('/',{replace:true})}catch(err){setError(getErrorMessage(err))}finally{setBusy(false)}}
  return <AuthLayout title="로그인" subtitle="wearesdm에 로그인하세요."><form onSubmit={submit} className="stack">
    {error&&<ErrorBox message={error}/>}<Field label="이메일"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required autoComplete="email"/></Field>
    <Field label="비밀번호"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required autoComplete="current-password"/></Field>
    <Button disabled={busy}>{busy?'로그인 중…':'로그인'}</Button><Link to="/forgot-password" className="text-link">비밀번호를 잊으셨나요?</Link><div className="divider">또는</div><Link to="/signup" className="btn btn-secondary center">회원가입</Link>
  </form></AuthLayout>
}
export function SignupPage() {
  const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [name,setName]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const navigate=useNavigate()
  const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);setError('');try{const d=await signUp(email,password,name);setMessage(d.session?'가입되었습니다.':'가입 확인 메일을 확인하세요.');if(d.session)navigate('/')}catch(err){setError(getErrorMessage(err))}finally{setBusy(false)}}
  return <AuthLayout title="회원가입" subtitle="계정을 만들면 기본 프로필이 자동으로 생성됩니다."><form onSubmit={submit} className="stack">{error&&<ErrorBox message={error}/>} {message&&<div className="success-box">{message}</div>}
    <Field label="이름"><Input value={name} onChange={e=>setName(e.target.value)} required maxLength={100}/></Field><Field label="이메일"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field><Field label="비밀번호"><Input type="password" value={password} onChange={e=>setPassword(e.target.value)} required minLength={8}/></Field><Button disabled={busy}>{busy?'가입 중…':'가입하기'}</Button><Link to="/login" className="text-link">이미 계정이 있나요?</Link>
  </form></AuthLayout>
}
export function ForgotPasswordPage(){const [email,setEmail]=useState('');const [error,setError]=useState('');const [message,setMessage]=useState('');const [busy,setBusy]=useState(false);const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);try{await sendPasswordReset(email);setMessage('비밀번호 재설정 메일을 보냈습니다.')}catch(err){setError(getErrorMessage(err))}finally{setBusy(false)}};return <AuthLayout title="비밀번호 재설정" subtitle="가입한 이메일을 입력하세요."><form onSubmit={submit} className="stack">{error&&<ErrorBox message={error}/>} {message&&<div className="success-box">{message}</div>}<Field label="이메일"><Input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/></Field><Button disabled={busy}>재설정 메일 보내기</Button><Link to="/login" className="text-link">로그인으로 돌아가기</Link></form></AuthLayout>}
export function ResetPasswordPage(){const [password,setPassword]=useState('');const [message,setMessage]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);const navigate=useNavigate();const submit=async(e:FormEvent)=>{e.preventDefault();setBusy(true);try{await updatePassword(password);setMessage('비밀번호가 변경되었습니다.');setTimeout(()=>navigate('/'),800)}catch(err){setError(getErrorMessage(err))}finally{setBusy(false)}};return <AuthLayout title="새 비밀번호" subtitle="새 비밀번호를 설정하세요."><form onSubmit={submit} className="stack">{error&&<ErrorBox message={error}/>} {message&&<div className="success-box">{message}</div>}<Field label="새 비밀번호"><Input type="password" minLength={8} value={password} onChange={e=>setPassword(e.target.value)} required/></Field><Button disabled={busy}>비밀번호 변경</Button></form></AuthLayout>}
function AuthLayout({title,subtitle,children}:{title:string;subtitle:string;children:ReactNode}){return <div className="auth-page"><Card className="auth-card"><div className="auth-brand">wearesdm</div><h1>{title}</h1><p className="muted">{subtitle}</p>{children}</Card></div>}
