<template>
  <div>
    <div class="pfr-layout">
      <!-- 左侧：空间结构树 -->
      <div class="pfr-tree-panel">
        <div class="pfr-tree-header">
          <h3 class="pfr-tree-title">统计区域</h3>
          <el-button text size="small" :icon="Setting" @click="configDrawerVisible = true">配置</el-button>
        </div>
        <div class="pfr-tree-scroll">
          <el-tree
            v-if="hasStatisticAreas"
            :data="treeData"
            :props="treeProps"
            node-key="key"
            default-expand-all
            highlight-current
            :current-node-key="currentNodeKey"
            :expand-on-click-node="false"
            @node-click="handleTreeNodeClick"
          />
          <el-empty v-else description="请先配置统计区域" :image-size="72" class="pfr-tree-empty" />
        </div>
      </div>

      <!-- 右侧：统计内容 -->
      <div class="pfr-content">
        <div v-if="!hasStatisticAreas" class="pfr-page-empty">
          <el-empty description="暂无统计区域，请先完成统计区域配置" :image-size="110">
            <el-button type="primary" :icon="Setting" @click="configDrawerVisible = true">前往配置</el-button>
          </el-empty>
        </div>
        <template v-else>
        <!-- 选中区域面包屑 -->
        <div class="pfr-breadcrumb">
          <el-icon><HomeFilled /></el-icon>
          <span class="pfr-breadcrumb__item">园区</span>
          <template v-if="currentPath.length">
            <el-icon class="pfr-breadcrumb__sep"><ArrowRight /></el-icon>
            <span
              v-for="(seg, idx) in currentPath"
              :key="seg"
              class="pfr-breadcrumb__item"
              :class="{ 'pfr-breadcrumb__item--active': idx === currentPath.length - 1 }"
            >{{ seg }}</span>
          </template>
        </div>

        <!-- 顶部统计卡片 -->
        <el-row :gutter="16" class="pfr-stats">
          <el-col :span="8">
            <div class="pfr-stat-card pfr-stat-card--primary">
              <div class="pfr-stat-card__icon"><el-icon :size="28"><UserFilled /></el-icon></div>
              <div class="pfr-stat-card__body">
                <div class="pfr-stat-card__value">{{ stats.currentInPark }}</div>
                <div class="pfr-stat-card__label">当前人数</div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="pfr-stat-card pfr-stat-card--warning">
              <div class="pfr-stat-card__icon"><el-icon :size="28"><TopRight /></el-icon></div>
              <div class="pfr-stat-card__body">
                <div class="pfr-stat-card__value">{{ stats.todayEntry }}</div>
                <div class="pfr-stat-card__label">今日进入</div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="pfr-stat-card pfr-stat-card--danger">
              <div class="pfr-stat-card__icon"><el-icon :size="28"><BottomLeft /></el-icon></div>
              <div class="pfr-stat-card__body">
                <div class="pfr-stat-card__value">{{ stats.todayExit }}</div>
                <div class="pfr-stat-card__label">今日离开</div>
              </div>
            </div>
          </el-col>
        </el-row>

        <!-- 查询条件 -->
        <el-form :model="query" inline class="pfr-search">
          <el-form-item label="统计周期">
            <el-date-picker
              v-model="query.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              value-format="YYYY-MM-DD"
              style="width: 240px"
            />
          </el-form-item>
          <el-form-item label="时间粒度">
            <el-radio-group v-model="query.granularity">
              <el-radio-button value="day">按日</el-radio-button>
              <el-radio-button value="week">按周</el-radio-button>
              <el-radio-button value="month">按月</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item>
            <el-button type="primary" :icon="Search" @click="handleQuery">查询</el-button>
            <el-button :icon="Refresh" @click="handleReset">重置</el-button>
            <el-button :icon="Download" @click="handleExport">导出报表</el-button>
          </el-form-item>
        </el-form>

        <!-- 统计明细表 -->
        <div class="pfr-section">
          <h3 class="pfr-section__title">
            统计明细
            <span v-if="selectedAreaLabel" class="pfr-section__subtitle">（{{ selectedAreaLabel }}）</span>
          </h3>
          <div v-if="statTotal > 0">
            <el-table :data="statTableData" border stripe style="width: 100%" @sort-change="handleSortChange">
              <el-table-column prop="date" label="日期" width="140" sortable fixed />
              <el-table-column prop="entry" label="进入" width="120" sortable align="center" />
              <el-table-column prop="exit" label="离开" width="120" sortable align="center" />
              <el-table-column label="环比" width="160" align="center">
                <template #default="{ row }">
                  <span v-if="row.mom !== null" :class="row.mom >= 0 ? 'pfr-mom--up' : 'pfr-mom--down'">
                    <el-icon :size="12"><Top v-if="row.mom >= 0" /><Bottom v-else /></el-icon>
                    {{ Math.abs(row.mom).toFixed(1) }}%
                  </span>
                  <span v-else class="pfr-mom--na">—</span>
                </template>
              </el-table-column>
              <el-table-column prop="peakHour" label="高峰时段" width="140" align="center" />
              <el-table-column prop="peakFlow" label="高峰流量" width="100" align="center" sortable />
            </el-table>
          </div>
          <div v-else class="pfr-empty-block">
            <el-empty description="当前筛选条件下暂无统计明细" />
          </div>
          <div v-if="statTotal > 0" class="pfr-pagination">
            <el-pagination
              v-model:current-page="statPage"
              v-model:page-size="statPageSize"
              :page-sizes="[10, 20, 50]"
              :total="statTotal"
              layout="total, sizes, prev, pager, next, jumper"
            />
          </div>
        </div>

        <!-- 人流趋势图 -->
        <div class="pfr-section">
          <h3 class="pfr-section__title">
            人流趋势
            <span v-if="selectedAreaLabel" class="pfr-section__subtitle">（{{ selectedAreaLabel }}）</span>
          </h3>
          <div class="pfr-chart-area">
            <template v-if="trendData.length > 0">
              <div class="pfr-chart__y-axis">
                <span v-for="n in 5" :key="n" class="pfr-chart__y-label">{{ (maxCount / 5 * (6 - n)).toFixed(0) }}</span>
              </div>
              <div class="pfr-chart">
                <div class="pfr-chart__plot" @mouseleave="handleTrendLeave">
                  <svg class="pfr-line-chart" :viewBox="'0 0 ' + chartViewBoxWidth + ' 260'" preserveAspectRatio="xMidYMid meet">
                    <line v-for="n in 5" :key="'g' + n" :x1="40" :y1="20 + (n - 1) * 48" :x2="trendData.length * 60 + 40" :y2="20 + (n - 1) * 48" stroke="#ebeef5" stroke-width="1" />
                    <line
                      v-if="activeTrendItem"
                      :x1="pointX(activeTrendIndex ?? 0)"
                      y1="20"
                      :x2="pointX(activeTrendIndex ?? 0)"
                      y2="230"
                      stroke="#dcdfe6"
                      stroke-dasharray="4 4"
                    />
                    <polyline
                      :points="linePoints('entry')"
                      fill="none"
                      stroke="#409eff"
                      stroke-width="2.5"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                    />
                    <polyline
                      :points="linePoints('exit')"
                      fill="none"
                      stroke="#e6a23c"
                      stroke-width="2.5"
                      stroke-linejoin="round"
                      stroke-linecap="round"
                    />
                    <g v-for="(item, idx) in trendData" :key="'group' + idx">
                      <rect
                        :x="40 + idx * 60"
                        y="20"
                        width="60"
                        height="210"
                        fill="transparent"
                        @mouseenter="handleTrendHover(idx)"
                      />
                      <circle
                        :cx="pointX(idx)"
                        :cy="pointY(item.entry)"
                        :r="activeTrendIndex === idx ? 5 : 3.5"
                        fill="#409eff"
                        stroke="#fff"
                        stroke-width="1.5"
                      />
                      <circle
                        :cx="pointX(idx)"
                        :cy="pointY(item.exit)"
                        :r="activeTrendIndex === idx ? 5 : 3.5"
                        fill="#e6a23c"
                        stroke="#fff"
                        stroke-width="1.5"
                      />
                      <text
                        :x="pointX(idx)"
                        y="248"
                        text-anchor="middle"
                        fill="#909399"
                        font-size="10"
                      >{{ formatLabel(item.date) }}</text>
                    </g>
                  </svg>
                  <div v-if="activeTrendItem" class="pfr-chart-tooltip" :style="trendTooltipStyle">
                    <div class="pfr-chart-tooltip__title">{{ activeTrendItem.date }}</div>
                    <div class="pfr-chart-tooltip__row">
                      <span class="pfr-chart-tooltip__dot pfr-chart-tooltip__dot--entry" />进入：{{ activeTrendItem.entry }}
                    </div>
                    <div class="pfr-chart-tooltip__row">
                      <span class="pfr-chart-tooltip__dot pfr-chart-tooltip__dot--exit" />离开：{{ activeTrendItem.exit }}
                    </div>
                  </div>
                </div>
                <div class="pfr-chart__legend">
                  <span class="pfr-chart__legend-item"><span class="pfr-chart__legend-dot pfr-chart__legend-dot--entry" />进入</span>
                  <span class="pfr-chart__legend-item"><span class="pfr-chart__legend-dot pfr-chart__legend-dot--exit" />离开</span>
                </div>
              </div>
            </template>
            <div v-else class="pfr-chart-empty">
              <el-empty description="当前筛选条件下暂无趋势数据" />
            </div>
          </div>
        </div>
        </template>
      </div>
    </div>

    <el-drawer v-model="configDrawerVisible" title="人流统计配置" size="680px" :with-header="true">
      <div class="pfr-config-toolbar">
        <el-button type="primary" :icon="Plus" @click="openAddStatisticArea">新增统计区域</el-button>
      </div>
      <el-table
        :data="configuredAreaRows"
        row-key="id"
        border
        default-expand-all
        :tree-props="{ children: 'children' }"
        class="pfr-config-hierarchy"
      >
        <el-table-column prop="area" label="统计区域" min-width="240" />
        <el-table-column label="统计点位" min-width="300">
          <template #default="{ row }">
            <template v-if="row.points.length">
              <el-popover placement="top" :width="280" trigger="hover">
                <template #reference>
                  <el-link type="primary" :underline="false" class="pfr-config-point-count">
                    {{ row.points.length }} 个点位
                  </el-link>
                </template>
                <div class="pfr-config-point-popover">
                  <div v-for="point in row.points" :key="point.id" class="pfr-config-point-popover__item">
                    <span>{{ point.name }}</span>
                    <span class="pfr-config-point-popover__meta">
                      {{ point.code }} · {{ point.direction === 'entry' ? '进入' : '离开' }}
                    </span>
                  </div>
                </div>
              </el-popover>
            </template>
            <span v-else class="pfr-config-placeholder">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right" align="center">
          <template #default="{ row }">
            <el-button text type="primary" size="small" @click="openEditStatisticArea(row.id)">编辑</el-button>
            <el-button text type="danger" size="small" @click="deleteStatisticArea(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-drawer>

    <el-dialog v-model="addAreaVisible" :title="editingAreaId ? '编辑统计区域' : '新增统计区域'" width="760px" :close-on-click-modal="false" destroy-on-close>
      <el-form ref="addAreaFormRef" :model="addAreaForm" :rules="addAreaRules" label-width="100px">
        <el-form-item label="统计区域名称" prop="name">
          <el-input v-model="addAreaForm.name" maxlength="30" show-word-limit placeholder="请输入统计区域名称" />
        </el-form-item>
        <el-form-item label="父级区域">
          <el-select v-model="addAreaForm.parentId" clearable placeholder="未选择则作为第一级区域" style="width: 100%">
            <el-option v-for="option in statisticAreaOptions" :key="option.id" :label="option.label" :value="option.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="点位位置筛选">
          <el-cascader
            v-model="addAreaForm.locationPath"
            :options="accessLocationOptions"
            :props="{ checkStrictly: true }"
            clearable
            placeholder="请选择建筑、楼层或功能区域"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="统计点位" prop="pointIds">
          <el-transfer
            v-model="addAreaForm.pointIds"
            :data="filteredAccessPointOptions"
            :titles="['可选点位', '已选点位']"
            filterable
            filter-placeholder="搜索点位名称或编号"
            class="pfr-point-transfer"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addAreaVisible = false">取消</el-button>
        <el-button type="primary" @click="saveStatisticArea">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import exportTemplateUrl from './PeopleFlowReport_导出报表模板.xls?url'
import {
  Search, Refresh, Download, Setting, Plus,
  UserFilled, TopRight, BottomLeft,
  Top, Bottom, HomeFilled, ArrowRight
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const treeProps = { label: 'label', children: 'children' }


// ==================== 空间树数据（建筑→楼层） ====================

interface AreaTreeNode {
  key: string
  value: string
  label: string
  children?: AreaTreeNode[]
}

interface AreaTreeNodeSource {
  value: string
  label: string
  children?: AreaTreeNodeSource[]
}

const areaTreeSource: AreaTreeNodeSource[] = [
  {
    value: 'CT楼',
    label: 'CT楼',
    children: [
      { value: '1F', label: '1F' },
      { value: '2F', label: '2F' },
      { value: '3F', label: '3F' },
      { value: '4F', label: '4F' },
      { value: '5F', label: '5F' },
      { value: '6F', label: '6F' },
      { value: '屋顶层', label: '屋顶层' },
      { value: '地下室', label: '地下室' },
    ]
  },
  {
    value: 'FF楼',
    label: 'FF楼',
    children: [
      { value: '1F', label: '1F' },
      { value: 'S夹层', label: 'S夹层' },
      { value: '7F', label: '7F' },
      { value: '8F', label: '8F' },
    ]
  },
  {
    value: '海关联检大楼(OB)',
    label: '海关联检大楼(OB)',
    children: [
      { value: '1F', label: '1F' },
      { value: '2F', label: '2F' },
    ]
  },
]

function attachTreeKeys(nodes: AreaTreeNodeSource[], parentKey = ''): AreaTreeNode[] {
  return nodes.map((node) => {
    const key = parentKey ? `${parentKey}/${node.value}` : node.value
    return {
      key,
      value: node.value,
      label: node.label,
      children: node.children ? attachTreeKeys(node.children, key) : undefined,
    }
  })
}

const areaTreeRaw = attachTreeKeys(areaTreeSource)

interface AccessDevice {
  id: string
  areaKey: string
  name: string
  code: string
  direction: 'entry' | 'exit'
}

interface AccessPointOption extends AccessDevice {
  locationPath: string[]
}

interface StatisticArea {
  id: string
  name: string
  parentId: string | null
  pointIds: string[]
}

interface CascaderOption {
  value: string
  label: string
  children?: CascaderOption[]
}

const accessPointInventory: AccessPointOption[] = [
  { id: 'ct-entry-01', areaKey: 'CT楼', name: '东区入口门禁', code: 'CT-IN-01', direction: 'entry', locationPath: ['CT楼', '1F', '物流作业区'] },
  { id: 'ct-exit-01', areaKey: 'CT楼', name: '东区出口门禁', code: 'CT-OUT-01', direction: 'exit', locationPath: ['CT楼', '1F', '物流作业区'] },
  { id: 'ct-1f-entry-01', areaKey: 'CT楼/1F', name: '1楼左侧门禁', code: 'CT-1F-01', direction: 'entry', locationPath: ['CT楼', '1F', '公共区域'] },
  { id: 'ct-2f-entry-01', areaKey: 'CT楼/2F', name: '2楼左侧门禁', code: 'CT-2F-01', direction: 'entry', locationPath: ['CT楼', '2F', '办公管理区'] },
  { id: 'ff-1f-entry-01', areaKey: 'FF楼/1F', name: 'FF楼西侧入口门禁', code: 'FF-1F-IN-01', direction: 'entry', locationPath: ['FF楼', '1F', '物流作业区'] },
  { id: 'ff-1f-exit-01', areaKey: 'FF楼/1F', name: 'FF楼西侧出口门禁', code: 'FF-1F-OUT-01', direction: 'exit', locationPath: ['FF楼', '1F', '海关作业区'] },
  { id: 'ob-1f-entry-01', areaKey: '海关联检大楼(OB)/1F', name: '联检大楼门厅门禁', code: 'OB-1F-IN-01', direction: 'entry', locationPath: ['海关联检大楼(OB)', '1F', '公共区域'] },
]

const statisticAreas = ref<StatisticArea[]>([
  { id: 'ct', name: 'CT楼', parentId: null, pointIds: ['ct-entry-01', 'ct-exit-01'] },
  { id: 'ct-1f', name: '1F', parentId: 'ct', pointIds: ['ct-1f-entry-01'] },
  { id: 'ct-2f', name: '2F', parentId: 'ct', pointIds: ['ct-2f-entry-01'] },
])

const configDrawerVisible = ref(false)
const addAreaVisible = ref(false)
const addAreaFormRef = ref()
const editingAreaId = ref('')
const addAreaForm = reactive({
  name: '',
  parentId: '' as string | null,
  locationPath: [] as string[],
  pointIds: [] as string[],
})

const addAreaRules = {
  name: [{ required: true, message: '请输入统计区域名称', trigger: 'blur' }],
  pointIds: [{ type: 'array', min: 1, message: '请至少选择一个统计点位', trigger: 'change' }],
}

const accessLocationOptions: CascaderOption[] = [
  {
    value: 'CT楼',
    label: 'CT楼',
    children: [
      { value: '1F', label: '1F', children: [{ value: '物流作业区', label: '物流作业区' }, { value: '公共区域', label: '公共区域' }] },
      { value: '2F', label: '2F', children: [{ value: '办公管理区', label: '办公管理区' }] },
    ],
  },
  {
    value: 'FF楼',
    label: 'FF楼',
    children: [
      { value: '1F', label: '1F', children: [{ value: '物流作业区', label: '物流作业区' }, { value: '海关作业区', label: '海关作业区' }] },
    ],
  },
  {
    value: '海关联检大楼(OB)',
    label: '海关联检大楼(OB)',
    children: [
      { value: '1F', label: '1F', children: [{ value: '公共区域', label: '公共区域' }] },
    ],
  },
]

function areaPathKey(areaPath: string[]): string {
  return areaPath.join('/')
}

function buildStatisticAreaTree(parentId: string | null = null, parentKey = ''): AreaTreeNode[] {
  return statisticAreas.value
    .filter((area) => area.parentId === parentId)
    .map((area) => {
      const key = parentKey ? `${parentKey}/${area.id}` : area.id
      const children = buildStatisticAreaTree(area.id, key)
      return {
        key,
        value: area.id,
        label: area.name,
        children: children.length > 0 ? children : undefined,
      }
    })
}

const treeData = computed<AreaTreeNode[]>(() => buildStatisticAreaTree())
const hasStatisticAreas = computed(() => statisticAreas.value.length > 0)

interface ConfiguredAreaRow {
  id: string
  area: string
  points: AccessDevice[]
  children?: ConfiguredAreaRow[]
}

function buildConfiguredAreaRows(parentId: string | null = null): ConfiguredAreaRow[] {
  return statisticAreas.value
    .filter((area) => area.parentId === parentId)
    .map((area) => {
      const children = buildConfiguredAreaRows(area.id)
      return {
        id: area.id,
        area: area.name,
        points: accessPointInventory.filter((point) => area.pointIds.includes(point.id)),
        children: children.length > 0 ? children : undefined,
      }
    })
}

const configuredAreaRows = computed<ConfiguredAreaRow[]>(() => buildConfiguredAreaRows())

const statisticAreaOptions = computed(() => {
  const options: { id: string; label: string }[] = []
  function walk(parentId: string | null, prefix = '') {
    statisticAreas.value.filter((area) => area.parentId === parentId).forEach((area) => {
      options.push({ id: area.id, label: `${prefix}${area.name}` })
      walk(area.id, `${prefix}${area.name} / `)
    })
  }
  walk(null)
  return options
})

const filteredAccessPointOptions = computed(() => {
  const path = addAreaForm.locationPath
  // Empty cascader selection intentionally restores the complete point inventory.
  return accessPointInventory
    .filter((point) => path.length === 0 || path.every((segment, index) => point.locationPath[index] === segment))
    .map((point) => ({
      key: point.id,
      label: `${point.name}（${point.code}，${point.direction === 'entry' ? '进入' : '离开'}）`,
    }))
})

const currentNode = ref<AreaTreeNode | null>(null)
const currentNodeKey = computed(() => currentNode.value?.key ?? '')

function containsTreeNode(nodes: AreaTreeNode[], key: string): boolean {
  return nodes.some((node) => node.key === key || (node.children && containsTreeNode(node.children, key)))
}

watch(treeData, (nodes) => {
  if (!nodes.length) {
    currentNode.value = null
    return
  }

  if (!currentNode.value || !containsTreeNode(nodes, currentNode.value.key)) {
    currentNode.value = nodes[0]
  }
}, { immediate: true })

const currentAreaPath = computed<string[]>(() => {
  if (!currentNode.value) return []
  return currentNode.value.key.split('/')
})

const currentPath = computed(() => currentAreaPath.value.map((areaId) => {
  return statisticAreas.value.find((area) => area.id === areaId)?.name || areaId
}))

const selectedStatisticAreaId = computed(() => currentNode.value?.value || '')

const selectedAreaLabel = computed(() => {
  if (!currentNode.value) return ''
  return currentNode.value.label
})

function handleTreeNodeClick(data: AreaTreeNode) {
  currentNode.value = data
  statPage.value = 1
  regenerateTrendData()
  updateStats()
}

function openAddStatisticArea() {
  editingAreaId.value = ''
  addAreaForm.name = ''
  addAreaForm.parentId = null
  addAreaForm.locationPath = []
  addAreaForm.pointIds = []
  addAreaVisible.value = true
}

function openEditStatisticArea(areaId: string) {
  const area = statisticAreas.value.find((item) => item.id === areaId)
  if (!area) return

  editingAreaId.value = area.id
  addAreaForm.name = area.name
  addAreaForm.parentId = area.parentId
  addAreaForm.locationPath = []
  addAreaForm.pointIds = [...area.pointIds]
  addAreaVisible.value = true
}

async function saveStatisticArea() {
  const valid = await addAreaFormRef.value?.validate().catch(() => false)
  if (!valid) return

  if (editingAreaId.value) {
    const index = statisticAreas.value.findIndex((area) => area.id === editingAreaId.value)
    if (index >= 0) {
      statisticAreas.value[index] = {
        ...statisticAreas.value[index],
        name: addAreaForm.name.trim(),
        parentId: addAreaForm.parentId || null,
        pointIds: [...addAreaForm.pointIds],
      }
    }
  } else {
    statisticAreas.value.push({
      id: `stat-area-${Date.now()}`,
      name: addAreaForm.name.trim(),
      parentId: addAreaForm.parentId || null,
      pointIds: [...addAreaForm.pointIds],
    })
  }
  addAreaVisible.value = false
}

async function deleteStatisticArea(areaId: string) {
  if (statisticAreas.value.some((area) => area.parentId === areaId)) {
    ElMessage.warning('当前统计区域包含子区域，无法删除')
    return
  }

  const area = statisticAreas.value.find((item) => item.id === areaId)
  if (!area) return

  try {
    await ElMessageBox.confirm(`确定删除统计区域“${area.name}”吗？`, '删除确认', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    statisticAreas.value = statisticAreas.value.filter((item) => item.id !== areaId)
    if (selectedStatisticAreaId.value === areaId) {
      currentNode.value = null
      regenerateTrendData()
      updateStats()
    }
    ElMessage.success('统计区域已删除')
  } catch {
    // User cancelled deletion.
  }
}

// ==================== 查询条件 ====================

const query = reactive({
  dateRange: getDefaultDateRange(),
  granularity: 'day' as string,
})

function getDefaultDateRange(): [string, string] {
  const end = new Date()
  const start = new Date(end)
  start.setDate(start.getDate() - 29)
  return [formatDate(start), formatDate(end)]
}

function handleQuery() {
  statPage.value = 1
  regenerateTrendData()
  updateStats()
}

function handleReset() {
  currentNode.value = treeData.value[0] || null
  query.dateRange = getDefaultDateRange()
  query.granularity = 'day'
  statPage.value = 1
  regenerateTrendData()
  updateStats()
}

function handleExport() {
  const areaName = selectedAreaLabel.value || '未选择区域'
  const period = query.dateRange ? query.dateRange.join('至') : '全部时间'
  const link = document.createElement('a')
  link.href = exportTemplateUrl
  link.download = `人流统计报表_${areaName}_${period}.xls`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

// ==================== 顶部概览统计 ====================

const stats = reactive({
  currentInPark: 0,
  todayEntry: 0,
  todayExit: 0,
})

// ==================== 趋势数据 ====================

interface TrendItem {
  date: string
  entry: number
  exit: number
}

const trendData = ref<TrendItem[]>([])

const maxCount = computed(() => {
  if (trendData.value.length === 0) return 100
  const max = Math.max(...trendData.value.flatMap(d => [d.entry, d.exit]))
  return Math.ceil(max / 10) * 10 || 100
})

function formatLabel(date: string): string {
  if (query.granularity === 'day') return date.slice(5)
  if (query.granularity === 'week') return date
  return date.slice(0, 7)
}

// ==================== 统计明细表 ====================

interface StatRow {
  date: string
  entry: number
  exit: number
  mom: number | null
  peakHour: string
  peakFlow: number
}

const statTableData = ref<StatRow[]>([])
const allStatTableData = ref<StatRow[]>([])
const statPage = ref(1)
const statPageSize = ref(10)
const statTotal = ref(0)
const sortBy = ref('')
const sortOrder = ref('')

// ==================== 区域因子 ====================

const buildingProfiles: Record<string, { base: number; variance: number }> = {
  'CT楼': { base: 980, variance: 220 },
  'FF楼': { base: 720, variance: 180 },
  '海关联检大楼(OB)': { base: 360, variance: 110 },
}

const floorWeights: Record<string, number> = {
  '1F': 0.36,
  '2F': 0.22,
  '3F': 0.18,
  '4F': 0.15,
  '5F': 0.13,
  '6F': 0.1,
  '屋顶层': 0.03,
  '地下室': 0.08,
  'S夹层': 0.16,
  '7F': 0.09,
  '8F': 0.06,
}

function getFloorProfile(areaPath: string[]) {
  const [building, floor] = areaPath
  const buildingProfile = buildingProfiles[building] || { base: 240, variance: 80 }
  const weight = floorWeights[floor] || 0.1
  return {
    base: Math.round(buildingProfile.base * weight),
    variance: Math.max(20, Math.round(buildingProfile.variance * weight)),
  }
}

function hashSeed(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0
  }
  return hash
}

function seededRatio(seed: string): number {
  return (hashSeed(seed) % 1000) / 1000
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function parseDate(value: string): Date {
  return new Date(`${value}T00:00:00`)
}

function generateFloorDailyTrend(areaPath: string[], totalDays = 180): TrendItem[] {
  const days: TrendItem[] = []
  const now = new Date()
  const factor = getFloorProfile(areaPath)
  const floorSeed = areaPath.join('/')
  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = formatDate(d)
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const weekdayFactor = isWeekend ? 0.58 : 1
    const workdayPulse = d.getDay() === 1 ? 1.08 : d.getDay() === 5 ? 0.94 : 1
    const entryNoise = (seededRatio(`${floorSeed}-${dateStr}-entry`) - 0.5) * 2 * factor.variance
    const exitNoise = (seededRatio(`${floorSeed}-${dateStr}-exit`) - 0.5) * 2 * factor.variance * 0.7
    const entry = Math.max(8, Math.round(factor.base * weekdayFactor * workdayPulse + entryNoise))
    const exitRate = 0.82 + seededRatio(`${floorSeed}-${dateStr}-rate`) * 0.08
    const exit = Math.max(5, Math.round(factor.base * weekdayFactor * workdayPulse * exitRate + exitNoise))
    days.push({ date: dateStr, entry, exit })
  }
  return days
}

// ==================== 获取楼层级区域 ====================

function getAllFloorPaths(): string[][] {
  const results: string[][] = []
  function walk(nodes: AreaTreeNode[], path: string[]) {
    for (const node of nodes) {
      if (node.children) {
        walk(node.children, [...path, node.value])
      } else {
        results.push([...path, node.value])
      }
    }
  }
  walk(areaTreeRaw, [])
  return results
}

function getFloorPathsForSelection(selectedPath: string[]): string[][] {
  if (selectedPath.length === 0) return getAllFloorPaths()

  const results: string[][] = []
  function walk(nodes: AreaTreeNode[], path: string[], depth: number) {
    for (const node of nodes) {
      if (node.value === selectedPath[depth]) {
        const newPath = [...path, node.value]
        if (depth === selectedPath.length - 1) {
          if (node.children) {
            collectFloors(node.children, newPath, results)
          } else {
            results.push(newPath)
          }
        } else if (node.children) {
          walk(node.children, newPath, depth + 1)
        }
      }
    }
  }
  function collectFloors(nodes: AreaTreeNode[], basePath: string[], out: string[][]) {
    for (const n of nodes) {
      if (n.children) {
        collectFloors(n.children, basePath, out)
      } else {
        out.push([...basePath, n.value])
      }
    }
  }
  walk(areaTreeRaw, [], 0)
  return results
}

// ==================== Mock 数据生成 ====================

function getStatisticAreaPointIds(areaId = ''): string[] {
  const area = statisticAreas.value.find((item) => item.id === areaId)
  return area ? [...area.pointIds] : []
}

function generateAccessPointDailyTrend(point: AccessPointOption, totalDays = 180): TrendItem[] {
  const days: TrendItem[] = []
  const now = new Date()
  const base = 90 + Math.round(seededRatio(`${point.id}-base`) * 110)
  const variance = 25 + Math.round(seededRatio(`${point.id}-variance`) * 35)
  for (let i = totalDays - 1; i >= 0; i--) {
    const date = new Date(now)
    date.setDate(date.getDate() - i)
    const dateStr = formatDate(date)
    const isWeekend = date.getDay() === 0 || date.getDay() === 6
    const weekdayFactor = isWeekend ? 0.58 : 1
    const noise = (seededRatio(`${point.id}-${dateStr}`) - 0.5) * 2 * variance
    const count = Math.max(1, Math.round(base * weekdayFactor + noise))
    days.push({
      date: dateStr,
      entry: point.direction === 'entry' ? count : 0,
      exit: point.direction === 'exit' ? count : 0,
    })
  }
  return days
}

function generateMockTrend(): TrendItem[] {
  const pointIds = getStatisticAreaPointIds(selectedStatisticAreaId.value)
  const points = accessPointInventory.filter((point) => pointIds.includes(point.id))
  if (points.length === 0) {
    return []
  }

  const allSeries = points.map((point) => generateAccessPointDailyTrend(point))
  const days: TrendItem[] = []
  for (let i = 0; i < allSeries[0].length; i++) {
    let entry = 0
    let exit = 0
    for (const series of allSeries) {
      entry += series[i].entry
      exit += series[i].exit
    }
    days.push({ date: allSeries[0][i].date, entry, exit })
  }
  return days
}

function generateMockStats(): StatRow[] {
  const raw = trendData.value
  return raw.map((d, idx) => ({
    date: d.date,
    entry: d.entry,
    exit: d.exit,
    mom: idx === 0 || raw[idx - 1].entry === 0 ? null : ((d.entry - raw[idx - 1].entry) / raw[idx - 1].entry * 100),
    peakHour: getPeakHourLabel(d.date),
    peakFlow: Math.round((d.entry + d.exit) * (0.3 + seededRatio(`${d.date}-peak`) * 0.12)),
  }))
}

function updateStats() {
  const trend = generateMockTrend()
  const latest = trend[trend.length - 1]
  if (!latest) {
    stats.currentInPark = 0
    stats.todayEntry = 0
    stats.todayExit = 0
    return
  }

  const occupancyBias = selectedStatisticAreaId.value ? 40 : 180
  stats.todayEntry = latest.entry
  stats.todayExit = latest.exit
  stats.currentInPark = Math.max(0, Math.round(latest.entry * 0.62 - latest.exit * 0.18 + occupancyBias))
}

function getPeakHourLabel(date: string): string {
  const slot = Math.floor(seededRatio(`${date}-slot`) * 4)
  return ['08:00-09:00', '09:00-10:00', '17:00-18:00', '18:00-19:00'][slot]
}

function applyStatPagination() {
  let data = [...allStatTableData.value]
  if (sortBy.value) {
    data.sort((a, b) => {
      const va = a[sortBy.value as keyof StatRow]
      const vb = b[sortBy.value as keyof StatRow]
      if (va === null) return 1
      if (vb === null) return -1
      if (typeof va === 'string' && typeof vb === 'string') {
        return sortOrder.value === 'ascending' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      return sortOrder.value === 'ascending'
        ? Number(va) - Number(vb)
        : Number(vb) - Number(va)
    })
  }
  statTotal.value = data.length
  const start = (statPage.value - 1) * statPageSize.value
  statTableData.value = data.slice(start, start + statPageSize.value)
}

function handleSortChange({ prop, order }: { prop: string; order: string }) {
  sortBy.value = prop || ''
  sortOrder.value = order || ''
  applyStatPagination()
}

watch([statPage, statPageSize], () => {
  applyStatPagination()
})

// SVG 折线图辅助函数
const chartPadding = { top: 20, bottom: 30, left: 40 }
const chartHeight = 260
const activeTrendIndex = ref<number | null>(null)

const activeTrendItem = computed(() => {
  if (activeTrendIndex.value === null) return null
  return trendData.value[activeTrendIndex.value] || null
})

const chartViewBoxWidth = computed(() => trendData.value.length * 60 + 60)

const trendTooltipStyle = computed(() => {
  if (activeTrendIndex.value === null || trendData.value.length === 0) {
    return {}
  }

  const left = ((pointX(activeTrendIndex.value) / chartViewBoxWidth.value) * 100)
  const top = ((Math.min(pointY(activeTrendItem.value!.entry), pointY(activeTrendItem.value!.exit)) - 12) / chartHeight) * 100
  return {
    left: `${Math.max(8, Math.min(92, left))}%`,
    top: `${Math.max(10, top)}%`,
  }
})

function pointY(value: number): number {
  return chartPadding.top + (1 - value / maxCount.value) * (chartHeight - chartPadding.top - chartPadding.bottom)
}

function pointX(index: number): number {
  return 40 + (index + 0.5) * 60
}

function linePoints(field: 'entry' | 'exit'): string {
  return trendData.value.map((item, idx) => {
    const x = pointX(idx)
    const y = pointY(item[field])
    return `${x},${y}`
  }).join(' ')
}

function handleTrendHover(index: number) {
  activeTrendIndex.value = index
}

function handleTrendLeave() {
  activeTrendIndex.value = null
}

function getDefaultRangeDays() {
  if (query.granularity === 'week') return 84
  if (query.granularity === 'month') return 180
  return 30
}

function filterTrendByRange(data: TrendItem[]) {
  if (query.dateRange) {
    const [start, end] = query.dateRange
    const startDate = parseDate(start).getTime()
    const endDate = parseDate(end).getTime()
    return data.filter((item) => {
      const time = parseDate(item.date).getTime()
      return time >= startDate && time <= endDate
    })
  }
  return data.slice(-getDefaultRangeDays())
}

function aggregateWeekly(data: TrendItem[]) {
  const weekly: TrendItem[] = []
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, i + 7)
    if (chunk.length === 0) continue
    weekly.push({
      date: `${chunk[0].date.slice(5)}~${chunk[chunk.length - 1].date.slice(5)}`,
      entry: Math.round(chunk.reduce((sum, item) => sum + item.entry, 0) / chunk.length),
      exit: Math.round(chunk.reduce((sum, item) => sum + item.exit, 0) / chunk.length),
    })
  }
  return weekly
}

function aggregateMonthly(data: TrendItem[]) {
  const monthly: TrendItem[] = []
  const groups: Record<string, TrendItem[]> = {}
  data.forEach((item) => {
    const month = item.date.slice(0, 7)
    if (!groups[month]) groups[month] = []
    groups[month].push(item)
  })

  Object.entries(groups).forEach(([month, items]) => {
    monthly.push({
      date: month,
      entry: Math.round(items.reduce((sum, item) => sum + item.entry, 0) / items.length),
      exit: Math.round(items.reduce((sum, item) => sum + item.exit, 0) / items.length),
    })
  })

  return monthly
}

watch(() => query.granularity, () => {
  statPage.value = 1
  regenerateTrendData()
})

function regenerateTrendData() {
  const baseTrend = filterTrendByRange(generateMockTrend())
  if (query.granularity === 'week') {
    trendData.value = aggregateWeekly(baseTrend)
  } else if (query.granularity === 'month') {
    trendData.value = aggregateMonthly(baseTrend)
  } else {
    trendData.value = baseTrend
  }
  allStatTableData.value = generateMockStats()
  activeTrendIndex.value = trendData.value.length > 0 ? trendData.value.length - 1 : null
  applyStatPagination()
}

// 初始化 - 数据随默认选中节点一并生成
regenerateTrendData()
updateStats()
</script>

<style scoped>
.pfr-layout {
  display: flex;
  gap: 0;
  height: 100%;
  min-height: 600px;
}

/* ===== 左侧空间树 ===== */
.pfr-tree-panel {
  width: 260px;
  min-width: 260px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}

.pfr-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #ebeef5;
}

.pfr-tree-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.pfr-tree-filter {
  padding: 8px 12px;
}

.pfr-tree-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 8px 0;
}

.pfr-tree-empty {
  padding-top: 48px;
}

/* ===== 右侧主要内容 ===== */
.pfr-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 24px 24px;
  min-width: 0;
}

.pfr-page-empty {
  min-height: 520px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 面包屑 */
.pfr-breadcrumb {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 12px 0;
  font-size: 13px;
  color: #909399;
}

.pfr-breadcrumb__sep {
  font-size: 12px;
}

.pfr-breadcrumb__item {
  color: #606266;
}

.pfr-breadcrumb__item--active {
  color: #409eff;
  font-weight: 600;
}

/* 统计卡片 */
.pfr-stats {
  margin-bottom: 20px;
}

.pfr-stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 6px;
  background: #fff;
  border: 1px solid #ebeef5;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
  transition: transform 0.2s, box-shadow 0.2s;
}

.pfr-stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.pfr-stat-card__icon {
  width: 52px;
  height: 52px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 16px;
}

.pfr-stat-card--primary .pfr-stat-card__icon { background: #ecf5ff; color: #409eff; }
.pfr-stat-card--success .pfr-stat-card__icon { background: #f0f9eb; color: #67c23a; }
.pfr-stat-card--warning .pfr-stat-card__icon { background: #fdf6ec; color: #e6a23c; }
.pfr-stat-card--danger .pfr-stat-card__icon { background: #fef0f0; color: #f56c6c; }

.pfr-stat-card__body { flex: 1; min-width: 0; }

.pfr-stat-card__value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1.2;
}

.pfr-stat-card__label {
  font-size: 13px;
  color: #909399;
  margin-top: 4px;
}

/* 查询区域 */
.pfr-search {
  background: #fafbfc;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 20px;
}

.pfr-config-note {
  padding: 10px 12px;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  background: #ecf5ff;
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
}

.pfr-config-toolbar {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

.pfr-point-transfer {
  width: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 52px minmax(0, 1fr);
  align-items: center;
}

.pfr-point-transfer :deep(.el-transfer-panel) {
  width: auto;
  min-width: 0;
}

.pfr-point-transfer :deep(.el-transfer__buttons) {
  padding: 0 8px;
}

.pfr-point-transfer :deep(.el-transfer-panel__body) {
  height: 230px;
}

.pfr-config-hierarchy {
  width: 100%;
}

.pfr-config-placeholder {
  color: #c0c4cc;
}

.pfr-config-point-count {
  font-size: 13px;
}

.pfr-config-point-popover__item {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 6px 0;
  color: #303133;
  font-size: 13px;
}

.pfr-config-point-popover__item + .pfr-config-point-popover__item {
  border-top: 1px solid #f0f2f5;
}

.pfr-config-point-popover__meta {
  color: #909399;
  white-space: nowrap;
  font-size: 12px;
}

/* 区块 */
.pfr-section {
  margin-bottom: 24px;
}

.pfr-section__title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 16px;
  padding-left: 12px;
  border-left: 3px solid #409eff;
  line-height: 1.2;
}

.pfr-section__subtitle {
  font-size: 13px;
  font-weight: 400;
  color: #909399;
}

.pfr-empty-block {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
  padding: 28px 0;
}

/* 图表 */
.pfr-chart-area {
  display: flex;
  gap: 8px;
  padding: 16px 16px 0;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
  min-height: 300px;
}

.pfr-chart__y-axis {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 20px 0 34px;
  flex-shrink: 0;
  width: 40px;
}

.pfr-chart__y-label {
  font-size: 11px;
  color: #909399;
  text-align: right;
  line-height: 1;
}

.pfr-chart {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.pfr-chart__plot {
  position: relative;
}

.pfr-line-chart {
  width: 100%;
  height: 260px;
}

.pfr-chart-empty {
  width: 100%;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pfr-chart-tooltip {
  position: absolute;
  transform: translate(-50%, -100%);
  min-width: 132px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(32, 33, 36, 0.92);
  color: #fff;
  pointer-events: none;
  box-shadow: 0 8px 18px rgba(0, 0, 0, 0.18);
  z-index: 2;
}

.pfr-chart-tooltip__title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 6px;
}

.pfr-chart-tooltip__row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  line-height: 1.6;
}

.pfr-chart-tooltip__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex-shrink: 0;
}

.pfr-chart-tooltip__dot--entry { background: #409eff; }
.pfr-chart-tooltip__dot--exit { background: #e6a23c; }

.pfr-chart__legend {
  display: flex;
  justify-content: center;
  gap: 20px;
  padding: 6px 0;
  flex-shrink: 0;
}

.pfr-chart__legend-item {
  font-size: 12px;
  color: #606266;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pfr-chart__legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 2px;
  display: inline-block;
}

.pfr-chart__legend-dot--entry { background: #409eff; }
.pfr-chart__legend-dot--exit { background: #e6a23c; }

/* 表格 */
.pfr-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 环比 */
.pfr-mom--up { color: #f56c6c; font-size: 13px; display: inline-flex; align-items: center; gap: 2px; }
.pfr-mom--down { color: #67c23a; font-size: 13px; display: inline-flex; align-items: center; gap: 2px; }
.pfr-mom--na { color: #c0c4cc; font-size: 13px; }
</style>
