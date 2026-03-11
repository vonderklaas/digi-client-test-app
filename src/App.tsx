import { useState } from 'react'
import './App.css'

const API_URL = '/api/digistorms/events' // same origin → proxied by Vite, no CORS

const SEQUENCE_EVENTS: { event: string; label: string }[] = [
  { event: 'user.signed_up', label: 'User Signed Up' },
  { event: 'milestone.1_achieved', label: 'Milestone #1 Success' },
  { event: 'nudge.1', label: 'Nudge #1' },
  { event: 'milestone.2_achieved', label: 'Milestone #2 Success' },
  { event: 'nudge.2', label: 'Nudge #2' },
  { event: 'trial.ending_24h', label: 'Trial Ending (24h Left)' },
  { event: 'trial.ended', label: 'Trial Ended' },
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

    // add to cart()
    // sned email to suer

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
      <h1>DigiStorms Events Ingestion</h1>
      <p className="subtitle">Send events as one user to test the full sequence.</p>
      <div className="card">
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Workspace API key"
          disabled={status === 'loading'}
          autoComplete="off"
        />
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@example.com"
          disabled={status === 'loading'}
        />
        <div className="event-buttons">
          {SEQUENCE_EVENTS.map(({ event, label }) => (
            <button
              key={event}
              onClick={() => sendEvent(event)}
              disabled={status === 'loading'}
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
