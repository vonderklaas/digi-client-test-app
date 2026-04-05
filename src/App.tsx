import { useState } from 'react'
import './App.css'

const API_URL =
  import.meta.env.VITE_EVENTS_API_URL ?? 'https://app.digistorms.ai/api/digistorms/events'

const SEQUENCE_EVENTS: { event: string; label: string }[] = [
  { event: 'user.signed_up', label: 'user.signed_up' },
  { event: 'milestone.1_achieved', label: 'milestone.1_achieved' },
  { event: 'milestone.2_achieved', label: 'milestone.2_achieved' },
  { event: 'user.upgraded', label: 'user.upgraded (stop emails)' },
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
  const [lastResponse, setLastResponse] = useState<unknown>(null)

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
    setLastResponse(null)
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
    setLastResponse(null)

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

      const text = await response.text()
      let parsed: unknown = null
      try {
        parsed = text ? JSON.parse(text) : null
      } catch {
        parsed = text
      }

      if (!response.ok) {
        let message = `Request failed (${response.status})`
        if (parsed && typeof parsed === 'object' && parsed !== null) {
          const o = parsed as Record<string, unknown>
          if (typeof o.message === 'string') message = o.message
          else if (typeof o.error === 'string') message = o.error
        } else if (typeof parsed === 'string' && parsed) message = parsed
        setErrorMessage(message)
        setStatus('error')
        setLastResponse(parsed)
        console.error('[DigiStorms SDK]', response.status, parsed)
        return
      }

      setLastEvent(event)
      setLastSentBody(payload)
      setLastResponse(parsed ?? { ok: response.ok })
      setStatus('success')
      console.log('[DigiStorms SDK] success', { event, response: parsed })
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
      setLastResponse(null)
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
      <h1 className="app-title">DigiStorms Client SDK</h1>
      <p className="api-url-hint">
        POST target: <code>{API_URL}</code>
        {' · '}
        Override with <code>VITE_EVENTS_API_URL</code> in <code>.env</code>
      </p>
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
        <h2 className="json-split-heading">Request · Response</h2>
        <div className="json-split">
          <div className="json-panel">
            <h3 className="json-panel-title">Request body</h3>
            <p className="json-hint">
              {lastSentBody
                ? 'Last sent JSON:'
                : 'Preview (event is null until you send):'}
            </p>
            <pre className="json-preview" tabIndex={0}>
              {JSON.stringify(previewPayload, null, 2)}
            </pre>
          </div>
          <div className="json-panel">
            <h3 className="json-panel-title">API response</h3>
            <p className="json-hint">
              {lastResponse !== null
                ? 'Parsed JSON or text from the last request:'
                : 'No response yet.'}
            </p>
            <pre className="json-preview json-preview--response" tabIndex={0}>
              {lastResponse !== null
                ? typeof lastResponse === 'string'
                  ? lastResponse
                  : JSON.stringify(lastResponse, null, 2)
                : '—'}
            </pre>
          </div>
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
