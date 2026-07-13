import type { ModuleType } from '@/types/prototype'

export interface PrototypeModuleSchema {
  moduleId: string
  pageId: string
  moduleName: string
  moduleType: ModuleType
  bounds: {
    x: number
    y: number
    width: number
    height: number
  }
  props: Record<string, any>
  requirementId: string
}

export const defaultModuleSchema: PrototypeModuleSchema = {
  moduleId: '',
  pageId: '',
  moduleName: '',
  moduleType: 'unknown',
  bounds: { x: 0, y: 0, width: 0, height: 0 },
  props: {},
  requirementId: '',
}
