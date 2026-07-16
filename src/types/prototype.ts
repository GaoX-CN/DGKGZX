export type ModuleType = 'form' | 'table' | 'chart' | 'card' | 'header' | 'toolbar' | 'unknown'

export interface PrototypeModule {
  moduleId: string
  moduleName: string
  moduleType: ModuleType
  pageId: string
  requirementId: string
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  props: Record<string, any>
}

export interface PrototypePage {
  pageId: string
  pageName: string
  pagePath?: string
  icon?: string
  modules?: PrototypeModule[]
  children?: PrototypePage[]
  isFolder?: boolean
}

export type PrototypeDesignStatus = 'designing' | 'completed'

export interface PrototypeVersionRecord {
  version: number
  createdAt: string
  description: string
}

export interface PrototypePageMetadata {
  status: PrototypeDesignStatus
  versions: PrototypeVersionRecord[]
}

export interface PrototypePageMetadataFile {
  pages: Record<string, Partial<PrototypePageMetadata>>
}
