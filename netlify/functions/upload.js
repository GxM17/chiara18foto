const { google } = require('googleapis')
const Busboy = require('busboy')
const { Readable } = require('stream')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const FOLDER_NAME = 'Chiara18'

// Helper: get or create folder
async function getOrCreateFolder(drive) {
  // Search for existing folder
  const res = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: 'files(id, name)',
    spaces: 'drive'
  })

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id
  }

  // Create folder
  const folder = await drive.files.create({
    requestBody: {
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    },
    fields: 'id'
  })

  return folder.data.id
}

// Parse multipart form data
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

    busboy.on('field', (name, value) => {
      fields[name] = value
    })

    busboy.on('file', (fieldname, file, info) => {
      const { filename, mimeType } = info
      fileInfo = { filename, mimeType }
      const chunks = []
      file.on('data', chunk => chunks.push(chunk))
      file.on('end', () => { fileBuffer = Buffer.concat(chunks) })
    })

    busboy.on('finish', () => resolve({ fields, fileBuffer, fileInfo }))
    busboy.on('error', reject)

    // Feed the body to busboy
    const body = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '')

    const readable = new Readable()
    readable.push(body)
    readable.push(null)
    readable.pipe(busboy)
  })
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { fields, fileBuffer, fileInfo } = await parseMultipart(event)

    if (!fileBuffer || !fileInfo) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Nessun file ricevuto' }) }
    }

    const guestName = fields.guestName || 'Ospite'
    const originalFileName = fields.fileName || fileInfo.filename || 'foto.jpg'

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
    if (!allowedTypes.includes(fileInfo.mimeType) && !fileInfo.mimeType.startsWith('image/')) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Tipo file non supportato' }) }
    }

    // Max 20MB
    if (fileBuffer.length > 20 * 1024 * 1024) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'File troppo grande (max 20MB)' }) }
    }

    // Get stored token from the upload request
    // Since we're accepting guest uploads without auth, we use a service approach
    // The token is stored in env as GOOGLE_ACCESS_TOKEN (refreshed via admin connection)
    const accessToken = process.env.GOOGLE_REFRESH_TOKEN
      ? await refreshAccessToken()
      : null

    if (!accessToken) {
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({ error: 'Google Drive non ancora configurato. L\'admin deve prima connettersi.' })
      }
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
    oauth2Client.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // Get/create folder
    const folderId = await getOrCreateFolder(drive)

    // Build filename: guestName_timestamp_originalName
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const safeGuest = guestName.replace(/[^a-zA-Z0-9\u00C0-\u024F\s]/g, '').trim().replace(/\s+/g, '_')
    const safeName = originalFileName.replace(/[^a-zA-Z0-9.\-_]/g, '_')
    const finalName = `${safeGuest}_${timestamp}_${safeName}`

    // Upload to Drive
    const { Readable: ReadableStream } = require('stream')
    const fileStream = new ReadableStream()
    fileStream.push(fileBuffer)
    fileStream.push(null)

    const uploadRes = await drive.files.create({
      requestBody: {
        name: finalName,
        parents: [folderId],
        description: JSON.stringify({
          guestName,
          uploadedAt: new Date().toISOString(),
          originalName: originalFileName
        })
      },
      media: {
        mimeType: fileInfo.mimeType,
        body: fileStream
      },
      fields: 'id, name, webViewLink'
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        fileId: uploadRes.data.id,
        fileName: finalName
      })
    }

  } catch (err) {
    console.error('Upload error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Errore interno del server' })
    }
  }
}

async function refreshAccessToken() {
  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
    oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN })
    const { credentials } = await oauth2Client.refreshAccessToken()
    return credentials.access_token
  } catch {
    return null
  }
}
