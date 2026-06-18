const https = require('https')

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }

  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || ''
  const folderId = process.env.DRIVE_FOLDER_ID || ''

  // Debug: check if vars exist (return first/last chars, not full values)
  const debug = {
    clientId_ok: !!clientId,
    clientId_preview: clientId ? clientId.slice(0,20) + '...' : 'MISSING',
    clientSecret_ok: !!clientSecret,
    clientSecret_len: clientSecret.length,
    refreshToken_ok: !!refreshToken,
    refreshToken_len: refreshToken.length,
    refreshToken_start: refreshToken ? refreshToken.slice(0,8) : 'MISSING',
    folderId_ok: !!folderId,
  }

  if (!clientId || !clientSecret || !refreshToken) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Variabili mancanti', debug }) }
  }

  const body = `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}&grant_type=refresh_token`

  try {
    const result = await new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
      }, res => {
        let d = ''
        res.on('data', c => d += c)
        res.on('end', () => resolve({ status: res.statusCode, body: d }))
      })
      req.on('error', reject)
      req.write(body); req.end()
    })

    console.error('Google response status:', result.status, 'body:', result.body)

    if (result.status !== 200) {
      // Return full Google error to browser for diagnosis
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'Google error', google_status: result.status, google_response: result.body, debug }) }
    }

    const data = JSON.parse(result.body)
    if (!data.access_token) {
      return { statusCode: 500, headers, body: JSON.stringify({ error: 'No access_token', google_response: result.body, debug }) }
    }
    return { statusCode: 200, headers, body: JSON.stringify({ access_token: data.access_token, folder_id: folderId, expires_in: 3600 }) }
  } catch (err) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message, debug }) }
  }
}
