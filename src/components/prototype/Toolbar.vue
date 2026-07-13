<template>
  <div class="toolbar">
    <slot />
  </div>
</template>

<script setup lang="ts">
</script>

<style lang="scss" scoped>
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
