<template>
  <div class="requirement-panel">
    <div class="requirement-panel__header">
      <div class="requirement-panel__header-title">
        <el-icon><Document /></el-icon>
        <span>PRD 需求说明</span>
      </div>
      <div class="requirement-panel__header-actions">
        <el-button text :icon="View" :disabled="prdLoadingState !== 'loaded'" @click="openJsonViewer">查看 JSON</el-button>
        <el-button text :icon="Close" @click="uiStore.togglePrdPanel()" />
      </div>
    </div>

    <div class="requirement-panel__body">
      <template v-if="prdLoadingState === 'empty'">
        <EmptyState description="暂无 PRD 数据，请先生成页面 PRD" />
      </template>
      <template v-else-if="prdLoadingState === 'loading'">
        <Loading text="加载 PRD 中..." />
      </template>
      <template v-else-if="prdLoadingState === 'error'">
        <EmptyState description="PRD 加载失败" />
      </template>
      <template v-else-if="prdLoadingState === 'loaded'">
        <div class="requirement-panel__layout">
          <div class="requirement-panel__sidebar">
            <RequirementSidebar
              :items="moduleNavItems"
              :current-index="currentModuleIndex"
              @select="onModuleSelect"
            />
          </div>
          <div class="requirement-panel__content">
            <RequirementContent v-if="currentModule" :module="currentModule" />
            <EmptyState v-else description="请选择左侧模块查看需求详情" :image-size="80" />
          </div>
        </div>
      </template>
    </div>

    <el-dialog v-model="jsonViewerVisible" width="720px" top="8vh" append-to-body>
      <template #header>
        <div class="requirement-panel__json-header">
          <span>PRD JSON 源文件</span>
          <el-button size="small" :icon="CopyDocument" @click="copyPrdSource">复制 JSON</el-button>
        </div>
      </template>
      <pre class="requirement-panel__json">{{ prdSource || '未找到当前页面的 PRD JSON 文件' }}</pre>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, ref } from 'vue'
import { Document, Close, View, CopyDocument } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useUiStore } from '@/stores/uiStore'
import { useRequirementStore } from '@/stores/requirementStore'
import { usePrototypeStore } from '@/stores/prototypeStore'
import { loadPrd, loadPrdSource } from './PrdJsonLoader'
import { useRoute } from 'vue-router'
import EmptyState from '@/components/common/EmptyState.vue'
import Loading from '@/components/common/Loading.vue'
import RequirementSidebar from './RequirementSidebar.vue'
import RequirementContent from './RequirementContent.vue'

const uiStore = useUiStore()
const requirementStore = useRequirementStore()
const prototypeStore = usePrototypeStore()
const route = useRoute()
const jsonViewerVisible = ref(false)
const prdSource = ref('')

const prdLoadingState = computed(() => requirementStore.prdLoadingState)
const moduleNavItems = computed(() => requirementStore.moduleNavItems)
const currentModuleIndex = computed(() => requirementStore.currentModuleIndex)
const currentModule = computed(() => requirementStore.currentModule)

function onModuleSelect(index: number) {
  requirementStore.selectModule(index)
  const prd = requirementStore.currentPagePrd
  if (prd && prd.modules[index]) {
    prototypeStore.setCurrentModule(prd.modules[index].id)
  }
}

async function loadCurrentPrd() {
  const pageName = (route.name as string) || 'Welcome'
  requirementStore.setPrdLoadingState('loading')
  try {
    const data = await loadPrd(pageName)
    if (data && data.modules.length > 0) {
      requirementStore.setPrdJson(data)
    } else {
      requirementStore.setPrdLoadingState('empty')
    }
  } catch {
    requirementStore.setPrdLoadingState('error')
  }
}

async function openJsonViewer() {
  const pageName = (route.name as string) || 'Welcome'
  prdSource.value = await loadPrdSource(pageName) ?? ''
  jsonViewerVisible.value = true
}

async function copyPrdSource() {
  if (!prdSource.value) return

  try {
    if (navigator.clipboard?.writeText && window.isSecureContext) {
      await navigator.clipboard.writeText(prdSource.value)
    } else if (!copyWithSelection(prdSource.value)) {
      throw new Error('clipboard unavailable')
    }
    ElMessage.success('JSON 已复制到剪贴板')
  } catch {
    if (copyWithSelection(prdSource.value)) {
      ElMessage.success('JSON 已复制到剪贴板')
    } else {
      ElMessage.error('复制失败，请手动选择 JSON 内容复制')
    }
  }
}

function copyWithSelection(text: string) {
  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  return copied
}

onMounted(() => {
  loadCurrentPrd()

  if (import.meta.hot) {
    import.meta.hot.on('prd-updated', () => {
      loadCurrentPrd()
    })
  }
})

watch(() => route.name, () => {
  loadCurrentPrd()
})
</script>

<style lang="scss" scoped>
.requirement-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.requirement-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
}

.requirement-panel__header-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: $text-color;
}

.requirement-panel__header-actions {
  display: flex;
  align-items: center;
}

.requirement-panel__body {
  flex: 1;
  overflow: hidden;
}

.requirement-panel__layout {
  display: flex;
  height: 100%;
}

.requirement-panel__sidebar {
  width: 160px;
  border-right: 1px solid $border-color;
  overflow: auto;
  flex-shrink: 0;
}

.requirement-panel__content {
  flex: 1;
  overflow: auto;
}

.requirement-panel__json {
  max-height: 70vh;
  margin: 0;
  padding: 16px;
  overflow: auto;
  border-radius: 4px;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: Consolas, 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.requirement-panel__json-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-right: 28px;
  font-size: 16px;
  font-weight: 600;
}
</style>
