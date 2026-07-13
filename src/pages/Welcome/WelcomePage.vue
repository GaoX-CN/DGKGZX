<template>
  <div class="welcome-page">
    <div class="welcome-page__container">
      <div class="welcome-page__logo">
        <el-icon :size="64" color="#409eff"><Monitor /></el-icon>
      </div>

      <h1 class="welcome-page__title">欢迎使用 Prototype Workspace</h1>

      <p class="welcome-page__intro">
        Prototype Workspace 是一个原型浏览工作台，支持页面浏览、需求说明查看、
        Prototype 与 PRD 联动等功能，帮助团队高效协作与需求评审。
      </p>

      <div class="welcome-page__cards">
        <div class="info-card" data-module-id="module-status">
          <div class="info-card__header">
            <el-icon :size="18"><DataAnalysis /></el-icon>
            <span>当前工作区状态</span>
          </div>
          <div class="info-card__body">
            <div class="info-card__row">
              <span class="info-card__label">工程版本</span>
              <span class="info-card__value">v1.0.0</span>
            </div>
            <div class="info-card__row">
              <span class="info-card__label">技术栈</span>
              <span class="info-card__value">Vue3 + TypeScript + Vite</span>
            </div>
            <div class="info-card__row">
              <span class="info-card__label">UI 框架</span>
              <span class="info-card__value">Element Plus</span>
            </div>
            <div class="info-card__row">
              <span class="info-card__label">页面数量</span>
              <span class="info-card__value">{{ prototypeStore.pages.length }}</span>
            </div>
          </div>
        </div>

        <div class="info-card" data-module-id="module-next-step">
          <div class="info-card__header">
            <el-icon :size="18"><Guide /></el-icon>
            <span>下一步操作</span>
          </div>
          <div class="info-card__body">
            <p class="info-card__hint">使用 AI 能力生成第一个原型页面</p>
            <div class="info-card__actions">
              <el-tag type="info" size="small">对话式生成</el-tag>
              <el-tag type="info" size="small">PRD 自动同步</el-tag>
              <el-tag type="info" size="small">模块联动</el-tag>
            </div>
          </div>
        </div>

        <div class="info-card" data-module-id="module-recent">
          <div class="info-card__header">
            <el-icon :size="18"><Clock /></el-icon>
            <span>最近页面</span>
          </div>
          <div class="info-card__body">
            <EmptyState description="暂无访问记录" :image-size="50" />
          </div>
        </div>

        <div class="info-card" data-module-id="module-ai">
          <div class="info-card__header">
            <el-icon :size="18"><MagicStick /></el-icon>
            <span>AI 功能</span>
          </div>
          <div class="info-card__body">
            <div class="info-card__ai-items">
              <div class="ai-item">
                <el-icon><ChatDotRound /></el-icon>
                <span>生成原型页面</span>
              </div>
              <div class="ai-item">
                <el-icon><Document /></el-icon>
                <span>生成 PRD 文档</span>
              </div>
              <div class="ai-item">
                <el-icon><Search /></el-icon>
                <span>需求分析</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Monitor,
  DataAnalysis,
  Guide,
  Clock,
  MagicStick,
  ChatDotRound,
  Document,
  Search,
} from '@element-plus/icons-vue'
import { usePrototypeStore } from '@/stores/prototypeStore'
import EmptyState from '@/components/common/EmptyState.vue'

const prototypeStore = usePrototypeStore()
</script>

<style lang="scss" scoped>
.welcome-page {
  height: 100%;
  overflow: auto;
  padding: 40px;
  display: flex;
  justify-content: center;
}

.welcome-page__container {
  max-width: 800px;
  width: 100%;
}

.welcome-page__logo {
  text-align: center;
  margin-bottom: 16px;
}

.welcome-page__title {
  text-align: center;
  font-size: 24px;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 12px;
}

.welcome-page__intro {
  text-align: center;
  font-size: 14px;
  color: $text-secondary;
  line-height: 1.6;
  margin-bottom: 32px;
}

.welcome-page__cards {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
}

.info-card {
  background: #fff;
  border: 1px solid $border-color;
  border-radius: 6px;
  overflow: hidden;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.info-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: $text-color;
  border-bottom: 1px solid $border-color;
  background: #fafafa;
}

.info-card__body {
  padding: 16px;
}

.info-card__row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  font-size: 13px;

  &:not(:last-child) {
    border-bottom: 1px dashed #ebeef5;
  }
}

.info-card__label {
  color: $text-secondary;
}

.info-card__value {
  color: $text-color;
  font-weight: 500;
}

.info-card__hint {
  font-size: 13px;
  color: $text-secondary;
  margin-bottom: 10px;
}

.info-card__actions {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.info-card__ai-items {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ai-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: $text-color;
  padding: 6px 8px;
  border-radius: $radius;
  cursor: pointer;
  transition: background 0.2s;

  &:hover {
    background: rgba(64, 158, 255, 0.06);
    color: $primary-color;
  }
}
</style>
