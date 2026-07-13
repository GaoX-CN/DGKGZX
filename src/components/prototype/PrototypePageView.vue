<template>
  <div class="prototype-page-view" ref="pageRef">
    <div
      v-for="module in currentPage?.modules ?? []"
      :key="module.moduleId"
      :data-module-id="module.moduleId"
      class="prototype-page-view__module"
      :style="moduleStyle(module)"
    >
      <div class="prototype-page-view__module-label">
        {{ module.moduleName }}
      </div>
      <div class="prototype-page-view__module-content">
        <slot :name="module.moduleId" :module="module" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { usePrototypeStore } from '@/stores/prototypeStore'
import type { PrototypeModule } from '@/types/prototype'

const prototypeStore = usePrototypeStore()
const pageRef = ref<HTMLElement | null>(null)

const currentPage = computed(() => prototypeStore.currentPage)

function moduleStyle(module: PrototypeModule) {
  const { x, y, width, height } = module.bounds
  return {
    left: `${x}px`,
    top: `${y}px`,
    width: width ? `${width}px` : 'auto',
    height: height ? `${height}px` : 'auto',
  }
}
</script>

<style lang="scss" scoped>
.prototype-page-view {
  position: relative;
  min-height: 100%;
  width: 100%;
}

.prototype-page-view__module {
  position: absolute;
  border: 1px dashed transparent;
  border-radius: $radius;
  transition: border-color 0.2s, box-shadow 0.2s;
  cursor: pointer;

  &:hover {
    border-color: $primary-color;
  }
}

.prototype-page-view__module-label {
  position: absolute;
  top: -20px;
  left: 0;
  font-size: 11px;
  color: $primary-color;
  background: rgba(64, 158, 255, 0.1);
  padding: 1px 6px;
  border-radius: 2px;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s;
  pointer-events: none;
}

.prototype-page-view__module:hover .prototype-page-view__module-label {
  opacity: 1;
}

.prototype-page-view__module-content {
  pointer-events: none;
}
</style>
