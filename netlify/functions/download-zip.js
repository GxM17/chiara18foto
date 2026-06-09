const crypto = require('crypto')
const JSZip = require('jszip')

const ADMIN_KEY = 'Chiara18!Admin'

async function getServiceAccountToken() {
  const email = process.env.SERVICE_ACCOUNT_EMAIL
  const privateKey = (process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
  if (!email || !privateKey) throw new Error('Service account non configurato')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    iss: email, scope: 'https://www.googleapis.com/auth/drive',
    aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600
  })).toString('base64url')
  const signingInput = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256')
  sign.update(signingInput)
  const jwt = `${signingInput}.${sign.sign(privateKey, 'base64url')}`
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: jwt })
  })
  const data = await res.json()
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data))
  return data.access_token
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const adminKey = event.headers['x-admin-key']
  if (adminKey !== ADMIN_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }

  try {
    const { fileIds } = JSON.parse(event.body || '{}')
    if (!Array.isArray(fileIds) || fileIds.length === 0) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Lista file mancante' }) }

    const token = await getServiceAccountToken()
    const zip = new JSZip()
    const nameCount = {}

    for (const fileId of fileIds.slice(0, 100)) {
      try {
        const metaRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=name,mimeType`,
          { headers: { Authorization: `Bearer ${token}` } })
        const meta = await metaRes.json()
        const fileRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
          { headers: { Authorization: `Bearer ${token}` } })
        const arrayBuffer = await fileRes.arrayBuffer()

        let fileName = meta.name || `foto_${fileId}.jpg`
        if (nameCount[fileName]) { const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''; const base = ext ? fileName.slice(0, -ext.length) : fileName; nameCount[fileName]++; fileName = `${base}_${nameCount[fileName]}${ext}` } else { nameCount[fileName] = 1 }
        zip.file(fileName, Buffer.from(arrayBuffer))
      } catch (err) { console.error(`Error with file ${fileId}:`, err.message) }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/zip', 'Content-Disposition': 'attachment; filename="foto_chiara18.zip"', 'Content-Length': zipBuffer.length },
      body: zipBuffer.toString('base64'),
      isBase64Encoded: true
    }
  } catch (err) {
    console.error('zip error:', err)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
