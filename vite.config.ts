import { defineConfig, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { readFileSync, writeFileSync } from 'fs'
import { globSync } from 'glob'

function prdApiPlugin(): Plugin {
  const PRD_GLOB = 'src/pages/**/*_prd.json'
  const PAGE_METADATA_FILE = 'src/data/prototype-page-metadata.json'
  const PUBLISH_ADDRESSES_FILE = 'src/data/project-publish-addresses.json'

  function findPrdFile(pageId: string, root: string): string | null {
    const files = globSync(PRD_GLOB, { cwd: root })
    for (const file of files) {
      const fullPath = resolve(root, file)
      try {
        const content = readFileSync(fullPath, 'utf-8')
        const data = JSON.parse(content)
        if (data.pageId === pageId || data.pageName === pageId) {
          return fullPath
        }
      } catch {
        // skip invalid files
      }
    }
    return null
  }

  return {
    name: 'prd-api',
    configureServer(server) {
      const root = server.config.root

      server.middlewares.use('/api/prototype-page-metadata', (req, res) => {
        const filePath = resolve(root, PAGE_METADATA_FILE)

        if (req.method === 'GET') {
          try {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(readFileSync(filePath, 'utf-8'))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
          return
        }

        if (req.method !== 'PUT') {
          res.statusCode = 405
          res.end()
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            if (!data || typeof data !== 'object' || !data.pages || typeof data.pages !== 'object') {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'invalid metadata' }))
              return
            }

            writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })

      server.middlewares.use('/api/project-publish-addresses', (req, res) => {
        const filePath = resolve(root, PUBLISH_ADDRESSES_FILE)

        if (req.method === 'GET') {
          try {
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(readFileSync(filePath, 'utf-8'))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
          return
        }

        if (req.method !== 'PUT') {
          res.statusCode = 405
          res.end()
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            if (!data || typeof data !== 'object' || typeof data.projectName !== 'string' || typeof data.prototype !== 'string' || typeof data.ui !== 'string') {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'invalid publish addresses' }))
              return
            }

            writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8')
            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })

      server.middlewares.use('/api/prd/save', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405
          res.end()
          return
        }

        let body = ''
        req.on('data', (chunk: Buffer) => { body += chunk.toString() })
        req.on('end', () => {
          try {
            const data = JSON.parse(body)
            const pageId = data.pageId || data.pageName || ''
            if (!pageId) {
              res.statusCode = 400
              res.end(JSON.stringify({ error: 'missing pageId' }))
              return
            }

            const filePath = findPrdFile(pageId, root)
            if (!filePath) {
              res.statusCode = 404
              res.end(JSON.stringify({ error: 'prd file not found' }))
              return
            }

            writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')

            res.statusCode = 200
            res.setHeader('Content-Type', 'application/json')
            res.end(JSON.stringify({ ok: true }))
          } catch (e: any) {
            res.statusCode = 500
            res.end(JSON.stringify({ error: e.message }))
          }
        })
      })
    },
    handleHotUpdate(ctx) {
      if (ctx.file.includes('_prd.json')) {
        ctx.server.ws.send({ type: 'custom', event: 'prd-updated' })
        return []
      }
    },
  }
}

export default defineConfig({
  plugins: [vue(), prdApiPlugin()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "@/styles/variables.scss" as *;`,
      },
    },
  },
  server: {
    port: 5173,
    open: true,
  },
})
