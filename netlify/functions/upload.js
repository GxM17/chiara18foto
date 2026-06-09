const { google } = require('googleapis')
const { getStore } = require('@netlify/blobs')
const Busboy = require('busboy')
const { Readable } = require('stream')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const FOLDER_NAME = 'Chiara18'

async function getAccessToken() {
  // Get refresh token from Netlify Blobs
  const store = getStore('chiara18-auth')
  const refreshToken = await store.get('google_refresh_token')
  if (!refreshToken) throw new Error('Admin non ancora configurato. Connettiti prima dalla dashboard.')

  const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
  oauth2Client.setCredentials({ refresh_token: refreshToken })
  const { credentials } = await oauth2Client.refreshAccessToken()
  return credentials.access_token
}

async function getOrCreateFolder(drive) {
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id)',
    spaces: 'drive'
  })
  if (res.data.files && res.data.files.length > 0) return res.data.files[0].id

  const folder = await drive.files.create({
    requestBody: { name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder' },
    fields: 'id'
  })
  return folder.data.id
}

function parseMultipart(event) {
  return new Promise((resolve, reject) => {
    const contentType = event.headers['content-type'] || event.headers['Content-Type']
    if (!contentType || !contentType.includes('multipart/form-data')) {
      return reject(new Error('Content-Type must be multipart/form-data'))
    }

    const busboy = Busboy({ headers: { 'content-type': contentType } })
    const fields = {}
    let fileBuffer = null
    let fileInfo = null

    busboy.on('field', (name, value) => { fields[name] = value })
    busboy.on('file', (fieldname, file, info) => {
      fileInfo = { filename: info.filename, mimeType: info.mimeType }
      const chunks = []
      file.on('data', chunk => chunks.push(chunk))
      file.on('end', () => { fileBuffer = Buffer.concat(chunks) })
    })
    busboy.on('finish', () => resolve({ fields, fileBuffer, fileInfo }))
    busboy.on('error', reject)

    const body = event.isBase64Encoded ? Buffer.from(event.body, 'base64') : Buffer.from(event.body || '')
    const readable = new Readable()
    readable.push(body)
    readable.push(null)
    readable.pipe(busboy)
  })
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const { fields, fileBuffer, fileInfo } = await parseMultipart(event)

    if (!fileBuffer || !fileInfo) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nessun file ricevuto' }) }

    const guestName = fields.guestName || 'Ospite'
    const originalFileName = fields.fileName || fileInfo.filename || 'foto.jpg'

    if (fileBuffer.length > 20 * 1024 * 1024) return { statusCode: 400, headers, body: JSON.stringify({ error: 'File troppo grande (max 20MB)' }) }

    // Get fresh access token using saved refresh token
    const accessToken = await getAccessToken()

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
    oauth2Client.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    const folderId = await getOrCreateFolder(drive)

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safeGuest = guestName.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '').trim().replace(/\s+/g, '_')
    const safeName = originalFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const finalName = `${safeGuest}_${timestamp}_${safeName}`

    const fileStream = new Readable()
    fileStream.push(fileBuffer)
    fileStream.push(null)

    await drive.files.create({
      requestBody: {
        name: finalName,
        parents: [folderId],
        description: JSON.stringify({ guestName, uploadedAt: new Date().toISOString(), originalName: originalFileName })
      },
      media: { mimeType: fileInfo.mimeType, body: fileStream },
      fields: 'id,name'
    })

    return { statusCode: 200, headers, body: JSON.stringify({ success: true, fileName: finalName }) }
  } catch (err) {
    console.error('Upload error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Errore interno del server' }) }
  }
}
