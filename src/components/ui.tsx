import { forwardRef, useEffect, useId, useRef } from 'react'
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'

export const Button = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary'|'secondary'|'danger'|'ghost' }>(function Button({ children, variant='primary', ...props }, ref) {
  return <button ref={ref} className={`btn btn-${variant}`} {...props}>{children}</button>
})
export function Card({ children, className='' }: { children: ReactNode; className?: string }) {
  return <section className={`card ${className}`}>{children}</section>
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className="input" {...props} />
}
export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="input textarea" {...props} />
}
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="input" {...props} />
}
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return <label className="field"><span>{label}</span>{children}{hint && <small>{hint}</small>}</label>
}
export function Empty({ children='표시할 내용이 없습니다.' }: { children?: ReactNode }) {
  return <div className="empty">{children}</div>
}
export function Spinner({ size='normal' }: { size?: 'small'|'normal' }) { return <div className={`spinner spinner-${size}`} aria-label="로딩 중" role="status" /> }
export function ErrorBox({ message }: { message: string }) {
  return <div className="error-box" role="alert">{message}</div>
}
export function Badge({ children, tone='neutral' }: { children: ReactNode; tone?: 'neutral'|'success'|'warning'|'danger'|'info' }) {
  return <span className={`badge badge-${tone}`}>{children}</span>
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  const titleId = useId()
  const closeRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKeyDown)
    closeRef.current?.focus()
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [onClose])
  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
    <div className="modal" role="dialog" aria-modal="true" aria-labelledby={titleId} onMouseDown={(e) => e.stopPropagation()}>
      <div className="modal-header"><h2 id={titleId}>{title}</h2><Button ref={closeRef} type="button" variant="ghost" onClick={onClose} aria-label="닫기">✕</Button></div>
      {children}
    </div>
  </div>
}
