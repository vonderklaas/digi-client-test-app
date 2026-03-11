import { useState } from 'react'
import './App.css'

const API_URL = 'https://liftoff-email-craft-git-feat-ai-agent-infra-digi-storms-prod.vercel.app/api/digistorms/events'

const SEQUENCE_EVENTS: { event: string; label: string }[] = [
  { event: 'user.signed_up', label: 'user.signed_up' },
  { event: 'milestone.1_achieved', label: 'milestone.1_achieved' },
  { event: 'nudge.1', label: 'nudge.1' },
  { event: 'milestone.2_achieved', label: 'milestone.2_achieved' },
  { event: 'nudge.2', label: 'nudge.2' },
  { event: 'trial.ending_24h', label: 'trial.ending_24h' },
  { event: 'trial.ended', label: 'trial.ended' },
]

function App() {
  const [apiKey, setApiKey] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState<string | null>(null) // stable per session for sequence testing
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastEvent, setLastEvent] = useState<string | null>(null)

  async function sendEvent(event: string) {
    if (!apiKey.trim()) {
      setErrorMessage('Please enter an API key')
      setStatus('error')
      return
    }
    if (!email.trim()) {
      setErrorMessage('Please enter an email')
      setStatus('error')
      return
    }

    setStatus('loading')
    setErrorMessage('')

    const uid = userId ?? `usr_${Date.now()}`
    if (!userId) setUserId(uid)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          event,
          userId: uid,
          email: email.trim(),
          properties: {},
        }),
      })

      if (!response.ok) {
        let message = `Request failed (${response.status})`
        try {
          const text = await response.text()
          const parsed = text ? JSON.parse(text) : null
          if (parsed?.message) message = parsed.message
          else if (parsed?.error) message = parsed.error
          else if (text) message = text
        } catch {
          // ignore parse errors, use default message
        }
        setErrorMessage(message)
        setStatus('error')
        return
      }

      setLastEvent(event)
      setStatus('success')
    } catch (err) {
      setStatus('error')
      const msg = err instanceof Error ? err.message : ''
      const isCorsOrNetwork =
        msg.includes('Failed to fetch') ||
        msg.includes('NetworkError') ||
        msg.includes('Load failed') ||
        msg.includes('CORS')
      if (isCorsOrNetwork) {
        setErrorMessage(
          'Request was blocked (CORS or network). The API must allow requests from this origin, or call it from a backend proxy instead of the browser.'
        )
      } else {
        setErrorMessage(msg || 'Request failed')
      }
    }
  }

  return (
    <>
      <h1>Digi Events Ingestion</h1>
      {/* <p className="subtitle">Send events as one user to test the full sequence.</p> */}
      <div className="card">
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Your API Key"
          disabled={status === 'loading'}
          autoComplete="off"
        />
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Your User (user@example.com)"
          disabled={status === 'loading'}
        />
        <h3>Event Picker</h3>
        <div className="event-buttons">
          {SEQUENCE_EVENTS.map(({ event, label }) => (
            <button
              key={event}
              onClick={() => sendEvent(event)}
              disabled={status === 'loading' || !apiKey.trim() || !email.trim()}
              title={event}
            >
              {label}
            </button>
          ))}
        </div>
        {status === 'success' && (
          <p className="success">
            Event sent: <code>{lastEvent}</code>
          </p>
        )}
        {status === 'error' && <p className="error">{errorMessage}</p>}
      </div>
    </>
  )
}

export default App
