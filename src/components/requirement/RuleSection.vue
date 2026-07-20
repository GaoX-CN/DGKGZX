<template>
  <SectionBlock title="业务规则">
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
      <div class="rule-edit">
        <div
          v-for="(rule, index) in localRules"
          :key="index"
          class="rule-edit__item"
        >
          <el-input
            v-model="localRules[index]"
            type="textarea"
            :rows="2"
            size="small"
            :placeholder="`规则 ${index + 1}`"
          />
          <el-button text type="danger" size="small" :icon="Delete" @click="removeRule(index)" />
        </div>
        <el-button size="small" :icon="Plus" @click="addRule">添加规则</el-button>

        <el-divider />

        <div class="rule-images">
          <div class="rule-images__grid">
            <div
              v-for="(img, index) in localImages"
              :key="index"
              class="rule-images__thumb"
            >
              <el-image
                :src="img.path"
                :preview-src-list="[img.path]"
                fit="cover"
                class="rule-images__img"
              />
              <span class="rule-images__label">{{ img.fileName }}</span>
              <el-button
                text
                type="danger"
                size="small"
                :icon="Delete"
                class="rule-images__remove"
                @click="removeImage(index)"
              />
            </div>
          </div>
          <el-upload
            :auto-upload="false"
            :show-file-list="false"
            accept="image/*"
            @change="onImageChange"
          >
            <el-button size="small" :icon="Plus">上传图片</el-button>
          </el-upload>
        </div>
      </div>
    </template>

    <template v-else>
      <template v-if="localRules.length > 0">
        <div v-for="(rule, index) in localRules" :key="index" class="rule-item">
          <span class="rule-item__index">{{ index + 1 }}.</span>
          <span>{{ rule }}</span>
        </div>
      </template>
      <EmptyState v-else description="暂无业务规则" :image-size="60" />

      <div v-if="localImages.length > 0" class="rule-images-preview">
        <el-divider v-if="localRules.length > 0" />
        <div class="rule-images-preview__grid">
          <div v-for="(img, index) in localImages" :key="index" class="rule-images-preview__thumb">
            <el-image
              :src="img.path"
              :preview-src-list="[img.path]"
              fit="cover"
              class="rule-images-preview__img"
            />
            <span class="rule-images-preview__label">{{ img.fileName }}</span>
          </div>
        </div>
      </div>
    </template>
  </SectionBlock>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { Edit, Delete, Plus } from '@element-plus/icons-vue'
import type { RuleImage } from '@/types/requirement'
import SectionBlock from './SectionBlock.vue'
import EmptyState from '@/components/common/EmptyState.vue'

const props = defineProps<{
  rules: string[]
  ruleImages: RuleImage[]
  editing: boolean
  editable: boolean
}>()

const emit = defineEmits<{
  save: [data: { rules: string[]; ruleImages: RuleImage[] }]
  cancel: []
  edit: []
}>()

const localRules = ref<string[]>([...props.rules])
const localImages = ref<RuleImage[]>([...props.ruleImages])

watch(() => props.rules, (val) => {
  localRules.value = [...val]
})
watch(() => props.ruleImages, (val) => {
  localImages.value = [...val]
})

function addRule() {
  localRules.value.push('')
}

function removeRule(index: number) {
  localRules.value.splice(index, 1)
}

function removeImage(index: number) {
  localImages.value.splice(index, 1)
}

async function onImageChange(file: any) {
  const raw = file.raw as File
  if (!raw) return
  const reader = new FileReader()
  reader.onload = async (e) => {
    const dataUrl = e.target?.result as string
    if (!dataUrl) return
    localImages.value.push({ path: dataUrl, fileName: raw.name })
  }
  reader.readAsDataURL(raw)
}

function onSave() {
  emit('save', {
    rules: [...localRules.value],
    ruleImages: [...localImages.value],
  })
}
</script>

<style lang="scss" scoped>
.rule-edit__item {
  display: flex;
  gap: 4px;
  align-items: flex-start;
  margin-bottom: 8px;

  .el-textarea {
    flex: 1;
  }
}

.rule-item {
  font-size: 13px;
  color: $text-color;
  line-height: 1.8;
}

.rule-item__index {
  color: $text-secondary;
  margin-right: 4px;
}

.rule-images {
  margin-top: 4px;
}

.rule-images__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
}

.rule-images__thumb {
  position: relative;
  width: 80px;
  border: 1px solid $border-color;
  border-radius: $radius;
  overflow: hidden;
  background: #fff;
}

.rule-images__img {
  width: 80px;
  height: 60px;
  display: block;
}

.rule-images__label {
  display: block;
  font-size: 10px;
  color: $text-secondary;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.rule-images__remove {
  position: absolute;
  top: 0;
  right: 0;
  padding: 2px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 0 0 0 4px;
}

.rule-images-preview {
  margin-top: 8px;
}

.rule-images-preview__grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.rule-images-preview__thumb {
  width: 80px;
  border: 1px solid $border-color;
  border-radius: $radius;
  overflow: hidden;
  background: #fff;
  cursor: pointer;
  transition: box-shadow 0.2s;

  &:hover {
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
  }
}

.rule-images-preview__img {
  width: 80px;
  height: 60px;
  display: block;
}

.rule-images-preview__label {
  display: block;
  font-size: 10px;
  color: $text-secondary;
  padding: 2px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
