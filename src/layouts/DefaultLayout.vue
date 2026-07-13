<template>
  <el-container class="workspace-layout">
    <el-aside :style="{ width: pageTreeCollapsed ? '0px' : '260px' }" class="workspace-layout__aside">
      <PageTree v-if="!pageTreeCollapsed" />
    </el-aside>
    <el-container class="workspace-layout__main-area">
      <el-header height="48px" class="workspace-layout__header">
        <div class="workspace-layout__header-left">
          <el-button
            :icon="pageTreeCollapsed ? Expand : Fold"
            text
            @click="uiStore.togglePageTree()"
          />
          <span class="workspace-layout__title">{{ prototypeStore.currentPageName }}</span>
        </div>
        <div class="workspace-layout__header-right">
          <slot name="toolbar" />
        </div>
      </el-header>
      <el-main class="workspace-layout__main">
        <router-view />
      </el-main>
    </el-container>

    <FloatingButton @click="uiStore.togglePrdPanel()" />

    <Transition name="prd-slide">
      <div v-if="uiStore.prdPanelVisible" class="prd-overlay" @click.self="onOverlayClick">
        <ResizablePanel
          :visible="true"
          :width="uiStore.prdPanelWidth"
          :min-width="uiStore.minPanelWidth"
          :max-width="uiStore.maxPanelWidth"
          class="prd-overlay__panel"
          @update:width="uiStore.setPrdPanelWidth"
        >
          <RequirementPanel />
        </ResizablePanel>
      </div>
    </Transition>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Expand, Fold } from '@element-plus/icons-vue'
import { useUiStore } from '@/stores/uiStore'
import { usePrototypeStore } from '@/stores/prototypeStore'
import PageTree from '@/components/prototype/PageTree.vue'
import FloatingButton from '@/components/common/FloatingButton.vue'
import ResizablePanel from '@/components/common/ResizablePanel.vue'
import RequirementPanel from '@/components/requirement/RequirementPanel.vue'

const uiStore = useUiStore()
const prototypeStore = usePrototypeStore()
const pageTreeCollapsed = computed(() => uiStore.pageTreeCollapsed)

function onOverlayClick() {
  if (uiStore.isPrdResizing) return
  uiStore.togglePrdPanel()
}
</script>

<style lang="scss" scoped>
.workspace-layout {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.workspace-layout__aside {
  transition: width $transition;
  overflow: hidden;
  flex-shrink: 0;
  border-right: 1px solid $border-color;
  background: #fff;
}

.workspace-layout__main-area {
  flex: 1;
  min-width: 0;
}

.workspace-layout__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  border-bottom: 1px solid $border-color;
  background: #fff;
  flex-shrink: 0;
}

.workspace-layout__header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workspace-layout__title {
  font-size: 14px;
  font-weight: 600;
  color: $text-color;
}

.workspace-layout__header-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.workspace-layout__main {
  padding: 0;
  overflow: auto;
  background: $bg-color;
  position: relative;
}

.prd-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: flex-end;
}

.prd-overlay__panel {
  height: 100%;
}

.prd-slide-enter-active,
.prd-slide-leave-active {
  transition: opacity 0.25s ease;

  .prd-overlay__panel {
    transition: transform 0.25s ease;
  }
}

.prd-slide-enter-from,
.prd-slide-leave-to {
  opacity: 0;

  .prd-overlay__panel {
    transform: translateX(100%);
  }
}
</style>
