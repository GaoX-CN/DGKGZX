<template>
  <div class="mo-page">
    <div class="mo-phone">
      <!-- 手机状态栏 -->
      <div class="mo-statusbar">
        <span class="mo-statusbar__time">9:41</span>
        <span class="mo-statusbar__icons">
          <i class="mo-sig"></i>
          <i class="mo-wifi"></i>
          <i class="mo-batt"></i>
        </span>
      </div>

      <!-- ==================== 屏 1：我的工单 ==================== -->
      <div v-if="screen === 'list'" class="mo-view">
        <div class="mo-head">
          <div class="mo-head__title">巡检工单</div>

          <div class="mo-search">
            <el-input v-model="query.orderNo" size="small" placeholder="工单号" clearable />
          </div>

          <div class="mo-chips">
            <button
              v-for="c in statusChips"
              :key="c.value"
              class="mo-chip"
              :class="{ 'mo-chip--active': statusFilter === c.value }"
              @click="statusFilter = c.value"
            >
              {{ c.label }} {{ c.count }}
            </button>
          </div>
        </div>

        <div ref="listScrollRef" class="mo-scroll" @scroll="tryLoadMore">
          <div
            v-for="o in visibleOrders"
            :key="o.id"
            class="mo-card mo-card--clickable"
            @click="openDetail(o)"
          >
            <div class="mo-card__top">
              <span class="mo-card__no">{{ o.orderNo }}</span>
              <span class="mo-tag" :class="statusTagClass(o.status)">{{ orderStatusLabel(o.status) }}</span>
            </div>
            <div class="mo-card__line">
              <span v-if="o.source === 'manual'" class="mo-tag mo-tag--inline mo-tag--warning">人工提报</span>
              <span>{{ o.source === 'manual' ? '—' : o.planName }}</span>
            </div>
            <div class="mo-card__meta">{{ o.scopeLabel }} · {{ o.scheduledTime }}</div>
            <div class="mo-card__meta">{{ o.inspectionTeam }}{{ o.assignee ? ' · ' + o.assignee : '' }}</div>
          </div>

          <div v-if="filteredOrders.length === 0" class="mo-empty">没有符合条件的工单</div>
          <div v-else-if="!hasMore" class="mo-end">已加载全部 {{ filteredOrders.length }} 条</div>
        </div>
      </div>

      <!-- ==================== 屏 2：巡检处置 · 设备清单 ==================== -->
      <div v-else-if="screen === 'devices'" class="mo-view">
        <div class="mo-nav">
          <button class="mo-nav__back" @click="backToDetail">‹ 返回</button>
          <span class="mo-tag" :class="statusTagClass(currentOrder?.status || '')">
            {{ orderStatusLabel(currentOrder?.status || '') }}
          </span>
        </div>
        <div class="mo-head mo-head--compact">
          <div class="mo-head__title mo-head__title--mono">{{ currentOrder?.orderNo }}</div>
          <div class="mo-head__sub">{{ currentOrder?.planName }} · {{ currentOrder?.inspectionTeam }}</div>
          <div class="mo-progress">
            <span class="mo-progress__text">已完成 {{ doneDeviceCount }}/{{ handleDevices.length }} 台</span>
            <span class="mo-progress__bar"><i :style="{ width: progressPercent + '%' }"></i></span>
          </div>
        </div>

        <div class="mo-scroll">
          <div v-for="(dev, idx) in handleDevices" :key="dev.key" class="mo-dev" @click="openDevice(idx)">
            <span class="mo-dev__icon">
              <el-icon v-if="isDeviceAllNormal(idx)" :size="18" color="#67c23a"><CircleCheckFilled /></el-icon>
              <el-icon v-else-if="isDeviceDone(idx)" :size="18" color="#f56c6c"><WarningFilled /></el-icon>
              <el-icon v-else :size="18" color="#c0c4cc"><CircleCheck /></el-icon>
            </span>
            <div class="mo-dev__info">
              <div class="mo-dev__name">{{ dev.name }}</div>
              <div class="mo-dev__meta">{{ dev.type }} · {{ dev.location }}</div>
            </div>
            <span v-if="getAbnormalCount(dev) > 0" class="mo-tag mo-tag--danger">异常{{ getAbnormalCount(dev) }}项</span>
            <span v-else-if="isDeviceDone(idx)" class="mo-tag mo-tag--success">已检</span>
            <span v-else class="mo-tag mo-tag--info">未检</span>
          </div>
        </div>

        <div class="mo-footerbar">
          <button class="mo-btn mo-btn--plain mo-btn--block" @click="saveDraft">暂存</button>
          <button class="mo-btn mo-btn--primary mo-btn--block" @click="confirmHandle">提交处置</button>
        </div>
      </div>

      <!-- ==================== 屏 3：巡检项评定 ==================== -->
      <div v-else-if="screen === 'items'" class="mo-view">
        <div class="mo-nav">
          <button class="mo-nav__back" @click="screen = 'devices'">‹ 设备清单</button>
          <button class="mo-btn mo-btn--sm mo-btn--ghost" @click="setAllNormal">全部正常</button>
        </div>
        <div class="mo-head mo-head--compact">
          <div class="mo-head__title">{{ currentDevice?.name }}</div>
          <div class="mo-head__sub">
            {{ currentDevice?.type }} · {{ currentDevice?.location }} · {{ currentDevice?.items.length }} 个巡检项
          </div>
        </div>

        <div class="mo-scroll">
          <div
            v-for="(item, i) in currentDevice?.items || []"
            :key="i"
            class="mo-item"
            :class="{ 'mo-item--abnormal': item.result === 'abnormal' }"
          >
            <div class="mo-item__top">
              <span class="mo-item__name">{{ item.name }}</span>
              <span v-if="item.result === 'abnormal'" class="mo-tag mo-tag--danger">异常</span>
            </div>
            <div class="mo-item__std">标准：{{ item.standard }}</div>
            <div class="mo-seg">
              <button
                class="mo-seg__btn"
                :class="{ 'is-normal': item.result === 'normal' }"
                @click="markNormal(item)"
              >
                正常
              </button>
              <button
                class="mo-seg__btn"
                :class="{ 'is-abnormal': item.result === 'abnormal' }"
                @click="item.result = 'abnormal'"
              >
                异常
              </button>
            </div>
            <div v-if="item.result === 'abnormal'" class="mo-item__fix">
              <div class="mo-seg">
                <button
                  class="mo-seg__btn"
                  :class="{ 'is-abnormal': item.fixType === 'onsite' }"
                  @click="item.fixType = 'onsite'"
                >
                  现场处理
                </button>
                <button
                  class="mo-seg__btn"
                  :class="{ 'is-abnormal': item.fixType === 'repair' }"
                  @click="item.fixType = 'repair'"
                >
                  需维修
                </button>
              </div>
              <el-input
                v-model="item.fixDesc"
                type="textarea"
                :rows="2"
                size="small"
                placeholder="请描述处理方式或异常情况"
              />
            </div>
          </div>
        </div>

        <div class="mo-footerbar">
          <button class="mo-btn mo-btn--primary mo-btn--block" @click="finishDevice">完成</button>
        </div>
      </div>

      <!-- ==================== 屏 4：工单详情（只读） ==================== -->
      <div v-else class="mo-view">
        <div class="mo-nav">
          <button class="mo-nav__back" @click="screen = 'list'">‹ 返回</button>
          <span class="mo-tag" :class="statusTagClass(detailOrder?.status || '')">
            {{ orderStatusLabel(detailOrder?.status || '') }}
          </span>
        </div>
        <div class="mo-head mo-head--compact">
          <div class="mo-head__title mo-head__title--mono">{{ detailOrder?.orderNo }}</div>
          <div class="mo-head__sub">{{ detailOrder?.scopeLabel }} · {{ detailOrder?.scheduledTime }}</div>
        </div>

        <div class="mo-scroll" v-if="detailOrder">
          <div class="mo-info">
            <div class="mo-info__row">
              <span>巡检计划</span>
              <b>{{ detailOrder.source === 'manual' ? '—' : detailOrder.planName }}</b>
            </div>
            <div class="mo-info__row"><span>巡检班组</span><b>{{ detailOrder.inspectionTeam || '—' }}</b></div>
            <div class="mo-info__row"><span>执行人</span><b>{{ detailOrder.assignee || '—' }}</b></div>
            <div class="mo-info__row"><span>工单时间</span><b>{{ detailOrder.scheduledTime }}</b></div>
            <div class="mo-info__row"><span>发布人</span><b>{{ detailOrder.publisher || '—' }}</b></div>
            <div class="mo-info__row"><span>发布部门</span><b>{{ detailOrder.dept || '—' }}</b></div>
            <div class="mo-info__row">
              <span>处置时间</span><b>{{ detailOrder.handleTime || '—' }}</b>
            </div>
          </div>

          <div class="mo-stats">
            <div class="mo-stats__cell">
              <span class="mo-stats__label">设备</span>
              <span class="mo-stats__value">{{ detailDevices.length }} 台</span>
            </div>
            <div class="mo-stats__cell">
              <span class="mo-stats__label">正常</span>
              <span class="mo-stats__value mo-stats__value--ok">{{ detailNormalCount }} 项</span>
            </div>
            <div class="mo-stats__cell">
              <span class="mo-stats__label">异常</span>
              <span class="mo-stats__value mo-stats__value--bad">{{ detailAbnormalCount }} 项</span>
            </div>
          </div>

          <div v-for="(dev, idx) in detailDevices" :key="dev.key" class="mo-card mo-card--dev">
            <div class="mo-card__top" @click="toggleDetailDevice(idx)">
              <div class="mo-dev__info">
                <div class="mo-dev__name">{{ dev.name }}</div>
                <div class="mo-dev__meta">{{ dev.type }} · {{ dev.location }}</div>
              </div>
              <span v-if="getAbnormalCount(dev) > 0" class="mo-tag mo-tag--danger">异常{{ getAbnormalCount(dev) }}项</span>
              <span v-else-if="isDetailDeviceDone(dev)" class="mo-tag mo-tag--success">全部正常</span>
              <span v-else class="mo-tag mo-tag--info">未检</span>
            </div>
            <div v-if="detailExpanded.includes(idx)" class="mo-card__body">
              <div v-for="(item, i) in dev.items" :key="i" class="mo-kv">
                <div class="mo-kv__row">
                  <span class="mo-kv__name">{{ item.name }}</span>
                  <span class="mo-tag mo-tag--sm" :class="resultTagClass(item.result)">
                    {{ resultLabel(item.result) }}
                  </span>
                </div>
                <div class="mo-kv__std">{{ item.standard }}</div>
                <div v-if="item.result === 'abnormal'" class="mo-kv__fix">
                  {{ item.fixType === 'onsite' ? '现场处理' : '需维修' }}
                  <template v-if="item.fixDesc">· {{ item.fixDesc }}</template>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="canOperate" class="mo-footerbar">
          <template v-if="detailStatus === 'pending'">
            <button class="mo-btn mo-btn--primary mo-btn--block" @click="onReceive">接收</button>
          </template>
          <template v-else-if="detailStatus === 'draft'">
            <button class="mo-btn mo-btn--warn mo-btn--block" @click="onHandle">开始巡检</button>
            <button class="mo-btn mo-btn--plain mo-btn--block" @click="onReturn">退回</button>
          </template>
          <template v-else-if="detailStatus === 'handling'">
            <button class="mo-btn mo-btn--warn mo-btn--block" @click="onHandle">继续巡检</button>
          </template>
        </div>
      </div>

      <div class="mo-homebar"><i></i></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { CircleCheck, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

interface HandleItem {
  name: string
  standard: string
  result: string
  fixType: string
  fixDesc: string
}
interface HandleDevice {
  key: string
  name: string
  type: string
  location: string
  items: HandleItem[]
}
interface InspectionOrder {
  id: number
  orderNo: string
  planName: string
  source: string
  inspectionTeam: string
  scopeLabel: string
  scheduledTime: string
  status: string
  assignee: string
  handleTime: string
  handleData: HandleDevice[]
  publisher?: string
  dept?: string
}

type ScreenName = 'list' | 'devices' | 'items' | 'detail'

const PAGE_SIZE = 5

/** 移动端登录人固定为当前巡检班组成员 */
const currentUser = { name: '张伟', team: '巡检一组', dept: '运维部' }

const standardMap: Record<string, string> = {
  配电柜温度检测: '用红外测温仪检测各开关触点、母排连接处温度≤70℃',
  电压电流测量: '用万用表测量三相电压平衡度、各回路电流在额定范围内',
  接地电阻检测: '用接地电阻测试仪测量接地电阻≤4Ω',
  运行电流检测: '用钳形表测量压缩机运行电流应在额定值±10%以内',
  冷凝器外观检查: '目视检查冷凝器翅片清洁无损坏变形',
  制冷效果测试: '出风口与进风口温差应在8-12℃',
  过滤网清洗: '检查过滤网积灰情况并清洗或更换',
  冷媒压力检查: '接压力表检测高低压侧压力应与标准值一致',
  灭火器压力检查: '目视检查灭火器压力表指针在绿色区域、瓶体无锈蚀',
  烟感报警测试: '用烟感测试器触发探测器验证火警信号正常上报',
  消火栓出水测试: '连接水带开启阀门确认水压满足要求且无渗漏',
  灯具点亮测试: '逐路开启照明回路确认所有灯具正常点亮无闪烁',
  照度检测: '用照度计在工作面测量照度不低于标准值300lux',
  应急灯功能测试: '断开主电源确认应急灯自动点亮持续60分钟以上',
  轿厢运行平稳性: '乘坐感受轿厢启停是否平稳、有无异常抖动和异响',
  层门开关测试: '逐层测试厅门开关门动作顺畅、防夹保护是否生效',
  紧急呼叫测试: '按下紧急呼叫按钮确认与值班室通话清晰',
  门禁读卡测试: '用有效卡和无效卡分别刷卡验证控制器开/拒动作正常',
  电锁状态检查: '检查电控锁通电吸合和断电释放动作灵敏可靠',
}

function getStandard(name: string): string {
  return standardMap[name] || '按设备巡检标准执行'
}

function orderStatusLabel(s: string): string {
  const m: Record<string, string> = { pending: '待接收', draft: '待处置', handling: '处置中', completed: '已处置' }
  return m[s] || s
}

function statusTagClass(s: string): string {
  const m: Record<string, string> = {
    pending: 'mo-tag--info',
    draft: 'mo-tag--warning',
    handling: 'mo-tag--warning',
    completed: 'mo-tag--success',
  }
  return m[s] || 'mo-tag--info'
}

function resultLabel(r: string): string {
  return r === 'normal' ? '正常' : r === 'abnormal' ? '异常' : '未检'
}

function resultTagClass(r: string): string {
  return r === 'normal' ? 'mo-tag--success' : r === 'abnormal' ? 'mo-tag--danger' : 'mo-tag--info'
}

/** 巡检设备模板（与 PC 端巡检处置模板一致） */
const DEVICE_TEMPLATE: HandleDevice[] = [
  {
    key: 'd1',
    name: '1F 配电柜 A',
    type: '配电',
    location: '1F 配电房',
    items: ['配电柜温度检测', '电压电流测量', '接地电阻检测'].map(n => ({
      name: n,
      standard: getStandard(n),
      result: '',
      fixType: '',
      fixDesc: '',
    })),
  },
  {
    key: 'd2',
    name: '1F 空调主机',
    type: '空调',
    location: '1F 空调机房',
    items: ['运行电流检测', '冷凝器外观检查', '制冷效果测试', '过滤网清洗'].map(n => ({
      name: n,
      standard: getStandard(n),
      result: '',
      fixType: '',
      fixDesc: '',
    })),
  },
  {
    key: 'd3',
    name: '1F 消防泵',
    type: '消防',
    location: '1F 泵房',
    items: ['灭火器压力检查', '烟感报警测试', '消火栓出水测试'].map(n => ({
      name: n,
      standard: getStandard(n),
      result: '',
      fixType: '',
      fixDesc: '',
    })),
  },
  {
    key: 'd4',
    name: '1F 货梯',
    type: '电梯',
    location: '1F 大厅北侧',
    items: ['轿厢运行平稳性', '层门开关测试', '紧急呼叫测试'].map(n => ({
      name: n,
      standard: getStandard(n),
      result: '',
      fixType: '',
      fixDesc: '',
    })),
  },
  {
    key: 'd5',
    name: '1F 照明回路 A',
    type: '照明',
    location: '1F 走廊',
    items: ['灯具点亮测试', '应急灯功能测试'].map(n => ({
      name: n,
      standard: getStandard(n),
      result: '',
      fixType: '',
      fixDesc: '',
    })),
  },
  {
    key: 'd6',
    name: '1F 门禁控制器 A',
    type: '门禁',
    location: '1F 主入口',
    items: ['门禁读卡测试', '电锁状态检查'].map(n => ({
      name: n,
      standard: getStandard(n),
      result: '',
      fixType: '',
      fixDesc: '',
    })),
  },
]

function cloneDevices(list: HandleDevice[]): HandleDevice[] {
  return list.map(d => ({ ...d, items: d.items.map(i => ({ ...i })) }))
}

/** 按巡检范围（N 台设备）生成待检设备清单 */
function buildDevices(scopeLabel: string): HandleDevice[] {
  const n = parseInt(scopeLabel, 10)
  const size = Number.isNaN(n) ? DEVICE_TEMPLATE.length : Math.min(n, DEVICE_TEMPLATE.length)
  return cloneDevices(DEVICE_TEMPLATE.slice(0, size)).map(d => ({
    ...d,
    items: d.items.map(i => ({ ...i, result: '', fixType: '', fixDesc: '' })),
  }))
}

/** 已处置工单的巡检结果样例（含一项现场处理异常） */
function completedResult(scopeLabel: string): HandleDevice[] {
  const list = buildDevices(scopeLabel)
  list.forEach(d => d.items.forEach(i => { i.result = 'normal' }))
  const dev = list.find(d => d.name === '1F 空调主机')
  const item = dev?.items.find(i => i.name === '运行电流检测')
  if (item) {
    item.result = 'abnormal'
    item.fixType = 'onsite'
    item.fixDesc = '调整冷媒压力至标准值'
  }
  return list
}

/** Mock：当前班组（巡检一组）的工单，时间倒序 */
const orders = ref<InspectionOrder[]>([
  {
    id: 1022, orderNo: 'XJ2026070022', planName: 'CT楼配电设备日检', source: 'plan', inspectionTeam: '巡检一组',
    scopeLabel: '4台设备', scheduledTime: '2026-07-08 09:00', status: 'pending', assignee: '', handleTime: '',
    handleData: [], publisher: '张伟', dept: '运维部',
  },
  {
    id: 1021, orderNo: 'XJ2026070021', planName: 'FF楼全设备周检', source: 'plan', inspectionTeam: '巡检一组',
    scopeLabel: '4台设备', scheduledTime: '2026-07-07 12:00', status: 'pending', assignee: '', handleTime: '',
    handleData: [], publisher: '张伟', dept: '运维部',
  },
  {
    id: 1020, orderNo: 'XJ2026070020', planName: 'CT楼1F设备月检', source: 'plan', inspectionTeam: '巡检一组',
    scopeLabel: '6台设备', scheduledTime: '2026-07-06 06:00', status: 'handling', assignee: '张伟', handleTime: '',
    handleData: [], publisher: '张伟', dept: '运维部',
  },
  {
    id: 1019, orderNo: 'XJ2026070019', planName: '全区域消防设备周检', source: 'plan', inspectionTeam: '巡检一组',
    scopeLabel: '3台设备', scheduledTime: '2026-07-05 15:00', status: 'draft', assignee: '张伟', handleTime: '',
    handleData: [], publisher: '张伟', dept: '运维部',
  },
  {
    id: 1018, orderNo: 'XJ2026070018', planName: 'CT楼配电设备日检', source: 'plan', inspectionTeam: '巡检一组',
    scopeLabel: '4台设备', scheduledTime: '2026-07-04 09:00', status: 'completed', assignee: '张伟',
    handleTime: '2026-07-04 10:30', handleData: completedResult('4台设备'), publisher: '张伟', dept: '运维部',
  },
  {
    id: 1017, orderNo: 'XJ2026070017', planName: 'FF楼全设备周检', source: 'plan', inspectionTeam: '巡检一组',
    scopeLabel: '4台设备', scheduledTime: '2026-07-03 21:00', status: 'completed', assignee: '张伟',
    handleTime: '2026-07-03 22:10', handleData: completedResult('4台设备'), publisher: '张伟', dept: '运维部',
  },
  {
    id: 1002, orderNo: 'XJ2026070002', planName: '人工提报', source: 'manual', inspectionTeam: '巡检一组',
    scopeLabel: '2台设备', scheduledTime: '2026-07-02 14:00', status: 'completed', assignee: '张伟',
    handleTime: '2026-07-02 15:20', handleData: completedResult('2台设备'), publisher: '李强', dept: '运维部',
  },
  {
    id: 1001, orderNo: 'XJ2026070001', planName: '人工提报', source: 'manual', inspectionTeam: '巡检一组',
    scopeLabel: '2台设备', scheduledTime: '2026-07-01 14:00', status: 'pending', assignee: '', handleTime: '',
    handleData: [], publisher: '李强', dept: '运维部',
  },
])

const screen = ref<ScreenName>('list')

/* -------------------- 列表查询 -------------------- */
const query = reactive({ orderNo: '' })
const statusFilter = ref('')
const visibleCount = ref(PAGE_SIZE)

/** 工单号命中的工单（用于计算各状态数量） */
const baseOrders = computed(() => {
  if (!query.orderNo) return orders.value.slice()
  return orders.value.filter(o => o.orderNo.includes(query.orderNo))
})

const statusChips = computed(() => {
  const base = baseOrders.value
  return [
    { value: '', label: '全部', count: base.length },
    { value: 'pending', label: '待接收', count: base.filter(o => o.status === 'pending').length },
    { value: 'draft', label: '待处置', count: base.filter(o => o.status === 'draft').length },
    { value: 'handling', label: '处置中', count: base.filter(o => o.status === 'handling').length },
    { value: 'completed', label: '已处置', count: base.filter(o => o.status === 'completed').length },
  ]
})

/** 列表排序：工单时间倒序 */
const filteredOrders = computed(() => {
  const list = statusFilter.value
    ? baseOrders.value.filter(o => o.status === statusFilter.value)
    : baseOrders.value.slice()
  return list.sort((a, b) => (a.scheduledTime < b.scheduledTime ? 1 : a.scheduledTime > b.scheduledTime ? -1 : 0))
})

const visibleOrders = computed(() => filteredOrders.value.slice(0, visibleCount.value))
const hasMore = computed(() => filteredOrders.value.length > visibleCount.value)

/* 上滑自动加载：与开发实现一致，不提供「加载更多」按钮 */
const listScrollRef = ref<HTMLElement | null>(null)

function tryLoadMore() {
  const el = listScrollRef.value
  if (!el || !hasMore.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) {
    visibleCount.value += PAGE_SIZE
  }
}

/** 内容不足以产生滚动条时自动补足，避免出现「看不到更多也没法上滑」的死角 */
async function fillViewport() {
  await nextTick()
  const el = listScrollRef.value
  if (!el) return
  while (hasMore.value && el.scrollHeight <= el.clientHeight + 1) {
    visibleCount.value += PAGE_SIZE
    await nextTick()
  }
}

watch([() => query.orderNo, statusFilter], () => {
  visibleCount.value = PAGE_SIZE
  fillViewport()
})

onMounted(() => { fillViewport() })

/* -------------------- 接收 / 退回 -------------------- */
function receiveOrder(row: InspectionOrder) {
  ElMessageBox.confirm(`确认接收工单「${row.orderNo}」？接收后由您负责执行巡检。`, '接收确认', {
    confirmButtonText: '确认接收',
    cancelButtonText: '取消',
    type: 'info',
  })
    .then(() => {
      row.status = 'draft'
      row.assignee = currentUser.name
      ElMessage.success('工单已接收')
    })
    .catch(() => {})
}

function returnOrder(row: InspectionOrder) {
  ElMessageBox.confirm(`确认退回工单「${row.orderNo}」？退回后将由班组内其他人重新接收。`, '退回确认', {
    confirmButtonText: '确认退回',
    cancelButtonText: '取消',
    type: 'warning',
  })
    .then(() => {
      row.status = 'pending'
      row.assignee = ''
      ElMessage.success('工单已退回')
    })
    .catch(() => {})
}

/* -------------------- 处置 -------------------- */
const currentOrder = ref<InspectionOrder | null>(null)
const handleDevices = ref<HandleDevice[]>([])
const currentDeviceIdx = ref(0)
const currentDevice = computed(() => handleDevices.value[currentDeviceIdx.value] || null)
const savedSignature = ref('')

function signature(list: HandleDevice[]): string {
  return list.map(d => d.items.map(i => `${i.result}|${i.fixType}|${i.fixDesc}`).join(',')).join(';')
}

const dirty = computed(() => handleDevices.value.length > 0 && signature(handleDevices.value) !== savedSignature.value)

function openHandle(row: InspectionOrder) {
  currentOrder.value = row
  currentDeviceIdx.value = 0
  const resumed = row.status === 'handling' && row.handleData.length > 0
  handleDevices.value = resumed ? cloneDevices(row.handleData) : buildDevices(row.scopeLabel)
  savedSignature.value = signature(handleDevices.value)
  screen.value = 'devices'
}

function openDevice(idx: number) {
  currentDeviceIdx.value = idx
  screen.value = 'items'
}

/** 完成当前设备的巡检项评定，返回设备清单（作用等同于返回） */
function finishDevice() {
  screen.value = 'devices'
}

function markNormal(item: HandleItem) {
  item.result = 'normal'
  item.fixType = ''
  item.fixDesc = ''
}

function isDeviceDone(idx: number): boolean {
  return !!handleDevices.value[idx]?.items.every(i => i.result !== '')
}

function isDeviceAllNormal(idx: number): boolean {
  return !!handleDevices.value[idx]?.items.every(i => i.result === 'normal')
}

function getAbnormalCount(dev: HandleDevice): number {
  return dev.items.filter(i => i.result === 'abnormal').length
}

const doneDeviceCount = computed(() => handleDevices.value.filter((_, idx) => isDeviceDone(idx)).length)
const progressPercent = computed(() =>
  handleDevices.value.length === 0 ? 0 : Math.round((doneDeviceCount.value / handleDevices.value.length) * 100)
)

function setAllNormal() {
  if (!currentDevice.value) return
  currentDevice.value.items.forEach(i => {
    i.result = 'normal'
    i.fixType = ''
    i.fixDesc = ''
  })
}

function saveDraft() {
  if (!currentOrder.value) return
  currentOrder.value.status = 'handling'
  currentOrder.value.handleData = cloneDevices(handleDevices.value)
  savedSignature.value = signature(handleDevices.value)
  ElMessage.success('处置进度已暂存')
}

function isAllDone(): boolean {
  return handleDevices.value.every(d => d.items.every(i => i.result !== ''))
}

function isAbnormalValid(): boolean {
  return handleDevices.value.every(d => d.items.every(i => (i.result !== 'abnormal' ? true : !!i.fixType)))
}

function confirmHandle() {
  if (!currentOrder.value) return
  if (!isAllDone()) {
    ElMessageBox.alert('请完成所有设备的巡检项后再提交', '提示', { type: 'warning' })
    return
  }
  if (!isAbnormalValid()) {
    ElMessageBox.alert('请为所有异常巡检项选择处理方式（现场处理/需维修）', '提示', { type: 'warning' })
    return
  }
  const now = new Date()
  const pad = (v: number) => String(v).padStart(2, '0')
  currentOrder.value.status = 'completed'
  currentOrder.value.handleTime =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
    `${pad(now.getHours())}:${pad(now.getMinutes())}:00`
  currentOrder.value.handleData = cloneDevices(handleDevices.value)
  savedSignature.value = signature(handleDevices.value)
  screen.value = 'list'
  ElMessage.success('巡检处置已提交')
}

/** 退出处置：存在未暂存的评定结果时给出提示，返回工单详情 */
function backToDetail() {
  if (dirty.value) {
    ElMessageBox.confirm('返回后未暂存的评定结果将不保留，确认返回？', '退出处置', {
      confirmButtonText: '确认返回',
      cancelButtonText: '继续处置',
      type: 'warning',
    })
      .then(() => { screen.value = 'detail' })
      .catch(() => {})
    return
  }
  screen.value = 'detail'
}

/* -------------------- 详情 -------------------- */
const detailOrder = ref<InspectionOrder | null>(null)
const detailExpanded = ref<number[]>([])

const detailStatus = computed(() => detailOrder.value?.status || '')
/** 未完结工单在详情底部给出操作入口；已处置工单只读，靠左上角返回 */
const canOperate = computed(() => ['pending', 'draft', 'handling'].includes(detailStatus.value))

function openDetail(row: InspectionOrder) {
  detailOrder.value = row
  detailExpanded.value = []
  screen.value = 'detail'
}

/* 详情底部操作：作用于当前详情工单 */
function onReceive() {
  if (detailOrder.value) receiveOrder(detailOrder.value)
}

function onReturn() {
  if (detailOrder.value) returnOrder(detailOrder.value)
}

function onHandle() {
  if (detailOrder.value) openHandle(detailOrder.value)
}

const detailDevices = computed<HandleDevice[]>(() => {
  const order = detailOrder.value
  if (!order) return []
  return order.handleData.length > 0 ? order.handleData : buildDevices(order.scopeLabel)
})

const detailNormalCount = computed(() =>
  detailDevices.value.reduce((sum, d) => sum + d.items.filter(i => i.result === 'normal').length, 0)
)
const detailAbnormalCount = computed(() =>
  detailDevices.value.reduce((sum, d) => sum + d.items.filter(i => i.result === 'abnormal').length, 0)
)

function isDetailDeviceDone(dev: HandleDevice): boolean {
  return dev.items.length > 0 && dev.items.every(i => i.result === 'normal')
}

function toggleDetailDevice(idx: number) {
  const at = detailExpanded.value.indexOf(idx)
  if (at >= 0) detailExpanded.value.splice(at, 1)
  else detailExpanded.value.push(idx)
}
</script>

<style scoped>
.mo-page {
  min-height: 100%;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 24px 16px 32px;
}

.mo-phone {
  width: 390px;
  height: min(844px, calc(100vh - 96px));
  min-height: 600px;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 36px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
  overflow: hidden;
}

/* 状态栏 */
.mo-statusbar {
  flex-shrink: 0;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 22px;
  background: #fff;
}
.mo-statusbar__time {
  font-size: 12px;
  font-weight: 600;
  color: #303133;
}
.mo-statusbar__icons {
  display: flex;
  align-items: center;
  gap: 4px;
}
.mo-sig,
.mo-wifi {
  width: 12px;
  height: 8px;
  border: 1px solid #909399;
  border-radius: 2px;
  display: block;
}
.mo-wifi {
  width: 9px;
}
.mo-batt {
  width: 18px;
  height: 9px;
  border: 1px solid #909399;
  border-radius: 2px;
  display: block;
  position: relative;
}
.mo-batt::after {
  content: '';
  position: absolute;
  left: 1.5px;
  top: 1.5px;
  bottom: 1.5px;
  width: 10px;
  background: #909399;
  border-radius: 1px;
}

/* 屏容器 */
.mo-view {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  background: #f5f7fa;
}

/* 头部 */
.mo-head {
  flex-shrink: 0;
  background: #fff;
  padding: 12px 16px 10px;
  border-bottom: 1px solid #ebeef5;
}
.mo-head--compact {
  padding: 10px 16px;
}
.mo-head__title {
  font-size: 17px;
  font-weight: 600;
  color: #303133;
  line-height: 1.3;
}
.mo-head__title--mono {
  font-size: 15px;
  letter-spacing: 0.2px;
}
.mo-head__sub {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 搜索 */
.mo-search {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
}
.mo-search :deep(.el-input) {
  flex: 1;
}
.mo-search :deep(.el-input__wrapper) {
  border-radius: 16px;
}

/* 状态 chips */
.mo-chips {
  display: flex;
  gap: 8px;
  margin-top: 10px;
  padding-bottom: 2px;
  overflow-x: auto;
  scrollbar-width: none;
}
.mo-chips::-webkit-scrollbar {
  display: none;
}
.mo-chip {
  flex: 0 0 auto;
  height: 28px;
  padding: 0 12px;
  border: none;
  border-radius: 14px;
  background: #f4f4f5;
  color: #606266;
  font-size: 12px;
  cursor: pointer;
}
.mo-chip--active {
  background: #409eff;
  color: #fff;
}

/* 内容滚动区 */
.mo-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 12px 16px 16px;
}

/* 工单卡片 */
.mo-card {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.mo-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mo-card__no {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  letter-spacing: 0.2px;
}
.mo-card__line {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #303133;
  margin-top: 8px;
}
.mo-card__meta {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.mo-card--clickable {
  cursor: pointer;
}
.mo-card--dev {
  padding: 12px 12px 12px;
}
.mo-card--dev .mo-card__top {
  cursor: pointer;
}
.mo-card__body {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f2f3f5;
}

/* 标签 */
.mo-tag {
  flex-shrink: 0;
  display: inline-block;
  font-size: 12px;
  line-height: 18px;
  padding: 0 8px;
  border-radius: 4px;
  background: #f4f4f5;
  color: #909399;
}
.mo-tag--sm {
  font-size: 11px;
  line-height: 16px;
  padding: 0 6px;
}
.mo-tag--inline {
  padding: 0 6px;
}
.mo-tag--info {
  background: #f4f4f5;
  color: #909399;
}
.mo-tag--warning {
  background: #fdf6ec;
  color: #e6a23c;
}
.mo-tag--success {
  background: #f0f9eb;
  color: #67c23a;
}
.mo-tag--danger {
  background: #fef0f0;
  color: #f56c6c;
}

/* 按钮 */
.mo-btn {
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  border: 1px solid #dcdfe6;
  border-radius: 6px;
  background: #fff;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}
.mo-btn--sm {
  height: 30px;
  font-size: 12px;
  padding: 0 12px;
}
.mo-btn--block {
  flex: 1;
  height: 40px;
  border-radius: 8px;
  font-size: 14px;
}
.mo-btn--primary {
  background: #409eff;
  border-color: #409eff;
  color: #fff;
}
.mo-btn--warn {
  background: #e6a23c;
  border-color: #e6a23c;
  color: #fff;
}
.mo-btn--ghost {
  background: #fff;
  border-color: #a0cfff;
  color: #409eff;
}
.mo-btn--plain {
  background: #fff;
  border-color: #dcdfe6;
  color: #606266;
}
.mo-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.mo-empty {
  text-align: center;
  font-size: 13px;
  color: #909399;
  padding: 40px 0;
}
.mo-end {
  text-align: center;
  font-size: 12px;
  color: #c0c4cc;
  padding: 10px 0 4px;
}

/* 处置导航与进度 */
.mo-nav {
  flex-shrink: 0;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  background: #fff;
}
.mo-nav__back {
  border: none;
  background: none;
  padding: 0;
  font-size: 13px;
  color: #409eff;
  cursor: pointer;
}
.mo-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}
.mo-progress__text {
  flex-shrink: 0;
  font-size: 12px;
  color: #606266;
}
.mo-progress__bar {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #f0f2f5;
  overflow: hidden;
}
.mo-progress__bar i {
  display: block;
  height: 6px;
  background: #409eff;
  transition: width 0.2s;
}

/* 设备条目 */
.mo-dev {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 12px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  margin-bottom: 10px;
  cursor: pointer;
}
.mo-dev__icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}
.mo-dev__info {
  flex: 1;
  min-width: 0;
}
.mo-dev__name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}
.mo-dev__meta {
  font-size: 12px;
  color: #909399;
  margin-top: 3px;
}

/* 巡检项 */
.mo-item {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
}
.mo-item--abnormal {
  background: #fef0f0;
  border-color: #fbc4c4;
}
.mo-item__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mo-item__name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}
.mo-item__std {
  font-size: 12px;
  color: #909399;
  line-height: 1.6;
  margin-top: 6px;
}
.mo-seg {
  display: flex;
  gap: 8px;
  margin-top: 10px;
}
.mo-seg__btn {
  flex: 1;
  height: 36px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  background: #fff;
  color: #606266;
  font-size: 13px;
  cursor: pointer;
}
.mo-seg__btn.is-normal {
  background: #67c23a;
  border-color: #67c23a;
  color: #fff;
}
.mo-seg__btn.is-abnormal {
  background: #f56c6c;
  border-color: #f56c6c;
  color: #fff;
}
.mo-item__fix {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #fbc4c4;
}
.mo-item__fix :deep(.el-textarea) {
  margin-top: 8px;
}
.mo-item__fix :deep(.el-textarea__inner) {
  border-radius: 8px;
}

/* 底部操作条 */
.mo-footerbar {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 16px;
  background: #fff;
  border-top: 1px solid #ebeef5;
}

/* 详情信息 */
.mo-info {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 6px 12px;
}
.mo-info__row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  font-size: 13px;
  border-bottom: 1px solid #f7f8fa;
}
.mo-info__row:last-child {
  border-bottom: none;
}
.mo-info__row span {
  flex-shrink: 0;
  color: #909399;
}
.mo-info__row b {
  font-weight: 500;
  color: #303133;
  text-align: right;
}

.mo-stats {
  display: flex;
  gap: 10px;
  margin: 12px 0;
}
.mo-stats__cell {
  flex: 1;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  padding: 10px 0;
  text-align: center;
}
.mo-stats__label {
  display: block;
  font-size: 12px;
  color: #909399;
}
.mo-stats__value {
  display: block;
  margin-top: 4px;
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.mo-stats__value--ok {
  color: #67c23a;
}
.mo-stats__value--bad {
  color: #f56c6c;
}

.mo-kv {
  padding: 8px 0;
  border-bottom: 1px solid #f7f8fa;
}
.mo-kv:last-child {
  border-bottom: none;
}
.mo-kv__row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mo-kv__name {
  font-size: 13px;
  color: #303133;
}
.mo-kv__std {
  font-size: 11px;
  color: #909399;
  line-height: 1.5;
  margin-top: 4px;
}
.mo-kv__fix {
  font-size: 12px;
  color: #606266;
  margin-top: 4px;
}

/* Home 指示条 */
.mo-homebar {
  flex-shrink: 0;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
}
.mo-homebar i {
  width: 120px;
  height: 4px;
  border-radius: 2px;
  background: #d4d7de;
  display: block;
}

@media (max-width: 430px) {
  .mo-page {
    padding: 12px 8px 20px;
  }
  .mo-phone {
    width: 100%;
    border-radius: 24px;
  }
}
</style>
