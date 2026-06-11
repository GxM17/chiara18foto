const crypto = require('crypto')
const Busboy = require('busboy')
const { Readable } = require('stream')

const FOLDER_NAME = 'Chiara18'

// ── Service Account JWT (same pattern as photos.js / download.js) ──────────
function getPrivateKey() {
  const b64 = process.env.SERVICE_ACCOUNT_PRIVATE_KEY_B64
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8')
  return (process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
}

async function getServiceAccountToken() {
  const email = process.env.SERVICE_ACCOUNT_EMAIL
  const privateKey = getPrivateKey()
  if (!email || !privateKey || !privateKey.includes('BEGIN PRIVATE KEY'))
    throw new Error('Service account non configurato (SERVICE_ACCOUNT_EMAIL / SERVICE_ACCOUNT_PRIVATE_KEY)')

  const now = Math.floor(Date.now() / 1000)
  const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now, exp: now + 3600
  })).toString('base64url')
  const signingInput = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const jwt = `${signingInput}.${sign.sign(privateKey, 'base64url')}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data))
  return data.access_token
}

// ── Find or create the Chiara18 folder owned by the service account ─────────
async function getOrCreateFolder(token) {
  // Search only in the service account's own Drive (not shared drives)
  const q = encodeURIComponent(
    `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
  )
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id)&spaces=drive`,
    { headers: { Authorization: `Bearer ${token}` } }
  )
  const data = await res.json()
  if (data.files && data.files.length > 0) return data.files[0].id

  // Create it
  const create = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' })
    }
  )
  const folder = await create.json()
  if (!folder.id) throw new Error('Impossibile creare la cartella Drive')
  return folder.id
}

// ── Multipart form parser ───────────────────────────────────────────────────
function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type']
    if (!contentType?.includes('multipart/form-data'))
      return reject(new Error('Content-Type must be multipart/form-data'))

    const busboy = Busboy({ headers: { 'content-type': contentType } })
    const fields = {}
    let fileBuffer = null, fileInfo = null

    busboy.on('field', (name, value) => { fields[name] = value })
    busboy.on('file', (_fieldname, file, info) => {
      fileInfo = { filename: info.filename, mimeType: info.mimeType }
      const chunks = []
      file.on('data', c => chunks.push(c))
      file.on('end', () => { fileBuffer = Buffer.concat(chunks) })
    })
    busboy.on('finish', () => resolve({ fields, fileBuffer, fileInfo }))
    busboy.on('error', reject)

    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '')
    const readable = new Readable()
    readable.push(body)
    readable.push(null)
    readable.pipe(busboy)
  })
}

// ── Handler ─────────────────────────────────────────────────────────────────
exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST')
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const { fields, fileBuffer, fileInfo } = await parseMultipart(event)

    if (!fileBuffer || !fileInfo)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nessun file ricevuto' }) }

    if (fileBuffer.length > 20 * 1024 * 1024)
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'File troppo grande (max 20MB)' }) }

    const guestName = (fields.guestName || 'Ospite').trim()
    const originalFileName = fields.fileName || fileInfo.filename || 'foto.jpg'
    const mimeType = fileInfo.mimeType || 'image/jpeg'

    // Get token + folder
    const token = await getServiceAccountToken()
    const folderId = await getOrCreateFolder(token)

    // Build filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safeGuest = guestName.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '').trim().replace(/\s+/g, '_') || 'Ospite'
    const ext = originalFileName.includes('.') ? originalFileName.split('.').pop() : 'jpg'
    const finalName = `${safeGuest}_${timestamp}.${ext}`

    // Upload via multipart to Drive
    const metadata = {
      name: finalName,
      parents: [folderId],
      description: JSON.stringify({
        guestName,
        uploadedAt: new Date().toISOString(),
        originalName: originalFileName
      })
    }

    // Build multipart body manually (Drive upload API)
    const boundary = '-------314159265358979323846'
    const delimiter = `\r\n--${boundary}\r\n`
    const closeDelimiter = `\r\n--${boundary}--`

    const metaPart = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata)
    const filePart = `\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`

    const metaBuf = Buffer.from(metaPart)
    const filePartBuf = Buffer.from(filePart)
    const closeBuf = Buffer.from(closeDelimiter)
    const body = Buffer.concat([metaBuf, filePartBuf, fileBuffer, closeBuf])

    const uploadRes = await fetch(
      'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': `multipart/related; boundary="${boundary}"`,
          'Content-Length': body.length
        },
        body
      }
    )
    const result = await uploadRes.json()
    if (!uploadRes.ok) throw new Error(result.error?.message || `Errore upload (${uploadRes.status})`)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, fileName: finalName, fileId: result.id })
    }
  } catch (err) {
    console.error('Upload error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Errore interno del server' }) }
  }
}
