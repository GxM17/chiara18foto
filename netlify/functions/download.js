const { google } = require('googleapis')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  const authHeader = event.headers['authorization'] || event.headers['Authorization']
  if (!authHeader?.startsWith('Bearer ')) {
    return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }
  }

  const accessToken = authHeader.replace('Bearer ', '')
  const fileId = event.path.split('/').pop()

  if (!fileId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'ID file mancante' }) }
  }

  try {
    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET)
    oauth2Client.setCredentials({ access_token: accessToken })
    const drive = google.drive({ version: 'v3', auth: oauth2Client })

    // Get file metadata
    const meta = await drive.files.get({
      fileId,
      fields: 'name, mimeType'
    })

    // Download file content
    const res = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    )

    const buffer = Buffer.from(res.data)

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': meta.data.mimeType || 'image/jpeg',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(meta.data.name)}"`,
        'Content-Length': buffer.length
      },
      body: buffer.toString('base64'),
      isBase64Encoded: true
    }

  } catch (err) {
    console.error('Download error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    }
  }
}
