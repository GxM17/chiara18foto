const https = require('https')
const JSZip = require('jszip')
const ADMIN_KEY = 'Chiara18!Admin'

async function getAccessToken() {
  const body = `client_id=${encodeURIComponent(process.env.GOOGLE_CLIENT_ID)}&client_secret=${encodeURIComponent(process.env.GOOGLE_CLIENT_SECRET)}&refresh_token=${encodeURIComponent(process.env.GOOGLE_REFRESH_TOKEN)}&grant_type=refresh_token`
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'oauth2.googleapis.com', path: '/token', method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body) } }, res => {
      let d = ''; res.on('data', c => d += c)
      res.on('end', () => { const data = JSON.parse(d); if (!data.access_token) reject(new Error(data.error_description || 'Token error')); else resolve(data.access_token) })
    })
    req.on('error', reject); req.write(body); req.end()
  })
}

function get(path, token) {
  return new Promise((resolve, reject) => {
    const req = https.request({ hostname: 'www.googleapis.com', path, method: 'GET', headers: { Authorization: `Bearer ${token}` } }, res => {
      const chunks = []; res.on('data', c => chunks.push(c)); res.on('end', () => resolve(Buffer.concat(chunks)))
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
    const token = await getAccessToken()
    const zip = new JSZip()
    const nameCount = {}
    for (const fileId of fileIds.slice(0, 100)) {
      try {
        const [metaBuf, fileBuf] = await Promise.all([get(`/drive/v3/files/${fileId}?fields=name,mimeType`, token), get(`/drive/v3/files/${fileId}?alt=media`, token)])
        const meta = JSON.parse(metaBuf.toString())
        let fileName = meta.name || `foto_${fileId}.jpg`
        if (nameCount[fileName]) { const ext = fileName.includes('.') ? '.' + fileName.split('.').pop() : ''; const base = ext ? fileName.slice(0, -ext.length) : fileName; nameCount[fileName]++; fileName = `${base}_${nameCount[fileName]}${ext}` } else { nameCount[fileName] = 1 }
        zip.file(fileName, fileBuf)
      } catch (e) { console.error(`File ${fileId}:`, e.message) }
    }
    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } })
    return { statusCode: 200, headers: { ...headers, 'Content-Type': 'application/zip', 'Content-Disposition': `attachment; filename="foto_chiara18_${new Date().toISOString().slice(0,10)}.zip"`, 'Content-Length': zipBuffer.length }, body: zipBuffer.toString('base64'), isBase64Encoded: true }
  } catch (err) {
    console.error('zip error:', err.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) }
  }
}
