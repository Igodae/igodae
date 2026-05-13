// api/groq-proxy.js
// Vercel Serverless Function — Groq API CORS 프록시
// 브라우저에서 api.groq.com 직접 호출 시 CORS 차단 → 이 함수가 서버에서 대신 호출
// 동시에 GROQ_API_KEY를 클라이언트 번들에 노출하지 않는 효과

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' })
  }

  try {
    const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(req.body),
    })

    const text = await upstream.text()
    res.status(upstream.status)
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json')
    return res.send(text)
  } catch (err) {
    console.error('groq-proxy error:', err.message)
    return res.status(502).json({ error: err.message })
  }
}
