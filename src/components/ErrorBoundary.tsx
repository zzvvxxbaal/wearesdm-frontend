import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Card } from './ui'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled application error', error, info)
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div className="full-loading error-page">
        <Card className="error-page-card">
          <span className="eyebrow">UNEXPECTED ERROR</span>
          <h1>잠시 문제가 발생했어요.</h1>
          <p className="muted">페이지를 새로고침하면 대부분의 일시적인 오류가 해결됩니다.</p>
          <div className="actions">
            <Button onClick={() => window.location.reload()}>새로고침</Button>
            <Button variant="secondary" onClick={() => this.setState({ hasError: false, error: null })}>다시 시도</Button>
          </div>
          {import.meta.env.DEV && this.state.error && <pre className="debug-box">{this.state.error.stack || this.state.error.message}</pre>}
        </Card>
      </div>
    )
  }
}
