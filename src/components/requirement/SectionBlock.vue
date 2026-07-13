<template>
  <div class="section-block">
    <div class="section-block__header">
      <span class="section-block__title">{{ title }}</span>
      <div class="section-block__actions">
        <slot name="actions" />
      </div>
    </div>
    <div class="section-block__body">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  title: string
}>()
</script>

<style lang="scss" scoped>
.section-block {
  margin-bottom: 20px;
  background: #fff;
  border: 1px solid $border-color;
  border-radius: $radius;

  &:last-child {
    margin-bottom: 0;
  }
}

.section-block__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid $border-color;
  background: #fafafa;
}

.section-block__title {
  font-size: 13px;
  font-weight: 600;
  color: $text-color;
}

.section-block__actions {
  display: flex;
  gap: 4px;
}

.section-block__body {
  padding: 14px;
}
</style>
