const { google } = require('googleapis')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const FOLDER_NAME = 'Chiara18'

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, DELETE, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Token mancante' }) }
  }

  const accessToken = authHeader.replace('Bearer ', '')

  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
    oauth2Client.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    if (event.httpMethod === 'DELETE') {
      // Delete a file: path is /api/photos/{fileId}
      const fileId = event.path.split('/').pop()
      if (!fileId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID file mancante' }) }
      }
      await drive.files.delete({ fileId })
      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) }
    }

    // GET: List photos in Chiara18 folder
    // Find folder
    const folderRes = await drive.files.list({
      q: `name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`,
      fields: 'files(id)',
      spaces: 'drive'
    })

    if (!folderRes.data.files || folderRes.data.files.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify({ photos: [] }) }
    }

    const folderId = folderRes.data.files[0].id

    // List all images in folder
    const filesRes = await drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed=false`,
      fields: 'files(id, name, mimeType, size, createdTime, description, thumbnailLink, webContentLink)',
      orderBy: 'createdTime desc',
      pageSize: 500
    })

    const photos = (filesRes.data.files || []).map(file => {
      let guestName = 'Ospite'
      let uploadedAt = file.createdTime
      let originalName = file.name

      try {
        if (file.description) {
          const meta = JSON.parse(file.description)
          guestName = meta.guestName || guestName
          uploadedAt = meta.uploadedAt || uploadedAt
          originalName = meta.originalName || originalName
        }
      } catch {}

      // Extract guest name from filename if no description
      if (guestName === 'Ospite' && file.name) {
        const parts = file.name.split('_')
        if (parts.length > 2) {
          guestName = parts[0].replace(/_/g, ' ')
        }
      }

      return {
        id: file.id,
        name: file.name,
        originalName,
        guestName,
        uploadedAt,
        size: file.size,
        mimeType: file.mimeType,
        thumbnailUrl: file.thumbnailLink
          ? file.thumbnailLink.replace('=s220', '=s400')
          : null,
        url: file.thumbnailLink
          ? file.thumbnailLink.replace('=s220', '=s1600')
          : `https://drive.google.com/uc?id=${file.id}&export=view`,
        downloadUrl: file.webContentLink || `https://drive.google.com/uc?id=${file.id}&export=download`
      }
    })

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ photos })
    }

  } catch (err) {
    console.error('Photos error:', err)
    const status = err.code === 401 ? 401 : 500
    return {
      statusCode: status,
      headers,
      body: JSON.stringify({ error: err.message || 'Errore interno' })
    }
  }
}
