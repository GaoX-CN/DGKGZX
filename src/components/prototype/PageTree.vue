<template>
  <div class="page-tree">
    <div class="page-tree__header">
      <span class="page-tree__title">页面列表</span>
    </div>
    <el-tree
      :data="treeData"
      node-key="pageId"
      default-expand-all
      :props="{ label: 'pageName', children: 'children' }"
      highlight-current
      :current-node-key="prototypeStore.currentPageId"
      @node-click="onNodeClick"
    >
      <template #default="{ data }">
        <div class="page-tree__node">
          <el-icon v-if="data.icon" class="page-tree__node-icon">
            <component :is="data.icon" />
          </el-icon>
          <span class="page-tree__node-name">{{ data.pageName }}</span>
          <template v-if="!data.isFolder">
            <el-tooltip :content="getStatusLabel(data.pageId)" placement="top">
              <el-icon
                class="page-tree__status"
                :class="[
                  `page-tree__status--${getPageMetadata(data.pageId).status}`,
                  { 'page-tree__status--editable': isDevelopment },
                ]"
                @click.stop="toggleStatus(data)"
              >
                <CircleCheck v-if="getPageMetadata(data.pageId).status === 'completed'" />
                <Clock v-else />
              </el-icon>
            </el-tooltip>
            <el-tooltip content="修改记录" placement="top">
              <el-button link class="page-tree__history-button" @click.stop="openHistory(data)">
                <el-icon><Document /></el-icon>
              </el-button>
            </el-tooltip>
          </template>
        </div>
      </template>
    </el-tree>

    <el-drawer v-model="historyVisible" :title="`${historyPage?.pageName || ''} · 修改记录`" size="420px">
      <div v-if="historyPage" class="page-tree__history">
        <el-empty v-if="versions.length === 0" description="暂无修改记录" :image-size="80" />
        <el-timeline v-else>
          <el-timeline-item v-for="record in versions" :key="record.version" :timestamp="formatTime(record.createdAt)">
            <strong>v{{ record.version }}</strong>
            <p>{{ record.description }}</p>
          </el-timeline-item>
        </el-timeline>
        <template v-if="isDevelopment">
          <el-divider />
          <el-input v-model="versionDescription" type="textarea" :rows="3" placeholder="填写本次修改内容" />
          <el-button type="primary" :loading="saving" :disabled="!versionDescription.trim()" @click="addVersion">
            新增版本记录
          </el-button>
        </template>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { CircleCheck, Clock, Document } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { usePrototypeStore } from '@/stores/prototypeStore'
import type { PrototypePage, PrototypeVersionRecord } from '@/types/prototype'

const prototypeStore = usePrototypeStore()
const router = useRouter()
const isDevelopment = import.meta.env.DEV
const historyVisible = ref(false)
const historyPage = ref<PrototypePage | null>(null)
const versionDescription = ref('')
const saving = ref(false)

const treeData = computed(() => prototypeStore.pages)
const versions = computed<PrototypeVersionRecord[]>(() =>
  historyPage.value ? prototypeStore.getPageMetadata(historyPage.value.pageId).versions : [],
)

onMounted(() => {
  prototypeStore.loadPageMetadata()
})

function onNodeClick(data: PrototypePage) {
  if (data.isFolder) return
  prototypeStore.setCurrentPage(data.pageId)
  if (data.pagePath) {
    router.push(data.pagePath)
  }
}

function getPageMetadata(pageId: string) {
  return prototypeStore.getPageMetadata(pageId)
}

function getStatusLabel(pageId: string) {
  return getPageMetadata(pageId).status === 'completed' ? '原型设计完成' : '原型设计中'
}

async function toggleStatus(data: PrototypePage) {
  if (!isDevelopment) return

  const status = getPageMetadata(data.pageId).status === 'completed' ? 'designing' : 'completed'
  try {
    await prototypeStore.setPageStatus(data.pageId, status)
    ElMessage.success(status === 'completed' ? '已标记为原型设计完成' : '已标记为原型设计中')
  } catch {
    ElMessage.error('状态保存失败，请确认开发服务器正在运行')
  }
}

function openHistory(data: PrototypePage) {
  historyPage.value = data
  versionDescription.value = ''
  historyVisible.value = true
}

async function addVersion() {
  if (!historyPage.value || !versionDescription.value.trim()) return

  saving.value = true
  try {
    await prototypeStore.addVersionRecord(historyPage.value.pageId, versionDescription.value.trim())
    versionDescription.value = ''
    ElMessage.success('版本记录已保存')
  } catch {
    ElMessage.error('版本记录保存失败，请确认开发服务器正在运行')
  } finally {
    saving.value = false
  }
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN', { hour12: false })
}
</script>

<style lang="scss" scoped>
.page-tree {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.page-tree__header {
  padding: 12px 16px;
  border-bottom: 1px solid $border-color;
}

.page-tree__title {
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.page-tree__node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  width: 100%;
  min-width: 0;
}

.page-tree__node-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.page-tree__node-icon {
  font-size: 14px;
  color: $text-secondary;
}

.page-tree__status {
  margin-left: auto;
  flex-shrink: 0;
  font-size: 16px;
}

.page-tree__status--designing {
  color: var(--el-color-warning);
}

.page-tree__status--completed {
  color: var(--el-color-success);
}

.page-tree__status--editable {
  cursor: pointer;
}

.page-tree__history-button {
  flex-shrink: 0;
  padding: 0;
  font-size: 16px;
}

.page-tree__history {
  display: flex;
  flex-direction: column;
  min-height: 100%;

  :deep(.el-timeline) {
    padding-left: 8px;
  }

  p {
    margin: 6px 0 0;
    color: $text-secondary;
    line-height: 1.6;
    white-space: pre-wrap;
  }

  .el-button {
    align-self: flex-end;
    margin-top: 12px;
  }
}
</style>
