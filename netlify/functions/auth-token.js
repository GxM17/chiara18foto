const { google } = require('googleapis')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }
  }

  try {
    const { code, redirectUri } = JSON.parse(event.body || '{}')

    if (!code) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Codice mancante' }) }
    }

    const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, redirectUri)
    const { tokens } = await oauth2Client.getToken(code)

    // IMPORTANT: Store refresh token in env for future guest uploads
    // In production, you'd save this to a database or Netlify env
    // For now we return it so admin can save it
    console.log('Refresh token obtained:', tokens.refresh_token ? 'YES' : 'NO')

    // If we got a refresh token, save it (this requires Netlify API - done via admin panel)
    if (tokens.refresh_token) {
      await saveRefreshToken(tokens.refresh_token)
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        access_token: tokens.access_token,
        expires_in: tokens.expiry_date
          ? Math.floor((tokens.expiry_date - Date.now()) / 1000)
          : 3600,
        refresh_token: tokens.refresh_token
      })
    }
  } catch (err) {
    console.error('Token exchange error:', err)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message || 'Errore scambio token' })
    }
  }
}

async function saveRefreshToken(refreshToken) {
  // Update Netlify environment variable via API
  const siteId = process.env.NETLIFY_SITE_ID
  const netlifyToken = process.env.NETLIFY_TOKEN

  if (!siteId || !netlifyToken) {
    console.log('Netlify API credentials not set, cannot save refresh token automatically')
    return
  }

  try {
    await fetch(`https://api.netlify.com/api/v1/sites/${siteId}/env`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${netlifyToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        key: 'GOOGLE_REFRESH_TOKEN',
        values: [{ context: 'all', value: refreshToken }]
      })
    })
    console.log('Refresh token saved to Netlify env')
  } catch (err) {
    console.error('Failed to save refresh token:', err)
  }
}
