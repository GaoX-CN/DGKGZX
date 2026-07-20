<template>
  <SectionBlock title="字段说明">
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
      <el-table :data="localFields" border size="small">
        <el-table-column prop="name" label="字段名">
          <template #default="{ row, $index }">
            <el-input v-model="localFields[$index].name" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="label" label="中文名">
          <template #default="{ row, $index }">
            <el-input v-model="localFields[$index].label" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row, $index }">
            <el-input v-model="localFields[$index].type" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="required" label="必填" width="70">
          <template #default="{ row, $index }">
            <el-switch v-model="localFields[$index].required" size="small" />
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明">
          <template #default="{ row, $index }">
            <el-input v-model="localFields[$index].description" size="small" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="70" fixed="right">
          <template #default="{ $index }">
            <el-button text type="danger" size="small" :icon="Delete" @click="removeField($index)" />
          </template>
        </el-table-column>
      </el-table>
      <el-button size="small" :icon="Plus" class="add-btn" @click="addField">添加字段</el-button>
    </template>

    <template v-else>
      <el-table v-if="localFields.length > 0" :data="localFields" border size="small">
        <el-table-column prop="name" label="字段名" />
        <el-table-column prop="label" label="中文名" />
        <el-table-column prop="type" label="类型" width="100" />
        <el-table-column prop="required" label="必填" width="70">
          <template #default="{ row }">
            <el-tag :type="row.required ? 'danger' : 'info'" size="small">{{ row.required ? '是' : '否' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="说明" />
      </el-table>
      <EmptyState v-else description="暂无字段定义" :image-size="60" />
    </template>
  </SectionBlock>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import type { PrdField } from '@/types/requirement'
import SectionBlock from './SectionBlock.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{
  fields: PrdField[]
  editing: boolean
  editable: boolean
}>()

const emit = defineEmits<{
  save: [fields: PrdField[]]
  cancel: []
  edit: []
}>()

const localFields = ref<PrdField[]>([...props.fields])

watch(() => props.fields, (val) => {
  localFields.value = [...val]
})

function addField() {
  localFields.value.push({
    name: '',
    label: '',
    type: 'string',
    required: false,
    description: '',
    source: 'manual',
    status: 'generated',
  })
}

function removeField(index: number) {
  localFields.value.splice(index, 1)
}

function onSave() {
  emit('save', [...localFields.value])
}
</script>

<style lang="scss" scoped>
.add-btn {
  margin-top: 8px;
}
</style>
