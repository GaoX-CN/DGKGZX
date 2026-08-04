<template>
  <div class="hv-page">
    <el-form :model="query" inline class="hv-search">
      <el-form-item label="进线名称 / 编号">
        <el-input v-model="query.keyword" placeholder="请输入" clearable style="width: 210px" />
      </el-form-item>
      <el-form-item label="电压等级">
        <el-select v-model="query.voltageLevel" placeholder="全部" clearable style="width: 120px">
          <el-option v-for="item in voltageOptions" :key="item" :label="item" :value="item" />
        </el-select>
      </el-form-item>
      <el-form-item label="当前状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="在运" value="running" />
          <el-option label="停运" value="stopped" />
          <el-option label="检修中" value="maintenance" />
        </el-select>
      </el-form-item>
      <el-form-item label="供电单位">
        <el-input v-model="query.supplier" placeholder="请输入" clearable style="width: 190px" />
      </el-form-item>
      <el-form-item label="区域">
        <el-cascader v-model="query.area" :options="areaOptions" :props="{ checkStrictly: true, emitPath: true }" clearable placeholder="全部" style="width: 210px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="page = 1">查询</el-button>
        <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
      </el-form-item>
    </el-form>

    <div class="hv-actions">
      <el-button type="primary" :icon="Plus" @click="openCreate">新增高压进线</el-button>
      <span class="hv-actions__count">共 {{ filteredLines.length }} 条记录</span>
    </div>

    <el-table :data="pageRows" border stripe style="width: 100%">
      <el-table-column type="index" label="序号" width="58" align="center" />
      <el-table-column prop="name" label="进线名称" width="190" show-overflow-tooltip />
      <el-table-column prop="code" label="进线编号" width="135" />
      <el-table-column prop="voltageLevel" label="电压等级" width="100" align="center" />
      <el-table-column prop="powerSource" label="电源名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="区域" width="190" show-overflow-tooltip>
        <template #default="{ row }">{{ areaLabel(row.area) }}</template>
      </el-table-column>
      <el-table-column prop="accessDistributionRoom" label="接入配电室" width="160" show-overflow-tooltip />
      <el-table-column prop="supplier" label="所属供电单位" width="170" show-overflow-tooltip />
      <el-table-column label="供电合同" width="180" show-overflow-tooltip>
        <template #default="{ row }">
          <el-button v-if="getContract(row.contractId)" link type="primary" @click="openContractPreview(row.contractId)">{{ getContract(row.contractId)?.name }}</el-button>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="计费计量点" width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ getMeter(row.meterId)?.name || '-' }}</template>
      </el-table-column>
      <el-table-column label="合同容量" width="110" align="right">
        <template #default="{ row }">{{ formatCapacity(row.contractId) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }"><el-tag :type="statusType(row.status)" size="small" effect="dark">{{ statusLabel(row.status) }}</el-tag></template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-popconfirm title="确认删除该高压进线？" @confirm="removeLine(row.id)">
            <template #reference><el-button link type="danger" size="small">删除</el-button></template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <div class="hv-pagination">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="filteredLines.length" layout="total, prev, pager, next" />
    </div>

    <el-drawer v-model="formVisible" :title="editingId ? '编辑高压进线' : '新增高压进线'" direction="rtl" size="min(720px, 100%)" :close-on-click-modal="false">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="112px">
        <el-divider content-position="left">基本信息</el-divider>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="进线名称" prop="name"><el-input v-model="form.name" placeholder="请输入" /></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="进线编号" prop="code"><el-input v-model="form.code" placeholder="如：HV-01" /></el-form-item></el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12"><el-form-item label="电压等级" prop="voltageLevel"><el-select v-model="form.voltageLevel" placeholder="请选择" style="width: 100%"><el-option v-for="item in voltageOptions" :key="item" :label="item" :value="item" /></el-select></el-form-item></el-col>
          <el-col :span="12"><el-form-item label="当前状态" prop="status"><el-select v-model="form.status" placeholder="请选择" style="width: 100%"><el-option label="在运" value="running" /><el-option label="停运" value="stopped" /><el-option label="检修中" value="maintenance" /></el-select></el-form-item></el-col>
        </el-row>
        <el-form-item label="电源名称" prop="powerSource"><el-input v-model="form.powerSource" placeholder="请输入电源名称" /></el-form-item>
        <el-form-item label="区域" prop="area"><el-cascader v-model="form.area" :options="areaOptions" :props="{ checkStrictly: true, emitPath: true }" placeholder="请选择区域" style="width: 100%" /></el-form-item>
        <el-form-item label="接入配电室" prop="accessDistributionRoom"><el-input v-model="form.accessDistributionRoom" placeholder="请输入接入配电室" maxlength="100" /></el-form-item>
        <el-form-item label="所属供电单位" prop="supplier"><el-input v-model="form.supplier" placeholder="请输入供电单位" maxlength="100" /></el-form-item>

        <el-divider content-position="left">关联信息</el-divider>
        <el-form-item label="所属供电合同" prop="contractId">
          <el-select v-model="form.contractId" placeholder="请选择供电合同" filterable style="width: 100%"><el-option v-for="item in contracts" :key="item.id" :label="`${item.code} · ${item.name}`" :value="item.id" /></el-select>
          <div class="hv-form-hint">可暂不关联；关联后将自动带出合同容量、计费方式和基本电价，仅供查看。</div>
        </el-form-item>
        <div v-if="selectedContract" class="hv-contract-readonly">
          <span>合同容量 <b>{{ selectedContract.capacity.toLocaleString() }} kVA</b></span>
          <span>计费方式 <b>{{ selectedContract.billingMethod }}</b></span>
          <span>基本电价 <b>{{ selectedContract.basicPrice }} 元/{{ selectedContract.billingMethod === '按容量' ? 'kVA·月' : 'kW·月' }}</b></span>
        </div>
        <el-form-item label="计费计量点" prop="meterId">
          <div class="hv-selector-line">
            <span v-if="selectedMeter" class="hv-selector-line__selected"><b>{{ selectedMeter.name }}</b>（{{ selectedMeter.code }}）</span>
            <span v-else class="hv-selector-line__empty">暂未关联</span>
            <el-button type="primary" plain size="small" @click="openMeterSelector">选择计量点</el-button>
          </div>
        </el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" type="textarea" :rows="3" maxlength="200" show-word-limit placeholder="请输入备注" /></el-form-item>
      </el-form>
      <template #footer><el-button @click="formVisible = false">取消</el-button><el-button type="primary" @click="saveLine">保存</el-button></template>
    </el-drawer>

    <el-drawer v-model="detailVisible" title="高压进线详情" direction="rtl" size="min(760px, 100%)">
      <template v-if="detailRow">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="进线名称">{{ detailRow.name }}</el-descriptions-item>
          <el-descriptions-item label="进线编号">{{ detailRow.code }}</el-descriptions-item>
          <el-descriptions-item label="电压等级">{{ detailRow.voltageLevel }}</el-descriptions-item>
          <el-descriptions-item label="当前状态"><el-tag :type="statusType(detailRow.status)" size="small" effect="dark">{{ statusLabel(detailRow.status) }}</el-tag></el-descriptions-item>
          <el-descriptions-item label="电源名称" span="2">{{ detailRow.powerSource }}</el-descriptions-item>
          <el-descriptions-item label="区域" span="2">{{ areaLabel(detailRow.area) }}</el-descriptions-item>
          <el-descriptions-item label="接入配电室">{{ detailRow.accessDistributionRoom }}</el-descriptions-item>
          <el-descriptions-item label="所属供电单位">{{ detailRow.supplier }}</el-descriptions-item>
          <el-descriptions-item label="供电合同" span="2"><template v-if="getContract(detailRow.contractId)">{{ getContract(detailRow.contractId)?.code }} · {{ getContract(detailRow.contractId)?.name }}</template><span v-else>-</span></el-descriptions-item>
          <el-descriptions-item label="计费计量点" span="2">{{ getMeter(detailRow.meterId)?.name }}（{{ getMeter(detailRow.meterId)?.code }}）</el-descriptions-item>
          <el-descriptions-item label="备注" span="2">{{ detailRow.remark || '-' }}</el-descriptions-item>
        </el-descriptions>
        <div class="hv-detail-section"><h4>合同信息（只读）</h4><el-descriptions :column="2" border size="small"><el-descriptions-item label="合同容量">{{ formatCapacity(detailRow.contractId) }}</el-descriptions-item><el-descriptions-item label="计费方式">{{ getContract(detailRow.contractId)?.billingMethod || '-' }}</el-descriptions-item><el-descriptions-item label="基本电价">{{ contractPrice(detailRow.contractId) }}</el-descriptions-item><el-descriptions-item label="合同有效期">{{ contractPeriod(detailRow.contractId) }}</el-descriptions-item></el-descriptions></div>
      </template>
      <template #footer><el-button @click="detailVisible = false">关闭</el-button></template>
    </el-drawer>

    <el-dialog v-model="meterSelectorVisible" title="选择计费计量点" width="min(900px, 94vw)" :close-on-click-modal="false">
      <el-form :model="meterQuery" inline class="hv-meter-search">
        <el-form-item label="计量点名称"><el-input v-model="meterQuery.keyword" placeholder="请输入名称或编码" clearable style="width: 220px" /></el-form-item>
        <el-form-item label="空间层级"><el-cascader v-model="meterQuery.space" :options="spaceOptions" :props="{ checkStrictly: true, emitPath: true }" clearable placeholder="请选择" style="width: 250px" /></el-form-item>
        <el-form-item><el-button type="primary" :icon="Search">查询</el-button><el-button @click="resetMeterQuery">重置</el-button></el-form-item>
      </el-form>
      <el-table :data="filteredMeters" border stripe max-height="380" highlight-current-row @current-change="pendingMeter = $event">
        <el-table-column width="52" align="center"><template #default="{ row }"><el-radio v-model="pendingMeterId" :value="row.id" /></template></el-table-column>
        <el-table-column prop="name" label="计量点名称" min-width="180" /><el-table-column prop="code" label="计量点编码" width="160" /><el-table-column prop="location" label="安装位置" min-width="200" /><el-table-column prop="status" label="采集状态" width="100" align="center"><template #default="{ row }"><el-tag :type="row.status === '在线' ? 'success' : 'info'" size="small">{{ row.status }}</el-tag></template></el-table-column>
      </el-table>
      <template #footer><el-button @click="meterSelectorVisible = false">取消</el-button><el-button type="primary" @click="confirmMeter">确认关联</el-button></template>
    </el-dialog>

    <el-dialog v-model="contractPreviewVisible" title="供电合同信息" width="min(620px, 94vw)"><el-descriptions v-if="previewContract" :column="2" border><el-descriptions-item label="合同编号">{{ previewContract.code }}</el-descriptions-item><el-descriptions-item label="合同名称">{{ previewContract.name }}</el-descriptions-item><el-descriptions-item label="合同容量">{{ previewContract.capacity.toLocaleString() }} kVA</el-descriptions-item><el-descriptions-item label="计费方式">{{ previewContract.billingMethod }}</el-descriptions-item><el-descriptions-item label="基本电价">{{ previewContract.basicPrice }} 元/{{ previewContract.billingMethod === '按容量' ? 'kVA·月' : 'kW·月' }}</el-descriptions-item><el-descriptions-item label="有效期">{{ previewContract.startDate }} 至 {{ previewContract.endDate }}</el-descriptions-item><el-descriptions-item label="备注" span="2">{{ previewContract.remark || '-' }}</el-descriptions-item></el-descriptions><template #footer><el-button @click="contractPreviewVisible = false">关闭</el-button></template></el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

type Status = 'running' | 'stopped' | 'maintenance'
interface Contract { id: number; code: string; name: string; capacity: number; billingMethod: '按容量' | '按最大需量'; basicPrice: number; startDate: string; endDate: string; remark: string }
interface Meter { id: number; name: string; code: string; location: string; space: string[]; status: string }
interface InletLine { id: number; name: string; code: string; voltageLevel: string; powerSource: string; area: string[]; accessDistributionRoom: string; supplier: string; contractId?: number; meterId: number; status: Status; remark: string }
const voltageOptions = ['10kV', '20kV', '35kV']
const areaOptions = [
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
const areaLabelMap: Record<string, string> = {
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
  { id: 1, code: 'GD-HT-2025-001', name: '东莞空港中心一期供电合同', capacity: 12500, billingMethod: '按最大需量', basicPrice: 42, startDate: '2025-01-01', endDate: '2027-12-31', remark: '主园区生产及公共区域用电。' },
  { id: 2, code: 'GD-HT-2025-002', name: '货运区专线供电合同', capacity: 6300, billingMethod: '按容量', basicPrice: 28, startDate: '2025-06-01', endDate: '2028-05-31', remark: '货运区冷链及仓储设备用电。' },
  { id: 3, code: 'GD-HT-2026-001', name: '联检大楼供电合同', capacity: 4000, billingMethod: '按最大需量', basicPrice: 42, startDate: '2026-01-01', endDate: '2028-12-31', remark: '' },
])
const meters: Meter[] = [
  { id: 1, name: '一期总进线计量点', code: 'IOT-EM-10K-001', location: '一期总配电房 10kV 进线柜', space: ['park-a', 'phase-1', 'main-distribution'], status: '在线' },
  { id: 2, name: '货运区专线计量点', code: 'IOT-EM-10K-002', location: '货运区变电所 10kV 进线柜', space: ['park-a', 'cargo-area', 'cargo-substation'], status: '在线' },
  { id: 3, name: '联检大楼计量点', code: 'IOT-EM-10K-003', location: '联检大楼变配电房', space: ['park-a', 'joint-inspection', 'distribution-room'], status: '在线' },
  { id: 4, name: '备用电源计量点', code: 'IOT-EM-10K-004', location: '一期总配电房备用柜', space: ['park-a', 'phase-1', 'main-distribution'], status: '离线' },
]
const allLines = ref<InletLine[]>([
  { id: 1, name: '一期主供进线', code: 'HV-01', voltageLevel: '10kV', powerSource: '东城站 10kV I 段母线', area: ['airport-center', 'main-plot'], accessDistributionRoom: '一期总配电房', supplier: '东莞供电局', contractId: 1, meterId: 1, status: 'running', remark: '园区主供电源。' },
  { id: 2, name: '货运区专线', code: 'HV-02', voltageLevel: '10kV', powerSource: '东城站 10kV II 段母线', area: ['airport-center', 'wharf', 'wharf-operations'], accessDistributionRoom: '货运区变电所', supplier: '东城供电服务中心', contractId: 2, meterId: 2, status: 'running', remark: '货运区冷链负荷专用。' },
  { id: 3, name: '联检大楼进线', code: 'HV-03', voltageLevel: '10kV', powerSource: '松山湖站 10kV III 段母线', area: ['airport-center', 'main-plot', 'joint-inspection-building'], accessDistributionRoom: '联检大楼变配电房', supplier: '松山湖供电服务中心', contractId: 3, meterId: 3, status: 'maintenance', remark: '当前处于年度预防性试验。' },
  { id: 4, name: '一期备用进线', code: 'HV-04', voltageLevel: '10kV', powerSource: '东城站 10kV II 段母线', area: ['airport-center', 'main-plot'], accessDistributionRoom: '一期总配电房', supplier: '东莞供电局', contractId: 1, meterId: 4, status: 'stopped', remark: '与一期主供进线互为备用。' },
  { id: 5, name: 'FF楼临时进线', code: 'HV-05', voltageLevel: '10kV', powerSource: '东城站 10kV III 段母线', area: ['airport-center', 'main-plot', 'ff-building'], accessDistributionRoom: 'FF楼配电房', supplier: '东莞供电局', meterId: 1, status: 'running', remark: '临时供电方案，暂未关联供电合同。' },
])
const query = reactive({ keyword: '', voltageLevel: '', status: '', supplier: '', area: [] as string[] })
const page = ref(1); const pageSize = 10
const filteredLines = computed(() => allLines.value.filter(row => (!query.keyword || row.name.includes(query.keyword) || row.code.includes(query.keyword)) && (!query.voltageLevel || row.voltageLevel === query.voltageLevel) && (!query.status || row.status === query.status) && (!query.supplier || row.supplier === query.supplier) && (!query.area.length || query.area.every((value, index) => row.area[index] === value))))
const pageRows = computed(() => filteredLines.value.slice((page.value - 1) * pageSize, page.value * pageSize))
function getContract(id?: number) { return contracts.value.find(item => item.id === id) }
function getMeter(id: number) { return meters.find(item => item.id === id) }
function formatCapacity(id?: number) { const capacity = getContract(id)?.capacity; return capacity ? `${capacity.toLocaleString()} kVA` : '-' }
function contractPrice(id?: number) { const item = getContract(id); return item ? `${item.basicPrice} 元/${item.billingMethod === '按容量' ? 'kVA·月' : 'kW·月'}` : '-' }
function contractPeriod(id?: number) { const item = getContract(id); return item ? `${item.startDate} 至 ${item.endDate}` : '-' }
function statusLabel(status: Status) { return { running: '在运', stopped: '停运', maintenance: '检修中' }[status] }
function statusType(status: Status) { return { running: 'success', stopped: 'info', maintenance: 'warning' }[status] }
function areaLabel(area: string[]) { return area.map(item => areaLabelMap[item] || item).join(' / ') || '-' }
function resetQuery() { Object.assign(query, { keyword: '', voltageLevel: '', status: '', supplier: '', area: [] }); page.value = 1 }
const formRef = ref<FormInstance>(); const formVisible = ref(false); const editingId = ref<number | null>(null)
const emptyForm = () => ({ name: '', code: '', voltageLevel: '10kV', powerSource: '', area: [] as string[], accessDistributionRoom: '', supplier: '', contractId: undefined as number | undefined, meterId: undefined as number | undefined, status: 'running' as Status, remark: '' })
const form = reactive(emptyForm())
const selectedContract = computed(() => form.contractId ? getContract(form.contractId) : undefined)
const selectedMeter = computed(() => form.meterId ? getMeter(form.meterId) : undefined)
const rules: FormRules = { name: [{ required: true, message: '请输入进线名称', trigger: 'blur' }], code: [{ required: true, message: '请输入进线编号', trigger: 'blur' }], voltageLevel: [{ required: true, message: '请选择电压等级', trigger: 'change' }], powerSource: [{ required: true, message: '请输入电源名称', trigger: 'blur' }], area: [{ required: true, type: 'array', min: 1, message: '请选择区域', trigger: 'change' }], accessDistributionRoom: [{ required: true, message: '请输入接入配电室', trigger: 'blur' }], supplier: [{ required: true, message: '请输入供电单位', trigger: 'blur' }], meterId: [{ required: true, message: '请选择计费计量点', trigger: 'change' }] }
function openCreate() { editingId.value = null; Object.assign(form, emptyForm()); formVisible.value = true }
function openEdit(row: InletLine) { editingId.value = row.id; Object.assign(form, row); formVisible.value = true }
function saveLine() { formRef.value?.validate(valid => { if (!valid) return; if (editingId.value) { const index = allLines.value.findIndex(item => item.id === editingId.value); if (index >= 0) allLines.value[index] = { ...allLines.value[index], ...form, id: editingId.value, meterId: form.meterId! } } else { const id = Math.max(...allLines.value.map(item => item.id), 0) + 1; allLines.value.unshift({ ...form, id, meterId: form.meterId! }) } formVisible.value = false }) }
function removeLine(id: number) { allLines.value = allLines.value.filter(item => item.id !== id) }
const detailVisible = ref(false); const detailRow = ref<InletLine | null>(null)
function openDetail(row: InletLine) { detailRow.value = row; detailVisible.value = true }
const spaceOptions = [
  { value: 'park-a', label: '东莞空港中心', children: [
    { value: 'phase-1', label: '一期园区', children: [{ value: 'main-distribution', label: '一期总配电房' }] },
    { value: 'cargo-area', label: '货运区', children: [{ value: 'cargo-substation', label: '货运区变电所' }] },
    { value: 'joint-inspection', label: '联检大楼', children: [{ value: 'distribution-room', label: '变配电房' }] },
  ] },
]
const meterSelectorVisible = ref(false); const pendingMeterId = ref<number>(); const pendingMeter = ref<Meter | null>(null)
const meterQuery = reactive({ keyword: '', space: [] as string[] })
const filteredMeters = computed(() => meters.filter(item => {
  const keyword = meterQuery.keyword.trim().toLowerCase()
  const matchesKeyword = !keyword || item.name.toLowerCase().includes(keyword) || item.code.toLowerCase().includes(keyword)
  const matchesSpace = !meterQuery.space.length || meterQuery.space.every((value, index) => item.space[index] === value)
  return matchesKeyword && matchesSpace
}))
function resetMeterQuery() { meterQuery.keyword = ''; meterQuery.space = [] }
function openMeterSelector() { pendingMeterId.value = form.meterId; pendingMeter.value = getMeter(form.meterId || 0) || null; resetMeterQuery(); meterSelectorVisible.value = true }
function confirmMeter() { const picked = pendingMeter.value || getMeter(pendingMeterId.value || 0); if (picked) form.meterId = picked.id; meterSelectorVisible.value = false }
const contractPreviewVisible = ref(false); const previewContract = ref<Contract | undefined>()
function openContractPreview(id: number) { previewContract.value = getContract(id); contractPreviewVisible.value = true }
</script>

<style scoped>
.hv-page { max-width: 1560px; padding: 20px; }
.hv-search { padding: 16px 16px 0; margin-bottom: 16px; border-radius: 4px; background: #fafbfc; }
.hv-actions { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
.hv-actions__count { margin-left: auto; color: #909399; font-size: 13px; }
.hv-pagination { display: flex; justify-content: flex-end; margin-top: 14px; }
.hv-form-hint { color: #909399; font-size: 12px; line-height: 18px; margin-top: 5px; }
.hv-contract-readonly { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; padding: 10px 12px; margin: -12px 0 16px 112px; border: 1px solid #e1f3ff; border-radius: 4px; color: #606266; font-size: 12px; background: #f4faff; }
.hv-contract-readonly span { display: flex; flex-direction: column; gap: 4px; }.hv-contract-readonly b { color: #303133; font-weight: 500; }
.hv-selector-line { display: flex; align-items: center; justify-content: space-between; width: 100%; padding: 0 10px; height: 34px; border: 1px solid #dcdfe6; border-radius: 4px; }.hv-selector-line__selected { color: #303133; }.hv-selector-line__empty { color: #c0c4cc; }
.hv-detail-section { margin-top: 20px; }.hv-detail-section h4 { margin: 0 0 10px; padding-left: 10px; font-size: 14px; color: #303133; border-left: 3px solid #409eff; }
.hv-meter-search { padding: 12px 12px 0; margin-bottom: 14px; border-radius: 4px; background: #fafbfc; }
@media (max-width: 900px) { .hv-contract-readonly { margin-left: 0; grid-template-columns: 1fr; } }
</style>
