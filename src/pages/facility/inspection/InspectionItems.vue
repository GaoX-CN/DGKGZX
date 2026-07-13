<template>
  <div>
    <div class="ii-page">
      <div class="ii-layout">
        <!-- 左侧：设备类型 -->
        <div class="ii-left">
          <div class="ii-left__header">
            <span class="ii-left__title">设备类型</span>
          </div>
          <div class="ii-left__list">
            <div
              v-for="dt in deviceTypes"
              :key="dt.value"
              class="ii-type-item"
              :class="{ 'ii-type-item--active': currentType === dt.value }"
              @click="currentType = dt.value"
            >
              <span class="ii-type-item__name">{{ dt.label }}</span>
              <span class="ii-type-item__count">{{ getTypeCount(dt.value) }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧：巡检项列表 -->
        <div class="ii-right">
          <div class="ii-right__header">
            <span class="ii-right__title">{{ currentTypeLabel }} · 巡检项</span>
          </div>

          <el-form :model="query" inline class="ii-search">
            <el-form-item label="关键词">
              <el-input v-model="query.keyword" placeholder="巡检项名称" clearable style="width: 180px" />
            </el-form-item>
            <el-form-item label="状态">
              <el-select v-model="query.status" placeholder="全部" clearable style="width: 110px">
                <el-option label="启用" value="active" />
                <el-option label="停用" value="inactive" />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" :icon="Search" @click="applyFilters">查询</el-button>
              <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
            </el-form-item>
          </el-form>

          <div class="ii-actions">
            <el-button type="primary" :icon="Plus" @click="openAdd">新增巡检项</el-button>
            <el-button :icon="Download" @click="handleExport">导出</el-button>
          </div>

          <el-table :data="tableData" border stripe style="width: 100%">
            <el-table-column type="index" label="序号" width="55" align="center" />
            <el-table-column prop="name" label="巡检项名称" width="160" />
            <el-table-column prop="description" label="巡检标准" min-width="220" show-overflow-tooltip />
            <el-table-column prop="method" label="巡检方式" width="110" align="center">
              <template #default="{ row }">
                <el-tag size="small">{{ methodLabel(row.method) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
                  {{ row.status === 'active' ? '启用' : '停用' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="180" align="center">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
                <el-button link :type="row.status === 'active' ? 'warning' : 'success'" size="small" @click="toggleStatus(row)">
                  {{ row.status === 'active' ? '停用' : '启用' }}
                </el-button>
                <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="ii-pagination">
            <el-pagination
              v-model:current-page="page"
              :page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next"
              @change="applyFilters"
            />
          </div>
        </div>
      </div>
    </div>

    <!-- 新增/编辑弹窗 -->
    <el-dialog
      v-model="formVisible"
      :title="isEditing ? '编辑巡检项' : '新增巡检项'"
      width="520px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="90px" size="small">
        <el-form-item label="所属类型" prop="deviceType">
          <el-select v-model="form.deviceType" placeholder="请选择设备类型" style="width: 100%">
            <el-option v-for="dt in deviceTypes" :key="dt.value" :label="dt.label" :value="dt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="巡检项名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="巡检标准" prop="description">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="请描述巡检检查标准" />
        </el-form-item>
        <el-form-item label="巡检方式" prop="method">
          <el-select v-model="form.method" placeholder="请选择" style="width: 100%">
            <el-option label="目测" value="visual" />
            <el-option label="仪器测量" value="instrument" />
            <el-option label="数据记录" value="record" />
            <el-option label="功能测试" value="functional" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用状态">
          <el-switch v-model="form.status" active-value="active" inactive-value="inactive" active-text="启用" inactive-text="停用" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { Plus, Search, Refresh, Download } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

interface InspectionItem {
  id: number
  deviceType: string
  name: string
  description: string
  method: string
  status: string
}

const deviceTypes = [
  { value: 'ac', label: '空调' },
  { value: 'lighting', label: '照明' },
  { value: 'fire', label: '消防' },
  { value: 'elevator', label: '电梯' },
  { value: 'electrical', label: '配电' },
  { value: 'mechanical', label: '给排水' },
  { value: 'door', label: '门禁' },
  { value: 'it', label: '弱电' },
  { value: 'other', label: '其他' },
]

function methodLabel(v: string): string {
  const map: Record<string, string> = { visual: '目测', instrument: '仪器测量', record: '数据记录', functional: '功能测试' }
  return map[v] || v
}

const currentTypeLabel = computed(() => {
  const d = deviceTypes.find(d => d.value === currentType.value)
  return d?.label || ''
})

// Mock 数据
let nextId = 1
const mockItems: Record<string, InspectionItem[]> = {
  ac: [
    { id: 1, deviceType: 'ac', name: '运行电流检测', description: '用钳形表测量压缩机运行电流，应在额定值±10%以内', method: 'instrument', status: 'active' },
    { id: 2, deviceType: 'ac', name: '冷凝器外观检查', description: '目视检查冷凝器翅片是否清洁、有无损坏变形', method: 'visual', status: 'active' },
    { id: 3, deviceType: 'ac', name: '制冷效果测试', description: '用温度计测量出风口温度，与进风口温差应在8-12℃', method: 'instrument', status: 'active' },
    { id: 4, deviceType: 'ac', name: '冷媒压力检查', description: '接压力表检测高低压侧压力，应与标准值一致', method: 'instrument', status: 'active' },
    { id: 5, deviceType: 'ac', name: '过滤网清洗', description: '检查过滤网积灰情况并清洗或更换', method: 'visual', status: 'active' },
  ],
  lighting: [
    { id: 6, deviceType: 'lighting', name: '灯具点亮测试', description: '逐路开启照明回路，确认所有灯具正常点亮无闪烁', method: 'functional', status: 'active' },
    { id: 7, deviceType: 'lighting', name: '照度检测', description: '用照度计在工作面测量照度，不低于标准值300lux', method: 'instrument', status: 'active' },
    { id: 8, deviceType: 'lighting', name: '应急灯功能测试', description: '断开主电源，确认应急灯自动点亮并持续60分钟以上', method: 'functional', status: 'active' },
  ],
  fire: [
    { id: 9, deviceType: 'fire', name: '烟感报警测试', description: '用烟感测试器触发烟感探测器，验证火警信号正常上报', method: 'functional', status: 'active' },
    { id: 10, deviceType: 'fire', name: '灭火器压力检查', description: '目视检查灭火器压力表指针在绿色区域，瓶体无锈蚀', method: 'visual', status: 'active' },
    { id: 11, deviceType: 'fire', name: '消火栓出水测试', description: '连接水带开启阀门，确认水压满足要求且无渗漏', method: 'functional', status: 'active' },
    { id: 12, deviceType: 'fire', name: '防火门闭合检查', description: '检查防火门自闭器功能正常，关闭后密封条无缝隙', method: 'visual', status: 'active' },
  ],
  elevator: [
    { id: 13, deviceType: 'elevator', name: '轿厢运行平稳性', description: '乘坐感受轿厢启停是否平稳、有无异常抖动和异响', method: 'visual', status: 'active' },
    { id: 14, deviceType: 'elevator', name: '层门开关测试', description: '逐层测试厅门开关门动作是否顺畅、防夹保护是否生效', method: 'functional', status: 'active' },
    { id: 15, deviceType: 'elevator', name: '紧急呼叫测试', description: '按下紧急呼叫按钮，确认与值班室通话清晰', method: 'functional', status: 'active' },
  ],
  electrical: [
    { id: 16, deviceType: 'electrical', name: '配电柜温度检测', description: '用红外测温仪检测各开关触点、母排连接处温度不超过70℃', method: 'instrument', status: 'active' },
    { id: 17, deviceType: 'electrical', name: '电压电流测量', description: '用万用表测量三相电压平衡度、各回路电流在额定范围内', method: 'instrument', status: 'active' },
    { id: 18, deviceType: 'electrical', name: '接地电阻检测', description: '用接地电阻测试仪测量接地电阻不大于4Ω', method: 'instrument', status: 'active' },
  ],
  mechanical: [
    { id: 19, deviceType: 'mechanical', name: '水泵运行噪音', description: '运行状态下靠近水泵，判断运行声音是否正常、无异常撞击声', method: 'visual', status: 'active' },
    { id: 20, deviceType: 'mechanical', name: '管路渗漏检查', description: '目视检查各法兰接头、阀门密封处是否有水渍或渗漏', method: 'visual', status: 'active' },
    { id: 21, deviceType: 'mechanical', name: '压力表读数', description: '记录进出水压力表读数，与系统设计值对比', method: 'record', status: 'active' },
  ],
  door: [
    { id: 22, deviceType: 'door', name: '门禁读卡测试', description: '用有效卡和无效卡分别刷卡，验证门禁控制器开/拒动作正常', method: 'functional', status: 'active' },
    { id: 23, deviceType: 'door', name: '电锁状态检查', description: '检查电控锁通电吸合和断电释放动作灵敏可靠', method: 'functional', status: 'active' },
  ],
  it: [
    { id: 24, deviceType: 'it', name: '交换机指示灯', description: '目视检查网络交换机各端口和状态指示灯，确认无红灯告警', method: 'visual', status: 'active' },
    { id: 25, deviceType: 'it', name: '机房温湿度', description: '读取温湿度传感器数值，温度18-26℃、湿度40-70%', method: 'record', status: 'active' },
  ],
  other: [
    { id: 26, deviceType: 'other', name: '设备外观完整性', description: '目视检查设备外壳、面板是否完好、无破损变形', method: 'visual', status: 'active' },
  ],
}

function getTypeCount(type: string): number {
  return (mockItems[type] || []).length
}

// 列表状态
const currentType = ref('ac')
const page = ref(1)
const pageSize = ref(10)
const query = reactive({ keyword: '', status: '' })

const filteredItems = computed(() => {
  let list = mockItems[currentType.value] || []
  if (query.keyword) list = list.filter(i => i.name.includes(query.keyword))
  if (query.status) list = list.filter(i => i.status === query.status)
  return list
})

const total = computed(() => filteredItems.value.length)
const tableData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredItems.value.slice(start, start + pageSize.value)
})

function applyFilters() { page.value = 1 }
function resetQuery() { query.keyword = ''; query.status = ''; page.value = 1 }

// 表单状态
const formRef = ref<FormInstance>()
const formVisible = ref(false)
const isEditing = ref(false)
const editingId = ref(0)
const form = reactive({ deviceType: '', name: '', description: '', method: '', status: 'active' })
const formRules: FormRules = {
  deviceType: [{ required: true, message: '请选择设备类型', trigger: 'change' }],
  name: [{ required: true, message: '请输入巡检项名称', trigger: 'blur' }],
  description: [{ required: true, message: '请填写巡检标准', trigger: 'blur' }],
  method: [{ required: true, message: '请选择巡检方式', trigger: 'change' }],
}

function openAdd() {
  isEditing.value = false
  editingId.value = 0
  form.deviceType = currentType.value
  form.name = ''
  form.description = ''
  form.method = ''
  form.status = 'active'
  formVisible.value = true
}
function openEdit(row: InspectionItem) {
  isEditing.value = true
  editingId.value = row.id
  form.deviceType = row.deviceType
  form.name = row.name
  form.description = row.description
  form.method = row.method
  form.status = row.status
  formVisible.value = true
}
function submitForm() {
  formRef.value?.validate((valid: boolean) => {
    if (!valid) return
    if (isEditing.value) {
      const list = mockItems[form.deviceType]
      const idx = list?.findIndex(i => i.id === editingId.value)
      if (idx !== undefined && idx >= 0) {
        list[idx] = { ...list[idx], name: form.name, description: form.description, method: form.method, status: form.status }
      }
    } else {
      const id = ++nextId
      const list = mockItems[form.deviceType]
      if (!list) mockItems[form.deviceType] = []
      mockItems[form.deviceType].push({
        id, deviceType: form.deviceType, name: form.name, description: form.description, method: form.method, status: form.status,
      })
    }
    formVisible.value = false
  })
}
function toggleStatus(row: InspectionItem) {
  row.status = row.status === 'active' ? 'inactive' : 'active'
}
function handleDelete(row: InspectionItem) {
  const list = mockItems[row.deviceType]
  const idx = list?.findIndex(i => i.id === row.id)
  if (idx !== undefined && idx >= 0) list.splice(idx, 1)
}

function handleExport() {
  const items = mockItems[currentType.value] || []
  const header = '巡检项名称,巡检标准,巡检方式,状态\n'
  const csv = header + items.map(i => `${i.name},${i.description.replace(/,/g,'，')},${methodLabel(i.method)},${i.status === 'active' ? '启用' : '停用'}`).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = `巡检项_${currentTypeLabel.value}.csv`
  a.click(); URL.revokeObjectURL(url)
}
</script>

<style scoped>
.ii-page { max-width: 1500px; }
.ii-layout { display: flex; gap: 16px; min-height: 600px; }
.ii-left { width: 180px; min-width: 180px; border: 1px solid #ebeef5; border-radius: 4px; background: #fafbfc; }
.ii-left__header { padding: 12px; border-bottom: 1px solid #ebeef5; }
.ii-left__title { font-size: 14px; font-weight: 600; color: #303133; }
.ii-left__list { padding: 4px 0; }
.ii-type-item { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; cursor: pointer; font-size: 13px; color: #606266; transition: all 0.15s; }
.ii-type-item:hover { background: #ecf5ff; color: #409eff; }
.ii-type-item--active { background: #ecf5ff; color: #409eff; font-weight: 600; border-right: 3px solid #409eff; }
.ii-type-item__count { font-size: 12px; color: #909399; background: #f0f0f0; padding: 1px 7px; border-radius: 10px; }
.ii-type-item--active .ii-type-item__count { background: #d9ecff; color: #409eff; }
.ii-right { flex: 1; min-width: 0; }
.ii-right__header { margin-bottom: 12px; }
.ii-right__title { font-size: 15px; font-weight: 600; color: #303133; }
.ii-search { background: #fafbfc; padding: 12px 16px; border-radius: 4px; margin-bottom: 12px; }
.ii-actions { display: flex; gap: 8px; margin-bottom: 12px; }
.ii-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>
