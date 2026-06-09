const crypto = require('crypto')

const ADMIN_KEY = 'Chiara18!Admin'
const FOLDER_NAME = 'Chiara18'

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
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }

  const adminKey = event.headers['x-admin-key']
  if (adminKey !== ADMIN_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }

  try {
    const token = await getServiceAccountToken()

    if (event.httpMethod === 'DELETE') {
      const fileId = event.path.split('/').pop()
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` }
      })
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    // GET - list photos
    const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
    const folderRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)`,
      { headers: { Authorization: `Bearer ${token}` } })
    const folderData = await folderRes.json()
    if (!folderData.files || folderData.files.length === 0) return { statusCode: 200, headers, body: JSON.stringify({ photos: [] }) }

    const folderId = folderData.files[0].id
    const q2 = encodeURIComponent(`'${folderId}' in parents and mimeType contains 'image/' and trashed=false`)
    const filesRes = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${q2}&fields=files(id,name,mimeType,size,createdTime,description,thumbnailLink)&orderBy=createdTime%20desc&pageSize=500`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const filesData = await filesRes.json()

    const photos = (filesData.files || []).map(file => {
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
    console.error('photos error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
