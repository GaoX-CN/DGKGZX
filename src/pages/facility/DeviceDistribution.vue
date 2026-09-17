<template>
  <div class="dd-page">
    <!-- ===================== 全屏地图层 ===================== -->
    <main class="dd-map" @click="onMapClick">
      <div class="dd-stage">
        <img :src="mapImage" alt="园区平面图" class="dd-map__bg" />
        <div class="dd-map__overlay" />

        <!-- 区域名称标注 -->
        <div
          v-for="area in areaLabels"
          :key="area.key"
          class="dd-area"
          :style="{ left: area.left + '%', top: area.top + '%' }"
        >{{ area.key }}</div>

        <!-- 设备撒点 -->
        <button
          v-for="device in visibleDevices"
          :key="device.id"
          type="button"
          class="dd-dot"
          :class="[`dd-dot--${device.status}`, { 'dd-dot--active': activeDeviceId === device.id }]"
          :style="dotStyle(device)"
          @click.stop="selectDevice(device.id)"
        >
          <span class="dd-dot__core">
            <el-icon :size="13"><component :is="categoryIcon(device.category)" /></el-icon>
          </span>
          <span class="dd-dot__label">{{ device.name }}</span>
        </button>

        <!-- 设备信息卡（点击图标后弹出） -->
        <div
          v-if="activeDevice"
          class="dd-tip"
          :style="tipStyle"
          @click.stop
        >
          <header class="dd-tip__header">
            <span class="dd-tip__cat" :style="{ background: categoryColor(activeDevice.category) }">
              <el-icon :size="12"><component :is="categoryIcon(activeDevice.category)" /></el-icon>
              {{ categoryLabel(activeDevice.category) }}
            </span>
            <el-button text :icon="Close" size="small" @click="activeDeviceId = null" />
          </header>
          <h4 class="dd-tip__name">{{ activeDevice.name }}</h4>
          <ul class="dd-tip__rows">
            <li><span>设备编号</span><b class="dd-tip__code">{{ activeDevice.id }}</b></li>
            <li><span>空间归属</span><b>{{ activeDevice.location }}</b></li>
            <li>
              <span>运行状态</span>
              <b class="dd-tip__status" :style="{ color: statusMeta[activeDevice.status].color }">
                <i class="dd-tip__status-dot" :style="{ background: statusMeta[activeDevice.status].color }" />
                {{ statusMeta[activeDevice.status].label }}
              </b>
            </li>
            <li><span>状态更新</span><b>{{ activeDevice.updatedAt }}</b></li>
          </ul>
        </div>
      </div>

      <!-- 空态 -->
      <div v-if="visibleDevices.length === 0" class="dd-empty">
        <el-icon :size="40"><Filter /></el-icon>
        <strong>当前筛选条件下没有可显示的设备</strong>
        <span>该分类下暂无此运行状态的设备，请调整运行状态后重试</span>
        <el-button size="small" @click="resetFilter">重置筛选</el-button>
      </div>
    </main>

    <!-- ===================== 左侧：分类筛选 + 设备清单 ===================== -->
    <aside class="dd-side dd-side--left">
      <section class="dd-card dd-card--filter">
        <header class="dd-card__header">
          <h2 class="dd-card__title">
            <el-icon><Filter /></el-icon>
            设备分类
          </h2>
        </header>

        <div class="dd-cat-list">
          <div
            v-for="cat in categories"
            :key="cat.value"
            class="dd-cat-item"
            :class="{
              'is-selected': selectedCategory === cat.value,
              'is-empty': countByCategory(cat.value) === 0,
            }"
            @click="selectCategory(cat.value)"
          >
            <span class="dd-cat-item__dot" :style="{ background: cat.color }" />
            <span class="dd-cat-item__name">{{ cat.label }}</span>
            <span class="dd-cat-item__count">{{ countByCategory(cat.value) }}</span>
            <button
              type="button"
              class="dd-cat-item__list-btn"
              :class="{ 'is-on': listPanelOpen && selectedCategory === cat.value }"
              :title="`查看${cat.label}设备清单`"
              @click.stop="openListPanel(cat.value)"
            >设备清单</button>
          </div>
        </div>
      </section>
    </aside>

    <!-- ===================== 分类设备清单（自设备分类卡右侧滑出） ===================== -->
    <Transition name="dd-slide">
      <section v-if="listPanelOpen" class="dd-slidepanel">
        <header class="dd-slidepanel__header">
          <div class="dd-slidepanel__title">{{ categoryLabel(selectedCategory) }}设备清单</div>
          <el-button text :icon="Close" size="small" @click="listPanelOpen = false" />
        </header>

        <!-- 清单内：名称搜索 + 运行状态过滤 -->
        <div class="dd-slidepanel__filter">
          <el-input
            v-model="listKeyword"
            size="small"
            placeholder="搜索设备名称"
            clearable
            :prefix-icon="Search"
          />
          <div class="dd-slidepanel__status">
            <button
              v-for="opt in LIST_STATUS_OPTIONS"
              :key="opt.value"
              type="button"
              class="dd-slidepanel__status-btn"
              :class="{ 'is-on': listStatus === opt.value }"
              @click="listStatus = opt.value"
            >{{ opt.label }}</button>
          </div>
        </div>

        <div class="dd-slidepanel__body">
          <article
            v-for="device in listPagedDevices"
            :key="device.id"
            class="dd-device-item"
            :class="{ 'is-active': activeDeviceId === device.id }"
            @click="focusDevice(device.id)"
          >
            <div class="dd-device-item__body">
              <div class="dd-device-item__name">{{ device.name }}</div>
              <div class="dd-device-item__meta">{{ device.location }}</div>
            </div>
            <el-tag size="small" effect="light" :type="statusTagType(device.status)">
              {{ statusMeta[device.status].label }}
            </el-tag>
          </article>
          <el-empty
            v-if="listPagedDevices.length === 0"
            :description="listTotal === 0 ? '没有匹配的设备' : '暂无数据'"
            :image-size="70"
          />
        </div>

        <footer v-if="listTotal > 0" class="dd-slidepanel__footer">
          <el-pagination
            v-model:current-page="listPage"
            size="small"
            background
            layout="prev, pager, next"
            :page-size="LIST_PAGE_SIZE"
            :total="listTotal"
          />
        </footer>
      </section>
    </Transition>

    <!-- ===================== 右侧：分布概览（含状态筛选） + 在线率 ===================== -->
    <aside class="dd-side dd-side--right">
      <section class="dd-card dd-card--overview">
        <header class="dd-card__header">
          <h2 class="dd-card__title">
            <el-icon><OfficeBuilding /></el-icon>
            分布概览
          </h2>
        </header>
        <div class="dd-overview">
          <button
            type="button"
            class="dd-overview__item"
            :class="{ 'is-active': statusFilter === 'all' }"
            @click="statusFilter = 'all'"
          >
            <strong>{{ overviewCount.all }}</strong>
            <span>全部设备</span>
          </button>
          <button
            type="button"
            class="dd-overview__item dd-overview__item--online"
            :class="{ 'is-active': statusFilter === 'online' }"
            @click="statusFilter = 'online'"
          >
            <strong>{{ overviewCount.online }}</strong>
            <span>在线</span>
          </button>
          <button
            type="button"
            class="dd-overview__item dd-overview__item--offline"
            :class="{ 'is-active': statusFilter === 'offline' }"
            @click="statusFilter = 'offline'"
          >
            <strong>{{ overviewCount.offline }}</strong>
            <span>离线</span>
          </button>
        </div>
        <div class="dd-overview__hint">
          在线率 <b>{{ onlineRate }}%</b> · 点击卡片可按运行状态筛选
        </div>
      </section>

      <section class="dd-card dd-card--rank">
        <header class="dd-card__header">
          <h2 class="dd-card__title">
            <el-icon><Histogram /></el-icon>
            在线率
          </h2>
          <div class="dd-rank__sort">
            <button
              type="button"
              class="dd-rank__sort-btn"
              :class="{ 'is-on': rankOrder === 'desc' }"
              title="按在线率从高到低"
              @click="rankOrder = 'desc'"
            >
              <el-icon :size="12"><CaretBottom /></el-icon>
              高→低
            </button>
            <button
              type="button"
              class="dd-rank__sort-btn"
              :class="{ 'is-on': rankOrder === 'asc' }"
              title="按在线率从低到高"
              @click="rankOrder = 'asc'"
            >
              <el-icon :size="12"><CaretTop /></el-icon>
              低→高
            </button>
          </div>
        </header>
        <div v-if="categoryRank.length > 0" class="dd-rank">
          <div v-for="item in categoryRank" :key="item.value" class="dd-rank__row">
            <span class="dd-rank__label">{{ item.label }}</span>
            <div
              class="dd-rank__track"
              @mouseenter="showRankTip($event, item)"
              @mousemove="moveRankTip($event)"
              @mouseleave="hideRankTip"
            >
              <div class="dd-rank__bar">
                <i
                  v-if="item.online > 0"
                  class="dd-rank__seg dd-rank__seg--online"
                  :style="{ width: item.onlineRatio + '%', background: item.color }"
                />
                <i
                  v-if="item.offline > 0"
                  class="dd-rank__seg dd-rank__seg--offline"
                  :style="{ width: 100 - item.onlineRatio + '%' }"
                />
              </div>
            </div>
            <b class="dd-rank__value">{{ item.rateText }}</b>
          </div>
        </div>
        <div v-else class="dd-rank__empty">暂无可统计数据</div>
      </section>

      <!-- 在线率条形悬停浮层（展示该分类总数 / 在线 / 离线） -->
      <Teleport to="body">
        <div
          v-if="rankTip.visible && rankTip.item"
          class="dd-ranktip"
          :style="{ left: rankTip.x + 'px', top: rankTip.y + 'px' }"
        >
          <div class="dd-ranktip__title">
            <i :style="{ background: rankTip.item.color }" />
            {{ rankTip.item.label }}设备
          </div>
          <ul class="dd-ranktip__rows">
            <li>
              <span>设备总数</span>
              <b>{{ rankTip.item.count }} 台</b>
            </li>
            <li>
              <span><i class="dd-ranktip__dot dd-ranktip__dot--online" />在线</span>
              <b>{{ rankTip.item.online }} 台</b>
            </li>
            <li>
              <span><i class="dd-ranktip__dot dd-ranktip__dot--offline" />离线</span>
              <b>{{ rankTip.item.offline }} 台</b>
            </li>
          </ul>
        </div>
      </Teleport>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Component } from 'vue'
import { Box, CaretBottom, CaretTop, Close, Filter, Histogram, OfficeBuilding, Search } from '@element-plus/icons-vue'
import {
  deviceAreaLabels,
  deviceCategories,
  deviceList,
  type DeviceCategory,
  type DeviceItem,
  type DeviceStatus,
} from '@/data/deviceData'
import mapImage from '@/map.png'

// ==================== 类型与数据源 ====================
// 设备分类与设备实例数据见 src/data/deviceData.ts
//   · 分类取 equip_device_def，一个 def_code 即一类（16 类），不按大类归并
//   · 设备取 equip_device_instance 清洗后 87 台

type StatusFilter = 'all' | DeviceStatus

/** 设备分类（16 类） */
const categories = deviceCategories

/** 设备实例（87 台） */
const devices = deviceList

/** 底图区域标注 */
const areaLabels = deviceAreaLabels

const categoryMap: Record<string, DeviceCategory> = categories.reduce((acc, item) => {
  acc[item.value] = item
  return acc
}, {} as Record<string, DeviceCategory>)

function categoryColor(value: string): string {
  return categoryMap[value]?.color ?? '#95a5b8'
}
function categoryLabel(value: string): string {
  return categoryMap[value]?.label ?? value
}
function categoryIcon(value: string): Component {
  return categoryMap[value]?.icon ?? Box
}

const statusMeta: Record<DeviceStatus, { label: string; color: string; tag: 'success' | 'info' }> = {
  online: { label: '在线', color: '#35b37e', tag: 'success' },
  offline: { label: '离线', color: '#95a5b8', tag: 'info' },
}

function statusTagType(status: DeviceStatus) {
  return statusMeta[status].tag
}

// ==================== 筛选状态（分类单选 + 状态单选） ====================

/** 默认选中第一个设备分类（摄像头） */
const selectedCategory = ref<string>(categories[0].value)
const statusFilter = ref<StatusFilter>('all')

/** 当前分类范围内的设备（不含状态过滤，用于分类型徽标与概览计数） */
const categoryBaseDevices = computed(() =>
  devices.filter((d) => d.category === selectedCategory.value),
)

/** 当前状态范围内的设备（不含分类过滤，用于分类徽标与「在线率」） */
const statusBaseDevices = computed(() => {
  if (statusFilter.value === 'all') return devices
  return devices.filter((d) => d.status === statusFilter.value)
})

/** 最终地图与清单使用的设备集合（分类 + 状态双重约束） */
const visibleDevices = computed(() => {
  if (statusFilter.value === 'all') return categoryBaseDevices.value
  return categoryBaseDevices.value.filter((d) => d.status === statusFilter.value)
})

function countByCategory(value: string): number {
  return statusBaseDevices.value.filter((d) => d.category === value).length
}

/** 分布概览的三个数字：只受分类筛选影响，切换状态时数字保持稳定 */
const overviewCount = computed(() => {
  const base = categoryBaseDevices.value
  const online = base.filter((d) => d.status === 'online').length
  return { all: base.length, online, offline: base.length - online }
})

const onlineRate = computed(() => {
  const total = categoryBaseDevices.value.length
  if (total === 0) return 0
  return Math.round((overviewCount.value.online / total) * 1000) / 10
})

// ==================== 选中设备 ====================

const activeDeviceId = ref<string | null>(null)
const activeDevice = computed<DeviceItem | null>(
  () => devices.find((d) => d.id === activeDeviceId.value) ?? null,
)

function selectDevice(id: string) {
  activeDeviceId.value = activeDeviceId.value === id ? null : id
}

function onMapClick() {
  activeDeviceId.value = null
  listPanelOpen.value = false
}

watch(visibleDevices, (list) => {
  if (activeDeviceId.value && !list.some((d) => d.id === activeDeviceId.value)) {
    activeDeviceId.value = null
  }
})

// ==================== 提示卡定位 ====================

const tipStyle = computed<Record<string, string>>(() => {
  if (!activeDevice.value) return { display: 'none' }
  const device = activeDevice.value
  const top = Math.max(3, device.top - 12)
  if (device.left > 55) {
    return {
      right: `${Math.max(4, 100 - device.left + 2)}%`,
      top: `${top}%`,
    }
  }
  return {
    left: `${Math.min(70, device.left + 3)}%`,
    top: `${top}%`,
  }
})

function dotStyle(device: DeviceItem): Record<string, string> {
  return {
    left: `${device.left}%`,
    top: `${device.top}%`,
    '--dot-color': categoryColor(device.category),
  }
}

// ==================== 在线率 ====================

interface CategoryRankItem {
  value: string
  label: string
  color: string
  online: number
  offline: number
  count: number
  rate: number
  rateText: string
  onlineRatio: number
}

/** 在线率排序方向：desc 高→低，asc 低→高 */
const rankOrder = ref<'desc' | 'asc'>('desc')

/** 以全量设备为基数，统计各分类的在线率（不受设备分类、运行状态筛选影响） */
const categoryRank = computed<CategoryRankItem[]>(() => {
  const list = categories
    .map((cat) => {
      const online = devices.filter((d) => d.category === cat.value && d.status === 'online').length
      const offline = devices.filter((d) => d.category === cat.value && d.status === 'offline').length
      const count = online + offline
      const rate = count === 0 ? 0 : Math.round((online / count) * 1000) / 10
      return {
        value: cat.value,
        label: cat.label,
        color: cat.color,
        online,
        offline,
        count,
        rate,
        rateText: `${Number.isInteger(rate) ? rate : rate.toFixed(1)}%`,
        onlineRatio: count === 0 ? 0 : (online / count) * 100,
      }
    })
    .filter((item) => item.count > 0)

  list.sort((a, b) => {
    if (b.rate !== a.rate) return rankOrder.value === 'desc' ? b.rate - a.rate : a.rate - b.rate
    return b.count - a.count
  })

  return list
})

// ==================== 在线率条形悬停浮层 ====================

const RANK_TIP_WIDTH = 152
const RANK_TIP_HEIGHT = 92

const rankTip = ref<{ visible: boolean; x: number; y: number; item: CategoryRankItem | null }>({
  visible: false,
  x: 0,
  y: 0,
  item: null,
})

function showRankTip(event: MouseEvent, item: CategoryRankItem) {
  rankTip.value = { visible: true, x: 0, y: 0, item }
  moveRankTip(event)
}

function moveRankTip(event: MouseEvent) {
  if (!rankTip.value.visible) return
  let x = event.clientX + 16
  if (x + RANK_TIP_WIDTH > window.innerWidth - 10) x = event.clientX - RANK_TIP_WIDTH - 16
  let y = event.clientY - RANK_TIP_HEIGHT - 12
  if (y < 10) y = event.clientY + 18
  rankTip.value.x = Math.max(10, x)
  rankTip.value.y = y
}

function hideRankTip() {
  rankTip.value.visible = false
}

// ==================== 筛选操作 ====================

/** 分类设备清单面板：默认收起，点击分类后的「设备清单」按钮自左卡右侧滑出 */
const listPanelOpen = ref(false)

function selectCategory(value: string) {
  selectedCategory.value = value
}

/** 打开某分类的设备清单（同时把该分类设为选中，保证地图与清单一致） */
function openListPanel(value: string) {
  selectCategory(value)
  listPage.value = 1
  listPanelOpen.value = true
}

// ==================== 清单面板内的搜索 / 状态过滤 / 分页 ====================

const LIST_PAGE_SIZE = 8

const LIST_STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: '全部' },
  { value: 'online', label: '在线' },
  { value: 'offline', label: '离线' },
]

const listKeyword = ref('')
const listStatus = ref<StatusFilter>('all')
const listPage = ref(1)

/** 面板清单：当前分类下，按名称关键字 + 运行状态过滤后的设备 */
const listDevices = computed(() => {
  const keyword = listKeyword.value.trim().toLowerCase()
  return categoryBaseDevices.value.filter((device) => {
    if (listStatus.value !== 'all' && device.status !== listStatus.value) return false
    if (keyword && !device.name.toLowerCase().includes(keyword)) return false
    return true
  })
})

const listTotal = computed(() => listDevices.value.length)

const listPagedDevices = computed(() => {
  const start = (listPage.value - 1) * LIST_PAGE_SIZE
  return listDevices.value.slice(start, start + LIST_PAGE_SIZE)
})

/** 分类、关键字或状态变化时回到第一页 */
watch([selectedCategory, listKeyword, listStatus], () => {
  listPage.value = 1
})

/** 清单内点击设备：若该设备因运行状态筛选不在图上，先复位状态筛选再定位 */
function focusDevice(id: string) {
  if (!visibleDevices.value.some((device) => device.id === id)) {
    statusFilter.value = 'all'
  }
  activeDeviceId.value = id
}

function resetFilter() {
  statusFilter.value = 'all'
  activeDeviceId.value = null
}
</script>

<style lang="scss" scoped>
.dd-page {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 100%;
  overflow: hidden;
  background: #dbe7dc;
  color: #1e2d45;
}

// ==================== 地图层 ====================
.dd-map {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  background: #dbe7dc;
  user-select: none;
}
.dd-stage {
  position: absolute;
  inset: 0;
}

.dd-map__bg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  filter: saturate(.66) contrast(.94);
}
.dd-map__overlay {
  position: absolute;
  inset: 0;
  background: rgba(220, 236, 222, .12);
}

// 区域名称标注
.dd-area {
  position: absolute;
  z-index: 2;
  transform: translate(-50%, -50%);
  padding: 2px 8px;
  color: #5f7a68;
  background: rgba(255, 255, 255, .62);
  border: 1px solid rgba(150, 175, 158, .5);
  border-radius: 3px;
  font-size: 11px;
  white-space: nowrap;
  pointer-events: none;
}

// ==================== 设备撒点 ====================
.dd-dot {
  position: absolute;
  z-index: 4;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  transform: translate(-50%, -50%);

  &__core {
    position: relative;
    display: grid;
    place-items: center;
    width: 26px;
    height: 26px;
    color: #fff;
    background: var(--dot-color);
    border: 2px solid #fff;
    border-radius: 50%;
    box-shadow: 0 2px 8px rgba(32, 54, 74, .32);
    transition: transform .15s ease, box-shadow .15s ease;
  }
  &__label {
    position: absolute;
    top: 30px;
    left: 50%;
    padding: 2px 6px;
    color: #45566e;
    background: rgba(255, 255, 255, .95);
    border: 1px solid #d0d7e2;
    border-radius: 4px;
    font-size: 10px;
    line-height: 1.4;
    white-space: nowrap;
    transform: translateX(-50%);
    opacity: 0;
    pointer-events: none;
    transition: opacity .15s ease;
  }
  &:hover .dd-dot__label { opacity: 1; }
  &:hover .dd-dot__core { transform: scale(1.12); }
}

.dd-dot--offline {
  .dd-dot__core {
    color: #7b8794;
    background: #f2f4f7;
    border: 2px dashed #a9b3bf;
    box-shadow: 0 1px 5px rgba(32, 54, 74, .2);
  }
}
.dd-dot--active {
  z-index: 6;
  .dd-dot__core {
    transform: scale(1.2);
    box-shadow: 0 0 0 5px rgba(71, 118, 230, .2), 0 0 0 9px rgba(71, 118, 230, .1), 0 4px 14px rgba(32, 54, 74, .4);
  }
  .dd-dot__label { opacity: 1; color: #4776e6; border-color: #4776e6; }
}

// ==================== 设备信息卡 ====================
.dd-tip {
  position: absolute;
  z-index: 14;
  width: 282px;
  background: #fff;
  border: 1px solid #e1e8f0;
  border-radius: 8px;
  box-shadow: 0 10px 28px rgba(29, 49, 78, .22);
  animation: dd-tip-in .15s ease;
}
@keyframes dd-tip-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.dd-tip__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px 8px 12px;
  border-bottom: 1px solid #eef1f5;
}
.dd-tip__cat {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  color: #fff;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
}
.dd-tip__name {
  margin: 10px 12px 6px;
  color: #1f2c44;
  font-size: 13px;
  font-weight: 600;
  line-height: 1.5;
}
.dd-tip__rows {
  margin: 0 12px 10px;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 5px 0;
    border-top: 1px dashed #edf0f5;
    font-size: 11px;

    &:first-child { border-top: none; }
    span { flex: none; color: #7989a0; }
    b { color: #253a55; font-weight: 500; text-align: right; }
  }
}
.dd-tip__status {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
// 设备编号为实例表 device_id（32 位无分隔串），允许折行以免撑破卡片
.dd-tip__code {
  flex: 1;
  min-width: 0;
  font-size: 10px;
  font-weight: 500;
  line-height: 1.6;
  word-break: break-all;
}
.dd-tip__status-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
}

// ==================== 空态 ====================
.dd-empty {
  position: absolute;
  inset: 0;
  z-index: 3;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #6c7c93;
  pointer-events: none;

  .el-icon { color: #9aa5b5; }
  strong { color: #253a55; font-size: 14px; }
  span { font-size: 12px; }
  .el-button { margin-top: 8px; pointer-events: auto; }
}

// ==================== 面板通用 ====================
.dd-side {
  position: absolute;
  z-index: 10;
  top: 16px;
  bottom: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
}
.dd-side--left { left: 16px; width: 320px; }
.dd-side--right { right: 16px; width: 340px; }

.dd-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 14px 16px;
  background: #fff;
  border: 1px solid #e5eaf1;
  border-radius: 10px;
  box-shadow: 0 5px 20px rgba(38, 58, 90, .12);
}
.dd-card--filter { flex: 1; }
.dd-card--overview { flex: none; }
.dd-card--rank { flex: 1; }

.dd-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}
.dd-card__title {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: #1f2c44;
  font-size: 14px;
  font-weight: 600;

  .el-icon { color: #4776e6; font-size: 15px; }
}

// ==================== 分类单选卡 ====================
.dd-cat-list {
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: flex-start;
  gap: 2px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}
.dd-cat-item {
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px 9px;
  border: 1px solid transparent;
  border-radius: 6px;
  cursor: pointer;
  transition: all .14s;

  &:hover { background: #f5f8fd; }
  &.is-selected { background: #f0f5ff; border-color: #cfdcf6; }
  &.is-empty { opacity: .45; }

  &__dot {
    flex: none;
    width: 10px;
    height: 10px;
    border-radius: 2px;
  }
  &__name {
    flex: 1;
    min-width: 0;
    color: #253a55;
    font-size: 14px;
  }
  &__count {
    flex: none;
    color: #9aa5b5;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
  }
  &__list-btn {
    flex: none;
    padding: 2px 8px;
    color: #6b8fd6;
    background: #f4f7fd;
    border: 1px solid #dbe4f4;
    border-radius: 4px;
    font-size: 12px;
    line-height: 17px;
    cursor: pointer;
    transition: all .14s;

    &:hover {
      color: #fff;
      background: #4776e6;
      border-color: #4776e6;
    }
    &.is-on {
      color: #fff;
      background: #4776e6;
      border-color: #4776e6;
    }
  }
}

// ==================== 分类设备清单滑出面板 ====================
.dd-slidepanel {
  position: absolute;
  z-index: 11;
  top: 16px;
  bottom: 16px;
  left: 336px;
  display: flex;
  flex-direction: column;
  width: 380px;
  padding: 14px 16px 8px;
  background: #fff;
  border: 1px solid #e5eaf1;
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(38, 58, 90, .18);
}
.dd-slidepanel__header {
  display: flex;
  align-items: center;
  gap: 9px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f0f3f7;
}
.dd-slidepanel__title {
  flex: 1;
  min-width: 0;
  color: #1f2c44;
  font-size: 14px;
  font-weight: 600;
}
.dd-slidepanel__filter {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-top: 11px;

  :deep(.el-input) {
    flex: 1;
    min-width: 0;
  }
}
.dd-slidepanel__status {
  display: flex;
  flex: none;
  gap: 4px;
}
.dd-slidepanel__status-btn {
  padding: 4px 9px;
  color: #5b6a82;
  background: #f6f8fb;
  border: 1px solid #e3e8ef;
  border-radius: 5px;
  font-size: 12px;
  line-height: 16px;
  cursor: pointer;
  transition: all .14s;

  &:hover { color: #4776e6; border-color: #b9c8e4; }
  &.is-on {
    color: #fff;
    background: #4776e6;
    border-color: #4776e6;
  }
}
.dd-slidepanel__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-top: 11px;
  padding-right: 2px;
}
.dd-slidepanel__footer {
  display: flex;
  justify-content: center;
  margin-top: 4px;
  padding-top: 8px;
  border-top: 1px solid #f0f3f7;
}

.dd-slide-enter-active,
.dd-slide-leave-active {
  transition: opacity .18s ease, transform .22s cubic-bezier(.22, .61, .36, 1);
}
.dd-slide-enter-from,
.dd-slide-leave-to {
  opacity: 0;
  transform: translateX(-16px);
}

// ==================== 设备清单条目 ====================
.dd-device-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 11px;
  margin-bottom: 7px;
  background: #fbfcfe;
  border: 1px solid #eaeff5;
  border-radius: 7px;
  cursor: pointer;
  transition: all .14s;

  &:hover { background: #f4f8fd; border-color: #c3d2e8; }
  &.is-active {
    background: #f0f5ff;
    border-color: #4776e6;
    box-shadow: 0 3px 10px rgba(71, 118, 230, .14);
  }

  :deep(.el-tag) { flex: none; }

  &__body { flex: 1; min-width: 0; }
  &__name {
    color: #1f2c44;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.45;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  &__meta {
    margin-top: 3px;
    color: #8595a8;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

// ==================== 分布概览（兼作运行状态筛选） ====================
.dd-overview {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}
.dd-overview__item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  padding: 9px 2px;
  background: #f6f9fd;
  border: 1px solid #eaf0f7;
  border-radius: 7px;
  font-family: inherit;
  cursor: pointer;
  transition: all .14s;

  strong { color: #1f2c44; font-size: 17px; font-weight: 600; font-variant-numeric: tabular-nums; }
  span { color: #8595a8; font-size: 10px; }

  &:hover { border-color: #b9c8e4; }
  &.is-active {
    background: #eef4ff;
    border-color: #4776e6;
    span { color: #4776e6; }
  }

  &--online strong { color: #35b37e; }
  &--offline strong { color: #95a5b8; }
}
.dd-overview__hint {
  margin-top: 10px;
  color: #8595a8;
  font-size: 11px;

  b { color: #2f4a78; font-weight: 600; }
}

// ==================== 在线率 ====================
.dd-rank__sort {
  display: flex;
  gap: 4px;
  padding: 2px;
  background: #f4f7fb;
  border-radius: 6px;
}
.dd-rank__sort-btn {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px 7px;
  color: #8595a8;
  background: transparent;
  border: 0;
  border-radius: 4px;
  font-family: inherit;
  font-size: 10px;
  cursor: pointer;
  transition: all .14s;

  &:hover { color: #4776e6; }
  &.is-on {
    color: #4776e6;
    background: #fff;
    box-shadow: 0 1px 3px rgba(45, 62, 83, .12);
  }
}

.dd-rank {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
  overflow-y: auto;
  padding-right: 2px;
}
.dd-rank__row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.dd-rank__label {
  flex: none;
  width: 42px;
  color: #5b6a82;
  font-size: 11px;
}
.dd-rank__track {
  flex: 1;
  height: 8px;
  background: #f2f5f9;
  border-radius: 4px;
  overflow: hidden;
  cursor: default;
}
.dd-rank__bar {
  display: flex;
  width: 100%;
  height: 100%;
  border-radius: 4px;
  overflow: hidden;
}
.dd-rank__seg {
  display: block;
  height: 100%;
  transition: width .25s ease;
}
.dd-rank__seg--offline {
  background: #c4cdd9;
}
.dd-rank__value {
  flex: none;
  width: 42px;
  color: #2f4a78;
  font-size: 11px;
  font-weight: 600;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.dd-rank__empty {
  padding: 16px 0;
  color: #a2aebb;
  font-size: 11px;
  text-align: center;
}

// ==================== 在线率条形悬停浮层 ====================
.dd-ranktip {
  position: fixed;
  z-index: 3000;
  width: 152px;
  padding: 9px 11px;
  background: rgba(255, 255, 255, .98);
  border: 1px solid #dbe3ee;
  border-radius: 8px;
  box-shadow: 0 8px 22px rgba(29, 49, 78, .18);
  pointer-events: none;
  animation: dd-tip-in .12s ease;
}
.dd-ranktip__title {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-bottom: 6px;
  padding-bottom: 6px;
  color: #1f2c44;
  border-bottom: 1px solid #f0f3f7;
  font-size: 11px;
  font-weight: 600;

  i {
    flex: none;
    width: 8px;
    height: 8px;
    border-radius: 2px;
  }
}
.dd-ranktip__rows {
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 2px 0;
    color: #6c7c93;
    font-size: 11px;

    span {
      display: inline-flex;
      align-items: center;
      gap: 5px;
    }
    b {
      color: #253a55;
      font-weight: 600;
      font-variant-numeric: tabular-nums;
    }
  }
}
.dd-ranktip__dot {
  flex: none;
  width: 7px;
  height: 7px;
  border-radius: 50%;
}
.dd-ranktip__dot--online { background: #35b37e; }
.dd-ranktip__dot--offline { background: #c4cdd9; }

// ==================== 响应式 ====================
@media (max-width: 1480px) {
  .dd-side--left { width: 300px; }
  .dd-side--right { width: 316px; }
  .dd-slidepanel { left: 316px; }
}
@media (max-width: 1280px) {
  .dd-side--left { width: 276px; }
  .dd-side--right { width: 288px; }
  .dd-overview__item strong { font-size: 15px; }
  .dd-slidepanel { left: 292px; width: 320px; }
}
@media (max-width: 1100px) {
  .dd-side--right { display: none; }
}
@media (max-width: 860px) {
  .dd-side--left { right: 16px; bottom: auto; width: auto; max-height: 46vh; }
  .dd-slidepanel { right: 16px; bottom: 16px; left: 16px; top: auto; width: auto; max-height: 60vh; }
}
</style>
