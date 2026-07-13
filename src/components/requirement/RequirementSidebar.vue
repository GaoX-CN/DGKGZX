<template>
  <div class="requirement-sidebar">
    <div
      v-for="(item, index) in items"
      :key="item.id"
      :class="['requirement-sidebar__item', { 'is-active': index === currentIndex }]"
      @click="$emit('select', index)"
    >
      <el-icon :size="14" v-if="index === currentIndex"><ArrowRightBold /></el-icon>
      <span class="requirement-sidebar__label">{{ item.title }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ArrowRightBold } from '@element-plus/icons-vue'

defineProps<{
  items: { id: string; title: string }[]
  currentIndex: number
}>()

defineEmits<{
  select: [index: number]
}>()
</script>

<style lang="scss" scoped>
.requirement-sidebar {
  padding: 8px 0;
}

.requirement-sidebar__item {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  font-size: 12px;
  color: $text-color;
  cursor: pointer;
  transition: background 0.2s;
  border-left: 3px solid transparent;

  &:hover {
    background: rgba(64, 158, 255, 0.05);
  }

  &.is-active {
    background: rgba(64, 158, 255, 0.08);
    color: $primary-color;
    font-weight: 500;
    border-left-color: $primary-color;
  }
}

.requirement-sidebar__label {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
