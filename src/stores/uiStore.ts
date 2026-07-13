import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUiStore = defineStore('ui', () => {
  const pageTreeCollapsed = ref<boolean>(false)
  const prdPanelVisible = ref<boolean>(false)
  const prdPanelWidth = ref<number>(700)
  const isPrdResizing = ref<boolean>(false)
  const theme = ref<'light' | 'dark'>('light')

  const minPanelWidth = 400
  const maxPanelWidth = 1000

  function togglePageTree() {
    pageTreeCollapsed.value = !pageTreeCollapsed.value
  }

  function togglePrdPanel() {
    prdPanelVisible.value = !prdPanelVisible.value
  }

  function setPrdPanelWidth(width: number) {
    prdPanelWidth.value = Math.min(Math.max(width, minPanelWidth), maxPanelWidth)
  }

  function setPrdResizing(value: boolean) {
    isPrdResizing.value = value
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme
  }

  return {
    pageTreeCollapsed,
    prdPanelVisible,
    prdPanelWidth,
    isPrdResizing,
    theme,
    minPanelWidth,
    maxPanelWidth,
    togglePageTree,
    togglePrdPanel,
    setPrdPanelWidth,
    setPrdResizing,
    setTheme,
  }
})
