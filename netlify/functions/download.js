const https = require('https')
const ADMIN_KEY = 'Chiara18!Admin'

async function getAccessToken() {
  const body = `client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(process.env.GOOGLE_CLIENT_SECRET)}&refresh_token=${encodeURIComponent(process.env.GOOGLE_REFRESH_TOKEN)}&grant_type=refresh_token`
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { const data = JSON.parse(d); if (!data.access_token) reject(new Error(data.error_description || 'Token error')); else resolve(data.access_token) })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'www.googleapis.com', path, method: 'GET', headers: { Authorization: `Bearer ${token}` } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve({ buffer: Buffer.concat(chunks), status: res.statusCode }))
    })
    req.on('error', reject); req.end()
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
    const token = await getAccessToken()
    const metaRes = await get(`/drive/v3/files/${fileId}?fields=name,mimeType`, token)
    const meta = JSON.parse(metaRes.buffer.toString())
    const fileRes = await get(`/drive/v3/files/${fileId}?alt=media`, token)
    return { statusCode: 200, headers: { ...headers, 'Content-Type': meta.mimeType || 'image/jpeg', 'Content-Disposition': `attachment; filename="${encodeURIComponent(meta.name)}"`, 'Content-Length': fileRes.buffer.length }, body: fileRes.buffer.toString('base64'), isBase64Encoded: true }
  } catch (err) {
    console.error('download error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
