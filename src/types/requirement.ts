export interface RuleImage {
  path: string
  fileName: string
}

export type SectionType = 'overview' | 'field' | 'rule' | 'interaction' | 'custom'

export interface TrackableMeta {
  source: 'ai' | 'manual'
  status: 'generated' | 'confirmed'
}

export interface PrdField extends TrackableMeta {
  name: string
  label: string
  type: string
  required: boolean
  description: string
}

export interface PrdInteraction extends TrackableMeta {
  trigger: string
  action: string
  description: string
}

export interface PrdIntent {
  type: 'query' | 'create' | 'manage' | 'analysis' | 'workflow'
  summary: string
}

export interface PrdRequirement extends TrackableMeta {
  title: string
  priority: 'P0' | 'P1' | 'P2'
  details: string
}

export interface PrdModule extends TrackableMeta {
  id: string
  title: string
  purpose: string
  summary: string
  requirements: PrdRequirement[]
  fields: PrdField[]
  rules: string[]
  interactions: PrdInteraction[]
  ruleImages: RuleImage[]
}

export interface PagePrd {
  pageName: string
  pageId: string
  version: string
  lastUpdated: string
  intent: PrdIntent
  overview: string
  modules: PrdModule[]
}

export interface RequirementMeta {
  id: string
  moduleId: string
  title: string
  source: 'ai' | 'manual'
  status: 'generated' | 'confirmed'
}

export interface RequirementSection {
  type: SectionType
  title: string
  content: Record<string, any>
}

export interface Requirement {
  id: string
  moduleId: string
  title: string
  meta: RequirementMeta
  sections: RequirementSection[]
}

export type RequirementState = 'loading' | 'loaded' | 'error' | 'empty'

export interface PrdJson {
  pageName: string
  pageId: string
  version: string
  lastUpdated: string
  intent: PrdIntent
  overview: string
  modules: PrdModule[]
}
