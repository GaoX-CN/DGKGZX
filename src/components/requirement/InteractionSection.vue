<template>
  <SectionBlock title="交互说明">
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
      <el-table :data="localInteractions" border size="small">
        <el-table-column prop="trigger" label="触发方式">
          <template #default="{ row, $index }">
            <el-input v-model="localInteractions[$index].trigger" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="action" label="执行动作">
          <template #default="{ row, $index }">
            <el-input v-model="localInteractions[$index].action" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明">
          <template #default="{ row, $index }">
            <el-input v-model="localInteractions[$index].description" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right">
          <template #default="{ $index }">
            <el-button text type="danger" size="small" :icon="Delete" @click="removeInteraction($index)" />
          </template>
        </el-table-column>
      </el-table>
      <el-button size="small" :icon="Plus" class="add-btn" @click="addInteraction">添加交互</el-button>
    </template>

    <template v-else>
      <el-table v-if="localInteractions.length > 0" :data="localInteractions" border size="small">
        <el-table-column prop="trigger" label="触发方式" />
        <el-table-column prop="action" label="执行动作" />
        <el-table-column prop="description" label="说明" />
      </el-table>
      <EmptyState v-else description="暂无交互说明" :image-size="60" />
    </template>
  </SectionBlock>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import type { PrdInteraction } from '@/types/requirement'
import SectionBlock from './SectionBlock.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{
  interactions: PrdInteraction[]
  editing: boolean
  editable: boolean
}>()

const emit = defineEmits<{
  save: [interactions: PrdInteraction[]]
  cancel: []
  edit: []
}>()

const localInteractions = ref<PrdInteraction[]>([...props.interactions])

watch(() => props.interactions, (val) => {
  localInteractions.value = [...val]
})

function addInteraction() {
  localInteractions.value.push({
    trigger: '',
    action: '',
    description: '',
    source: 'manual',
    status: 'generated',
  })
}

function removeInteraction(index: number) {
  localInteractions.value.splice(index, 1)
}

function onSave() {
  emit('save', [...localInteractions.value])
}
</script>

<style lang="scss" scoped>
.add-btn {
  margin-top: 8px;
}
</style>
