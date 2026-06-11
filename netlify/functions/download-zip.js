const crypto = require('crypto')
const https = require('https')
const JSZip = require('jszip')

const ADMIN_KEY = 'Chiara18!Admin'

function getPrivateKey() {
  const b64 = process.env.SERVICE_ACCOUNT_PRIVATE_KEY_B64
  if (b64) return Buffer.from(b64.trim(), 'base64').toString('utf8')
  return (process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '').replace(/\\n/g, '\n')
}

async function getServiceAccountToken() {
  const email = process.env.SERVICE_ACCOUNT_EMAIL
  const privateKey = getPrivateKey()
  if (!email || !privateKey.includes('BEGIN PRIVATE KEY')) throw new Error('Service account non configurato')
  const now = Math.floor(Date.now() / 1000)
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({ iss: email, scope: 'https://www.googleapis.com/auth/drive', aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600 })).toString('base64url')
  const si = `${header}.${payload}`
  const sign = crypto.createSign('RSA-SHA256'); sign.update(si)
  const jwt = `${si}.${sign.sign(privateKey, 'base64url')}`
  const body = `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { const data = JSON.parse(d); if (!data.access_token) reject(new Error(data.error_description || 'Token error')); else resolve(data.access_token) })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}

function downloadFile(token, fileId) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'www.googleapis.com', path: `/drive/v3/files/${fileId}?alt=media&supportsAllDrives=true`, method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    const req = https.request(opts, res => {
      const chunks = []
      res.on('data', c => chunks.push(c))
      res.on('end', () => resolve(Buffer.concat(chunks)))
    })
    req.on('error', reject); req.end()
  })
}

function getFileMeta(token, fileId) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'www.googleapis.com', path: `/drive/v3/files/${fileId}?fields=name,mimeType&supportsAllDrives=true`, method: 'GET', headers: { Authorization: `Bearer ${token}` } }
    const req = https.request(opts, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { try { resolve(JSON.parse(d)) } catch { resolve({ name: `foto_${fileId}.jpg` }) } })
    })
    req.on('error', reject); req.end()
  })
}

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type, X-Admin-Key', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) }

  const adminKey = event.headers['x-admin-key'] || event.headers['X-Admin-Key']
  if (adminKey !== ADMIN_KEY) return { statusCode: 401, headers, body: JSON.stringify({ error: 'Non autorizzato' }) }

  try {
    const { fileIds } = JSON.parse(event.body || '{}')
    if (!Array.isArray(fileIds) || !fileIds.length) return { statusCode: 400, headers, body: JSON.stringify({ error: 'Lista file mancante' }) }

    const token = await getServiceAccountToken()
    const zip = new JSZip()
    const nameCount = {}

    for (const fileId of fileIds.slice(0, 100)) {
      try {
        const [meta, buffer] = await Promise.all([getFileMeta(token, fileId), downloadFile(token, fileId)])
        let fileName = meta.name || `foto_${fileId}.jpg`
        if (nameCount[fileName]) { const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''; const base = ext ? fileName.slice(0, -ext.length) : fileName; nameCount[fileName]++; fileName = `${base}_${nameCount[fileName]}${ext}` } else { nameCount[fileName] = 1 }
        zip.file(fileName, buffer)
      } catch (err) { console.error(`File ${fileId} error:`, err.message) }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="foto_chiara18_${new Date().toISOString().slice(0,10)}.zip"`, 'Content-Length': zipBuffer.length },
      body: zipBuffer.toString('base64'), isBase64Encoded: true
    }
  } catch (err) {
    console.error('zip error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
