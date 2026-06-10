// Vercel serverless function: proxies Google OAuth 2.0 token exchange + refresh
// for the Google Health API integration.
//
// Why this exists: the browser shouldn't hold the OAuth client secret, and this
// keeps the exchange server-side. It injects GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET
// from the environment and forwards the rest of the form (code/code_verifier/
// refresh_token/grant_type) to Google. No tokens are stored here.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method_not_allowed' })
    return
  }

  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    res.status(500).json({
      error: 'server_misconfigured',
      error_description: 'GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in the environment.',
    })
    return
  }

  const incoming = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {}

  const form = new URLSearchParams()
  for (const [k, v] of Object.entries(incoming)) {
    if (v != null) form.set(k, String(v))
  }
  form.set('client_id', clientId)
  form.set('client_secret', clientSecret)

  try {
    const gRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: form,
    })
    const text = await gRes.text()
    res.status(gRes.status)
    res.setHeader('Content-Type', 'application/json')
    res.send(text)
  } catch (e) {
    res.status(502).json({ error: 'upstream_error', error_description: String(e) })
  }
}
