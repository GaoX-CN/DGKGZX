import type { SectionType, PrdField, PrdInteraction, PrdRequirement, RuleImage } from '@/types/requirement'

export interface RequirementSectionSchema {
  type: SectionType
  title: string
  fields?: PrdField[]
  rules?: string[]
  interactions?: PrdInteraction[]
  requirements?: PrdRequirement[]
  ruleImages?: RuleImage[]
  purpose?: string
  summary?: string
}

export interface RequirementSchema {
  id: string
  moduleId: string
  title: string
  meta: {
    source: 'ai' | 'manual'
    status: 'generated' | 'confirmed'
  }
  sections: RequirementSectionSchema[]
}

export const defaultRequirementSchema: RequirementSchema = {
  id: '',
  moduleId: '',
  title: '',
  meta: { source: 'ai', status: 'generated' },
  sections: [],
}
