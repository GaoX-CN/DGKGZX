<template>
  <div
    class="floating-button"
    :style="positionStyle"
    @mousedown="onMouseDown"
    ref="buttonRef"
  >
    <el-icon :size="24">
      <Document />
    </el-icon>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Document } from '@element-plus/icons-vue'

const buttonRef = ref<HTMLElement | null>(null)
const x = ref(window.innerWidth - 80)
const y = ref(window.innerHeight - 80)
const dragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)

const positionStyle = computed(() => ({
  left: `${x.value}px`,
  top: `${y.value}px`,
}))

function onMouseDown(e: MouseEvent) {
  dragging.value = true
  dragStartX.value = e.clientX - x.value
  dragStartY.value = e.clientY - y.value
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
}

function onMouseMove(e: MouseEvent) {
  if (!dragging.value) return
  x.value = Math.max(0, Math.min(e.clientX - dragStartX.value, window.innerWidth - 56))
  y.value = Math.max(0, Math.min(e.clientY - dragStartY.value, window.innerHeight - 56))
}

function onMouseUp() {
  dragging.value = false
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style lang="scss" scoped>
.floating-button {
  position: fixed;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: $primary-color;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  z-index: 1000;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.4);
  user-select: none;
  transition: box-shadow $transition;

  &:hover {
    box-shadow: 0 6px 16px rgba(64, 158, 255, 0.55);
  }

  &:active {
    cursor: grabbing;
  }
}
</style>
