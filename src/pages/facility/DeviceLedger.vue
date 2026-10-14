<template>
  <div class="dl-page">
    <!-- ===================== 搜索栏 ===================== -->
    <el-form :model="filters" inline class="dl-search">
      <el-form-item label="设备状态">
        <el-select v-model="filters.status" placeholder="请选择" clearable style="width: 130px">
          <el-option label="在线" value="online" />
          <el-option label="离线" value="offline" />
          <el-option label="报废" value="scrapped" />
        </el-select>
      </el-form-item>
      <el-form-item label="设备名称">
        <el-input v-model="filters.keyword" placeholder="请输入" clearable style="width: 190px" />
      </el-form-item>
      <el-form-item label="设备分类">
        <el-select v-model="filters.category" placeholder="请选择" clearable style="width: 150px">
          <el-option v-for="cat in categoryOptions" :key="cat.value" :label="cat.label" :value="cat.value" />
        </el-select>
      </el-form-item>
      <el-form-item label="空间位置">
        <el-tree-select
          v-model="filters.space"
          :data="spaceOptions"
          placeholder="请选择空间位置"
          check-strictly
          clearable
          filterable
          :render-after-expand="false"
          style="width: 200px"
        />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- ===================== 操作栏 ===================== -->
    <!-- 说明：导出 / 详情 / 关联设备 为占位按钮，按需求仅保留按钮、不实现交互 -->
    <div class="dl-actions">
      <el-button :icon="Download">导出</el-button>
    </div>

    <!-- ===================== 设备列表 ===================== -->
    <el-table :data="pagedDevices" border stripe style="width: 100%">
      <el-table-column prop="name" label="设备名称" min-width="160" show-overflow-tooltip />
      <el-table-column label="设备编码" width="132">
        <template #default="{ row }">
          <span class="dl-code">{{ row.id }}</span>
        </template>
      </el-table-column>
      <el-table-column label="业务归属" width="112">
        <template #default="{ row }">
          <span :class="{ 'dl-muted': subsystemOf(row) === UNCLASSIFIED }">{{ subsystemOf(row) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="设备分类" width="108">
        <template #default="{ row }">{{ categoryLabel(row.category) }}</template>
      </el-table-column>
      <el-table-column label="设备型号" width="150" show-overflow-tooltip>
        <template #default="{ row }">
          <span :class="{ 'dl-muted': !row.model }">{{ row.model || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="设备状态" width="96" align="center">
        <template #default="{ row }">
          <!-- 已报废：本系统业务状态，悬停可查看报废登记信息（不影响 IoT 实际运行状态） -->
          <el-tooltip v-if="row.scrap" placement="top" effect="light" :show-after="100">
            <template #content>
              <div class="dl-tip">
                <div>报废方式：{{ row.scrap.method }}</div>
                <div>报废原因：{{ row.scrap.reason }}</div>
                <div>报废时间：{{ row.scrap.date }}</div>
                <div>报废说明：{{ row.scrap.remark }}</div>
                <div class="dl-tip__note">仅本系统业务状态，不回写 IOT，不影响设备实际运行</div>
              </div>
            </template>
            <el-tag type="warning" size="small" effect="light">{{ statusMeta.scrapped.label }}</el-tag>
          </el-tooltip>
          <el-tag v-else :type="statusMeta[row.rawStatus].tag" size="small" effect="light">
            {{ statusMeta[row.rawStatus].label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="空间归属" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">
          <span :class="{ 'dl-muted': row.location === '—' }">{{ row.location }}</span>
        </template>
      </el-table-column>
      <el-table-column label="是否关联设备" width="120" align="center">
        <template #default="{ row }">
          <el-tag :type="subsystemOf(row) === UNCLASSIFIED ? 'danger' : 'success'" size="small" effect="light">
            {{ subsystemOf(row) === UNCLASSIFIED ? '否' : '是' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="192" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small">详情</el-button>
          <el-button link type="primary" size="small">关联设备</el-button>
          <el-button v-if="!row.scrap" link type="danger" size="small" @click="openScrapDialog(row)">报废</el-button>
          <el-button v-else link type="warning" size="small" @click="revokeScrap(row)">撤回报废</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- ===================== 分页 ===================== -->
    <div class="dl-pagination">
      <el-pagination
        v-model:current-page="currentPage"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="filteredDevices.length"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>

    <!-- ===================== 设备报废登记 ===================== -->
    <el-dialog
      v-model="scrapVisible"
      title="设备报废"
      width="660px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-alert
        class="dl-alert"
        type="info"
        :closable="false"
        show-icon
        title="设备报废为本系统的业务状态，不会同步至 IOT 及设备所属各弱电子系统，不影响设备实际运行与在线状态。"
      />

      <el-descriptions :column="2" border size="small" class="dl-desc">
        <el-descriptions-item label="设备名称">{{ scrapTarget?.name }}</el-descriptions-item>
        <el-descriptions-item label="设备编码">
          <span class="dl-code">{{ scrapTarget?.id }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="设备分类">
          {{ scrapTarget ? categoryLabel(scrapTarget.category) : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="业务归属">
          {{ scrapTarget ? subsystemOf(scrapTarget) : '—' }}
        </el-descriptions-item>
        <el-descriptions-item label="空间归属">{{ scrapTarget?.location }}</el-descriptions-item>
        <el-descriptions-item label="当前状态">
          {{ scrapTarget ? statusMeta[scrapTarget.rawStatus].label : '—' }}
        </el-descriptions-item>
      </el-descriptions>

      <el-form ref="scrapFormRef" :model="scrapForm" :rules="scrapRules" label-width="88px">
        <el-form-item label="报废方式" prop="method">
          <el-select v-model="scrapForm.method" placeholder="请选择报废方式" style="width: 100%">
            <el-option v-for="item in SCRAP_METHODS" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="报废原因" prop="reason">
          <el-select v-model="scrapForm.reason" placeholder="请选择报废原因" style="width: 100%">
            <el-option v-for="item in SCRAP_REASONS" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="报废时间" prop="date">
          <el-date-picker
            v-model="scrapForm.date"
            type="date"
            placeholder="请选择报废时间"
            value-format="YYYY-MM-DD"
            :disabled-date="disableFutureDate"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="报废说明" prop="remark">
          <el-input
            v-model="scrapForm.remark"
            type="textarea"
            :rows="3"
            maxlength="200"
            show-word-limit
            placeholder="请填写报废说明，如设备现状、处置依据、审批情况等"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="scrapVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmScrap">确认报废</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/**
 * 设备台账
 *
 * 数据来源：equip_device_instance / equip_device_def（见 src/data/deviceData.ts，与「设备分布」同源）
 * 列表口径：
 *   · 设备名称  ← device_name
 *   · 设备编码  ← device_id
 *   · 业务归属  ← 设备绑定的业务子系统（未绑定为「未分类」）
 *   · 设备分类  ← def_code / def_name（一个 def_code 即一个设备分类，共 16 类）
 *   · 设备型号  ← model
 *   · 设备状态  ← status（在线 / 离线 / 未激活），完成报废登记后在本系统呈现为「报废」
 *   · 空间归属  ← space_full_name（已去顶层前缀）
 *
 * 筛选口径：
 *   · 设备状态：在线 / 离线 / 报废（列表仍可能出现「未激活」，筛选项中暂不单列）
 *   · 设备名称模糊匹配；设备分类按 def_code 等值过滤；空间位置按所选空间及其下级空间过滤
 *
 * 设备报废（对应《设备设施系统业务场景应用手册》Q8，操作位置＝设备管理-设备台账-报废）：
 *   · 须填写报废方式、报废原因、报废时间，并填写报废说明；报废后设备状态在本系统呈现为「报废」
 *   · 仅为本系统业务记录，不回写 IOT 及设备所属各弱电子系统，不影响设备实际运行与在线状态
 *   · 支持撤回报废：撤回后清除报废登记，设备状态恢复为原本的在线 / 离线 / 未激活
 */
import { ref, reactive, computed, watch, nextTick } from 'vue'
import { Download, Refresh, Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { deviceCategories, deviceList, type DeviceItem } from '@/data/deviceData'

// ==================== 设备分类 / 设备状态 ====================
const categoryOptions = deviceCategories

function categoryLabel(value: string): string {
  return deviceCategories.find((cat) => cat.value === value)?.label || value
}

const statusMeta: Record<
  'online' | 'offline' | 'unactivated' | 'scrapped',
  { label: string; tag: 'success' | 'danger' | 'info' | 'warning' }
> = {
  online: { label: '在线', tag: 'success' },
  offline: { label: '离线', tag: 'danger' },
  unactivated: { label: '未激活', tag: 'info' },
  scrapped: { label: '报废', tag: 'warning' },
}

// ==================== 业务归属（业务子系统） ====================
// 口径：业务归属＝设备与业务子系统的绑定；业务子系统由各业务系统注册的子系统标识自动生成，
// 平台侧不人工新增/删除；一台设备只能归属一个业务子系统，未绑定时为「未分类」。
// ⚠️ equip_device_instance 未登记该字段（业务归属来自业务子系统的设备绑定关系），
//    原型按「设备分类 → 业务子系统」的示例绑定关系呈现，用于表达该列的取值与「未分类」态。
//    已注册子系统：访客子系统 / 能源子系统 / 应急子系统 / 门禁子系统 / 消防子系统 / 停车场子系统 / 安防子系统。
const UNCLASSIFIED = '未分类'

const SUBSYSTEM_BY_CATEGORY: Record<string, string> = {
  camera: '安防子系统',
  accessControl: '门禁子系统',
  barriergate: '停车场子系统',
  energyMeter: '能源子系统',
}

function subsystemOf(item: DeviceItem): string {
  return SUBSYSTEM_BY_CATEGORY[item.category] || UNCLASSIFIED
}

// ==================== 设备报废登记（仅本系统业务记录） ====================
interface ScrapRecord {
  /** 报废方式 */
  method: string
  /** 报废原因 */
  reason: string
  /** 报废时间 */
  date: string
  /** 报废说明 */
  remark: string
}

interface LedgerRow extends DeviceItem {
  /** 报废登记记录，未报废为 null */
  scrap: ScrapRecord | null
}

/** 报废方式候选（⚠️ 待业务确认，可替换为设计说明书中的正式枚举） */
const SCRAP_METHODS = ['出售转让', '拆解回收', '报废销毁', '以旧换新', '其他']
/** 报废原因候选 */
const SCRAP_REASONS = ['已达使用年限', '损坏无法修复', '技术淘汰停产', '遗失盘亏', '灾害或事故损毁', '其他']

const scrapRecords = ref<Record<string, ScrapRecord>>({})

/** 列表行：设备原始字段 + 报废登记状态 */
const ledgerRows = computed<LedgerRow[]>(() =>
  deviceList.map((device) => ({ ...device, scrap: scrapRecords.value[device.id] ?? null }))
)

/** 设备状态取值：已报废优先，其次取实例表原始状态 */
function statusKey(item: LedgerRow): keyof typeof statusMeta {
  return item.scrap ? 'scrapped' : item.rawStatus
}

const scrapVisible = ref(false)
const scrapTarget = ref<LedgerRow | null>(null)
const scrapFormRef = ref<FormInstance>()

const scrapForm = reactive({
  method: '',
  reason: '',
  date: '',
  remark: '',
})

const scrapRules: FormRules = {
  method: [{ required: true, message: '请选择报废方式', trigger: 'change' }],
  reason: [{ required: true, message: '请选择报废原因', trigger: 'change' }],
  date: [{ required: true, message: '请选择报废时间', trigger: 'change' }],
  remark: [{ required: true, message: '请填写报废说明', trigger: 'blur' }],
}

function todayText(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

function disableFutureDate(date: Date): boolean {
  return date.getTime() > Date.now()
}

function openScrapDialog(row: LedgerRow) {
  scrapTarget.value = row
  scrapForm.method = ''
  scrapForm.reason = ''
  scrapForm.date = todayText()
  scrapForm.remark = ''
  scrapVisible.value = true
  nextTick(() => scrapFormRef.value?.clearValidate())
}

function confirmScrap() {
  scrapFormRef.value?.validate((valid) => {
    if (!valid || !scrapTarget.value) return
    const target = scrapTarget.value
    scrapRecords.value[target.id] = {
      method: scrapForm.method,
      reason: scrapForm.reason,
      date: scrapForm.date,
      remark: scrapForm.remark.trim(),
    }
    scrapVisible.value = false
    ElMessage.success(`已完成设备报废登记：${target.name}（仅本系统业务记录）`)
  })
}

function revokeScrap(row: LedgerRow) {
  ElMessageBox.confirm(
    `确认撤回报废「${row.name}」？撤回后该设备状态恢复为「${statusMeta[row.rawStatus].label}」，报废登记信息同时清除。`,
    '撤回报废',
    { confirmButtonText: '确认撤回', cancelButtonText: '取消', type: 'warning' }
  )
    .then(() => {
      delete scrapRecords.value[row.id]
      ElMessage.success('已撤回报废')
    })
    .catch(() => {})
}

// ==================== 空间位置（按设备空间归属生成可选空间） ====================
interface SpaceOption {
  value: string
  label: string
  children?: SpaceOption[]
}

const spaceOptions = computed<SpaceOption[]>(() => {
  const nodeMap = new Map<string, SpaceOption>()
  const roots: SpaceOption[] = []
  for (const device of deviceList) {
    if (!device.location || device.location === '—') continue
    let path = ''
    let level: SpaceOption[] = roots
    for (const segment of device.location.split('/')) {
      path = path ? `${path}/${segment}` : segment
      let node = nodeMap.get(path)
      if (!node) {
        node = { value: path, label: segment, children: [] }
        nodeMap.set(path, node)
        level.push(node)
      }
      level = node.children as SpaceOption[]
    }
  }
  const prune = (nodes: SpaceOption[]): SpaceOption[] =>
    nodes.map((node) => {
      const children = node.children || []
      return children.length
        ? { value: node.value, label: node.label, children: prune(children) }
        : { value: node.value, label: node.label }
    })
  return prune(roots)
})

// ==================== 筛选与分页 ====================
// ==================== 筛选与分页 ====================
const filters = reactive({
  status: '',
  keyword: '',
  category: '',
  space: '',
})

const filteredDevices = computed(() => {
  let list = ledgerRows.value
  if (filters.status) list = list.filter((d) => statusKey(d) === filters.status)
  if (filters.keyword) list = list.filter((d) => d.name.includes(filters.keyword))
  if (filters.category) list = list.filter((d) => d.category === filters.category)
  if (filters.space) {
    list = list.filter((d) => d.location === filters.space || d.location.startsWith(`${filters.space}/`))
  }
  return list
})

const currentPage = ref(1)
const pageSize = ref(10)

const pagedDevices = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredDevices.value.slice(start, start + pageSize.value)
})

// 任一筛选条件变化后回到首页
watch(filters, () => {
  currentPage.value = 1
})

function handleSearch() {
  currentPage.value = 1
}

function handleReset() {
  filters.status = ''
  filters.keyword = ''
  filters.category = ''
  filters.space = ''
  currentPage.value = 1
}
</script>

<style scoped>
.dl-page {
  max-width: 1800px;
}
.dl-search {
  background: #fafbfc;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}
.dl-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.dl-code {
  font-size: 12px;
  line-height: 1.4;
  color: #606266;
  word-break: break-all;
}
.dl-muted {
  color: #909399;
}
.dl-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* ===== 报废登记 ===== */
.dl-alert {
  margin-bottom: 16px;
}
.dl-desc {
  margin-bottom: 16px;
}
.dl-tip {
  max-width: 280px;
  line-height: 1.7;
}
.dl-tip__note {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px solid #ebeef5;
  color: #909399;
}
</style>
