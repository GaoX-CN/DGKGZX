<template>
  <div class="resizable-panel" :class="{ 'is-visible': visible }" :style="panelStyle">
    <div class="resizable-panel__handle" @mousedown="onResizeStart" />
    <div class="resizable-panel__content">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { useUiStore } from '@/stores/uiStore'

const uiStore = useUiStore()

const props = withDefaults(defineProps<{
  visible: boolean
  width: number
  minWidth?: number
  maxWidth?: number
}>(), {
  minWidth: 400,
  maxWidth: 1000,
})

const emit = defineEmits<{
  'update:width': [width: number]
}>()

const resizing = ref(false)
const startX = ref(0)
const startWidth = ref(0)

const panelStyle = computed(() => ({
  width: props.visible ? `${props.width}px` : '0px',
  minWidth: props.visible ? `${props.minWidth}px` : '0px',
  maxWidth: `${props.maxWidth}px`,
}))

function onResizeStart(e: MouseEvent) {
  resizing.value = true
  startX.value = e.clientX
  startWidth.value = props.width
  uiStore.setPrdResizing(true)
  document.addEventListener('mousemove', onResizeMove)
  document.addEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = 'ew-resize'
  document.body.style.userSelect = 'none'
}

function onResizeMove(e: MouseEvent) {
  if (!resizing.value) return
  const delta = startX.value - e.clientX
  const newWidth = startWidth.value + delta
  emit('update:width', Math.min(Math.max(newWidth, props.minWidth), props.maxWidth))
}

function onResizeEnd() {
  resizing.value = false
  uiStore.setPrdResizing(false)
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onResizeMove)
  document.removeEventListener('mouseup', onResizeEnd)
})
</script>

<style lang="scss" scoped>
.resizable-panel {
  position: relative;
  height: 100%;
  background: #fff;
  border-left: 1px solid $border-color;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
  transition: width $transition;
  flex-shrink: 0;

  &.is-visible {
    overflow: visible;
  }
}

.resizable-panel__handle {
  position: absolute;
  left: -3px;
  top: 0;
  width: 6px;
  height: 100%;
  cursor: ew-resize;
  z-index: 10;
  background: transparent;
  transition: background 0.2s;

  &:hover {
    background: $primary-color;
    opacity: 0.4;
  }
}

.resizable-panel__content {
  height: 100%;
  overflow: auto;
}
</style>
