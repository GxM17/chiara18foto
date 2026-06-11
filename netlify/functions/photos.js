const crypto = require('crypto')
const https = require('https')

const ADMIN_KEY = 'Chiara18!Admin'

function getPrivateKey() {
  const b64 = process.env.SERVICE_ACCOUNT_PRIVATE_KEY_B64
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8')
  return (process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
}

function httpsReq(opts, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { try { resolve({ status: res.statusCode, data: JSON.parse(d) }) } catch { resolve({ status: res.statusCode, data: d }) } })
    })
    req.on('error', reject)
    if (body) req.write(body)
    req.end()
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
  const res = await httpsReq({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } }, body)
  if (!res.data.access_token) throw new Error(res.data.error_description || res.data.error || 'Token error')
  return res.data.access_token
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key', 'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS' }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }

  const adminKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key']
  if (adminKey !== ADMIN_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }

  try {
    const token = await getServiceAccountToken()
    const folderId = process.env.DRIVE_FOLDER_ID

    if (event.httpMethod === 'DELETE') {
      const fileId = event.path.split('/').pop()
      await httpsReq({ hostname: 'www.googleapis.com', path: `/drive/v3/files/${fileId}?supportsAllDrives=true`, method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    // GET photos
    if (!folderId) return { statusCode: 200, headers, body: JSON.stringify({ photos: [] }) }

    const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`)
    const res = await httpsReq({
      hostname: 'www.googleapis.com',
      path: `/drive/v3/files?q=${q}&fields=files(id,name,mimeType,size,createdTime,description,thumbnailLink)&orderBy=createdTime%20desc&pageSize=500&supportsAllDrives=true&includeItemsFromAllDrives=true`,
      method: 'GET', headers: { Authorization: `Bearer ${token}` }
    })

    const photos = (res.data.files || []).map(file => {
      let guestName = 'Ospite', uploadedAt = file.createdTime, originalName = file.name
      try { if (file.description) { const m = JSON.parse(file.description); guestName = m.guestName || guestName; uploadedAt = m.uploadedAt || uploadedAt; originalName = m.originalName || originalName } } catch {}
      return {
        id: file.id, name: file.name, originalName, guestName, uploadedAt, mimeType: file.mimeType,
        thumbnailUrl: file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s400') : null,
        url: file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s1600') : null
      }
    })
    return { statusCode: 200, headers, body: JSON.stringify({ photos }) }
  } catch (err) {
    console.error('photos error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
