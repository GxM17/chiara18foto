const crypto = require('crypto')
const https = require('https')

const FOLDER_NAME = 'Chiara18'

function getPrivateKey() {
  const b64 = process.env.SERVICE_ACCOUNT_PRIVATE_KEY_B64
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8')
  let key = process.env.SERVICE_ACCOUNT_PRIVATE_KEY || ''
  return key.replace(/\\n/g, '\n')
}

function httpsPost(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname, path, method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Content-Length': Buffer.byteLength(body)
      }
    }
    const req = https.request(opts, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch(e) { resolve({ _raw: d }) } })
    })
    req.on('error', reject)
    req.write(body)
    req.end()
  })
}

function httpsGetJson(hostname, path, token) {
  return new Promise((resolve, reject) => {
    const opts = { hostname, path, method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    const req = https.request(opts, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch(e) { resolve({ _raw: d }) } })
    })
    req.on('error', reject)
    req.end()
  })
}

function httpsPostJson(hostname, path, token, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = JSON.stringify(body)
    const opts = {
      hostname, path, method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(bodyStr) }
    }
    const req = https.request(opts, res => {
      let d = ''
      res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch(e) { resolve({ _raw: d }) } })
    })
    req.on('error', reject)
    req.write(bodyStr)
    req.end()
  })
}

async function getServiceAccountToken() {
  const email = process.env.SERVICE_ACCOUNT_EMAIL
  const privateKey = getPrivateKey()
  if (!email) throw new Error('SERVICE_ACCOUNT_EMAIL mancante')
  if (!privateKey || !privateKey.includes('BEGIN PRIVATE KEY')) throw new Error('Chiave privata non valida')

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

  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  const data = await httpsPost('oauth2.googleapis.com', '/token', body)
  if (!data.access_token) throw new Error(data.error_description || data.error || JSON.stringify(data))
  return data.access_token
}

async function ensureFolder(token) {
  const adminEmail = process.env.ADMIN_EMAIL
  const q = encodeURIComponent(`name='${FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false`)
  const searchData = await httpsGetJson('www.googleapis.com', `/drive/v3/files?q=${q}&fields=files(id)`, token)
  if (searchData.files && searchData.files.length > 0) return searchData.files[0].id

  const folder = await httpsPostJson('www.googleapis.com', '/drive/v3/files', token, {
    name: FOLDER_NAME, mimeType: 'application/vnd.google-apps.folder'
  })
  if (!folder.id) throw new Error('Impossibile creare cartella: ' + JSON.stringify(folder))

  if (adminEmail) {
    await httpsPostJson('www.googleapis.com', `/drive/v3/files/${folder.id}/permissions?sendNotificationEmail=false`, token, {
      role: 'writer', type: 'user', emailAddress: adminEmail
    }).catch(() => {})
  }
  return folder.id
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  try {
    const token = await getServiceAccountToken()
    const folderId = await ensureFolder(token)
    return { statusCode: 200, headers, body: JSON.stringify({ access_token: token, folder_id: folderId, expires_in: 3600 }) }
  } catch (err) {
    console.error('service-token error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
