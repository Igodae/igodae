import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function mfdsDevProxy(env) {
  const endpoints = {
    drugInfo: 'https://apis.data.go.kr/1471000/DrbEasyDrugInfoService/getDrbEasyDrugList',
    pillInfo: 'https://apis.data.go.kr/1471000/MdcinGrnIdntfcInfoService03/getMdcinGrnIdntfcInfoList03',
    permission: 'https://apis.data.go.kr/1471000/DrugPrdtPrmsnInfoService07/getDrugPrdtPrmsnDtlInq05',
  }

  return {
    name: 'mfds-dev-proxy',
    configureServer(server) {
      server.middlewares.use('/api/mfds-proxy', async (req, res) => {
        try {
          const url = new URL(req.url || '', 'http://localhost')
          const endpoint = url.searchParams.get('endpoint')
          const targetBase = endpoints[endpoint]
          const serviceKey = env.MFDS_API_KEY || env.VITE_MFDS_API_KEY

          res.setHeader('Access-Control-Allow-Origin', '*')
          res.setHeader('Content-Type', 'application/json; charset=utf-8')

          if (!targetBase) {
            res.statusCode = 400
            res.end(JSON.stringify({ error: `Unknown endpoint: ${endpoint}` }))
            return
          }

          if (!serviceKey) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: 'MFDS_API_KEY not configured' }))
            return
          }

          url.searchParams.delete('endpoint')
          url.searchParams.set('serviceKey', serviceKey)
          url.searchParams.set('type', 'json')

          const response = await fetch(`${targetBase}?${url.searchParams}`)
          const text = await response.text()
          res.statusCode = response.status
          res.end(text)
        } catch (error) {
          res.statusCode = 502
          res.end(JSON.stringify({ error: error.message }))
        }
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
  plugins: [react(), mfdsDevProxy(env)],
  server: {
    port: 3000,
    host: true
  }
  }
})
