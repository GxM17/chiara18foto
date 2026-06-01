const { google } = require('googleapis')
const JSZip = require('jszip')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

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

  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }
  }

  const accessToken = authHeader.replace('Bearer ', '')

  try {
    const { fileIds } = JSON.parse(event.body || '{}')

    if (!Array.isArray(fileIds) || fileIds.length === 0) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Lista file mancante' }) }
    }

    // Limit to 100 files per request
    const ids = fileIds.slice(0, 100)

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
    oauth2Client.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    const zip = new JSZip()
    const nameCount = {}

    for (const fileId of ids) {
      try {
        // Get metadata
        const meta = await drive.files.get({
          fileId,
          fields: 'name, mimeType'
        })

        // Download file
        const res = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        )

        let fileName = meta.data.name || `foto_${fileId}.jpg`

        // Handle duplicate names
        if (nameCount[fileName]) {
          const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''
          const base = ext ? fileName.slice(0, -ext.length) : fileName
          nameCount[fileName]++
          fileName = `${base}_${nameCount[fileName]}${ext}`
        } else {
          nameCount[fileName] = 1
        }

        zip.file(fileName, Buffer.from(res.data))
      } catch (err) {
        console.error(`Error downloading file ${fileId}:`, err.message)
        // Continue with other files
      }
    }

    const zipBuffer = await zip.generateAsync({
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    })

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="foto_chiara18.zip"`,
        'Content-Length': zipBuffer.length
      },
      body: zipBuffer.toString('base64'),
      isBase64Encoded: true
    }

  } catch (err) {
    console.error('ZIP error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Errore creazione ZIP' })
    }
  }
}
