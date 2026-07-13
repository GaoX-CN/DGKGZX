<template>
  <div>
    <div class="ip-page">
      <el-form :model="query" inline class="ip-search">
        <el-form-item label="计划名称">
          <el-input v-model="query.keyword" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="巡检班组">
          <el-select v-model="query.team" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="t in inspectionTeams" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 110px">
            <el-option label="未开始" value="pending" />
            <el-option label="进行中" value="active" />
            <el-option label="已结束" value="ended" />
            <el-option label="已停用" value="stopped" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="applyFilters">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="ip-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新建计划</el-button>
        <span class="ip-actions__count">共 {{ total }} 条记录</span>
      </div>

      <el-table :data="tableData" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="name" label="计划名称" width="180" />
        <el-table-column prop="inspectionTeam" label="巡检班组" width="110" />
        <el-table-column label="巡检频段" width="200">
          <template #default="{ row }">
            <span class="ip-freq">{{ row.frequencyLabel }}</span>
          </template>
        </el-table-column>
        <el-table-column label="巡检范围" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.scopeLabel }}</span>
          </template>
        </el-table-column>
        <el-table-column label="计划有效期" width="200">
          <template #default="{ row }">
            <span class="ip-freq">{{ row.startDate?.slice(0, 10) }} ~ {{ row.endDate ? row.endDate.slice(0, 10) : '永久' }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="dept" label="发布部门" width="90" />
        <el-table-column prop="publisher" label="发布人" width="80" />
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="planStatusType(row)" size="small" effect="dark">
              {{ planStatusLabel(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <template v-if="planStatus(row) === 'pending'">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
              <el-button link type="warning" size="small" @click="stopPlan(row)">停用</el-button>
            </template>
            <template v-else-if="planStatus(row) === 'active'">
              <el-button link type="warning" size="small" @click="stopPlan(row)">停用</el-button>
            </template>
            <template v-else-if="planStatus(row) === 'stopped'">
              <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
              <el-button link type="success" size="small" @click="enablePlan(row)">启用</el-button>
            </template>
          </template>
        </el-table-column>
      </el-table>

      <div class="ip-pagination">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="total"
          layout="total, prev, pager, next"
          @change="applyFilters"
        />
      </div>
    </div>

    <!-- 新建/编辑抽屉 -->
    <el-drawer v-model="drawerVisible" :title="isEditing ? '编辑巡检计划' : '新建巡检计划'" direction="rtl" size="650px" :close-on-click-modal="false">
      <template #header>
        <span class="ip-drawer-title">{{ isEditing ? '编辑巡检计划' : '新建巡检计划' }}</span>
      </template>
      <div class="ip-drawer-body">
        <el-form ref="baseFormRef" :model="baseForm" :rules="baseRules" label-width="100px" size="small">
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="计划名称" prop="name">
                <el-input v-model="baseForm.name" placeholder="请输入巡检计划名称" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="巡检班组" prop="inspectionTeam">
                <el-select v-model="baseForm.inspectionTeam" placeholder="请选择" style="width: 100%">
                  <el-option v-for="t in inspectionTeams" :key="t" :label="t" :value="t" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="计划开始时间" prop="startDate">
                <el-date-picker v-model="baseForm.startDate" type="datetime" placeholder="选择时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="计划结束时间">
                <el-date-picker v-model="baseForm.endDate" type="datetime" placeholder="选择时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
                <div class="ip-form-hint">不填则永久生效</div>
              </el-form-item>
            </el-col>
          </el-row>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="发布部门" prop="dept">
                <el-input v-model="baseForm.dept" placeholder="默认当前登录部门" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="发布人" prop="publisher">
                <el-input v-model="baseForm.publisher" placeholder="默认当前登录人" />
              </el-form-item>
            </el-col>
          </el-row>

          <el-divider content-position="left">巡检频段</el-divider>
          <el-form-item label="频段类型">
            <el-radio-group v-model="freqForm.type" @change="onFreqTypeChange">
              <el-radio value="daily">每天</el-radio>
              <el-radio value="weekly">每周</el-radio>
              <el-radio value="monthly">每月</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="执行时间">
            <el-time-picker v-model="freqForm.time" format="HH:mm" value-format="HH:mm" placeholder="选择时间" style="width: 160px" />
            <span class="ip-form-hint">在此时间自动生成巡检工单</span>
          </el-form-item>
          <el-form-item v-if="freqForm.type === 'weekly'" label="执行星期">
            <el-checkbox-group v-model="freqForm.weekDays">
              <el-checkbox v-for="(d, i) in weekOptions" :key="d" :label="i + 1">{{ d }}</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
          <el-form-item v-if="freqForm.type === 'monthly'" label="执行日期">
            <el-checkbox-group v-model="freqForm.monthDays">
              <el-checkbox v-for="d in 31" :key="d" :label="d">{{ d }}日</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-divider content-position="left">巡检设备</el-divider>
        </el-form>

        <div class="ip-device-section">
          <div class="ip-device-section__header">
            <span class="ip-device-section__count">已选设备（{{ selectedDevices.length }}）</span>
            <el-button size="small" type="primary" @click="openDeviceDialog">选择巡检设备</el-button>
          </div>
          <el-table :data="selectedDevices" border size="small" max-height="200" style="width: 100%" v-if="selectedDevices.length > 0">
            <el-table-column prop="name" label="设备名称" min-width="180" show-overflow-tooltip />
            <el-table-column label="类型" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small">{{ deviceTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="location" label="位置" min-width="160" show-overflow-tooltip />
            <el-table-column label="操作" width="55" align="center">
              <template #default="{ $index }">
                <el-button link type="danger" size="small" @click="removeDevice($index)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-else class="ip-device-empty">暂未选择巡检设备</div>
        </div>
      </div>
      <template #footer>
        <div class="ip-drawer-footer">
          <el-button @click="drawerVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmSave">完成</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 选择设备弹窗 -->
    <el-dialog v-model="deviceDialogVisible" title="选择巡检设备" width="750px" :close-on-click-modal="false">
      <el-form inline size="small" class="ip-device-filter">
        <el-form-item label="空间">
          <el-select v-model="deviceFilter.building" placeholder="全部建筑" clearable style="width: 140px" @change="deviceFilter.floor = ''">
            <el-option v-for="b in buildings" :key="b.value" :label="b.label" :value="b.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="deviceFilter.floor" placeholder="全部楼层" clearable style="width: 120px">
            <el-option v-for="f in currentFilterFloors" :key="f.value" :label="f.label" :value="f.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="deviceFilter.type" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="dt in deviceTypes" :key="dt.value" :label="dt.label" :value="dt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input v-model="deviceFilter.keyword" placeholder="请输入" clearable style="width: 160px" />
        </el-form-item>
      </el-form>

      <el-table
        :data="filteredDeviceTable"
        border
        size="small"
        style="width: 100%"
        max-height="320"
        @selection-change="() => {}"
        @select="onDeviceRowSelect"
        ref="deviceTableRef"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column prop="name" label="设备名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="设备类型" width="90" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ deviceTypeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="location" label="设备位置" width="160" show-overflow-tooltip />
      </el-table>

      <template #footer>
        <el-button @click="deviceDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDeviceSelect">确认选择</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailDrawerVisible" title="巡检计划详情" direction="rtl" size="600px">
      <template #header>
        <span class="ip-drawer-title">巡检计划详情</span>
      </template>
      <div class="ip-drawer-body" v-if="detailPlan">
        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="计划名称" span="2">{{ detailPlan.name }}</el-descriptions-item>
          <el-descriptions-item label="巡检班组">{{ detailPlan.inspectionTeam }}</el-descriptions-item>
          <el-descriptions-item label="巡检频段">{{ detailPlan.frequencyLabel }}</el-descriptions-item>
          <el-descriptions-item label="计划开始" span="2">{{ detailPlan.startDate }}</el-descriptions-item>
          <el-descriptions-item label="计划结束" span="2">{{ detailPlan.endDate || '永久生效' }}</el-descriptions-item>
          <el-descriptions-item label="发布部门">{{ detailPlan.dept }}</el-descriptions-item>
          <el-descriptions-item label="发布人">{{ detailPlan.publisher }}</el-descriptions-item>
          <el-descriptions-item label="状态" span="2">
            <el-tag :type="planStatusType(detailPlan)" size="small" effect="dark">{{ planStatusLabel(detailPlan) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="巡检范围" span="2">{{ detailPlan.scopeLabel }}</el-descriptions-item>
        </el-descriptions>

        <div class="ip-detail-devices" v-if="detailDevices.length > 0">
          <h4 class="ip-detail-devices__title">巡检设备（{{ detailDevices.length }}）</h4>
          <el-table :data="detailDevices" border size="small" max-height="240">
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="name" label="设备名称" min-width="180" show-overflow-tooltip />
            <el-table-column label="类型" width="80" align="center">
              <template #default="{ row }">
                <el-tag size="small">{{ deviceTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="location" label="位置" min-width="160" show-overflow-tooltip />
          </el-table>
        </div>
      </div>
      <template #footer>
        <div class="ip-drawer-footer">
          <el-button @click="detailDrawerVisible = false">关闭</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, watch } from 'vue'
import { Plus, Search, Refresh } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

interface InspectionPlan {
  id: number
  name: string
  inspectionTeam: string
  startDate: string
  endDate: string
  dept: string
  publisher: string
  frequencyLabel: string
  scopeLabel: string
  freqType: string
  freqTime: string
  freqWeekDays: number[]
  freqMonthDays: number[]
  scopeDevices: string[]
  stopped: boolean
}

const inspectionTeams = ['巡检一组', '巡检二组', '巡检三组']
const weekOptions = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
const deviceTypes = [
  { value: 'ac', label: '空调' }, { value: 'lighting', label: '照明' }, { value: 'fire', label: '消防' },
  { value: 'elevator', label: '电梯' }, { value: 'electrical', label: '配电' }, { value: 'mechanical', label: '给排水' },
  { value: 'door', label: '门禁' }, { value: 'it', label: '弱电' }, { value: 'other', label: '其他' },
]

const buildings = [
  { value: 'ct', label: 'CT楼' },
  { value: 'ff', label: 'FF楼' },
  { value: 'ob', label: '海关联检大楼(OB)' },
]
const buildingFloors: Record<string, { value: string; label: string }[]> = {
  ct: [
    { value: 'ct-1f', label: '1F' }, { value: 'ct-2f', label: '2F' }, { value: 'ct-3f', label: '3F' },
    { value: 'ct-4f', label: '4F' }, { value: 'ct-5f', label: '5F' }, { value: 'ct-6f', label: '6F' },
    { value: 'ct-roof', label: '屋顶层' }, { value: 'ct-b1', label: 'B1' },
  ],
  ff: [
    { value: 'ff-1f', label: '1F' }, { value: 'ff-s', label: 'S夹层' },
    { value: 'ff-7f', label: '7F' }, { value: 'ff-8f', label: '8F' },
  ],
  ob: [
    { value: 'ob-1f', label: '1F' }, { value: 'ob-2f', label: '2F' },
  ],
}
const currentFilterFloors = computed(() => deviceFilter.building ? (buildingFloors[deviceFilter.building] || []) : [])

interface DeviceEntry { key: string; name: string; type: string; location: string; space: string }

const allDevices: DeviceEntry[] = [
  { key: 'd1', name: '1F 配电柜 A', type: 'electrical', location: 'CT楼 1F 配电房', space: 'ct-1f' },
  { key: 'd2', name: '1F 空调主机', type: 'ac', location: 'CT楼 1F 空调机房', space: 'ct-1f' },
  { key: 'd3', name: '1F 消防泵', type: 'fire', location: 'CT楼 1F 泵房', space: 'ct-1f' },
  { key: 'd4', name: '1F 货梯', type: 'elevator', location: 'CT楼 1F 大厅北侧', space: 'ct-1f' },
  { key: 'd5', name: '1F 照明回路 A', type: 'lighting', location: 'CT楼 1F 走廊', space: 'ct-1f' },
  { key: 'd6', name: '1F 门禁控制器 A', type: 'door', location: 'CT楼 1F 主入口', space: 'ct-1f' },
  { key: 'd7', name: '2F 发电机', type: 'electrical', location: 'CT楼 2F 发电机房', space: 'ct-2f' },
  { key: 'd8', name: '2F 制冷机组', type: 'ac', location: 'CT楼 2F 制冷机房', space: 'ct-2f' },
  { key: 'd9', name: '2F 照明回路 B', type: 'lighting', location: 'CT楼 2F 办公区', space: 'ct-2f' },
  { key: 'd10', name: '3F 仓储区照明', type: 'lighting', location: 'CT楼 3F 仓储区', space: 'ct-3f' },
  { key: 'd11', name: '3F 货运电梯', type: 'elevator', location: 'CT楼 3F 货运区', space: 'ct-3f' },
  { key: 'd12', name: '4F 配电柜 B', type: 'electrical', location: 'CT楼 4F 配电间', space: 'ct-4f' },
  { key: 'd13', name: '4F 防火卷帘', type: 'fire', location: 'CT楼 4F 通道', space: 'ct-4f' },
  { key: 'd14', name: '5F 空调室内机', type: 'ac', location: 'CT楼 5F 海关功能区', space: 'ct-5f' },
  { key: 'd15', name: '6F IT控制主机', type: 'it', location: 'CT楼 6F IT控制机房', space: 'ct-6f' },
  { key: 'd16', name: '屋顶层 排风机', type: 'mechanical', location: 'CT楼 屋顶层风机房', space: 'ct-roof' },
  { key: 'd17', name: 'B1 加压风机', type: 'mechanical', location: 'CT楼 B1 加压机房', space: 'ct-b1' },
  { key: 'd18', name: 'B1 消防水泵', type: 'mechanical', location: 'CT楼 B1 泵房', space: 'ct-b1' },
  { key: 'd19', name: '1F 变压器', type: 'electrical', location: 'FF楼 1F 变电所', space: 'ff-1f' },
  { key: 'd20', name: '1F 发电机组', type: 'electrical', location: 'FF楼 1F 发电机房', space: 'ff-1f' },
  { key: 'd21', name: '1F 卸货平台液压升降台', type: 'mechanical', location: 'FF楼 1F 平台', space: 'ff-1f' },
  { key: 'd22', name: 'S夹层 货运电梯', type: 'elevator', location: 'FF楼 S夹层', space: 'ff-s' },
  { key: 'd23', name: 'S夹层 照明回路', type: 'lighting', location: 'FF楼 S夹层', space: 'ff-s' },
  { key: 'd24', name: '7F 送风机', type: 'mechanical', location: 'FF楼 7F 送风机房', space: 'ff-7f' },
  { key: 'd25', name: '8F 电梯曳引机', type: 'elevator', location: 'FF楼 8F 电梯机房', space: 'ff-8f' },
  { key: 'd26', name: '1F 配电柜', type: 'electrical', location: 'OB 1F 配电间', space: 'ob-1f' },
  { key: 'd27', name: '1F 门禁控制器', type: 'door', location: 'OB 1F 控制室', space: 'ob-1f' },
  { key: 'd28', name: '2F 空调外机', type: 'ac', location: 'OB 2F 室外', space: 'ob-2f' },
]

function deviceTypeLabel(v: string): string {
  const map: Record<string, string> = { ac: '空调', lighting: '照明', fire: '消防', elevator: '电梯', electrical: '配电', mechanical: '给排水', door: '门禁', it: '弱电', other: '其他' }
  return map[v] || v
}

// Mock 数据
let nextId = 100
function mockPlans(): InspectionPlan[] {
  return [
    { id: 101, name: 'CT楼配电设备日检', inspectionTeam: '巡检一组', startDate: '2026-07-01 00:00:00', endDate: '', dept: '运维部', publisher: '张伟', frequencyLabel: '每天 03:00', scopeLabel: '4台设备', freqType: 'daily', freqTime: '03:00', freqWeekDays: [], freqMonthDays: [], scopeDevices: ['d1', 'd7', 'd12', 'd19'], stopped: false },
    { id: 102, name: '全区域消防设备周检', inspectionTeam: '巡检二组', startDate: '2026-08-01 00:00:00', endDate: '2026-12-31 23:59:59', dept: '安全部', publisher: '李强', frequencyLabel: '每周一、周四 06:00', scopeLabel: '3台设备', freqType: 'weekly', freqTime: '06:00', freqWeekDays: [1, 4], freqMonthDays: [], scopeDevices: ['d3', 'd13', 'd18'], stopped: false },
    { id: 103, name: 'CT楼1F设备月检', inspectionTeam: '巡检三组', startDate: '2026-06-01 00:00:00', endDate: '2026-06-30 23:59:59', dept: '设备部', publisher: '王芳', frequencyLabel: '每月1日、15日 08:00', scopeLabel: '6台设备', freqType: 'monthly', freqTime: '08:00', freqWeekDays: [], freqMonthDays: [1, 15], scopeDevices: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6'], stopped: false },
    { id: 104, name: 'FF楼全设备周检', inspectionTeam: '巡检一组', startDate: '2026-09-01 00:00:00', endDate: '', dept: '运维部', publisher: '张伟', frequencyLabel: '每周五 10:00', scopeLabel: '4台设备', freqType: 'weekly', freqTime: '10:00', freqWeekDays: [5], freqMonthDays: [], scopeDevices: ['d19', 'd20', 'd21', 'd22'], stopped: true },
  ]
}

const allPlans = ref<InspectionPlan[]>(mockPlans())

function planStatus(row: InspectionPlan): string {
  if (row.stopped) return 'stopped'
  const now = new Date()
  const start = row.startDate ? new Date(row.startDate) : null
  const end = row.endDate ? new Date(row.endDate) : null
  if (start && now < start) return 'pending'
  if (end && now > end) return 'ended'
  return 'active'
}
function planStatusLabel(row: InspectionPlan): string {
  const m: Record<string, string> = { pending: '未开始', active: '进行中', ended: '已结束', stopped: '已停用' }
  return m[planStatus(row)] || ''
}
function planStatusType(row: InspectionPlan): string {
  const m: Record<string, string> = { pending: 'warning', active: 'success', ended: 'info', stopped: 'danger' }
  return m[planStatus(row)] || 'info'
}

// 列表状态
const page = ref(1)
const pageSize = ref(10)
const query = reactive({ keyword: '', team: '', status: '' })
const filtered = computed(() => {
  let list = allPlans.value
  if (query.keyword) list = list.filter(p => p.name.includes(query.keyword))
  if (query.team) list = list.filter(p => p.inspectionTeam === query.team)
  if (query.status) list = list.filter(p => planStatus(p) === query.status)
  return list
})
const total = computed(() => filtered.value.length)
const tableData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
function applyFilters() { page.value = 1 }
function resetQuery() { query.keyword = ''; query.team = ''; query.status = ''; page.value = 1 }
function stopPlan(row: InspectionPlan) { row.stopped = true }
function enablePlan(row: InspectionPlan) { row.stopped = false }
function handleDelete(row: InspectionPlan) {
  const idx = allPlans.value.findIndex(p => p.id === row.id)
  if (idx >= 0) allPlans.value.splice(idx, 1)
}

// 抽屉状态
const drawerVisible = ref(false)
const isEditing = ref(false)

const baseFormRef = ref<FormInstance>()
const baseForm = reactive({ name: '', inspectionTeam: '', startDate: '', endDate: '', dept: '运维部', publisher: '张伟' })
const baseRules: FormRules = {
  name: [{ required: true, message: '请输入计划名称', trigger: 'blur' }],
  inspectionTeam: [{ required: true, message: '请选择巡检班组', trigger: 'change' }],
  startDate: [{ required: true, message: '请选择计划开始时间', trigger: 'change' }],
  dept: [{ required: true, message: '请输入发布部门', trigger: 'blur' }],
  publisher: [{ required: true, message: '请输入发布人', trigger: 'blur' }],
}
const freqForm = reactive({ type: 'daily' as string, time: '' as string, weekDays: [] as number[], monthDays: [] as number[] })
function onFreqTypeChange() {
  freqForm.weekDays = []
  freqForm.monthDays = []
}

const selectedDevices = ref<DeviceEntry[]>([])
const deviceDialogVisible = ref(false)
const deviceTableRef = ref()
const tempSelectedDevices = ref<DeviceEntry[]>([])
const deviceFilter = reactive({ building: '', floor: '', type: '', keyword: '' })

const filteredDeviceTable = computed(() => {
  let list = allDevices
  if (deviceFilter.building) list = list.filter(d => d.space.startsWith(deviceFilter.building))
  if (deviceFilter.floor) list = list.filter(d => d.space === deviceFilter.floor)
  if (deviceFilter.type) list = list.filter(d => d.type === deviceFilter.type)
  if (deviceFilter.keyword) list = list.filter(d => d.name.includes(deviceFilter.keyword))
  return list
})

function openDeviceDialog() {
  deviceFilter.building = ''
  deviceFilter.floor = ''
  deviceFilter.type = ''
  deviceFilter.keyword = ''
  tempSelectedDevices.value = [...selectedDevices.value]
  deviceDialogVisible.value = true
  nextTick(() => syncTableSelection())
}

watch(filteredDeviceTable, () => {
  nextTick(() => syncTableSelection())
})

const syncing = ref(false)

function syncTableSelection() {
  if (!deviceTableRef.value) return
  syncing.value = true
  deviceTableRef.value.clearSelection()
  filteredDeviceTable.value.forEach(d => {
    if (tempSelectedDevices.value.find(t => t.key === d.key)) {
      deviceTableRef.value.toggleRowSelection(d, true)
    }
  })
  nextTick(() => { syncing.value = false })
}

function onDeviceRowSelect(_selection: DeviceEntry[], row: DeviceEntry) {
  if (syncing.value) return
  const idx = tempSelectedDevices.value.findIndex(d => d.key === row.key)
  if (idx >= 0) {
    tempSelectedDevices.value.splice(idx, 1)
  } else {
    tempSelectedDevices.value.push(row)
  }
}

function confirmDeviceSelect() {
  selectedDevices.value = [...tempSelectedDevices.value]
  deviceDialogVisible.value = false
}

function removeDevice(idx: number) {
  selectedDevices.value.splice(idx, 1)
}

const detailDrawerVisible = ref(false)
const detailPlan = ref<InspectionPlan | null>(null)
const detailDevices = computed(() => {
  if (!detailPlan.value) return []
  return allDevices.filter(d => detailPlan.value!.scopeDevices.includes(d.key))
})
function openDetail(row: InspectionPlan) {
  detailPlan.value = row
  detailDrawerVisible.value = true
}

let editingPlanId = 0

function openCreate() {
  isEditing.value = false
  editingPlanId = 0
  baseForm.name = ''
  baseForm.inspectionTeam = ''
  baseForm.startDate = ''
  baseForm.endDate = ''
  baseForm.dept = '运维部'
  baseForm.publisher = '张伟'
  freqForm.type = 'daily'
  freqForm.time = ''
  freqForm.weekDays = []
  freqForm.monthDays = []
  selectedDevices.value = []
  drawerVisible.value = true
}

function openEdit(row: InspectionPlan) {
  isEditing.value = true
  editingPlanId = row.id
  baseForm.name = row.name
  baseForm.inspectionTeam = row.inspectionTeam
  baseForm.startDate = row.startDate
  baseForm.endDate = row.endDate
  baseForm.dept = row.dept
  baseForm.publisher = row.publisher
  freqForm.type = row.freqType
  freqForm.time = row.freqTime
  freqForm.weekDays = [...row.freqWeekDays]
  freqForm.monthDays = [...row.freqMonthDays]
  selectedDevices.value = allDevices.filter(d => row.scopeDevices.includes(d.key))
  drawerVisible.value = true
}

function confirmSave() {
  baseFormRef.value?.validate((valid: boolean) => {
    if (!valid) return
    let freqLabel = ''
    if (freqForm.type === 'daily') freqLabel = `每天 ${freqForm.time}`
    else if (freqForm.type === 'weekly') freqLabel = `每周${freqForm.weekDays.map(d => weekOptions[d - 1]).join('、')} ${freqForm.time}`
    else freqLabel = `每月${freqForm.monthDays.join('日、')}日 ${freqForm.time}`

    const plan: InspectionPlan = {
      id: isEditing.value ? editingPlanId : ++nextId,
      name: baseForm.name,
      inspectionTeam: baseForm.inspectionTeam,
      startDate: baseForm.startDate,
      endDate: baseForm.endDate,
      dept: baseForm.dept,
      publisher: baseForm.publisher,
      frequencyLabel: freqLabel,
      scopeLabel: `${selectedDevices.value.length}台设备`,
      freqType: freqForm.type,
      freqTime: freqForm.time,
      freqWeekDays: [...freqForm.weekDays],
      freqMonthDays: [...freqForm.monthDays],
      scopeDevices: selectedDevices.value.map(d => d.key),
      stopped: false,
    }

    if (isEditing.value) {
      const idx = allPlans.value.findIndex(p => p.id === editingPlanId)
      if (idx >= 0) allPlans.value[idx] = plan
    } else {
      allPlans.value.unshift(plan)
    }
    drawerVisible.value = false
  })
}
</script>

<style scoped>
.ip-page { max-width: 1500px; }
.ip-search { background: #fafbfc; padding: 16px; border-radius: 4px; margin-bottom: 16px; }
.ip-actions { display: flex; align-items: center; gap: 16px; margin-bottom: 16px; }
.ip-actions__count { font-size: 13px; color: #909399; }
.ip-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }

.ip-drawer-title { font-size: 18px; font-weight: 600; color: #303133; }
.ip-drawer-body { padding: 0 4px; }
.ip-drawer-footer { display: flex; justify-content: flex-end; gap: 8px; }
.ip-freq { font-size: 13px; color: #606266; }
.ip-form-hint { font-size: 12px; color: #909399; display: block; margin-top: 4px; }

.ip-device-section { margin-top: 4px; }
.ip-device-section__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.ip-device-section__count { font-size: 13px; color: #606266; }
.ip-device-empty { padding: 16px; text-align: center; font-size: 13px; color: #c0c4cc; border: 1px solid #ebeef5; border-radius: 4px; background: #fafbfc; }

.ip-detail-devices { margin-top: 16px; }
.ip-detail-devices__title { font-size: 14px; font-weight: 600; color: #303133; margin: 0 0 10px; padding-left: 10px; border-left: 3px solid #409eff; }

.ip-device-filter { background: #fafbfc; padding: 12px 16px; border-radius: 4px; margin-bottom: 12px; }
</style>
