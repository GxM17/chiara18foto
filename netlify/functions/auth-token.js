const { google } = require('googleapis')
const { getStore } = require('@netlify/blobs')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  try {
    const { code, redirectUri } = JSON.parse(event.body || '{}')
    if (!code) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Codice mancante' }) }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    // Save refresh token permanently in Netlify Blobs
    if (tokens.refresh_token) {
      try {
        const store = getStore('chiara18-auth')
        await store.set('google_refresh_token', tokens.refresh_token)
        console.log('Refresh token saved to Netlify Blobs')
      } catch (blobErr) {
        console.error('Failed to save refresh token to blobs:', blobErr.message)
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: tokens.access_token,
        expires_in: tokens.expiry_date
          ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
          : 3600
      })
    }
  } catch (err) {
    console.error('Token exchange error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message || 'Errore scambio token' }) }
  }
}
