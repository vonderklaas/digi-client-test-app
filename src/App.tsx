import { useState } from 'react'
import './App.css'

const API_URL = 'https://app.digistorms.ai/api/digistorms/events'

const SEQUENCE_EVENTS: { event: string; label: string }[] = [
  { event: 'user.signed_up', label: 'user.signed_up' },
  { event: 'milestone.1_achieved', label: 'milestone.1_achieved' },
  { event: 'milestone.2_achieved', label: 'milestone.2_achieved' },
]

function newUserId() {
  return `usr_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
}

function App() {
  const [apiKey, setApiKey] = useState('')
  const [email, setEmail] = useState('')
  const [userId, setUserId] = useState(() => newUserId())
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [lastEvent, setLastEvent] = useState<string | null>(null)
  const [lastSentBody, setLastSentBody] = useState<object | null>(null)

  function buildPayload(event: string) {
    return {
      event,
      userId,
      email: email.trim(),
      properties: {},
    }
  }

  function regenerateUserId() {
    setUserId(newUserId())
    setLastEvent(null)
    setLastSentBody(null)
    setStatus('idle')
    setErrorMessage('')
  }

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

    const payload = buildPayload(event)

    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey.trim()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
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
      setLastSentBody(payload)
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

  const previewPayload = lastSentBody ?? {
    event: null,
    userId,
    email: email.trim(),
    properties: {},
  }

  return (
    <>
      <h1>DigiStorms Client SDK</h1>
      <div className="card">
        <input
          type="text"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="DigiStorms API Key"
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
        <button
          type="button"
          className="btn-regenerate"
          onClick={regenerateUserId}
          disabled={status === 'loading'}
          title="Generate a new anonymous user id (same as a new visitor)"
        >
          Regenerate ID (new user)
        </button>
        <h2>Event Picker</h2>
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
        <h2>Request body</h2>
        <p className="json-hint">
          {lastSentBody
            ? 'JSON sent with the last successful request:'
            : 'Preview: the event field is null until you send an event from the picker above.'}
        </p>
        <pre className="json-preview" tabIndex={0}>
          {JSON.stringify(previewPayload, null, 2)}
        </pre>
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
