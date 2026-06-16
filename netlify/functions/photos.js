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

function driveGet(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'www.googleapis.com', path, method: 'GET', headers: { Authorization: `Bearer ${token}` } }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve({}) } })
    })
    req.on('error', reject); req.end()
  })
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key', 'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS' }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  const adminKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key']
  if (adminKey !== ADMIN_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }
  try {
    const token = await getAccessToken()
    const folderId = process.env.DRIVE_FOLDER_ID
    if (event.httpMethod === 'DELETE') {
      const fileId = event.path.split('/').pop()
      await new Promise((resolve, reject) => {
        const req = https.request({ hostname: 'www.googleapis.com', path: `/drive/v3/files/${fileId}`, method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }, res => { res.on('data', () => {}); res.on('end', resolve) })
        req.on('error', reject); req.end()
      })
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }
    const q = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`)
    const data = await driveGet(`/drive/v3/files?q=${q}&fields=files(id,name,mimeType,createdTime,description,thumbnailLink)&orderBy=createdTime%20desc&pageSize=500`, token)
    const photos = (data.files || []).map(file => {
      let guestName = 'Ospite', uploadedAt = file.createdTime, originalName = file.name
      try { if (file.description) { const m = JSON.parse(file.description); guestName = m.guestName || guestName; uploadedAt = m.uploadedAt || uploadedAt; originalName = m.originalName || originalName } } catch {}
      return { id: file.id, name: file.name, originalName, guestName, uploadedAt, mimeType: file.mimeType, thumbnailUrl: file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s400') : null, url: file.thumbnailLink ? file.thumbnailLink.replace('=s220', '=s1600') : null }
    })
    return { statusCode: 200, headers, body: JSON.stringify({ photos }) }
  } catch (err) {
    console.error('photos error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
