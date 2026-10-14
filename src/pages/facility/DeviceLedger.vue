<template>
  <div class="dl-page">
    <!-- ===================== 搜索栏 ===================== -->
    <el-form :model="filters" inline class="dl-search">
      <el-form-item label="启用状态">
        <el-select v-model="filters.enabled" placeholder="请选择" clearable style="width: 140px">
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </el-form-item>
      <el-form-item label="设备名称">
        <el-input v-model="filters.keyword" placeholder="请输入" clearable style="width: 200px" />
      </el-form-item>
      <el-form-item label="设备分类">
        <el-select v-model="filters.category" placeholder="请选择" clearable style="width: 160px">
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
          style="width: 220px"
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
      <el-table-column label="设备型号" width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <span :class="{ 'dl-muted': !row.model }">{{ row.model || '—' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="设备状态" width="96" align="center">
        <template #default="{ row }">
          <el-tag :type="statusMeta[row.rawStatus].tag" size="small" effect="light">
            {{ statusMeta[row.rawStatus].label }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="空间归属" min-width="150" show-overflow-tooltip>
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
      <el-table-column label="操作" width="150" align="center" fixed="right">
        <template #default>
          <el-button link type="primary" size="small">详情</el-button>
          <el-button link type="primary" size="small">关联设备</el-button>
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
 *   · 设备状态  ← status（在线 / 离线 / 未激活）
 *   · 空间归属  ← space_full_name（已去顶层前缀）
 */
import { ref, reactive, computed, watch } from 'vue'
import { Download, Refresh, Search } from '@element-plus/icons-vue'
import { deviceCategories, deviceList, type DeviceItem } from '@/data/deviceData'

// ==================== 设备分类 / 设备状态 ====================
const categoryOptions = deviceCategories

function categoryLabel(value: string): string {
  return deviceCategories.find((cat) => cat.value === value)?.label || value
}

const statusMeta: Record<string, { label: string; tag: 'success' | 'danger' | 'info' }> = {
  online: { label: '在线', tag: 'success' },
  offline: { label: '离线', tag: 'danger' },
  unactivated: { label: '未激活', tag: 'info' },
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

// ==================== 启用状态 ====================
// ⚠️ 实例表未单独登记启用标记，原型按「未激活＝停用，其余＝启用」的示例口径呈现。
function enabledOf(item: DeviceItem): 'enabled' | 'disabled' {
  return item.rawStatus === 'unactivated' ? 'disabled' : 'enabled'
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
const filters = reactive({
  enabled: '',
  keyword: '',
  category: '',
  space: '',
})

const filteredDevices = computed(() => {
  let list = deviceList
  if (filters.enabled) list = list.filter((d) => enabledOf(d) === filters.enabled)
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
  filters.enabled = ''
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
</style>
