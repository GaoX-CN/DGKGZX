<template>
  <div class="requirement-content">
    <SectionBlock title="功能说明">
      <template #actions>
        <el-button
          text
          size="small"
          :type="currentSection === 'overview' ? 'primary' : 'default'"
          :icon="Edit"
          @click="onEditSection('overview')"
        >
          {{ currentSection === 'overview' ? '保存' : '编辑' }}
        </el-button>
      </template>
      <template v-if="currentSection === 'overview'">
        <div class="edit-section">
          <div class="edit-section__field">
            <label>模块目的 (Purpose)</label>
            <el-input v-model="editData.purpose" type="textarea" :rows="3" />
          </div>
          <div class="edit-section__field">
            <label>模块概述 (Summary)</label>
            <el-input v-model="editData.summary" type="textarea" :rows="5" />
          </div>
        </div>
      </template>
      <template v-else>
        <div class="read-section">
          <div class="read-section__item">
            <div class="read-section__label">模块目的</div>
            <div class="read-section__value">{{ module.purpose || '暂无' }}</div>
          </div>
          <div class="read-section__item">
            <div class="read-section__label">模块概述</div>
            <div class="read-section__value">{{ module.summary || '暂无' }}</div>
          </div>
        </div>
      </template>
    </SectionBlock>

    <RuleSection
      :rules="module.rules"
      :rule-images="module.ruleImages"
      :editing="currentSection === 'rule'"
      @save="onRuleSave"
      @cancel="onSectionCancel"
      @edit="onEditSection('rule')"
    />

    <InteractionSection
      :interactions="module.interactions"
      :editing="currentSection === 'interaction'"
      @save="onInteractionSave"
      @cancel="onSectionCancel"
      @edit="onEditSection('interaction')"
    />

    <FieldSection
      :fields="module.fields"
      :editing="currentSection === 'field'"
      @save="onFieldSave"
      @cancel="onSectionCancel"
      @edit="onEditSection('field')"
    />

    <CustomSection
      :requirements="module.requirements"
      :editing="currentSection === 'custom'"
      @save="onCustomSave"
      @cancel="onSectionCancel"
      @edit="onEditSection('custom')"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from 'vue'
import { Edit } from '@element-plus/icons-vue'
import { useRequirementStore } from '@/stores/requirementStore'
import { saveCurrentPrd } from './PrdJsonLoader'
import type { PrdModule, SectionType, PrdField, PrdInteraction, PrdRequirement, RuleImage } from '@/types/requirement'
import SectionBlock from './SectionBlock.vue'
import FieldSection from './FieldSection.vue'
import RuleSection from './RuleSection.vue'
import InteractionSection from './InteractionSection.vue'
import CustomSection from './CustomSection.vue'

const props = defineProps<{
  module: PrdModule
}>()

const requirementStore = useRequirementStore()
const currentSection = computed(() => requirementStore.currentSection)

const editData = reactive({
  purpose: '',
  summary: '',
})

watch(() => props.module, (m) => {
  editData.purpose = m.purpose
  editData.summary = m.summary
}, { immediate: true })

function onEditSection(section: SectionType) {
  if (currentSection.value === section) {
    if (section === 'overview') {
      onOverviewSave()
    }
    requirementStore.setCurrentSection(null)
  } else {
    requirementStore.setCurrentSection(section)
  }
}

function onSectionCancel() {
  requirementStore.setCurrentSection(null)
}

async function onOverviewSave() {
  requirementStore.updateModuleContent(requirementStore.currentModuleIndex, {
    purpose: editData.purpose,
    summary: editData.summary,
  })
  const prd = requirementStore.currentPagePrd
  if (prd) {
    await saveCurrentPrd(prd)
  }
  requirementStore.setCurrentSection(null)
}

async function onFieldSave(fields: PrdField[]) {
  requirementStore.updateModuleContent(requirementStore.currentModuleIndex, { fields })
  const prd = requirementStore.currentPagePrd
  if (prd) {
    await saveCurrentPrd(prd)
  }
  requirementStore.setCurrentSection(null)
}

async function onRuleSave(data: { rules: string[]; ruleImages: RuleImage[] }) {
  requirementStore.updateModuleContent(requirementStore.currentModuleIndex, {
    rules: data.rules,
    ruleImages: data.ruleImages,
  })
  const prd = requirementStore.currentPagePrd
  if (prd) {
    await saveCurrentPrd(prd)
  }
  requirementStore.setCurrentSection(null)
}

async function onInteractionSave(interactions: PrdInteraction[]) {
  requirementStore.updateModuleContent(requirementStore.currentModuleIndex, { interactions })
  const prd = requirementStore.currentPagePrd
  if (prd) {
    await saveCurrentPrd(prd)
  }
  requirementStore.setCurrentSection(null)
}

async function onCustomSave(requirements: PrdRequirement[]) {
  requirementStore.updateModuleContent(requirementStore.currentModuleIndex, { requirements })
  const prd = requirementStore.currentPagePrd
  if (prd) {
    await saveCurrentPrd(prd)
  }
  requirementStore.setCurrentSection(null)
}
</script>

<style lang="scss" scoped>
.requirement-content {
  padding: 16px;
}

.read-section__item {
  margin-bottom: 16px;

  &:last-child {
    margin-bottom: 0;
  }
}

.read-section__label {
  font-size: 12px;
  font-weight: 600;
  color: $text-secondary;
  margin-bottom: 4px;
}

.read-section__value {
  font-size: 13px;
  color: $text-color;
  line-height: 1.6;
  white-space: pre-wrap;
}

.edit-section__field {
  margin-bottom: 12px;

  &:last-child {
    margin-bottom: 0;
  }

  label {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: $text-secondary;
    margin-bottom: 6px;
  }
}
</style>
