<template>
  <div class="sc-page">
    <el-form :model="query" inline class="sc-search">
      <el-form-item label="合同编号 / 名称"><el-input v-model="query.keyword" placeholder="请输入" clearable style="width: 220px" /></el-form-item>
      <el-form-item label="计费方式"><el-select v-model="query.billingMethod" placeholder="全部" clearable style="width: 150px"><el-option label="按容量" value="按容量" /><el-option label="按最大需量" value="按最大需量" /></el-select></el-form-item>
      <el-form-item label="合同状态"><el-select v-model="query.status" placeholder="全部" clearable style="width: 120px"><el-option label="生效中" value="active" /><el-option label="即将到期" value="expiring" /><el-option label="已到期" value="expired" /></el-select></el-form-item>
      <el-form-item><el-button type="primary" :icon="Search" @click="page = 1">查询</el-button><el-button :icon="Refresh" @click="resetQuery">重置</el-button></el-form-item>
    </el-form>

    <div class="sc-actions"><el-button type="primary" :icon="Plus" @click="openCreate">新增供电合同</el-button><span class="sc-actions__count">共 {{ filteredContracts.length }} 条记录</span></div>

    <el-table :data="pageRows" border stripe style="width: 100%">
      <el-table-column type="index" label="序号" width="58" align="center" />
      <el-table-column prop="code" label="合同编号" width="165" />
      <el-table-column prop="name" label="合同名称" min-width="220" show-overflow-tooltip />
      <el-table-column label="合同范围" width="180" show-overflow-tooltip><template #default="{ row }">{{ contractScopeLabel(row.scope) }}</template></el-table-column>
      <el-table-column label="合同容量" width="125" align="right"><template #default="{ row }">{{ row.capacity.toLocaleString() }} kVA</template></el-table-column>
      <el-table-column prop="billingMethod" label="计费方式" width="125" align="center"><template #default="{ row }"><el-tag :type="row.billingMethod === '按最大需量' ? 'warning' : 'primary'" size="small">{{ row.billingMethod }}</el-tag></template></el-table-column>
      <el-table-column label="基本电价" width="165" align="right"><template #default="{ row }">{{ row.basicPrice }} 元/{{ row.billingMethod === '按容量' ? 'kVA·月' : 'kW·月' }}</template></el-table-column>
      <el-table-column label="合同有效期" width="210"><template #default="{ row }">{{ row.startDate }} 至 {{ row.endDate }}</template></el-table-column>
      <el-table-column label="关联进线" width="115" align="center"><template #default="{ row }"><el-button link type="primary" @click="openDetail(row)">{{ linkedLines(row.id).length }} 条</el-button></template></el-table-column>
      <el-table-column label="合同状态" width="105" align="center"><template #default="{ row }"><el-tag :type="contractStatusType(row)" size="small" effect="dark">{{ contractStatus(row) }}</el-tag></template></el-table-column>
      <el-table-column label="操作" width="155" fixed="right" align="center"><template #default="{ row }"><el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button><el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button><el-popconfirm :title="linkedLines(row.id).length ? '该合同已有关联高压进线，不可删除。' : '确认删除该供电合同？'" :disabled="linkedLines(row.id).length > 0" @confirm="removeContract(row.id)"><template #reference><el-button link type="danger" size="small" :disabled="linkedLines(row.id).length > 0">删除</el-button></template></el-popconfirm></template></el-table-column>
    </el-table>
    <div class="sc-pagination"><el-pagination v-model:current-page="page" :page-size="pageSize" :total="filteredContracts.length" layout="total, prev, pager, next" /></div>

    <el-drawer v-model="formVisible" :title="editingId ? '编辑供电合同' : '新增供电合同'" direction="rtl" size="min(680px, 100%)" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="合同编号" prop="code"><el-input v-model="form.code" placeholder="请输入" /></el-form-item></el-col><el-col :span="12"><el-form-item label="合同名称" prop="name"><el-input v-model="form.name" placeholder="请输入" /></el-form-item></el-col></el-row>
        <el-form-item label="合同范围" prop="scope"><el-cascader v-model="form.scope" :options="scopeOptions" :props="{ checkStrictly: true, emitPath: true }" placeholder="请选择合同适用范围" style="width: 100%" /></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="合同容量" prop="capacity"><el-input-number v-model="form.capacity" :min="1" :precision="0" controls-position="right" style="width: 100%"><template #suffix>kVA</template></el-input-number></el-form-item></el-col><el-col :span="12"><el-form-item label="计费方式" prop="billingMethod"><el-radio-group v-model="form.billingMethod"><el-radio value="按容量">按容量</el-radio><el-radio value="按最大需量">按最大需量</el-radio></el-radio-group></el-form-item></el-col></el-row>
        <el-form-item label="基本电价" prop="basicPrice"><el-input-number v-model="form.basicPrice" :min="0" :precision="2" :step="0.01" controls-position="right" style="width: 260px"><template #suffix>元/{{ form.billingMethod === '按容量' ? 'kVA·月' : 'kW·月' }}</template></el-input-number></el-form-item>
        <el-row :gutter="16"><el-col :span="12"><el-form-item label="生效日期" prop="startDate"><el-date-picker v-model="form.startDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" /></el-form-item></el-col><el-col :span="12"><el-form-item label="到期日期" prop="endDate"><el-date-picker v-model="form.endDate" type="date" value-format="YYYY-MM-DD" placeholder="选择日期" style="width: 100%" /></el-form-item></el-col></el-row>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="4" maxlength="200" show-word-limit placeholder="请输入备注" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="formVisible = false">取消</el-button><el-button type="primary" @click="saveContract">保存</el-button></template>
    </el-drawer>

    <el-drawer v-model="detailVisible" title="供电合同详情" direction="rtl" size="min(720px, 100%)">
      <template v-if="detailRow"><el-descriptions :column="2" border><el-descriptions-item label="合同编号">{{ detailRow.code }}</el-descriptions-item><el-descriptions-item label="合同状态"><el-tag :type="contractStatusType(detailRow)" size="small" effect="dark">{{ contractStatus(detailRow) }}</el-tag></el-descriptions-item><el-descriptions-item label="合同名称" span="2">{{ detailRow.name }}</el-descriptions-item><el-descriptions-item label="合同范围" span="2">{{ contractScopeLabel(detailRow.scope) }}</el-descriptions-item><el-descriptions-item label="合同容量">{{ detailRow.capacity.toLocaleString() }} kVA</el-descriptions-item><el-descriptions-item label="计费方式">{{ detailRow.billingMethod }}</el-descriptions-item><el-descriptions-item label="基本电价">{{ detailRow.basicPrice }} 元/{{ detailRow.billingMethod === '按容量' ? 'kVA·月' : 'kW·月' }}</el-descriptions-item><el-descriptions-item label="合同有效期">{{ detailRow.startDate }} 至 {{ detailRow.endDate }}</el-descriptions-item><el-descriptions-item label="备注" span="2">{{ detailRow.remark || '-' }}</el-descriptions-item></el-descriptions><div class="sc-linked"><h4>关联高压进线（{{ linkedLines(detailRow.id).length }}）</h4><el-table :data="linkedLines(detailRow.id)" border size="small"><el-table-column prop="name" label="进线名称" min-width="160" /><el-table-column prop="code" label="进线编号" width="120" /><el-table-column prop="voltageLevel" label="电压等级" width="100" /><el-table-column prop="status" label="状态" width="100" align="center"><template #default="{ row }"><el-tag :type="lineStatusType(row.status)" size="small">{{ lineStatusLabel(row.status) }}</el-tag></template></el-table-column></el-table><el-empty v-if="linkedLines(detailRow.id).length === 0" description="暂未关联高压进线" :image-size="64" /></div></template><template #footer><el-button @click="detailVisible = false">关闭</el-button></template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

type BillingMethod = '按容量' | '按最大需量'
interface Contract { id: number; code: string; name: string; scope: string[]; capacity: number; billingMethod: BillingMethod; basicPrice: number; startDate: string; endDate: string; remark: string }
interface LinkedLine { id: number; name: string; code: string; voltageLevel: string; status: 'running' | 'stopped' | 'maintenance'; contractId: number }
const scopeOptions = [
  { value: 'airport-center', label: '东莞空港中心', children: [
    { value: 'main-plot', label: '主地块', children: [
      { value: 'ct-building', label: 'CT楼' },
      { value: 'ff-building', label: 'FF楼' },
      { value: 'joint-inspection-building', label: '海关联检大楼' },
    ] },
    { value: 'wharf', label: '码头', children: [
      { value: 'wharf-operations', label: '码头作业区' },
      { value: 'wharf-support', label: '码头配套区' },
    ] },
  ] },
]
const scopeLabelMap: Record<string, string> = {
  'airport-center': '东莞空港中心',
  'main-plot': '主地块',
  'ct-building': 'CT楼',
  'ff-building': 'FF楼',
  'joint-inspection-building': '海关联检大楼',
  'wharf': '码头',
  'wharf-operations': '码头作业区',
  'wharf-support': '码头配套区',
}
const contracts = ref<Contract[]>([
  { id: 1, code: 'GD-HT-2025-001', name: '东莞空港中心一期供电合同', scope: ['airport-center'], capacity: 12500, billingMethod: '按最大需量', basicPrice: 42, startDate: '2025-01-01', endDate: '2027-12-31', remark: '主园区生产及公共区域用电。' },
  { id: 2, code: 'GD-HT-2025-002', name: '货运区专线供电合同', scope: ['airport-center', 'wharf', 'wharf-operations'], capacity: 6300, billingMethod: '按容量', basicPrice: 28, startDate: '2025-06-01', endDate: '2028-05-31', remark: '货运区冷链及仓储设备用电。' },
  { id: 3, code: 'GD-HT-2026-001', name: '联检大楼供电合同', scope: ['airport-center', 'main-plot', 'joint-inspection-building'], capacity: 4000, billingMethod: '按最大需量', basicPrice: 42, startDate: '2026-01-01', endDate: '2028-12-31', remark: '' },
  { id: 4, code: 'GD-HT-2026-002', name: 'FF楼供电合同', scope: ['airport-center', 'main-plot', 'ff-building'], capacity: 2500, billingMethod: '按容量', basicPrice: 28, startDate: '2026-08-01', endDate: '2029-07-31', remark: '待 FF 楼进线正式投运后关联。' },
])
const inletLines: LinkedLine[] = [
  { id: 1, name: '一期主供进线', code: 'HV-01', voltageLevel: '10kV', status: 'running', contractId: 1 },
  { id: 2, name: '货运区专线', code: 'HV-02', voltageLevel: '10kV', status: 'running', contractId: 2 },
  { id: 3, name: '联检大楼进线', code: 'HV-03', voltageLevel: '10kV', status: 'maintenance', contractId: 3 },
  { id: 4, name: '一期备用进线', code: 'HV-04', voltageLevel: '10kV', status: 'stopped', contractId: 1 },
]
const query = reactive({ keyword: '', billingMethod: '', status: '' }); const page = ref(1); const pageSize = 10
function contractStatus(row: Contract) { const now = '2026-07-24'; if (row.endDate < now) return '已到期'; if (row.endDate <= '2026-10-24') return '即将到期'; return '生效中' }
function contractStatusType(row: Contract) { return { '生效中': 'success', '即将到期': 'warning', '已到期': 'info' }[contractStatus(row)] }
const filteredContracts = computed(() => contracts.value.filter(row => (!query.keyword || row.code.includes(query.keyword) || row.name.includes(query.keyword)) && (!query.billingMethod || row.billingMethod === query.billingMethod) && (!query.status || ({ active: '生效中', expiring: '即将到期', expired: '已到期' }[query.status] === contractStatus(row)))))
const pageRows = computed(() => filteredContracts.value.slice((page.value - 1) * pageSize, page.value * pageSize))
function linkedLines(contractId: number) { return inletLines.filter(item => item.contractId === contractId) }
function contractScopeLabel(scope: string[]) { return scope.map(item => scopeLabelMap[item] || item).join(' / ') || '-' }
function resetQuery() { Object.assign(query, { keyword: '', billingMethod: '', status: '' }); page.value = 1 }
const formVisible = ref(false); const editingId = ref<number | null>(null); const formRef = ref<FormInstance>()
const emptyForm = () => ({ code: '', name: '', scope: [] as string[], capacity: 0, billingMethod: '按容量' as BillingMethod, basicPrice: 0, startDate: '', endDate: '', remark: '' })
const form = reactive(emptyForm())
const rules: FormRules = { code: [{ required: true, message: '请输入合同编号', trigger: 'blur' }], name: [{ required: true, message: '请输入合同名称', trigger: 'blur' }], scope: [{ required: true, type: 'array', min: 1, message: '请选择合同范围', trigger: 'change' }], capacity: [{ required: true, message: '请输入合同容量', trigger: 'blur' }], billingMethod: [{ required: true, message: '请选择计费方式', trigger: 'change' }], basicPrice: [{ required: true, message: '请输入基本电价', trigger: 'blur' }], startDate: [{ required: true, message: '请选择生效日期', trigger: 'change' }], endDate: [{ required: true, message: '请选择到期日期', trigger: 'change' }] }
function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); formVisible.value = true }
function openEdit(row: Contract) { editingId.value = row.id; Object.assign(form, row); formVisible.value = true }
function saveContract() { formRef.value?.validate(valid => { if (!valid) return; if (form.endDate < form.startDate) return; if (editingId.value) { const index = contracts.value.findIndex(item => item.id === editingId.value); if (index >= 0) contracts.value[index] = { ...form, id: editingId.value } } else { contracts.value.unshift({ ...form, id: Math.max(...contracts.value.map(item => item.id), 0) + 1 }) }; formVisible.value = false }) }
function removeContract(id: number) { contracts.value = contracts.value.filter(item => item.id !== id) }
const detailVisible = ref(false); const detailRow = ref<Contract | null>(null)
function openDetail(row: Contract) { detailRow.value = row; detailVisible.value = true }
function lineStatusLabel(status: LinkedLine['status']) { return { running: '在运', stopped: '停运', maintenance: '检修中' }[status] }
function lineStatusType(status: LinkedLine['status']) { return { running: 'success', stopped: 'info', maintenance: 'warning' }[status] }
</script>

<style scoped>
.sc-page { max-width: 1560px; padding: 20px; }.sc-search { padding: 16px 16px 0; margin-bottom: 16px; border-radius: 4px; background: #fafbfc; }.sc-actions { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }.sc-actions__count { margin-left: auto; color: #909399; font-size: 13px; }.sc-pagination { display: flex; justify-content: flex-end; margin-top: 14px; }.sc-linked { margin-top: 20px; }.sc-linked h4 { margin: 0 0 10px; padding-left: 10px; font-size: 14px; color: #303133; border-left: 3px solid #409eff; }
</style>
