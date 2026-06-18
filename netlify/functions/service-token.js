const https = require('https')

async function getAccessToken() {
  const clientId = process.env.GOOGLE_CLIENT_ID || ''
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || ''
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN || ''

  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(`Variabili mancanti: clientId=${!!clientId} clientSecret=${!!clientSecret} refreshToken=${!!refreshToken}`)
  }

  const body = `client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(clientSecret)}&refresh_token=${encodeURIComponent(refreshToken)}&grant_type=refresh_token`

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'oauth2.googleapis.com',
      path: '/token',
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => {
        // DEBUG: include diagnostic info in the error
        if (res.statusCode !== 200) {
          reject(new Error(`DEBUG status=${res.statusCode} body=${d} | clientId_len=${clientId.length} clientId_start=${clientId.slice(0,10)} clientSecret_len=${clientSecret.length} refreshToken_len=${refreshToken.length} refreshToken_start=${refreshToken.slice(0,10)} refreshToken_end=${refreshToken.slice(-10)}`))
          return
        }
        try {
          const data = JSON.parse(d)
          if (!data.access_token) reject(new Error('No access_token in response: ' + d))
          else resolve(data.access_token)
        } catch (e) {
          reject(new Error('JSON parse failed: ' + d))
        }
      })
    })
    req.on('error', err => reject(new Error('Request error: ' + err.message)))
    req.write(body)
    req.end()
  })
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS' }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  try {
    const token = await getAccessToken()
    const folderId = process.env.DRIVE_FOLDER_ID
    if (!folderId) throw new Error('DRIVE_FOLDER_ID non configurato')
    return { statusCode: 200, headers, body: JSON.stringify({ access_token: token, folder_id: folderId, expires_in: 3600 }) }
  } catch (err) {
    console.error('service-token error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
