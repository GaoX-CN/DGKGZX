<template>
  <div class="loading-wrapper" v-loading="true" :element-loading-text="text">
    <div style="height: 200px" />
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{
  text?: string
}>(), {
  text: '加载中...',
})
</script>

<style lang="scss" scoped>
.loading-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
