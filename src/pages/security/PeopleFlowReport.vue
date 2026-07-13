<template>
  <div>
    <div class="pfr-layout">
      <!-- 左侧：空间结构树 -->
      <div class="pfr-tree-panel">
        <div class="pfr-tree-header">
          <h3 class="pfr-tree-title">空间结构</h3>
          <el-button text size="small" @click="handleClearTree" :disabled="currentPath.length === 0">
            <el-icon><Refresh /></el-icon> 重置
          </el-button>
        </div>
        <el-input
          v-model="treeFilter"
          placeholder="搜索空间..."
          clearable
          size="small"
          :prefix-icon="Search"
          class="pfr-tree-filter"
        />
        <div class="pfr-tree-scroll">
          <el-tree
            ref="treeRef"
            :data="treeData"
            :props="treeProps"
            node-key="value"
            :filter-node-method="filterTreeNode"
            default-expand-all
            highlight-current
            :current-node-key="currentNodeKey"
            :expand-on-click-node="false"
            @node-click="handleTreeNodeClick"
          />
        </div>
      </div>

      <!-- 右侧：统计内容 -->
      <div class="pfr-content">
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
          <el-col :span="6">
            <div class="pfr-stat-card pfr-stat-card--primary">
              <div class="pfr-stat-card__icon"><el-icon :size="28"><UserFilled /></el-icon></div>
              <div class="pfr-stat-card__body">
                <div class="pfr-stat-card__value">{{ stats.currentInPark }}</div>
                <div class="pfr-stat-card__label">{{ areaLabel }}当前人数</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="pfr-stat-card pfr-stat-card--success">
              <div class="pfr-stat-card__icon"><el-icon :size="28"><Collection /></el-icon></div>
              <div class="pfr-stat-card__body">
                <div class="pfr-stat-card__value">{{ stats.todayTotal }}</div>
                <div class="pfr-stat-card__label">{{ areaLabel }}今日通行总量</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="pfr-stat-card pfr-stat-card--warning">
              <div class="pfr-stat-card__icon"><el-icon :size="28"><TopRight /></el-icon></div>
              <div class="pfr-stat-card__body">
                <div class="pfr-stat-card__value">{{ stats.todayEntry }}</div>
                <div class="pfr-stat-card__label">{{ areaLabel }}今日进入</div>
              </div>
            </div>
          </el-col>
          <el-col :span="6">
            <div class="pfr-stat-card pfr-stat-card--danger">
              <div class="pfr-stat-card__icon"><el-icon :size="28"><BottomLeft /></el-icon></div>
              <div class="pfr-stat-card__body">
                <div class="pfr-stat-card__value">{{ stats.todayExit }}</div>
                <div class="pfr-stat-card__label">{{ areaLabel }}今日离开</div>
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
          <div class="pfr-pagination">
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
            <div class="pfr-chart__y-axis">
              <span v-for="n in 5" :key="n" class="pfr-chart__y-label">{{ (maxCount / 5 * (6 - n)).toFixed(0) }}</span>
            </div>
            <div class="pfr-chart">
              <svg class="pfr-line-chart" :viewBox="'0 0 ' + (trendData.length * 60 + 60) + ' 260'" preserveAspectRatio="xMidYMid meet">
                <line v-for="n in 5" :key="'g' + n" :x1="40" :y1="20 + (n - 1) * 48" :x2="trendData.length * 60 + 40" :y2="20 + (n - 1) * 48" stroke="#ebeef5" stroke-width="1" />
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
                <circle
                  v-for="(item, idx) in trendData"
                  :key="'ed' + idx"
                  :cx="40 + (idx + 0.5) * 60"
                  :cy="pointY(item.entry)"
                  r="3.5"
                  fill="#409eff"
                  stroke="#fff"
                  stroke-width="1.5"
                >
                  <title>{{ item.date }} 进入: {{ item.entry }}</title>
                </circle>
                <circle
                  v-for="(item, idx) in trendData"
                  :key="'xd' + idx"
                  :cx="40 + (idx + 0.5) * 60"
                  :cy="pointY(item.exit)"
                  r="3.5"
                  fill="#e6a23c"
                  stroke="#fff"
                  stroke-width="1.5"
                >
                  <title>{{ item.date }} 离开: {{ item.exit }}</title>
                </circle>
                <text
                  v-for="(item, idx) in trendData"
                  :key="'lb' + idx"
                  :x="40 + (idx + 0.5) * 60"
                  y="248"
                  text-anchor="middle"
                  fill="#909399"
                  font-size="10"
                >{{ formatLabel(item.date) }}</text>
              </svg>
              <div class="pfr-chart__legend">
                <span class="pfr-chart__legend-item"><span class="pfr-chart__legend-dot pfr-chart__legend-dot--entry" />进入</span>
                <span class="pfr-chart__legend-item"><span class="pfr-chart__legend-dot pfr-chart__legend-dot--exit" />离开</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import {
  Search, Refresh, Download,
  UserFilled, Collection, TopRight, BottomLeft,
  Top, Bottom, HomeFilled, ArrowRight
} from '@element-plus/icons-vue'
import type { ElTree } from 'element-plus'

const treeProps = { label: 'label', children: 'children' }


// ==================== 空间树数据（建筑→楼层） ====================

interface AreaTreeNode {
  value: string
  label: string
  children?: AreaTreeNode[]
}

const areaTreeRaw: AreaTreeNode[] = [
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

const treeData = computed<AreaTreeNode[]>(() => [
  {
    value: '__all__',
    label: '全部区域',
    children: areaTreeRaw,
  }
])

const treeRef = ref<InstanceType<typeof ElTree>>()
const treeFilter = ref('')
const currentNode = ref<AreaTreeNode | null>(null)
const currentNodeKey = computed(() => currentNode.value?.value ?? '__all__')

const currentPath = computed(() => {
  const node = currentNode.value
  if (!node || node.value === '__all__') return []
  const path: string[] = []
  function find(nodes: AreaTreeNode[], target: AreaTreeNode, stack: string[]): boolean {
    for (const n of nodes) {
      stack.push(n.label)
      if (n === target) { path.push(...stack); return true }
      if (n.children && find(n.children, target, stack)) return true
      stack.pop()
    }
    return false
  }
  find(treeData.value, node, [])
  return path
})

const currentAreaPath = computed<string[]>(() => {
  const node = currentNode.value
  if (!node || node.value === '__all__') return []
  const path: string[] = []
  function find(nodes: AreaTreeNode[], target: AreaTreeNode): boolean {
    for (const n of nodes) {
      if (n === target) { path.push(n.value); return true }
      if (n.children && find(n.children, target)) { path.unshift(n.value); return true }
    }
    return false
  }
  find(treeData.value, node)
  return path
})

const selectedAreaLabel = computed(() => {
  if (currentAreaPath.value.length === 0) return ''
  return currentAreaPath.value.join(' / ')
})

const areaLabel = computed(() => {
  if (currentAreaPath.value.length === 0) return ''
  return `[${selectedAreaLabel.value}] `
})

function filterTreeNode(value: string, data: AreaTreeNode): boolean {
  if (!value) return true
  return data.label.includes(value) || data.value.includes(value)
}

watch(treeFilter, (val) => {
  treeRef.value?.filter(val)
})

function handleTreeNodeClick(data: AreaTreeNode) {
  if (data.value === '__all__') {
    currentNode.value = null
  } else {
    currentNode.value = data
  }
  statPage.value = 1
  regenerateTrendData()
}

function handleClearTree() {
  currentNode.value = null
  treeFilter.value = ''
  statPage.value = 1
  regenerateTrendData()
}

// ==================== 查询条件 ====================

const query = reactive({
  dateRange: null as [string, string] | null,
  granularity: 'day' as string,
})

function handleQuery() {
  statPage.value = 1
  regenerateTrendData()
}

function handleReset() {
  currentNode.value = null
  treeFilter.value = ''
  query.dateRange = null
  query.granularity = 'day'
  statPage.value = 1
  regenerateTrendData()
}

function handleExport() {
  const areaInfo = currentAreaPath.value.length ? `区域：${selectedAreaLabel.value}\n` : ''
  const msg = `人流报表导出成功！\n${areaInfo}时间范围：${query.dateRange ? query.dateRange.join(' ~ ') : '全部'}\n粒度：${query.granularity === 'day' ? '按日' : query.granularity === 'week' ? '按周' : '按月'}\n共 ${statTotal.value} 条统计记录`
  alert(msg)
}

// ==================== 顶部概览统计 ====================

const stats = reactive({
  currentInPark: 0,
  todayTotal: 0,
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
  if (query.granularity === 'week') return date.replace('第', 'W')
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
const statPage = ref(1)
const statPageSize = ref(10)
const statTotal = ref(0)
const sortBy = ref('')
const sortOrder = ref('')

// ==================== 区域因子 ====================

const areaFactors: Record<string, { base: number; variance: number }> = {
  'CT楼': { base: 1200, variance: 400 },
  'FF楼': { base: 800, variance: 300 },
  '海关联检大楼(OB)': { base: 400, variance: 200 },
  '1F': { base: 500, variance: 300 },
  '2F': { base: 350, variance: 200 },
  '3F': { base: 400, variance: 250 },
  '4F': { base: 280, variance: 180 },
  '5F': { base: 220, variance: 140 },
  '6F': { base: 180, variance: 120 },
  '屋顶层': { base: 40, variance: 25 },
  '地下室': { base: 100, variance: 60 },
  'S夹层': { base: 250, variance: 150 },
  '7F': { base: 120, variance: 70 },
  '8F': { base: 80, variance: 50 },
  '全部区域': { base: 2500, variance: 800 },
}

function getAreaFactor(areaName: string) {
  return areaFactors[areaName] || { base: 200, variance: 150 }
}

function generateAreaMockTrend(areaSeed: string): TrendItem[] {
  const days: TrendItem[] = []
  const now = new Date()
  const factor = getAreaFactor(areaSeed)
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const isWeekend = d.getDay() === 0 || d.getDay() === 6
    const baseRatio = isWeekend ? 0.4 : 1.0
    const entry = Math.round(factor.base * baseRatio + Math.random() * factor.variance)
    const exit = Math.round(factor.base * baseRatio * 0.85 + Math.random() * factor.variance * 0.7)
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

function generateMockTrend(): TrendItem[] {
  const floors = getFloorPathsForSelection(currentAreaPath.value)

  if (floors.length === 0) {
    return generateAreaMockTrend('全部区域')
  }

  const allSeries: TrendItem[][] = floors.map(f => generateAreaMockTrend(f[f.length - 1]))
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
  const raw = generateMockTrend()
  return raw.map((d, idx) => ({
    date: d.date,
    entry: d.entry,
    exit: d.exit,
    mom: idx === 0 ? null : ((d.entry - raw[idx - 1].entry) / raw[idx - 1].entry * 100),
    peakHour: `${7 + Math.floor(Math.random() * 3)}:00-${9 + Math.floor(Math.random() * 3)}:00`,
    peakFlow: Math.floor(d.entry * 0.35 + Math.random() * d.entry * 0.15),
  }))
}

function updateStats() {
  const areaName = currentAreaPath.value.length
    ? currentAreaPath.value[currentAreaPath.value.length - 1]
    : '全部区域'
  const areaFactor = getAreaFactor(areaName)

  stats.currentInPark = Math.round(areaFactor.base * 1.2 + Math.floor(Math.random() * areaFactor.variance - areaFactor.variance / 2))
  stats.todayTotal = Math.round(areaFactor.base * 2 + Math.floor(Math.random() * areaFactor.variance * 2 - areaFactor.variance))
  stats.todayEntry = Math.round(areaFactor.base * 1.1 + Math.floor(Math.random() * areaFactor.variance - areaFactor.variance / 2))
  stats.todayExit = Math.round(areaFactor.base * 0.9 + Math.floor(Math.random() * areaFactor.variance - areaFactor.variance / 2))
}

function applyStatPagination() {
  let data = [...statTableData.value]
  if (sortBy.value) {
    data.sort((a: any, b: any) => {
      const va = a[sortBy.value]
      const vb = b[sortBy.value]
      if (typeof va === 'string') return sortOrder.value === 'ascending' ? va.localeCompare(vb) : vb.localeCompare(va)
      return sortOrder.value === 'ascending' ? va - vb : vb - va
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

// SVG 折线图辅助函数
const chartPadding = { top: 20, bottom: 30, left: 40 }
const chartHeight = 260

function pointY(value: number): number {
  return chartPadding.top + (1 - value / maxCount.value) * (chartHeight - chartPadding.top - chartPadding.bottom)
}

function linePoints(field: 'entry' | 'exit'): string {
  return trendData.value.map((item, idx) => {
    const x = 40 + (idx + 0.5) * 60
    const y = pointY(item[field])
    return `${x},${y}`
  }).join(' ')
}

watch(() => query.granularity, () => {
  regenerateTrendData()
  statPage.value = 1
  applyStatPagination()
})

function regenerateTrendData() {
  if (query.granularity === 'week') {
    const weekly: TrendItem[] = []
    const raw = generateMockTrend()
    for (let i = 0; i < raw.length; i += 7) {
      const chunk = raw.slice(i, i + 7)
      if (chunk.length === 0) continue
      weekly.push({
        date: `第${Math.ceil((i + 1) / 7)}周`,
        entry: Math.round(chunk.reduce((s, d) => s + d.entry, 0) / chunk.length),
        exit: Math.round(chunk.reduce((s, d) => s + d.exit, 0) / chunk.length),
      })
    }
    trendData.value = weekly
  } else if (query.granularity === 'month') {
    const monthly: TrendItem[] = []
    const raw = generateMockTrend()
    const groups: { [key: string]: TrendItem[] } = {}
    raw.forEach(d => {
      const m = d.date.slice(0, 7)
      if (!groups[m]) groups[m] = []
      groups[m].push(d)
    })
    Object.entries(groups).forEach(([m, items]) => {
      monthly.push({
        date: m,
        entry: Math.round(items.reduce((s, d) => s + d.entry, 0) / items.length),
        exit: Math.round(items.reduce((s, d) => s + d.exit, 0) / items.length),
      })
    })
    trendData.value = monthly
  } else {
    trendData.value = generateMockTrend()
  }
  statTableData.value = generateMockStats()
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

/* ===== 右侧主要内容 ===== */
.pfr-content {
  flex: 1;
  overflow-y: auto;
  padding: 0 0 24px 24px;
  min-width: 0;
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

.pfr-line-chart {
  width: 100%;
  height: 260px;
}

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
