<template>
  <div class="ew-page">
    <!-- ============================== 全屏地图层（铺满屏幕） ============================== -->
    <main class="ew-map" @click="closeTooltip">
      <img :src="mapImage" alt="园区平面图" class="ew-map__bg" />
      <div class="ew-map__overlay" />

      <!-- 表计撒点 -->
      <button
        v-for="meter in visibleMeters"
        :key="meter.id"
        type="button"
        :class="[
          'ew-meter',
          `ew-meter--${meter.kind}`,
          { 'ew-meter--offline': meter.status === 'offline',
            'ew-meter--active': activeMeterId === meter.id },
        ]"
        :style="{ left: meter.left + '%', top: meter.top + '%' }"
        @click.stop="toggleMeter(meter.id)"
      >
        <span class="ew-meter__ring" />
        <span class="ew-meter__dot">
          <el-icon :size="14"><component :is="meter.kind === 'electric' ? Lightning : MostlyCloudy" /></el-icon>
        </span>
        <span class="ew-meter__label">{{ meter.code }}</span>
      </button>

      <!-- 信息卡（点击撒点后弹出） -->
      <div
        v-if="activeMeter"
        :class="['ew-tip', `ew-tip--anchor-${activeMeterAnchor}`]"
        :style="activeMeterTooltipStyle"
        @click.stop
      >
        <header class="ew-tip__header">
          <span :class="['ew-tip__type', `ew-tip__type--${activeMeter.kind}`]">
            <el-icon><component :is="activeMeter.kind === 'electric' ? Lightning : MostlyCloudy" /></el-icon>
            {{ activeMeter.kind === 'electric' ? '电表' : '水表' }}
          </span>
          <el-button text :icon="Close" size="small" @click="closeTooltip" />
        </header>
        <h3 class="ew-tip__name">{{ activeMeter.name }}</h3>
        <ul class="ew-tip__rows">
          <li><span>编号</span><b>{{ activeMeter.code }}</b></li>
          <li><span>位置</span><b>{{ activeMeter.location }}</b></li>
          <li><span>最新读数</span><b class="ew-tip__reading">{{ formatReading(activeMeter) }}</b></li>
          <li><span>上报时间</span><b>{{ activeMeter.lastReportTime }}</b></li>
          <li><span>采集状态</span>
            <el-tag size="small" effect="light" :type="activeMeter.status === 'online' ? 'success' : 'info'">
              {{ activeMeter.status === 'online' ? '在线' : '离线' }}
            </el-tag>
          </li>
        </ul>
      </div>

      <!-- 图例 -->
      <div class="ew-legend">
        <span><i class="dot dot--em" />电表（在线）</span>
        <span><i class="dot dot--em-offline" />电表（离线）</span>
        <span><i class="dot dot--wm" />水表（在线）</span>
        <span><i class="dot dot--wm-offline" />水表（离线）</span>
      </div>

      <div v-if="visibleMeters.length === 0" class="ew-map-empty">
        <el-icon :size="40"><Filter /></el-icon>
        <strong>当前筛选条件下没有可显示的表计</strong>
        <span>请切换「全部 / 电表 / 水表」或更换园区</span>
      </div>
    </main>

    <!-- ============================== 顶部悬浮工具栏：全局时间过滤 + 表计筛选 ============================== -->
    <header class="ew-topbar">
      <el-radio-group v-model="timeRange" size="default" class="ew-range ew-range--topbar">
        <el-radio-button label="day">本日</el-radio-button>
        <el-radio-button label="month">本月</el-radio-button>
        <el-radio-button label="year">本年</el-radio-button>
      </el-radio-group>
      <span class="ew-topbar__divider" />
      <el-radio-group v-model="meterKindFilter" size="default" class="ew-range ew-range--topbar">
        <el-radio-button label="all">全部</el-radio-button>
        <el-radio-button label="electric"><el-icon><Lightning /></el-icon>电表</el-radio-button>
        <el-radio-button label="water"><el-icon><MostlyCloudy /></el-icon>水表</el-radio-button>
      </el-radio-group>
    </header>

    <!-- ============================== 左侧浮动面板 ============================== -->
    <aside class="ew-side ew-side--left">
      <header class="ew-side__header">
        <h1 class="ew-side__title">能源工作台</h1>
      </header>

      <!-- 园区选择器（级联：东莞空港中心 → 主地块 / 码头，父级可选） -->
      <div class="ew-card ew-park-selector">
        <div class="ew-park-selector__main">
          <el-icon class="ew-park-selector__icon"><OfficeBuilding /></el-icon>
          <div class="ew-park-selector__info">
            <span class="ew-park-selector__label">当前园区</span>
            <el-cascader
              v-model="parkScopePath"
              :options="parkOptions"
              :props="{ checkStrictly: true, expandTrigger: 'hover' }"
              placeholder="请选择园区"
              class="ew-park-selector__cascader"
              @change="onParkChange"
            />
          </div>
        </div>
      </div>

      <!-- 园区 / 租户统计 -->
      <section class="ew-card ew-metric-stats">
        <div class="ew-metric-stats__item">
          <span class="ew-metric-stats__label">园区</span>
          <strong class="ew-metric-stats__value">{{ scopeStats.parkCount }}</strong>
          <span class="ew-metric-stats__unit">个</span>
        </div>
        <div class="ew-metric-stats__divider" />
        <div class="ew-metric-stats__item">
          <span class="ew-metric-stats__label">租户</span>
          <strong class="ew-metric-stats__value">{{ scopeStats.tenantCount }}</strong>
          <span class="ew-metric-stats__unit">个</span>
        </div>
      </section>

      <!-- 用能实时监控 -->
      <section class="ew-card">
        <header class="ew-card__header">
          <h2 class="ew-card__title">
            <el-icon><DataLine /></el-icon>
            用能实时监控
          </h2>
        </header>

        <div class="ew-metric">
          <div class="ew-metric__label">累计能源费</div>
          <div class="ew-metric__row">
            <strong class="ew-metric__value">{{ formatNumber(summary.energyCost.value) }}</strong>
            <span class="ew-metric__unit">万元</span>
          </div>
          <div class="ew-metric__yoy" :class="yoyClass(summary.energyCost.yoy)">
            <el-icon><CaretTop v-if="summary.energyCost.yoy > 0" /><CaretBottom v-else /></el-icon>
            同比 <span>{{ Math.abs(summary.energyCost.yoy).toFixed(1) }}%</span>
          </div>
        </div>

        <div class="ew-metric">
          <div class="ew-metric__label">累计能耗量</div>
          <div class="ew-metric__row">
            <strong class="ew-metric__value">{{ formatNumber(summary.energyQuantity.value) }}</strong>
            <span class="ew-metric__unit">kgce</span>
          </div>
          <div class="ew-metric__yoy" :class="yoyClass(summary.energyQuantity.yoy)">
            <el-icon><CaretTop v-if="summary.energyQuantity.yoy > 0" /><CaretBottom v-else /></el-icon>
            同比 <span>{{ Math.abs(summary.energyQuantity.yoy).toFixed(1) }}%</span>
          </div>
        </div>

        <div class="ew-metric ew-metric--split">
          <div class="ew-metric__col">
            <div class="ew-metric__label"><el-icon class="ew-metric__type-icon"><Lightning /></el-icon>电费</div>
            <div class="ew-metric__row ew-metric__row--small">
              <strong class="ew-metric__value">{{ formatNumber(summary.electricCost.value) }}</strong>
              <span class="ew-metric__unit">万元</span>
            </div>
            <div class="ew-metric__yoy ew-metric__yoy--small" :class="yoyClass(summary.electricCost.yoy)">
              同比 {{ Math.abs(summary.electricCost.yoy).toFixed(1) }}%
            </div>
          </div>
          <div class="ew-metric__col">
            <div class="ew-metric__label"><el-icon class="ew-metric__type-icon"><MostlyCloudy /></el-icon>自来水费</div>
            <div class="ew-metric__row ew-metric__row--small">
              <strong class="ew-metric__value">{{ formatNumber(summary.waterCost.value) }}</strong>
              <span class="ew-metric__unit">万元</span>
            </div>
            <div class="ew-metric__yoy ew-metric__yoy--small" :class="yoyClass(summary.waterCost.yoy)">
              同比 {{ Math.abs(summary.waterCost.yoy).toFixed(1) }}%
            </div>
          </div>
        </div>

        <div class="ew-metric ew-metric--accent ew-metric--last">
          <div class="ew-metric__label"><el-icon class="ew-metric__type-icon"><Histogram /></el-icon>累计碳排放</div>
          <div class="ew-metric__row">
            <strong class="ew-metric__value">{{ formatNumber(summary.carbon.value) }}</strong>
            <span class="ew-metric__unit">tCO₂</span>
          </div>
          <div class="ew-metric__yoy" :class="yoyClass(summary.carbon.yoy)">
            <el-icon><CaretTop v-if="summary.carbon.yoy > 0" /><CaretBottom v-else /></el-icon>
            同比 <span>{{ Math.abs(summary.carbon.yoy).toFixed(1) }}%</span>
          </div>
        </div>
      </section>

      <!-- 碳管理进度 -->
      <section class="ew-card">
        <header class="ew-card__header">
          <h2 class="ew-card__title">
            <el-icon><Aim /></el-icon>
            碳管理进度
          </h2>
        </header>

        <div class="ew-progress">
          <div class="ew-progress__row">
            <span>碳排放（<b>{{ formatNumber(summary.carbon.value) }}</b> tCO₂）</span>
            <strong class="ew-progress__percent">{{ carbonProgress.percent }}%</strong>
          </div>
          <el-progress
            :percentage="carbonProgress.percent"
            :stroke-width="8"
            :show-text="false"
            :color="carbonProgress.color"
            class="ew-progress__bar"
          />
          <div class="ew-progress__meta">
            <span>已使用 {{ formatNumber(summary.carbon.value) }} / 目标 {{ carbonProgress.target }} tCO₂</span>
            <span :class="['ew-progress__trend', carbonProgress.percent >= 80 ? 'is-alert' : '']">
              {{ carbonProgress.percent >= 80 ? '剩余空间紧张' : '剩余空间充足' }}
            </span>
          </div>
        </div>
      </section>
    </aside>

    <!-- ============================== 右侧浮动面板 ============================== -->
    <aside class="ew-side ew-side--right">
      <section class="ew-card ew-ranking">
        <header class="ew-card__header ew-card__header--tabs">
          <el-tabs v-model="costRankingTab" class="ew-tabs">
            <el-tab-pane label="园区成本排名" name="park" />
            <el-tab-pane label="租户成本排名" name="tenant" />
          </el-tabs>
        </header>
        <el-table :data="costRankingTab === 'park' ? parkCostRanking : tenantRanking" size="small" class="ew-ranking__table">
          <el-table-column type="index" label="排名" width="58" align="center">
            <template #default="{ $index }">
              <span :class="['ew-rank', { 'ew-rank--top': $index < 3 }]">{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="name" :label="costRankingTab === 'park' ? '园区名称' : '租户名称'" min-width="120" show-overflow-tooltip />
          <el-table-column prop="cost" label="费用（万元）" width="110" align="right">
            <template #default="{ row }">
              <strong class="ew-ranking__value">{{ formatNumber(row.cost) }}</strong>
            </template>
          </el-table-column>
          <el-table-column prop="ratio" label="占比" width="80" align="right">
            <template #default="{ row }">
              <div class="ew-ratio-cell">
                <span>{{ row.ratio }}%</span>
                <el-progress :percentage="row.ratio" :stroke-width="3" :show-text="false" :color="ratioColor(row.ratio)" />
              </div>
            </template>
          </el-table-column>
        </el-table>
      </section>

      <section class="ew-card ew-ranking">
        <header class="ew-card__header ew-card__header--tabs">
          <el-tabs v-model="energyRankingTab" class="ew-tabs">
            <el-tab-pane label="园区能耗排名" name="park" />
            <el-tab-pane label="租户能耗排名" name="tenant" />
          </el-tabs>
        </header>
        <el-table :data="energyRankingTab === 'park' ? parkEnergyRanking : tenantEnergyRanking" size="small" class="ew-ranking__table">
          <el-table-column type="index" label="排名" width="58" align="center">
            <template #default="{ $index }">
              <span :class="['ew-rank', { 'ew-rank--top': $index < 3 }]">{{ $index + 1 }}</span>
            </template>
          </el-table-column>
          <el-table-column :label="energyRankingTab === 'park' ? '园区名称' : '租户名称'" prop="name" min-width="120" show-overflow-tooltip />
          <el-table-column prop="quantity" :label="`能耗（${energyUnit}）`" width="120" align="right">
            <template #default="{ row }">
              <strong class="ew-ranking__value">{{ formatNumber(row.quantity) }}</strong>
            </template>
          </el-table-column>
        </el-table>
      </section>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Aim,
  CaretBottom,
  CaretTop,
  Close,
  DataLine,
  Filter,
  Histogram,
  Lightning,
  MostlyCloudy,
  OfficeBuilding,
} from '@element-plus/icons-vue'
import mapImage from '@/map.png'

// ========================== 类型 ==========================
type MeterKind = 'electric' | 'water'
type MeterStatus = 'online' | 'offline'
type RangeKey = 'day' | 'month' | 'year'

interface Meter {
  id: number
  code: string
  name: string
  kind: MeterKind
  status: MeterStatus
  location: string
  parkId: string
  left: number // 百分比，地图定位
  top: number
  readingValue: number
  readingUnit: string
  lastReportTime: string
}

interface Ranking {
  name: string
  cost?: number
  quantity?: number
  ratio?: number
}

// ========================== 数据：园区层级 ==========================
// 东莞空港中心（父级，可选）→ 主地块 / 码头（子级）
interface ParkOption {
  value: string
  label: string
  children?: ParkOption[]
}
const parkParentName = '东莞空港中心'
const parkOptions: ParkOption[] = [
  {
    value: 'airport-center',
    label: parkParentName,
    children: [
      { value: 'park-main', label: '主地块' },
      { value: 'park-wharf', label: '码头' },
    ],
  },
]
const parkScopePath = ref<string[]>(['airport-center', 'park-main'])
const currentParkId = ref('park-main')
const currentParkName = computed(() => {
  const findLabel = (val: string) => {
    if (val === 'airport-center') return parkParentName
    return parkOptions[0].children?.find((c) => c.value === val)?.label ?? val
  }
  return parkScopePath.value.map(findLabel).join(' / ')
})
function onParkChange(path: string[]) {
  if (!path || path.length === 0) return
  currentParkId.value = path[path.length - 1]
  activeMeterId.value = null
  ElMessage.success(`已切换至 ${currentParkName.value}`)
}

// ========================== 数据：表计撒点 ==========================
const allMeters: Meter[] = [
  // 电表（在线/离线）
  { id: 1, code: 'EM-001', name: '一期总进线计量点', kind: 'electric', status: 'online', location: '一期总配电房 10kV 进线柜', parkId: 'park-main', left: 50, top: 38, readingValue: 1284623, readingUnit: 'kWh', lastReportTime: '2026-08-17 16:51:58' },
  { id: 2, code: 'EM-002', name: '货运区专线计量点', kind: 'electric', status: 'online', location: '货运区变电所 10kV 进线柜', parkId: 'park-wharf', left: 74, top: 64, readingValue: 568312, readingUnit: 'kWh', lastReportTime: '2026-08-17 16:51:42' },
  { id: 3, code: 'EM-003', name: '联检大楼计量点', kind: 'electric', status: 'online', location: '联检大楼变配电房', parkId: 'park-main', left: 70, top: 42, readingValue: 412089, readingUnit: 'kWh', lastReportTime: '2026-08-17 16:51:36' },
  { id: 4, code: 'EM-004', name: '备用电源计量点', kind: 'electric', status: 'offline', location: '一期总配电房备用柜', parkId: 'park-main', left: 48, top: 42, readingValue: 218976, readingUnit: 'kWh', lastReportTime: '2026-08-17 14:08:11' },
  { id: 5, code: 'EM-005', name: '00312 电表（CT楼1F强电箱）', kind: 'electric', status: 'online', location: 'CT 楼 1F 东区强电箱', parkId: 'park-main', left: 33, top: 50, readingValue: 31241234, readingUnit: 'kWh', lastReportTime: '2026-08-17 16:51:22' },
  { id: 6, code: 'EM-006', name: 'CT楼2F配电箱', kind: 'electric', status: 'online', location: 'CT 楼 2F 弱电井', parkId: 'park-main', left: 36, top: 36, readingValue: 184623, readingUnit: 'kWh', lastReportTime: '2026-08-17 16:50:48' },
  { id: 7, code: 'EM-007', name: 'FF楼1F总配电箱', kind: 'electric', status: 'online', location: 'FF 楼 1F 总配电间', parkId: 'park-main', left: 58, top: 50, readingValue: 256314, readingUnit: 'kWh', lastReportTime: '2026-08-17 16:51:50' },
  { id: 8, code: 'EM-008', name: '码头作业区配电箱', kind: 'electric', status: 'offline', location: '码头作业区 1 号箱变', parkId: 'park-wharf', left: 74, top: 76, readingValue: 96210, readingUnit: 'kWh', lastReportTime: '2026-08-17 11:36:09' },
  // 水表
  { id: 101, code: 'WM-001', name: 'CT楼1F水表井', kind: 'water', status: 'online', location: 'CT 楼 1F 水表井', parkId: 'park-main', left: 31, top: 56, readingValue: 18423, readingUnit: 'm³', lastReportTime: '2026-08-17 16:48:30' },
  { id: 102, code: 'WM-002', name: 'CT楼2F水表', kind: 'water', status: 'online', location: 'CT 楼 2F 公共卫生间', parkId: 'park-main', left: 35, top: 42, readingValue: 9217, readingUnit: 'm³', lastReportTime: '2026-08-17 16:48:12' },
  { id: 103, code: 'WM-003', name: 'FF楼1F水表', kind: 'water', status: 'online', location: 'FF 楼 1F 水表间', parkId: 'park-main', left: 56, top: 56, readingValue: 14630, readingUnit: 'm³', lastReportTime: '2026-08-17 16:48:45' },
  { id: 104, code: 'WM-004', name: 'FF楼7F水表', kind: 'water', status: 'online', location: 'FF 楼 7F 茶水间', parkId: 'park-main', left: 60, top: 30, readingValue: 4218, readingUnit: 'm³', lastReportTime: '2026-08-17 16:49:02' },
  { id: 105, code: 'WM-005', name: '联检大楼水表', kind: 'water', status: 'offline', location: '联检大楼 1F 水表井', parkId: 'park-main', left: 68, top: 48, readingValue: 7864, readingUnit: 'm³', lastReportTime: '2026-08-17 09:12:34' },
  { id: 106, code: 'WM-006', name: '码头作业区水表', kind: 'water', status: 'online', location: '码头作业区 冷链区给水井', parkId: 'park-wharf', left: 74, top: 70, readingValue: 21084, readingUnit: 'm³', lastReportTime: '2026-08-17 16:46:58' },
]

// ========================== 全局时间过滤（本日/本月/本年，全页面共用） ==========================
const timeRange = ref<RangeKey>('month')

// ========================== 筛选：地图撒点 ==========================
const meterKindFilter = ref<'all' | MeterKind>('all')
const visibleMeters = computed(() => {
  // 选中父级「东莞空港中心」时展示全部表计，选中子级时仅展示对应园区表计
  let meters = allMeters.filter((m) => currentParkId.value === 'airport-center' || m.parkId === currentParkId.value)
  if (meterKindFilter.value !== 'all') meters = meters.filter((m) => m.kind === meterKindFilter.value)
  return meters
})

const activeMeterId = ref<number | null>(null)
const activeMeter = computed<Meter | null>(() => {
  if (activeMeterId.value === null) return null
  return allMeters.find((m) => m.id === activeMeterId.value) ?? null
})

const activeMeterTooltipStyle = computed(() => {
  if (!activeMeter.value) return { display: 'none' }
  const meter = activeMeter.value
  const isRight = meter.left > 55
  const left = isRight ? Math.max(8, meter.left - 32) : Math.min(62, meter.left + 4)
  const top = Math.max(6, meter.top - 10)
  return {
    left: `${left}%`,
    top: `${top}%`,
  }
})
const activeMeterAnchor = computed<'left' | 'right' | null>(() => {
  if (!activeMeter.value) return null
  return activeMeter.value.left > 55 ? 'right' : 'left'
})

function toggleMeter(id: number) {
  activeMeterId.value = activeMeterId.value === id ? null : id
}
function closeTooltip() {
  activeMeterId.value = null
}

// ========================== 数据：用能监控 ==========================
// 不同时间范围下的指标仿真数据（与「园区选择器」联动）
const summaryByParkAndRange: Record<string, Record<RangeKey, {
  energyCost: { value: number; yoy: number }
  energyQuantity: { value: number; yoy: number }
  electricCost: { value: number; yoy: number }
  waterCost: { value: number; yoy: number }
  carbon: { value: number; yoy: number }
}>> = {
  'airport-center': {
    day: { energyCost: { value: 1.88, yoy: -1.2 }, energyQuantity: { value: 572, yoy: 1.5 }, electricCost: { value: 1.39, yoy: -1.0 }, waterCost: { value: 0.26, yoy: -2.8 }, carbon: { value: 1.41, yoy: -1.2 } },
    month: { energyCost: { value: 49.1, yoy: -1.6 }, energyQuantity: { value: 16660, yoy: 2.1 }, electricCost: { value: 33.0, yoy: -1.2 }, waterCost: { value: 6.5, yoy: -3.6 }, carbon: { value: 41.0, yoy: -1.6 } },
    year: { energyCost: { value: 586.5, yoy: -2.6 }, energyQuantity: { value: 199260, yoy: 2.6 }, electricCost: { value: 399.7, yoy: -2.1 }, waterCost: { value: 79.2, yoy: -4.6 }, carbon: { value: 488.9, yoy: -2.6 } },
  },
  'park-main': {
    day: { energyCost: { value: 1.36, yoy: -2.2 }, energyQuantity: { value: 404, yoy: 1.1 }, electricCost: { value: 1.0, yoy: -1.9 }, waterCost: { value: 0.2, yoy: -3.4 }, carbon: { value: 0.99, yoy: -2.2 } },
    month: { energyCost: { value: 35.3, yoy: -2.8 }, energyQuantity: { value: 11800, yoy: 1.7 }, electricCost: { value: 23.4, yoy: -2.3 }, waterCost: { value: 5.0, yoy: -5.0 }, carbon: { value: 29.4, yoy: -2.8 } },
    year: { energyCost: { value: 424.1, yoy: -4.1 }, energyQuantity: { value: 140940, yoy: 2.0 }, electricCost: { value: 284.5, yoy: -3.6 }, waterCost: { value: 61.4, yoy: -6.4 }, carbon: { value: 353.3, yoy: -4.1 } },
  },
  'park-wharf': {
    day: { energyCost: { value: 0.52, yoy: 1.6 }, energyQuantity: { value: 168, yoy: 2.4 }, electricCost: { value: 0.39, yoy: 1.8 }, waterCost: { value: 0.06, yoy: 0.4 }, carbon: { value: 0.42, yoy: 1.6 } },
    month: { energyCost: { value: 13.8, yoy: 2.1 }, energyQuantity: { value: 4860, yoy: 3.2 }, electricCost: { value: 9.6, yoy: 2.4 }, waterCost: { value: 1.5, yoy: 0.8 }, carbon: { value: 11.6, yoy: 2.1 } },
    year: { energyCost: { value: 162.4, yoy: 3.5 }, energyQuantity: { value: 58320, yoy: 4.2 }, electricCost: { value: 115.2, yoy: 3.6 }, waterCost: { value: 17.8, yoy: 1.4 }, carbon: { value: 135.6, yoy: 3.5 } },
  },
}
const summary = computed(() => summaryByParkAndRange[currentParkId.value][timeRange.value])

// ========================== 数据：园区/租户统计 ==========================
const scopeStats = computed(() => ({
  parkCount: currentParkId.value === 'airport-center' ? 2 : 1, // 父级展示主地块、码头两个园区
  tenantCount: currentParkId.value === 'airport-center' ? 24 : currentParkId.value === 'park-main' ? 18 : 6,
}))

// ========================== 数据：碳管理进度 ==========================
const carbonTargetByRange: Record<RangeKey, number> = { day: 1, month: 30, year: 360 }
const carbonProgress = computed(() => {
  const target = carbonTargetByRange[timeRange.value]
  const current = summary.value.carbon.value
  const percent = Math.min(100, Math.round((current / target) * 100))
  let color = '#67c23a'
  if (percent >= 90) color = '#f56c6c'
  else if (percent >= 70) color = '#e6a23c'
  return { percent, target, color }
})

// ========================== 数据：排名 ==========================
const parkCostRanking: Ranking[] = [
  { name: '东莞空港中心 / 主地块', cost: 35.3, ratio: 72 },
  { name: '东莞空港中心 / 码头', cost: 13.8, ratio: 28 },
]
const tenantRanking: Ranking[] = [
  { name: '顺丰冷链（CT 楼 1F）', cost: 6.82, ratio: 23.8 },
  { name: '广州白云航空地面服务（CT 楼 2F）', cost: 4.35, ratio: 15.2 },
  { name: '联邦快递（FF 楼 1F）', cost: 3.91, ratio: 13.7 },
  { name: '京东物流（货运区）', cost: 3.26, ratio: 11.4 },
  { name: '嘉里物流（货运区）', cost: 2.74, ratio: 9.6 },
  { name: '联检海关业务（联检区）', cost: 2.18, ratio: 7.6 },
  { name: '顺丰冷链（FF 楼 7F）', cost: 1.86, ratio: 6.5 },
]
const parkEnergyRanking: Ranking[] = [
  { name: '东莞空港中心 / 主地块', quantity: 11800 },
  { name: '东莞空港中心 / 码头', quantity: 4860 },
]
const tenantEnergyRanking: Ranking[] = [
  { name: '顺丰冷链（CT 楼 1F）', quantity: 2248 },
  { name: '广州白云航空地面服务（CT 楼 2F）', quantity: 1436 },
  { name: '联邦快递（FF 楼 1F）', quantity: 1290 },
  { name: '京东物流（货运区）', quantity: 1078 },
  { name: '嘉里物流（货运区）', quantity: 904 },
]

const costRankingTab = ref<'park' | 'tenant'>('park')
const energyRankingTab = ref<'park' | 'tenant'>('park')
const energyUnit = computed(() => timeRange.value === 'year' ? '万 kgce' : 'kgce')

function ratioColor(ratio: number) {
  if (ratio >= 40) return '#f56c6c'
  if (ratio >= 25) return '#e6a23c'
  return '#409eff'
}

// ========================== 工具 ==========================
function formatNumber(value: number) {
  if (value >= 10000) return (value / 10000).toFixed(2)
  return value.toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}
function formatReading(meter: Meter) {
  const value = meter.readingValue.toLocaleString('zh-CN')
  return `${value} ${meter.readingUnit}`
}
function yoyClass(yoy: number) {
  if (yoy < 0) return 'is-down' // 同比下降，用绿色（节省）
  return 'is-up' // 同比上升，能源费/碳排放不友好
}
</script>

<style lang="scss" scoped>
.ew-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  background: #dbe7dc;
  color: #1f2c44;
}

// ============== 全屏地图层 ==============
.ew-map {
  position: absolute;
  inset: 0;
  z-index: 1;
  background: #dbe7dc;
  overflow: hidden;
}
.ew-map__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(0.7) contrast(0.96);
}
.ew-map__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(219, 231, 220, 0.18) 0%, rgba(219, 231, 220, 0.42) 100%);
}

// ============== 顶部悬浮工具栏 ==============
.ew-topbar {
  position: absolute;
  z-index: 20;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 8px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e3eaf3;
  border-radius: 10px;
  box-shadow: 0 6px 18px rgba(38, 58, 90, 0.14);
}
.ew-topbar__divider {
  width: 1px;
  height: 22px;
  background: #e3eaf3;
}
.ew-range--topbar {
  :deep(.el-radio-button__inner) {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 7px 14px;
    font-size: 13px;
  }
}

// ============== 通用卡片 ==============
.ew-card {
  position: relative;
  padding: 14px 16px;
  margin-bottom: 12px;
  background: #fff;
  border: 1px solid #e3eaf3;
  border-radius: 10px;
  box-shadow: 0 4px 14px rgba(38, 58, 90, 0.08);

  &:last-child { margin-bottom: 0; }
}
.ew-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: -2px 0 12px;
}
.ew-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #1f2c44;
  font-size: 14px;
  font-weight: 600;
  .el-icon { color: #409eff; font-size: 15px; }
}
.ew-card__header--tabs { margin-bottom: 0; padding-bottom: 0; }

// ============== 左右浮动面板 ==============
.ew-side {
  position: absolute;
  z-index: 10;
  top: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}
.ew-side--left { left: 16px; width: 320px; }
.ew-side--right { right: 16px; width: 320px; padding-right: 0; }

.ew-side__header {
  padding: 2px 4px 4px;
}
.ew-side__title {
  margin: 0;
  color: #1d3f74;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.5px;
  background: linear-gradient(90deg, #1e40af 0%, #409eff 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

// ============== 园区选择器（级联） ==============
.ew-park-selector__main {
  display: flex;
  align-items: center;
  gap: 10px;
}
.ew-park-selector__icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  color: #fff;
  background: linear-gradient(135deg, #4776e6 0%, #3b82f6 100%);
  border-radius: 8px;
  font-size: 20px;
  box-shadow: 0 4px 10px rgba(71, 118, 230, 0.32);
}
.ew-park-selector__info { display: flex; flex-direction: column; gap: 2px; }
.ew-park-selector__label { color: #8595a8; font-size: 11px; }
.ew-park-selector__cascader {
  width: 100%;
  :deep(.el-input__wrapper) {
    padding: 0;
    background: transparent;
    box-shadow: none;
    &:hover { box-shadow: none; }
    &.is-focus { box-shadow: none; }
  }
  :deep(.el-input__inner) {
    color: #1f2c44;
    font-size: 14px;
    font-weight: 600;
    height: auto;
  }
  :deep(.el-input__suffix) { color: #8595a8; }
}

// ============== 园区/租户/表计 统计 ==============
.ew-metric-stats {
  display: flex;
  align-items: center;
  padding: 12px 8px;
}
.ew-metric-stats__item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.ew-metric-stats__divider {
  width: 1px;
  height: 28px;
  background: #ebeff5;
}
.ew-metric-stats__label { color: #6b7c92; font-size: 11px; }
.ew-metric-stats__value {
  color: #1e40af;
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}
.ew-metric-stats__unit {
  margin-left: 2px;
  color: #6b7c92;
  font-size: 11px;
}

// ============== 用能实时监控 ==============
.ew-metric {
  position: relative;
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid #edf0f5;
  border-radius: 8px;
  background: #fbfdfe;
}
.ew-metric--last { margin-bottom: 0; }
.ew-metric--accent {
  background: linear-gradient(180deg, rgba(71, 118, 230, 0.05) 0%, rgba(71, 118, 230, 0.12) 100%);
  border-color: #cbd9f3;
}
.ew-metric--split {
  display: flex;
  gap: 12px;
  padding: 10px 12px;
}
.ew-metric__col {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.ew-metric__col + .ew-metric__col { padding-left: 12px; border-left: 1px dashed #e0e7f0; }
.ew-metric__label {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #6b7c92;
  font-size: 12px;
}
.ew-metric__type-icon { color: #409eff; font-size: 13px; }
.ew-metric__row {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-top: 4px;
}
.ew-metric__row--small { margin-top: 2px; }
.ew-metric__value {
  color: #1f2c44;
  font-size: 20px;
  font-weight: 700;
  line-height: 1.1;
}
.ew-metric__row--small .ew-metric__value { font-size: 17px; }
.ew-metric__unit {
  color: #6b7c92;
  font-size: 12px;
}
.ew-metric__yoy {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  margin-top: 6px;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 11px;
  font-weight: 500;
  &.is-up { color: #f56c6c; background: rgba(245, 108, 108, 0.1); }
  &.is-down { color: #67c23a; background: rgba(103, 194, 58, 0.1); }
  .el-icon { font-size: 10px; }
}
.ew-metric__yoy--small { margin-top: 4px; padding: 1px 6px; font-size: 10px; }
.ew-metric__yoy span { font-weight: 600; }

// ============== 碳管理进度 ==============
.ew-progress__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  color: #5b6a82;
  font-size: 12px;
  strong { color: #1f2c44; font-weight: 600; font-size: 13px; }
  b { color: #1f2c44; font-weight: 600; }
}
.ew-progress__percent {
  color: #4776e6;
  font-size: 14px;
  font-weight: 700;
}
.ew-progress__bar {
  margin: 4px 0 6px;
}
.ew-progress__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  color: #8595a8;
  font-size: 11px;
}
.ew-progress__trend.is-alert { color: #f56c6c; font-weight: 600; }

// ===== 表计 marker =====
.ew-meter {
  position: absolute;
  z-index: 5;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transform: translate(-50%, -50%);
  &__ring {
    position: absolute;
    inset: -6px;
    border-radius: 50%;
    opacity: 0.18;
  }
  &__dot {
    position: relative;
    display: grid;
    place-items: center;
    width: 30px;
    height: 30px;
    color: #fff;
    border: 2.5px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(32, 54, 74, 0.32);
    transition: transform 0.15s, box-shadow 0.15s;
  }
  &__label {
    position: absolute;
    top: 38px;
    left: 50%;
    padding: 2px 7px;
    color: #fff;
    border-radius: 4px;
    font-size: 10px;
    font-weight: 600;
    transform: translateX(-50%);
    pointer-events: none;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.18);
    white-space: nowrap;
  }
  &:hover .ew-meter__label { transform: translateX(-50%) scale(1.05); }
}

// 在线 marker
.ew-meter--electric {
  .ew-meter__ring { background: #4776e6; }
  .ew-meter__dot { background: rgba(71, 118, 230, 0.85); }
  .ew-meter__label { background: #4776e6; }
  &.ew-meter:not(.ew-meter--offline) .ew-meter__ring { animation: ew-pulse 2.5s infinite; }
}
.ew-meter--water {
  .ew-meter__ring { background: #06b6d4; }
  .ew-meter__dot { background: rgba(6, 182, 212, 0.85); }
  .ew-meter__label { background: #06b6d4; }
  &.ew-meter:not(.ew-meter--offline) .ew-meter__ring { animation: ew-pulse 2.5s infinite; }
}

// 离线 marker
.ew-meter--offline {
  cursor: not-allowed;
  .ew-meter__ring { opacity: 0; }
  .ew-meter__dot {
    background: #b4bac4;
    border-style: dashed;
    color: #6b7280;
  }
  .ew-meter__label {
    background: #909399;
    color: #fff;
  }
}

// 选中态
.ew-meter--active {
  .ew-meter__dot {
    transform: scale(1.15);
    box-shadow: 0 0 0 5px rgba(64, 158, 255, 0.18), 0 0 0 8px rgba(64, 158, 255, 0.08), 0 4px 14px rgba(64, 158, 255, 0.5);
  }
  .ew-meter__ring { opacity: 0.35; }
}

@keyframes ew-pulse {
  0%, 100% { transform: scale(0.7); opacity: 0.18; }
  50% { transform: scale(1.15); opacity: 0.42; }
}

// ===== 信息卡 (tooltip) =====
.ew-tip {
  position: absolute;
  z-index: 30;
  width: 286px;
  padding: 0;
  background: #fff;
  border: 1px solid #e1e8f0;
  border-radius: 10px;
  box-shadow: 0 12px 32px rgba(29, 49, 78, 0.22);
  animation: ew-tip-in 0.15s ease;
}
.ew-tip::before {
  position: absolute;
  top: 28px;
  width: 10px;
  height: 10px;
  background: #fff;
  border-top: 1px solid #e1e8f0;
  border-left: 1px solid #e1e8f0;
  content: '';
  transform: rotate(-45deg);
}
.ew-tip--anchor-left::before {
  left: -6px;
}
.ew-tip--anchor-right::before {
  right: -6px;
}
@keyframes ew-tip-in {
  from { opacity: 0; transform: translateY(-4px); }
  to { opacity: 1; transform: translateY(0); }
}
.ew-tip__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #eef1f5;
}
.ew-tip__type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  border-radius: 4px;
  color: #fff;
  font-size: 11px;
  font-weight: 600;
  &--electric { background: #4776e6; }
  &--water { background: #06b6d4; }
}
.ew-tip__name {
  margin: 10px 14px 8px;
  color: #1f2c44;
  font-size: 14px;
  font-weight: 600;
}
.ew-tip__rows {
  margin: 0 14px 12px;
  padding: 0;
  list-style: none;
  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 5px 0;
    border-top: 1px dashed #edf0f5;
    font-size: 12px;
    &:first-child { border-top: none; }
    span { color: #6b7c92; }
    b { color: #1f2c44; font-weight: 500; }
  }
}
.ew-tip__reading { color: #4776e6 !important; font-weight: 700 !important; }

// ===== 图例 =====
.ew-legend {
  position: absolute;
  z-index: 6;
  right: 14px;
  bottom: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.96);
  border: 1px solid #e1e7ef;
  border-radius: 8px;
  box-shadow: 0 3px 12px rgba(45, 62, 83, 0.1);
  span {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    color: #5b6a82;
    font-size: 11px;
  }
  .dot { width: 12px; height: 12px; border-radius: 50%; }
  .dot--em { background: #4776e6; box-shadow: 0 0 0 1.5px rgba(71, 118, 230, 0.3); }
  .dot--em-offline { background: #b4bac4; border: 1.5px dashed #6b7280; }
  .dot--wm { background: #06b6d4; box-shadow: 0 0 0 1.5px rgba(6, 182, 212, 0.3); }
  .dot--wm-offline { background: #b4bac4; border: 1.5px dashed #6b7280; }
}

.ew-map-empty {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #6c7c93;
  strong { color: #253a55; font-size: 13px; }
  span { font-size: 12px; }
  .el-icon { color: #9aa5b5; }
}

// ============== 右侧排名 ==============
.ew-ranking { display: flex; flex-direction: column; min-height: 0; }
.ew-ranking :deep(.ew-tabs) { width: 100%; }
.ew-tabs {
  :deep(.el-tabs__header) { margin-bottom: 8px; }
  :deep(.el-tabs__nav) { width: 100%; }
  :deep(.el-tabs__item) { flex: 1; text-align: center; padding: 0 12px !important; font-size: 13px; }
  :deep(.el-tabs__active-bar) { background-color: #4776e6; }
}
.ew-ranking__table {
  flex: 1;
  :deep(th) {
    padding: 6px 0 !important;
    color: #8595a8;
    background: #fafbfc !important;
    font-weight: normal;
    font-size: 12px;
  }
  :deep(td) {
    padding: 7px 0 !important;
    font-size: 12px;
  }
  :deep(.el-table__row:hover > td) {
    background: #f3f7fd !important;
  }
}
.ew-rank {
  display: inline-grid;
  place-items: center;
  width: 22px;
  height: 22px;
  color: #6b7c92;
  border-radius: 50%;
  background: #edf0f5;
  font-size: 11px;
  font-weight: 600;
}
.ew-rank--top {
  color: #fff;
  background: linear-gradient(135deg, #f6c453 0%, #f59e0b 100%);
  box-shadow: 0 2px 6px rgba(245, 158, 11, 0.32);
}
.ew-ranking__value {
  color: #1e40af;
  font-weight: 700;
}
.ew-ratio-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  span { color: #5b6a82; font-size: 11px; }
  :deep(.el-progress) { width: 60px; }
}

// ============== 响应式（窄屏压缩） ==============
@media (max-width: 1480px) {
  .ew-side--left,
  .ew-side--right { width: 296px; }
}
@media (max-width: 1280px) {
  .ew-side--left { width: 280px; }
  .ew-side--right { width: 268px; }
  .ew-card { padding: 12px 14px; }
  .ew-side__title { font-size: 16px; }
}
@media (max-width: 1100px) {
  .ew-side--right { display: none; }
  .ew-side--left { width: 256px; }
}
</style>
