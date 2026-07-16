import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Requirement, PagePrd, PrdModule, RequirementState, SectionType } from '@/types/requirement'

export const useRequirementStore = defineStore('requirement', () => {
  const requirements = ref<Requirement[]>([])
  const currentPagePrd = ref<PagePrd | null>(null)
  const currentModuleIndex = ref<number>(-1)
  const prdLoadingState = ref<RequirementState>('empty')
  const currentSection = ref<SectionType | null>(null)
  const loading = ref<boolean>(false)

  const currentModule = computed<PrdModule | null>(() => {
    if (!currentPagePrd.value || currentModuleIndex.value < 0) return null
    return currentPagePrd.value.modules[currentModuleIndex.value] ?? null
  })

  const moduleNavItems = computed(() => {
    if (!currentPagePrd.value) return []
    return currentPagePrd.value.modules.map((m) => ({
      id: m.id,
      title: m.title,
    }))
  })

  function setPrdJson(data: PagePrd) {
    currentPagePrd.value = data
    currentModuleIndex.value = data.modules.length > 0 ? 0 : -1
    currentSection.value = null
    prdLoadingState.value = 'loaded'
  }

  function setPrdLoadingState(state: RequirementState) {
    prdLoadingState.value = state
  }

  function selectModule(index: number) {
    currentModuleIndex.value = index
  }

  function updateModuleContent(moduleIndex: number, updates: Partial<PrdModule>) {
    if (!currentPagePrd.value) return
    const modules = [...currentPagePrd.value.modules]
    modules[moduleIndex] = { ...modules[moduleIndex], ...updates }
    currentPagePrd.value = { ...currentPagePrd.value, modules }
  }

  function setCurrentSection(section: SectionType | null) {
    currentSection.value = section
  }

  return {
    requirements,
    currentPagePrd,
    currentModuleIndex,
    prdLoadingState,
    currentSection,
    loading,
    currentModule,
    moduleNavItems,
    setPrdJson,
    setPrdLoadingState,
    selectModule,
    updateModuleContent,
    setCurrentSection,
  }
})
