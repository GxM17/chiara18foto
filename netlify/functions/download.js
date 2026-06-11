const crypto = require('crypto')
const https = require('https')

const ADMIN_KEY = 'Chiara18!Admin'

function getPrivateKey() {
  const b64 = process.env.SERVICE_ACCOUNT_PRIVATE_KEY_B64
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8')
  return (process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
}

function httpsGet(path, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'www.googleapis.com', path, method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    const req = https.request(opts, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buffer: Buffer.concat(chunks) }))
    })
    req.on('error', reject); req.end()
  })
}

async function getServiceAccountToken() {
  const email = process.env.SERVICE_ACCOUNT_EMAIL
  const privateKey = getPrivateKey()
  if (!email || !privateKey.includes('BEGIN PRIVATE KEY')) throw new Error('Service account non configurato')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })).toString('base64url')
  const si = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256'); sign.update(si)
  const jwt = `${si}.${sign.sign(privateKey, 'base64url')}`
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { const data = JSON.parse(d); if (!data.access_token) reject(new Error(data.error_description || 'Token error')); else resolve(data.access_token) })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }

  const adminKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key']
  if (adminKey !== ADMIN_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }

  const fileId = event.path.split('/').pop()
  if (!fileId) return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID mancante' }) }

  try {
    const token = await getServiceAccountToken()

    // Get metadata
    const metaRes = await httpsGet(`/drive/v3/files/${fileId}?fields=name,mimeType&supportsAllDrives=true`, token)
    const meta = JSON.parse(metaRes.buffer.toString())

    // Download file
    const fileRes = await httpsGet(`/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, token)

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': meta.mimeType || 'image/jpeg', 'Content-Disposition': `attachment; filename="${encodeURIComponent(meta.name)}"`, 'Content-Length': fileRes.buffer.length },
      body: fileRes.buffer.toString('base64'),
      isBase64Encoded: true
    }
  } catch (err) {
    console.error('download error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
