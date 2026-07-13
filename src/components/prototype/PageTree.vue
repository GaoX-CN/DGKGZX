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
          <span>{{ data.pageName }}</span>
        </div>
      </template>
    </el-tree>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePrototypeStore } from '@/stores/prototypeStore'
import type { PrototypePage } from '@/types/prototype'

const prototypeStore = usePrototypeStore()
const router = useRouter()

const treeData = computed(() => prototypeStore.pages)

function onNodeClick(data: PrototypePage) {
  if (data.isFolder) return
  prototypeStore.setCurrentPage(data.pageId)
  if (data.pagePath) {
    router.push(data.pagePath)
  }
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
}

.page-tree__node-icon {
  font-size: 14px;
  color: $text-secondary;
}
</style>
