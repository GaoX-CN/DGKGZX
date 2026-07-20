<template>
  <div class="os-page">
    <div class="os-main">
        <el-form :model="filters" inline class="os-filter">
          <el-form-item label="规范名称"><el-input v-model="filters.keyword" placeholder="输入名称、编号" clearable /></el-form-item>
          <el-form-item label="事件类型"><el-select v-model="filters.category" placeholder="全部" clearable><el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" /></el-select></el-form-item>
          <el-form-item label="状态"><el-select v-model="filters.status" placeholder="全部状态" clearable><el-option label="已启用" value="active" /><el-option label="已停用" value="inactive" /></el-select></el-form-item>
          <el-form-item><el-button type="primary" :icon="Search">查询</el-button><el-button :icon="Refresh" @click="resetFilters">重置</el-button></el-form-item>
        </el-form>

        <div class="os-toolbar">
          <div><el-button type="primary" :icon="Plus" @click="openEditor()">新建规范</el-button></div>
          <span>当前展示 <strong>{{ filteredStandards.length }}</strong> 条规范</span>
        </div>

        <el-table :data="filteredStandards" class="os-table" border stripe row-key="id">
          <el-table-column prop="code" label="规范编号" width="128" />
          <el-table-column label="规范名称" min-width="190">
            <template #default="{ row }"><div class="os-name"><span>{{ row.name }}</span><small>{{ row.summary }}</small></div></template>
          </el-table-column>
          <el-table-column label="事件类型" width="118"><template #default="{ row }"><el-tag size="small" effect="plain">{{ categoryName(row.category) }}</el-tag></template></el-table-column>
          <el-table-column prop="area" label="适用区域" width="132" show-overflow-tooltip />
          <el-table-column label="关键步骤" width="86" align="center"><template #default="{ row }"><span class="os-step-count">{{ row.steps.length }} 步</span></template></el-table-column>
          <el-table-column label="版本" width="80" align="center"><template #default="{ row }">V{{ row.version }}</template></el-table-column>
          <el-table-column label="状态" width="92" align="center"><template #default="{ row }"><el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag></template></el-table-column>
          <el-table-column prop="updatedAt" label="最近更新" width="170" />
          <el-table-column label="操作" width="212" fixed="right" align="center">
            <template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">查看</el-button><el-button link type="primary" @click="openEditor(row)">编辑</el-button><el-dropdown trigger="click" @command="(command: string) => handleCommand(command, row)"><el-button link type="primary">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="copy">复制为新规范</el-dropdown-item><el-dropdown-item :command="row.status === 'active' ? 'disable' : 'enable'">{{ row.status === 'active' ? '停用规范' : '启用规范' }}</el-dropdown-item><el-dropdown-item command="delete" divided>删除</el-dropdown-item></el-dropdown-menu></template></el-dropdown></template>
          </el-table-column>
        </el-table>
    </div>

    <el-drawer v-model="editorVisible" :title="editingId ? '编辑应急作业规范' : '新建应急作业规范'" size="760px" :close-on-click-modal="false">
      <div class="os-editor">
        <el-form ref="editorFormRef" :model="editor" :rules="rules" label-width="92px" class="os-editor__form">
          <el-row :gutter="16"><el-col :span="12"><el-form-item label="规范名称" prop="name"><el-input v-model="editor.name" placeholder="请输入规范名称" /></el-form-item></el-col><el-col :span="12"><el-form-item label="事件类型" prop="category"><el-select v-model="editor.category" style="width: 100%"><el-option v-for="category in categories" :key="category.id" :label="category.name" :value="category.id" /></el-select></el-form-item></el-col></el-row>
          <el-form-item label="版本" prop="version"><el-input v-model="editor.version" placeholder="例如：1.0" /></el-form-item>
          <el-form-item label="适用区域" prop="area"><el-cascader v-model="editor.area" :options="areaOptions" :props="{ checkStrictly: true }" clearable filterable style="width: 100%" placeholder="请选择园区、建筑或具体区域" /></el-form-item>
          <el-form-item label="作业说明" prop="summary"><el-input v-model="editor.summary" type="textarea" :rows="2" placeholder="概述本规范的触发场景及处置目标" /></el-form-item>
          <el-divider content-position="left">标准处置步骤</el-divider>
          <div v-for="(step, index) in editor.steps" :key="step.id" class="os-editor__step"><span class="os-editor__step-no">{{ index + 1 }}</span><el-input v-model="step.title" placeholder="处置动作" /><el-input v-model="step.owner" placeholder="责任角色" /><el-button text type="danger" :icon="Delete" aria-label="删除步骤" :disabled="editor.steps.length === 1" @click="editor.steps.splice(index, 1)" /></div>
          <el-button text type="primary" :icon="Plus" @click="addStep">添加处置步骤</el-button>
          <el-divider content-position="left">执行要点</el-divider>
          <el-form-item label="风险提示"><el-input v-model="editor.notice" type="textarea" :rows="2" placeholder="填写人员安全、上报或升级处置要求" /></el-form-item>
        </el-form>
      </div>
      <template #footer><el-button @click="editorVisible = false">取消</el-button><el-button type="primary" @click="saveStandard">保存并启用</el-button></template>
    </el-drawer>

    <el-drawer v-model="detailVisible" title="规范详情" size="620px"><template v-if="detail"><div class="os-detail__hero"><div><span>{{ detail.code }}</span><h3>{{ detail.name }}</h3><p>{{ detail.summary }}</p></div><el-tag :type="statusType(detail.status)">{{ statusLabel(detail.status) }}</el-tag></div><el-descriptions :column="2" border><el-descriptions-item label="事件类型">{{ categoryName(detail.category) }}</el-descriptions-item><el-descriptions-item label="适用区域">{{ detail.area }}</el-descriptions-item><el-descriptions-item label="当前版本">V{{ detail.version }}</el-descriptions-item></el-descriptions><h4>标准处置步骤</h4><div v-for="(step, index) in detail.steps" :key="step.id" class="os-detail__step"><span>{{ index + 1 }}</span><div><b>{{ step.title }}</b><small>责任角色：{{ step.owner }}</small></div></div><div class="os-detail__notice"><el-icon><Warning /></el-icon><div><b>执行要点</b><p>{{ detail.notice || '无' }}</p></div></div></template></el-drawer>
    <el-dialog v-model="deleteVisible" title="删除规范" width="420px"><p class="os-delete-text">确定删除规范「{{ deleting?.name }}」吗？删除后无法恢复。</p><template #footer><el-button @click="deleteVisible = false">取消</el-button><el-button type="danger" @click="confirmDelete">确认删除</el-button></template></el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { ArrowDown, Bell, Delete, DocumentChecked, FirstAidKit, Plus, Refresh, Search, Warning } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

type Status = 'active' | 'inactive'
interface Step { id: number; title: string; owner: string }
interface Standard { id: number; code: string; name: string; summary: string; category: string; area: string; status: Status; version: string; updatedAt: string; updatedBy: string; notice: string; steps: Step[] }
const categories = ref([{ id: 'fire', name: '火灾事故', color: '#f56c6c', icon: Warning }, { id: 'security', name: '治安事件', color: '#409eff', icon: Bell }, { id: 'equipment', name: '设备故障', color: '#e6a23c', icon: DocumentChecked }, { id: 'medical', name: '人员伤害', color: '#67c23a', icon: FirstAidKit }])
const areas = ['全园区', 'CT楼', 'FF楼', '海关联检大楼(OB)', '地下车库']
const standards = ref<Standard[]>([
  { id: 1, code: 'SOP-EM-001', name: '办公区初起火灾处置规范', summary: '适用于办公及公共区域发现初起火情后的先期处置。', category: 'fire', area: '全园区', status: 'active', version: '3.0', updatedAt: '2026-07-16 14:30', updatedBy: '王建国', notice: '确认火势无法控制时，立即撤离并向安全负责人报告，不得单人进入浓烟区域。', steps: [{ id: 11, title: '确认火情并启动现场报警', owner: '首位发现人员' }, { id: 12, title: '使用就近灭火器进行初期扑救', owner: '现场处置人员' }, { id: 13, title: '组织人员沿疏散路线撤离', owner: '楼层疏散引导员' }, { id: 14, title: '向指挥组汇报现场情况', owner: '值班负责人' }] },
  { id: 2, code: 'SOP-EM-006', name: '人员受伤现场救护规范', summary: '适用于作业区域发生外伤、晕厥等人员伤害事件。', category: 'medical', area: '全园区', status: 'active', version: '2.0', updatedAt: '2026-07-11 09:20', updatedBy: '李敏', notice: '未经专业评估不得随意移动伤员；疑似骨折或颈椎伤害时保持原位等待医疗救援。', steps: [{ id: 21, title: '评估现场安全并隔离风险源', owner: '现场负责人' }, { id: 22, title: '呼叫园区医疗救护与120', owner: '值班人员' }, { id: 23, title: '实施基础急救并记录伤情', owner: '持证急救员' }] },
  { id: 3, code: 'SOP-EM-012', name: '配电房突发断电应急处置', summary: '指导配电房异常跳闸、局部失电后的排查和恢复作业。', category: 'equipment', area: 'CT楼', status: 'active', version: '1.0', updatedAt: '2026-07-08 16:10', updatedBy: '陈立', notice: '严禁带负荷拉合隔离开关，恢复供电前须确认下游负荷状态。', steps: [{ id: 31, title: '核实失电影响范围并上报', owner: '电工值班员' }, { id: 32, title: '检查保护装置及设备异常信息', owner: '电工值班员' }, { id: 33, title: '执行经批准的供电恢复方案', owner: '设备主管' }] },
  { id: 4, code: 'SOP-EM-018', name: '可疑人员闯入现场控制规范', summary: '适用于重点区域发现可疑人员、未授权闯入等治安风险事件。', category: 'security', area: '海关联检大楼(OB)', status: 'active', version: '2.0', updatedAt: '2026-06-30 11:45', updatedBy: '赵凯', notice: '处置人员应保持安全距离，避免单独与对方发生冲突。', steps: [{ id: 41, title: '视频核实并通知就近安保人员', owner: '监控值班员' }, { id: 42, title: '现场劝离并核验身份', owner: '安保巡逻员' }, { id: 43, title: '升级报告并保全现场记录', owner: '安保主管' }] },
  { id: 5, code: 'SOP-EM-021', name: '地下车库积水排险规范', summary: '适用于暴雨期间地下车库出现积水倒灌风险的应急排险。', category: 'equipment', area: '地下车库', status: 'inactive', version: '1.0', updatedAt: '2026-06-18 10:00', updatedBy: '陈立', notice: '涉水作业前必须确认供电隔离，严禁在带电区域内排水。', steps: [{ id: 51, title: '封控车库入口并通知车辆转移', owner: '秩序维护员' }, { id: 52, title: '启动排水设施并检查水位', owner: '设备值班员' }] },
])
const filters = reactive({ keyword: '', category: '', status: '' }); const editorVisible = ref(false); const detailVisible = ref(false); const deleteVisible = ref(false); const editingId = ref<number | null>(null); const detail = ref<Standard | null>(null); const deleting = ref<Standard | null>(null); const editorFormRef = ref<FormInstance>(); let stepSeed = 100
const areaOptions = [{
  value: '全园区',
  label: '全园区',
  children: [
    { value: 'CT楼', label: 'CT楼', children: [{ value: '1F', label: '1F', children: [{ value: '办公区', label: '办公区' }, { value: '配电房', label: '配电房' }] }, { value: '2F', label: '2F' }, { value: '屋顶层', label: '屋顶层' }] },
    { value: 'FF楼', label: 'FF楼', children: [{ value: '1F', label: '1F', children: [{ value: '作业区', label: '作业区' }, { value: '卸货平台', label: '卸货平台' }] }, { value: 'S夹层', label: 'S夹层' }, { value: '7F', label: '7F' }, { value: '8F', label: '8F' }] },
    { value: '海关联检大楼(OB)', label: '海关联检大楼(OB)', children: [{ value: '1F', label: '1F' }, { value: '2F', label: '2F' }] },
    { value: '地下车库', label: '地下车库', children: [{ value: 'B1', label: 'B1' }, { value: 'B2', label: 'B2' }] },
  ],
}]
const editor = reactive({ name: '', category: '', area: [] as string[], version: '', summary: '', notice: '', status: 'active' as Status, steps: [] as Step[] })
const rules: FormRules = { name: [{ required: true, message: '请输入规范名称', trigger: 'blur' }], category: [{ required: true, message: '请选择事件类型', trigger: 'change' }], area: [{ required: true, message: '请选择适用区域', trigger: 'change' }], version: [{ required: true, message: '请输入版本号', trigger: 'blur' }], summary: [{ required: true, message: '请输入作业说明', trigger: 'blur' }] }
const filteredStandards = computed(() => standards.value.filter(item => (!filters.category || item.category === filters.category) && (!filters.keyword || `${item.name}${item.code}`.includes(filters.keyword)) && (!filters.status || item.status === filters.status)))
function categoryName(id: string) { return categories.value.find(item => item.id === id)?.name || id }
function countByCategory(id: string) { return standards.value.filter(item => item.category === id).length }
function statusLabel(status: Status) { return ({ active: '已启用', inactive: '已停用' })[status] }
function statusType(status: Status) { return ({ active: 'success', inactive: 'info' })[status] }
function resetFilters() { filters.keyword = ''; filters.category = ''; filters.status = '' }
function openEditor(row?: Standard) { editingId.value = row?.id ?? null; Object.assign(editor, row ? { name: row.name, category: row.category, area: row.area.split(' / '), version: row.version, summary: row.summary, notice: row.notice, status: row.status, steps: row.steps.map(step => ({ ...step })) } : { name: '', category: 'fire', area: ['全园区'], version: '1.0', summary: '', notice: '', status: 'active', steps: [{ id: ++stepSeed, title: '', owner: '' }] }); editorVisible.value = true }
function addStep() { editor.steps.push({ id: ++stepSeed, title: '', owner: '' }) }
function saveStandard() { editorFormRef.value?.validate(valid => { if (!valid) return; const now = '2026-07-17 10:20'; const area = editor.area.join(' / '); if (editingId.value) { const index = standards.value.findIndex(item => item.id === editingId.value); const current = standards.value[index]; standards.value[index] = { ...current, ...editor, area, steps: editor.steps.map(step => ({ ...step })), status: 'active', updatedAt: now, updatedBy: '当前用户' } } else { const id = Math.max(...standards.value.map(item => item.id)) + 1; standards.value.unshift({ id, code: `SOP-EM-${String(id + 20).padStart(3, '0')}`, ...editor, area, steps: editor.steps.map(step => ({ ...step })), status: 'active', updatedAt: now, updatedBy: '当前用户' }) } editorVisible.value = false }) }
function openDetail(row: Standard) { detail.value = row; detailVisible.value = true }
function handleCommand(command: string, row: Standard) { if (command === 'copy') { openEditor({ ...row, id: 0, name: `${row.name}（副本）`, status: 'inactive', steps: row.steps.map(step => ({ ...step, id: ++stepSeed })) }) } else if (command === 'delete') { deleting.value = row; deleteVisible.value = true } else { row.status = command === 'enable' ? 'active' : 'inactive' } }
function confirmDelete() { if (deleting.value) standards.value = standards.value.filter(item => item.id !== deleting.value!.id); deleteVisible.value = false; deleting.value = null }
</script>

<style scoped>
.os-page { min-width: 1060px; padding: 24px; color: #253047; }.os-main { max-width:1500px; }.os-filter { padding:16px 16px 0; margin-bottom:16px; background:#fafbfc; border-radius:4px; }.os-filter :deep(.el-input),.os-filter :deep(.el-select) { width:158px; }.os-toolbar { display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; }.os-toolbar span { font-size:13px; color:#909399; }.os-toolbar strong { color:#409eff; }.os-table :deep(.el-table__cell) { padding:10px 0; }.os-name span,.os-name small { display:block; }.os-name small { margin-top:4px; font-size:12px; color:#8792a3; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }.os-step-count { color:#4f5f77; font-size:12px; }
.os-editor { padding:0 8px; }.os-editor__form { margin-top:20px; }.os-editor__step { display:grid; grid-template-columns:28px 1fr 130px 32px; gap:8px; align-items:center; margin:8px 0; }.os-editor__step-no { display:grid; place-items:center; width:24px; height:24px; background:#eaf3ff; color:#2375d8; border-radius:50%; font-size:12px; }.os-detail__hero { display:flex; justify-content:space-between; padding:18px; margin-bottom:18px; background:#f6f9fd; border-left:3px solid #2375d8; }.os-detail__hero span { color:#71809a; font-size:12px; }.os-detail__hero h3 { margin:5px 0; font-size:18px; }.os-detail__hero p { font-size:13px; color:#6e7a90; }.os-detail__step { display:flex; gap:12px; align-items:center; padding:11px 0; border-bottom:1px solid #edf0f5; }.os-detail__step > span { display:grid; place-items:center; width:25px; height:25px; border-radius:50%; background:#eaf3ff; color:#2375d8; font-size:12px; }.os-detail__step b,.os-detail__step small { display:block; }.os-detail__step small { margin-top:3px; color:#7f8aa0; font-size:12px; }.os-detail__notice { display:flex; gap:10px; padding:12px; margin:18px 0; background:#fff8eb; color:#885c0a; border:1px solid #faecd8; border-radius:4px; }.os-detail__notice p { margin-top:4px; font-size:13px; line-height:1.5; }.os-detail h4 { margin:20px 0 10px; font-size:14px; }.os-delete-text { color:#5d687c; line-height:1.6; }
</style>
