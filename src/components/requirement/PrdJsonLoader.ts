import type { PagePrd, PrdModule } from '@/types/requirement'

const LS_PREFIX = 'prd:'
const prdCache = new Map<string, PagePrd>()
let pagePathMap: Record<string, string> | null = null

const prdModules = import.meta.glob<{ default: PagePrd }>(
  '@/pages/**/*_prd.json',
  { eager: false }
)

const prdSourceModules = import.meta.glob<string>(
  '@/pages/**/*_prd.json',
  { eager: false, query: '?raw', import: 'default' }
)

function isValidPrd(data: unknown): data is PagePrd {
  if (!data || typeof data !== 'object') return false
  const prd = data as Partial<PagePrd>
  if (!prd.pageId || !prd.pageName || !Array.isArray(prd.modules)) return false

  return prd.modules.every((module) => {
    return Boolean(
      module &&
      module.id &&
      module.title &&
      Array.isArray(module.requirements) &&
      Array.isArray(module.fields) &&
      Array.isArray(module.rules) &&
      Array.isArray(module.ruleImages) &&
      Array.isArray(module.interactions)
    )
  })
}

function loadFromStorage(pageId: string): PagePrd | null {
  try {
    const raw = localStorage.getItem(LS_PREFIX + pageId)
    const data = raw ? JSON.parse(raw) : null
    return isValidPrd(data) ? data : null
  } catch {
    return null
  }
}

function saveToStorage(data: PagePrd): void {
  try {
    localStorage.setItem(LS_PREFIX + data.pageId, JSON.stringify(data))
  } catch {
    // localStorage full or unavailable
  }
}

async function ensureIndex(pageName?: string): Promise<void> {
  if (!pageName) {
    if (pagePathMap) return
    pagePathMap = {}
  } else {
    pagePathMap = pagePathMap || {}
  }

  const entries = Object.entries(prdModules)
  const targets = pageName
    ? entries.filter(([path]) => path.includes(pageName))
    : entries

  const results = await Promise.all(
    targets.map(async ([path, loader]) => {
      try {
        const mod = await loader()
        const data = mod.default
        const key = data.pageName || data.pageId || ''
        return { path, key, data }
      } catch {
        return null
      }
    })
  )

  for (const r of results) {
    if (r && r.key) {
      pagePathMap[r.key] = r.path
      prdCache.set(r.key, r.data)
    }
  }
}

export async function loadPrd(pageName: string): Promise<PagePrd | null> {
  await ensureIndex(pageName)
  const fileData = prdCache.get(pageName)
  if (!isValidPrd(fileData)) return null

  const stored = loadFromStorage(fileData.pageId)
  if (!stored && localStorage.getItem(LS_PREFIX + fileData.pageId)) {
    localStorage.removeItem(LS_PREFIX + fileData.pageId)
  }
  if (stored) {
    const fileTime = fileData.lastUpdated ? new Date(fileData.lastUpdated).getTime() : 0
    const storedTime = stored.lastUpdated ? new Date(stored.lastUpdated).getTime() : 0
    const fileModuleCount = fileData.modules?.length || 0
    const storedModuleCount = stored.modules?.length || 0

    if (fileTime > storedTime || fileModuleCount !== storedModuleCount) {
      localStorage.removeItem(LS_PREFIX + fileData.pageId)
      prdCache.set(pageName, fileData)
      return fileData
    }

    prdCache.set(pageName, stored)
    return stored
  }

  return fileData
}

export async function loadPrdSource(pageName: string): Promise<string | null> {
  await ensureIndex(pageName)
  const filePath = pagePathMap?.[pageName]
  const loader = filePath ? prdSourceModules[filePath] : undefined
  if (!loader) return null

  try {
    return await loader()
  } catch {
    return null
  }
}

export function getPrdCache(pageName: string): PagePrd | null {
  return prdCache.get(pageName) ?? null
}

export async function saveCurrentPrd(data: PagePrd): Promise<boolean> {
  prdCache.set(data.pageId, data)
  saveToStorage(data)
  try {
    const response = await fetch('/api/prd/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    return response.ok
  } catch {
    return false
  }
}

export function clearCache(): void {
  prdCache.clear()
  pagePathMap = null
}

export async function uploadPrdImage(
  moduleId: string,
  fileName: string,
  base64: string
): Promise<{ path: string; fileName: string } | null> {
  const dataUrl = `data:image/png;base64,${base64}`
  return { path: dataUrl, fileName }
}

export function convertPrdModuleToRecord(module: PrdModule): Record<string, any> {
  return {
    purpose: module.purpose,
    summary: module.summary,
    fields: module.fields,
    rules: module.rules,
    interactions: module.interactions,
    requirements: module.requirements,
  }
}
