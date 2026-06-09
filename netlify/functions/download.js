const crypto = require('crypto')

const ADMIN_KEY = 'Chiara18!Admin'

async function getServiceAccountToken() {
  const email = process.env.SERVICE_ACCOUNT_EMAIL
  const privateKey = (process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Service account non configurato')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  })).toString('base64url')
  const signingInput = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const jwt = `${signingInput}.${sign.sign(privateKey, 'base64url')}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data))
  return data.access_token
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }

  const adminKey = event.headers['x-admin-key']
  if (adminKey !== ADMIN_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }

  const fileId = event.path.split('/').pop()
  if (!fileId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID mancante' }) }

  try {
    const token = await getServiceAccountToken()

    const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
      { headers: { Authorization: `Bearer ${token}` } })
    const meta = await metaRes.json()

    const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      { headers: { Authorization: `Bearer ${token}` } })
    const arrayBuffer = await fileRes.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': meta.mimeType || 'image/jpeg',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(meta.name)}"`,
        'Content-Length': buffer.length
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    }
  } catch (err) {
    console.error('download error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
