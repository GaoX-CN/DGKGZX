<template>
  <SectionBlock title="需求列表">
    <template #actions>
      <el-button
        v-if="editable && !editing"
        text
        size="small"
        :icon="Edit"
        @click="$emit('edit')"
      >
        编辑
      </el-button>
      <template v-else>
        <el-button text size="small" type="primary" @click="onSave">保存</el-button>
        <el-button text size="small" @click="$emit('cancel')">取消</el-button>
      </template>
    </template>

    <template v-if="editing">
      <div
        v-for="(req, index) in localRequirements"
        :key="index"
        class="req-card"
      >
        <div class="req-card__header">
          <el-input
            v-model="localRequirements[index].title"
            size="small"
            placeholder="需求标题"
            class="req-card__title-input"
          />
          <el-select v-model="localRequirements[index].priority" size="small" style="width: 100px">
            <el-option label="P0" value="P0" />
            <el-option label="P1" value="P1" />
            <el-option label="P2" value="P2" />
          </el-select>
          <el-button text type="danger" size="small" :icon="Delete" @click="removeRequirement(index)" />
        </div>
        <el-input
          v-model="localRequirements[index].details"
          type="textarea"
          :rows="2"
          size="small"
          placeholder="需求详情"
          class="req-card__details"
        />
      </div>
      <el-button size="small" :icon="Plus" @click="addRequirement">添加需求</el-button>
    </template>

    <template v-else>
      <div v-if="localRequirements.length > 0">
        <div v-for="(req, index) in localRequirements" :key="index" class="req-item">
          <div class="req-item__header">
            <el-tag :type="priorityTagType(req.priority)" size="small">{{ priorityLabel(req.priority) }}</el-tag>
            <span class="req-item__title">{{ req.title }}</span>
          </div>
          <div class="req-item__details">{{ req.details }}</div>
        </div>
      </div>
      <EmptyState v-else description="暂无需求项" :image-size="60" />
    </template>
  </SectionBlock>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import type { PrdRequirement } from '@/types/requirement'
import SectionBlock from './SectionBlock.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{
  requirements: PrdRequirement[]
  editing: boolean
  editable: boolean
}>()

const emit = defineEmits<{
  save: [requirements: PrdRequirement[]]
  cancel: []
  edit: []
}>()

const localRequirements = ref<PrdRequirement[]>([...props.requirements])

watch(() => props.requirements, (val) => {
  localRequirements.value = [...val]
})

function addRequirement() {
  localRequirements.value.push({
    title: '',
    priority: 'P1',
    details: '',
    source: 'manual',
    status: 'generated',
  })
}

function removeRequirement(index: number) {
  localRequirements.value.splice(index, 1)
}

function onSave() {
  emit('save', [...localRequirements.value])
}

function priorityTagType(p: string) {
  return p === 'P0' ? 'danger' : p === 'P1' ? 'warning' : 'info'
}

function priorityLabel(p: string) {
  return p === 'P0' ? 'P0' : p === 'P1' ? 'P1' : 'P2'
}
</script>

<style lang="scss" scoped>
.req-card {
  border: 1px solid $border-color;
  border-radius: $radius;
  padding: 10px;
  margin-bottom: 10px;
  background: $bg-color;
}

.req-card__header {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 8px;
}

.req-card__title-input {
  flex: 1;
}

.req-card__details {
  width: 100%;
}

.req-item {
  padding: 8px 0;
  border-bottom: 1px dashed $border-color;

  &:last-child {
    border-bottom: none;
  }
}

.req-item__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.req-item__title {
  font-size: 13px;
  font-weight: 500;
  color: $text-color;
}

.req-item__details {
  font-size: 12px;
  color: $text-secondary;
  margin-left: 48px;
  line-height: 1.5;
}
</style>
