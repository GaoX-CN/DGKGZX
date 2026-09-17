<template>
  <div class="telephone-page">
    <!-- 左侧：通讯录列表（60%） -->
    <aside class="panel contacts-panel">
      <div class="panel-title"><h2>通讯录</h2><el-icon><Iphone /></el-icon></div>
      <div class="contacts-toolbar">
        <el-input v-model="keyword" clearable size="small" placeholder="搜索话机名称或分机号" :prefix-icon="Search" />
        <el-radio-group v-model="contactFilter" size="small">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="normal">正常</el-radio-button>
          <el-radio-button value="dnd">免打扰</el-radio-button>
          <el-radio-button value="offline">离线</el-radio-button>
        </el-radio-group>
      </div>
      <div class="contacts-table-wrap">
        <el-table :data="filteredContacts" height="100%" row-key="ext">
          <el-table-column label="话机名称" min-width="190">
            <template #default="{ row }">
              <div class="name-wrap">
                <el-icon v-if="row.pinned" class="pin-icon"><StarFilled /></el-icon>
                <span class="status-dot" :class="row.status" />
                <span class="name-cell">{{ row.name }}</span>
                <el-tag v-if="slotRole(row)" size="small" :type="slotRole(row) === 'caller' ? 'primary' : 'warning'" effect="light" class="role-tag">{{ slotRole(row) === 'caller' ? '主叫' : '被叫' }}</el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="ext" label="分机号" width="80" />
          <el-table-column label="话机状态" width="92">
            <template #default="{ row }"><el-tag size="small" :type="statusTagType(row.status)" effect="light">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="置顶" width="80" align="center">
            <template #default="{ row }">
              <el-button text size="small" @click="togglePin(row)">{{ row.pinned ? '取消置顶' : '置顶' }}</el-button>
            </template>
          </el-table-column>
          <el-table-column label="调度选择" width="150" align="center">
            <template #default="{ row }">
              <el-button text size="small" :disabled="dispatchDisabled(row)" @click="pickContact(row, 'caller')">设为主叫</el-button>
              <el-button text size="small" :disabled="dispatchDisabled(row)" @click="pickContact(row, 'callee')">设为被叫</el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>
      <div class="contacts-footer"><span>正常：话机可正常使用　免打扰：话机已开启免打扰，可调度但不接听　离线：话机当前未注册，不可调度</span></div>
    </aside>

    <!-- 右侧：调度台 + 调度记录 -->
    <div class="right-col">
      <!-- 调度台 -->
      <aside class="panel console-panel">
        <div class="panel-title">
          <h2>调度台</h2>
          <span v-if="dispatching" class="console-flag" :class="dispatchPhase">{{ phaseLabel }}</span>
        </div>

        <!-- 待发起：选主被叫、可互换可清空 -->
        <div v-if="!dispatching" class="console-form">
          <div class="slot" :class="{ filled: !!caller }">
            <div class="slot-head">
              <span class="slot-label">主叫</span>
              <button v-if="caller" type="button" class="slot-clear" @click="clearSlot('caller')">清空</button>
            </div>
            <div v-if="caller" class="slot-card">
              <span class="status-dot" :class="caller.status" />
              <strong>{{ caller.name }}</strong>
              <small>分机 {{ caller.ext }}</small>
              <em class="slot-state">{{ statusText(caller.status) }}</em>
            </div>
            <div v-else class="slot-empty">在左侧通讯录点击「设为主叫」</div>
          </div>

          <div class="slot-swap">
            <el-button text size="small" :icon="Sort" :disabled="!caller || !callee" @click="swapSlots">互换主被叫</el-button>
          </div>

          <div class="slot" :class="{ filled: !!callee }">
            <div class="slot-head">
              <span class="slot-label">被叫</span>
              <button v-if="callee" type="button" class="slot-clear" @click="clearSlot('callee')">清空</button>
            </div>
            <div v-if="callee" class="slot-card">
              <span class="status-dot" :class="callee.status" />
              <strong>{{ callee.name }}</strong>
              <small>分机 {{ callee.ext }}</small>
              <em class="slot-state">{{ statusText(callee.status) }}</em>
            </div>
            <div v-else class="slot-empty">在左侧通讯录点击「设为被叫」</div>
          </div>

          <div class="console-actions">
            <el-button type="primary" :icon="Promotion" :disabled="!canDispatch" @click="startDispatch">发起调度</el-button>
          </div>
          <p class="console-hint">离线话机不可调度，已被选为主叫或被叫的话机不可重复选择；免打扰话机不接听。</p>
        </div>

        <!-- 调度中：三阶段流程 -->
        <div v-else class="console-running">
          <div class="dispatch-pair">
            <div class="pair-item"><span class="pair-label">主叫</span><strong>{{ caller?.name }}</strong><small>{{ caller?.ext }}</small></div>
            <el-icon class="pair-arrow"><Right /></el-icon>
            <div class="pair-item"><span class="pair-label">被叫</span><strong>{{ callee?.name }}</strong><small>{{ callee?.ext }}</small></div>
          </div>
          <ol class="phase-track">
            <li v-for="(p, i) in PHASES" :key="p.key" :class="{ done: phaseIndex > i, active: phaseIndex === i, timing: p.key === 'talking' && dispatchPhase === 'talking' }">
              <span class="phase-dot" />
              <span class="phase-name">{{ p.label }}</span>
              <span v-if="p.key === 'talking' && dispatchPhase === 'talking'" class="phase-timer">{{ elapsedText }}</span>
            </li>
          </ol>
          <div class="console-actions">
            <el-button v-if="dispatchPhase === 'waiting-caller'" :icon="CloseBold" @click="cancelDispatch">取消调度</el-button>
            <el-button v-else type="danger" :icon="PhoneFilled" :disabled="dispatchPhase !== 'talking'" @click="cutLine">拆线</el-button>
          </div>
          <p v-if="dispatchPhase === 'waiting-callee'" class="console-hint">等待被叫接通阶段不可拆线，接通进入「通话中」后方可拆线。</p>
        </div>
      </aside>

      <!-- 调度记录 -->
      <aside class="panel records-panel">
        <div class="panel-title"><h2>调度记录</h2></div>
        <div class="records-filter">
          <el-date-picker v-model="dateRange" type="daterange" size="small" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" :clearable="false" :shortcuts="dateShortcuts" />
        </div>
        <div class="records-list">
          <article v-for="record in pagedRecords" :key="record.id" class="record-item">
            <div class="record-row">
              <span class="record-party"><em>主</em><span class="party-name">{{ record.caller.name }}</span><small>{{ record.caller.ext }}</small></span>
              <el-icon class="record-arrow"><Right /></el-icon>
              <span class="record-party"><em>被</em><span class="party-name">{{ record.callee.name }}</span><small>{{ record.callee.ext }}</small></span>
              <el-tag class="record-status" size="small" :type="STATUS_META[record.status].type" effect="light">{{ STATUS_META[record.status].text }}</el-tag>
            </div>
            <div class="record-row record-row--sub">
              <span class="record-operator">调度人 {{ record.operator }}</span>
              <span>{{ record.time }}</span>
              <span class="record-duration">通话时长 {{ record.duration || '—' }}</span>
            </div>
          </article>
          <div v-if="pagedRecords.length === 0" class="list-empty"><el-icon><ChatLineSquare /></el-icon><strong>暂无调度记录</strong><span>该时间范围内没有调度记录</span></div>
        </div>
        <div class="records-footer">
          <span>共 {{ filteredRecords.length }} 条记录</span>
          <el-pagination v-model:current-page="currentPage" small background layout="prev, pager, next" :page-size="pageSize" :total="filteredRecords.length" />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChatLineSquare, CloseBold, Iphone, PhoneFilled, Promotion, Right, Search, Sort, StarFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

type ContactStatus = 'normal' | 'dnd' | 'offline'
/** 一条通讯录条目即一台话机，name 为话机名称（对应设备实例表的 device_name） */
type Contact = { name: string; ext: string; status: ContactStatus; pinned?: boolean }
type SlotRole = 'caller' | 'callee'
type DispatchPhase = 'waiting-caller' | 'waiting-callee' | 'talking'
type DispatchStatus = 'completed' | 'caller-unanswered' | 'callee-unanswered' | 'cancelled'
type DispatchRecord = { id: number; time: string; caller: Contact; callee: Contact; operator: string; duration: string | null; status: DispatchStatus }

const STATUS_META: Record<DispatchStatus, { text: string; type: 'success' | 'warning' | 'danger' | 'info' }> = {
  completed: { text: '通话完成', type: 'success' },
  'caller-unanswered': { text: '主叫未接通', type: 'danger' },
  'callee-unanswered': { text: '被叫未接通', type: 'warning' },
  cancelled: { text: '取消调度', type: 'info' },
}
const PHASES: { key: DispatchPhase; label: string }[] = [
  { key: 'waiting-caller', label: '等待主叫接通' },
  { key: 'waiting-callee', label: '等待被叫接通' },
  { key: 'talking', label: '通话中' },
]
/** 每个阶段停留时长（原型用固定延时模拟接通与未接通） */
const PHASE_MS = 2500

/* ---------- 通用 ---------- */
function pad(n: number) { return String(n).padStart(2, '0') }
function fmtDate(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
function fmtStamp(d: Date) { return `${fmtDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` }
function daysAgo(n: number, h: number, m: number, s: number) { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, s, 0); return fmtStamp(d) }
function formatDuration(seconds: number) { return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}` }

/* ---------- 通讯录 ---------- */
const contacts = ref<Contact[]>([
  { name: 'A栋前台数字电话', ext: '8102', status: 'normal' },
  { name: 'A栋办公数字电话-01', ext: '8103', status: 'normal' },
  { name: 'A栋办公数字电话-02', ext: '8104', status: 'dnd' },
  { name: 'B栋办公数字电话-01', ext: '8106', status: 'offline' },
  { name: 'B栋办公数字电话-02', ext: '8108', status: 'normal' },
  { name: '卡口1号岗数字电话', ext: '8110', status: 'dnd' },
  { name: '卡口2号岗数字电话', ext: '8112', status: 'normal' },
  { name: '查验区数字电话', ext: '8115', status: 'normal' },
  { name: '保税仓A区数字电话', ext: '8117', status: 'offline' },
  { name: '保税仓B区数字电话', ext: '8120', status: 'normal' },
  { name: '监控中心数字电话', ext: '8123', status: 'normal' },
  { name: '海关值班室数字电话', ext: '8126', status: 'normal' },
  { name: '消防控制室数字电话', ext: '8128', status: 'normal' },
  { name: '收货平台数字电话', ext: '8130', status: 'offline' },
  { name: '综合服务楼数字电话', ext: '8133', status: 'normal' },
])
function ext(no: string): Contact { return contacts.value.find((c) => c.ext === no) as Contact }
const keyword = ref('')
const contactFilter = ref<'all' | ContactStatus>('all')
/** 置顶的话机排在最前（sort 稳定，同组内保持原顺序） */
const sortedContacts = computed(() => [...contacts.value].sort((a, b) => Number(!!b.pinned) - Number(!!a.pinned)))
const filteredContacts = computed(() => sortedContacts.value.filter((c) => (contactFilter.value === 'all' || c.status === contactFilter.value) && `${c.name}${c.ext}`.includes(keyword.value)))
function statusText(status: ContactStatus) { return status === 'normal' ? '正常' : status === 'dnd' ? '免打扰' : '离线' }
function statusTagType(status: ContactStatus): 'success' | 'warning' | 'info' {
  if (status === 'normal') return 'success'
  if (status === 'dnd') return 'warning'
  return 'info'
}
function togglePin(row: Contact) {
  const target = contacts.value.find((c) => c.ext === row.ext)
  if (target) target.pinned = !target.pinned
}

/* ---------- 调度台 ---------- */
const caller = ref<Contact | null>(null)
const callee = ref<Contact | null>(null)
const dispatching = ref(false)
const dispatchPhase = ref<DispatchPhase | null>(null)
const elapsedSeconds = ref(0)
const elapsedText = ref('00:00')
let phaseTimer: ReturnType<typeof setTimeout> | undefined
let tickTimer: ReturnType<typeof setInterval> | undefined

const canDispatch = computed(() => !!caller.value && !!callee.value && caller.value.ext !== callee.value.ext)
const phaseIndex = computed(() => PHASES.findIndex((p) => p.key === dispatchPhase.value))
const phaseLabel = computed(() => PHASES.find(p => p.key === dispatchPhase.value)?.label ?? '')

function slotRole(row: Contact): SlotRole | null {
  if (caller.value?.ext === row.ext) return 'caller'
  if (callee.value?.ext === row.ext) return 'callee'
  return null
}
/** 调度选择按钮的禁用条件：调度进行中 / 已占位（主叫或被叫）/ 话机离线（离线话机不可调度） */
function dispatchDisabled(row: Contact) {
  return dispatching.value || !!slotRole(row) || row.status === 'offline'
}
function pickContact(row: Contact, role: SlotRole) {
  if (dispatchDisabled(row)) return
  if (role === 'caller') caller.value = row
  else callee.value = row
}
function clearSlot(role: SlotRole) {
  if (role === 'caller') caller.value = null
  else callee.value = null
}
function swapSlots() {
  const c = caller.value
  caller.value = callee.value
  callee.value = c
}

/* ---------- 调度流程 ---------- */
function stopTimers() {
  if (phaseTimer) clearTimeout(phaseTimer)
  if (tickTimer) clearInterval(tickTimer)
  phaseTimer = undefined
  tickTimer = undefined
}
/** 主叫话机离线即无法接通（离线话机已不可选入调度台，此处保留为兜底判断） */
function callerReachable(c: Contact) { return c.status !== 'offline' }
/** 被叫话机离线或开启免打扰则不接听（离线话机已不可选，当前实际由免打扰触发「被叫未接通」） */
function calleeReachable(c: Contact) { return c.status === 'normal' }

function startDispatch() {
  if (!canDispatch.value) return
  dispatching.value = true
  elapsedSeconds.value = 0
  elapsedText.value = '00:00'
  runPhase('waiting-caller')
}
function runPhase(phase: DispatchPhase) {
  dispatchPhase.value = phase
  if (phase === 'waiting-caller') {
    phaseTimer = setTimeout(() => {
      if (!callerReachable(caller.value as Contact)) finishDispatch('caller-unanswered')
      else runPhase('waiting-callee')
    }, PHASE_MS)
  } else if (phase === 'waiting-callee') {
    phaseTimer = setTimeout(() => {
      if (!calleeReachable(callee.value as Contact)) finishDispatch('callee-unanswered')
      else {
        runPhase('talking')
        tickTimer = setInterval(() => {
          elapsedSeconds.value += 1
          elapsedText.value = formatDuration(elapsedSeconds.value)
        }, 1000)
      }
    }, PHASE_MS)
  }
}
function finishDispatch(status: DispatchStatus, duration: string | null = null) {
  stopTimers()
  const c = caller.value
  const k = callee.value
  if (c && k) {
    records.value.unshift({ id: nextId++, time: fmtStamp(new Date()), caller: c, callee: k, operator: CURRENT_OPERATOR, duration, status })
    currentPage.value = 1
  }
  dispatching.value = false
  dispatchPhase.value = null
  if (status === 'completed') ElMessage.success(`与 ${k?.name}（分机 ${k?.ext}）的调度完成`)
  else if (status === 'cancelled') ElMessage.info('已取消调度')
  else if (status === 'caller-unanswered') ElMessage.warning(`主叫 ${c?.name} 未接通，调度已终止`)
  else ElMessage.warning(`被叫 ${k?.name} 未接通，调度已终止`)
}
function cancelDispatch() { finishDispatch('cancelled') }
/** 拆线仅在「通话中」阶段可用：等待被叫接通阶段按钮保留但禁用，拆线按通话完成记录 */
function cutLine() {
  if (dispatchPhase.value !== 'talking') return
  finishDispatch('completed', formatDuration(elapsedSeconds.value))
}
onBeforeUnmount(stopTimers)

/* ---------- 调度记录 ---------- */
/** 调度人取当前登录账号，原型以「当前用户」占位（与照明/无线对讲等联动页操作日志一致） */
const CURRENT_OPERATOR = '当前用户'
let nextId = 100
const records = ref<DispatchRecord[]>([
  { id: 15, time: daysAgo(0, 10, 23, 15), caller: ext('8102'), callee: ext('8103'), operator: '张三', duration: '00:45', status: 'completed' },
  { id: 14, time: daysAgo(0, 9, 41, 2), caller: ext('8108'), callee: ext('8104'), operator: '李四', duration: null, status: 'callee-unanswered' },
  { id: 13, time: daysAgo(0, 8, 57, 40), caller: ext('8106'), callee: ext('8112'), operator: '张三', duration: null, status: 'caller-unanswered' },
  { id: 12, time: daysAgo(1, 17, 20, 11), caller: ext('8110'), callee: ext('8115'), operator: '王五', duration: '03:08', status: 'completed' },
  { id: 11, time: daysAgo(1, 16, 5, 32), caller: ext('8120'), callee: ext('8117'), operator: '赵敏', duration: null, status: 'callee-unanswered' },
  { id: 10, time: daysAgo(1, 15, 44, 19), caller: ext('8123'), callee: ext('8126'), operator: '李四', duration: null, status: 'cancelled' },
  { id: 9, time: daysAgo(2, 11, 12, 45), caller: ext('8112'), callee: ext('8128'), operator: '张三', duration: '00:58', status: 'completed' },
  { id: 8, time: daysAgo(2, 10, 2, 18), caller: ext('8133'), callee: ext('8130'), operator: '王五', duration: null, status: 'callee-unanswered' },
  { id: 7, time: daysAgo(3, 18, 26, 3), caller: ext('8115'), callee: ext('8120'), operator: '赵敏', duration: '05:22', status: 'completed' },
  { id: 6, time: daysAgo(3, 15, 33, 41), caller: ext('8128'), callee: ext('8102'), operator: '张三', duration: null, status: 'cancelled' },
  { id: 5, time: daysAgo(4, 20, 14, 7), caller: ext('8126'), callee: ext('8108'), operator: '李四', duration: '02:15', status: 'completed' },
  { id: 4, time: daysAgo(5, 9, 5, 22), caller: ext('8117'), callee: ext('8123'), operator: '王五', duration: null, status: 'caller-unanswered' },
  { id: 3, time: daysAgo(6, 14, 52, 30), caller: ext('8130'), callee: ext('8133'), operator: '赵敏', duration: null, status: 'cancelled' },
  { id: 2, time: daysAgo(8, 11, 28, 9), caller: ext('8103'), callee: ext('8110'), operator: '张三', duration: '04:41', status: 'completed' },
  { id: 1, time: daysAgo(12, 16, 40, 55), caller: ext('8104'), callee: ext('8115'), operator: '李四', duration: null, status: 'cancelled' },
])
const dateShortcuts = [
  { text: '近 7 天', value: () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6); return [start, end] } },
  { text: '近 30 天', value: () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 29); return [start, end] } },
  { text: '本月', value: () => { const end = new Date(); const start = new Date(end.getFullYear(), end.getMonth(), 1); return [start, end] } },
]
const endDate = new Date()
const startDate = new Date(); startDate.setDate(endDate.getDate() - 6)
const dateRange = ref<[string, string]>([fmtDate(startDate), fmtDate(endDate)])
const currentPage = ref(1)
const pageSize = ref(8)
const filteredRecords = computed(() => records.value.filter((r) => {
  const day = r.time.slice(0, 10)
  return day >= dateRange.value[0] && day <= dateRange.value[1]
}))
const pagedRecords = computed(() => filteredRecords.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
watch(dateRange, () => { currentPage.value = 1 })
</script>

<style lang="scss" scoped>
.telephone-page {
  position: relative; width: 100%; height: 100%; min-height: 100%;
  display: grid; grid-template-columns: 6fr 4fr; gap: 16px;
  padding: 16px; overflow: hidden; box-sizing: border-box;
  background: #dbe7dc; color: #1e2d45;
}
.panel { display: flex; flex-direction: column; min-height: 0; border: 1px solid #e5eaf1; border-radius: 10px; background: #fff; box-shadow: 0 5px 20px rgba(38, 58, 90, .12); }
.panel-title { display: flex; align-items: center; justify-content: space-between; padding: 17px 18px 13px; }
.panel-title h2 { margin: 0; font-size: 15px; }
.panel-title span { display: block; margin-top: 5px; color: #9aa5b5; font-size: 11px; }
.panel-title > .el-icon { color: #8d9aac; font-size: 19px; }
.right-col { display: flex; flex-direction: column; gap: 16px; min-height: 0; }

/* ---------- 通讯录列表 ---------- */
.contacts-toolbar { display: flex; align-items: center; gap: 10px; padding: 4px 14px 12px; }
.contacts-toolbar .el-input { width: 200px; flex: none; }
.contacts-table-wrap { flex: 1; min-height: 0; padding: 0 12px 12px; }
.name-wrap { display: flex; align-items: center; min-width: 0; }
.name-cell { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #2c405b; font-size: 13px; }
.pin-icon { flex: none; margin-right: 5px; color: #e8a13a; font-size: 13px; }
.status-dot { display: inline-block; flex: none; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; vertical-align: middle; }
.status-dot.normal { background: #21b486; box-shadow: 0 0 0 3px #dff6ed; }
.status-dot.dnd { background: #e8a13a; box-shadow: 0 0 0 3px #fbeeda; }
.status-dot.offline { background: #e85f66; box-shadow: 0 0 0 3px #fae4e5; }
.role-tag { flex: none; margin-left: 6px; }
.contacts-table-wrap :deep(.el-table__row) { height: 44px; }
.contacts-table-wrap :deep(.el-table .cell) { line-height: 20px; }
.contacts-table-wrap :deep(.el-table .cell .el-tag + .el-tag) { margin-left: 0; }
.contacts-table-wrap :deep(.el-button.is-text) { height: 24px; padding: 4px 6px; font-size: 12px; color: #4b77df; }
.contacts-table-wrap :deep(.el-button.is-text:hover) { background: #e8f0ff; color: #335ebd; }
.contacts-table-wrap :deep(.el-button.is-text.is-disabled) { color: #c9d1db; }
.contacts-footer { padding: 11px 14px; border-top: 1px solid #edf0f5; color: #a2adba; font-size: 10px; text-align: center; }

/* ---------- 调度台 ---------- */
.console-panel { flex: none; }
.panel-title .console-flag { display: inline-block; margin-top: 0; padding: 2px 9px; border-radius: 10px; background: #eef3ff; color: #4b77df; font-size: 10px; font-weight: 600; }
.panel-title .console-flag.waiting-caller,
.panel-title .console-flag.waiting-callee { background: #fff4e2; color: #b25e0b; }
.panel-title .console-flag.talking { background: #e3f7ef; color: #1a9d74; }

.console-form { padding: 0 14px 14px; }
.slot { padding: 8px 10px; border: 1px dashed #d9e2ee; border-radius: 8px; background: #fafcff; }
.slot.filled { border-style: solid; border-color: #dbe6f7; background: #f6f9ff; }
.slot-head { display: flex; align-items: center; justify-content: space-between; }
.slot-label { color: #8a97a8; font-size: 11px; font-weight: 600; }
.slot-clear { padding: 0; border: 0; background: none; color: #a6b0bd; font-size: 11px; cursor: pointer; }
.slot-clear:hover { color: #e85f66; }
.slot-card { display: flex; align-items: center; gap: 6px; margin-top: 6px; min-width: 0; }
.slot-card strong { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #2c405b; font-size: 13px; }
.slot-card small { flex: none; color: #9aa7b7; font-size: 11px; }
.slot-state { flex: none; margin-left: auto; color: #8a97a8; font-size: 10px; font-style: normal; }
.slot-empty { margin-top: 6px; color: #b3bdc9; font-size: 11px; }
.slot-swap { display: flex; align-items: center; justify-content: center; padding: 3px 0; }
.slot-swap .el-button { height: 22px; padding: 0 8px; font-size: 11px; color: #4b77df; }
.console-actions { margin-top: 12px; }
.console-actions .el-button { width: 100%; }
.console-hint { margin: 8px 0 0; color: #aab4c1; font-size: 10px; line-height: 15px; }

.console-running { padding: 0 14px 14px; }
.dispatch-pair { display: flex; align-items: center; gap: 8px; padding: 8px 10px; border: 1px solid #dbe6f7; border-radius: 8px; background: #f6f9ff; }
.pair-item { display: flex; align-items: baseline; gap: 5px; flex: 1 1 0; min-width: 0; overflow: hidden; }
.pair-label { flex: none; color: #8a97a8; font-size: 10px; }
.pair-item strong { flex: 0 1 auto; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #2c405b; font-size: 13px; }
.pair-item small { flex: none; color: #9aa7b7; font-size: 10px; }
.pair-arrow { flex: none; color: #9fb0c7; font-size: 13px; }
.phase-track { margin: 12px 0 0; padding: 0; list-style: none; }
.phase-track li { position: relative; display: flex; align-items: center; gap: 8px; min-height: 26px; }
.phase-track li:not(:last-child)::before { content: ''; position: absolute; left: 4px; top: 17px; width: 1px; height: 11px; background: #e2e9f2; }
.phase-dot { flex: none; width: 9px; height: 9px; border-radius: 50%; background: #dde4ed; }
.phase-name { color: #a6b0bd; font-size: 12px; }
.phase-timer { margin-left: auto; color: #1a9d74; font-size: 12px; font-weight: 600; }
.phase-track li.done .phase-dot { background: #9bb8f0; }
.phase-track li.done .phase-name { color: #8392a7; }
.phase-track li.active .phase-dot { background: #4b77df; box-shadow: 0 0 0 3px #e3ecff; animation: phasePulse 1.2s ease-in-out infinite; }
.phase-track li.active .phase-name { color: #335ebd; font-weight: 600; }
.phase-track li.active.timing .phase-dot { background: #1cad80; box-shadow: 0 0 0 3px #dff6ed; animation: none; }
@keyframes phasePulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

/* ---------- 调度记录 ---------- */
.records-panel { flex: 1; min-height: 0; }
.records-filter { padding: 2px 14px 10px; }
.records-filter :deep(.el-date-editor) { width: 100%; }
.records-list { flex: 1; padding: 3px 9px; overflow: auto; }
.record-item { padding: 8px 6px; border-bottom: 1px solid #f0f3f7; border-radius: 6px; }
.record-item:hover { background: #f4f7fc; }
.record-row { display: flex; align-items: center; gap: 6px; min-width: 0; }
.record-party { display: inline-flex; align-items: center; gap: 4px; flex: 1 1 0; min-width: 0; overflow: hidden; color: #2c405b; font-size: 12px; white-space: nowrap; }
.record-party em { flex: none; padding: 0 4px; border-radius: 3px; background: #eef3ff; color: #4b77df; font-size: 9px; font-style: normal; }
.record-party small { flex: none; color: #9aa7b7; font-size: 10px; }
.party-name { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.record-arrow { flex: none; color: #b6c1cf; font-size: 12px; }
.record-status { flex: none; margin-left: auto; }
.record-row--sub { margin-top: 6px; gap: 8px; color: #8a97a8; font-size: 11px; }
.record-operator { flex: none; padding: 0 5px; border-radius: 3px; background: #f2f5fa; color: #53647b; }
.record-duration { margin-left: auto; color: #53647b; }
.list-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 44px 10px; color: #a6b0bd; text-align: center; }
.list-empty .el-icon { margin-bottom: 6px; font-size: 26px; color: #bcc6d4; }
.list-empty strong { color: #8392a7; font-size: 12px; }
.list-empty span { color: #b3bdc9; font-size: 10px; }
.records-footer { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 11px 14px; border-top: 1px solid #edf0f5; color: #a2adba; font-size: 10px; }

@media (max-width: 1080px) {
  .telephone-page { grid-template-columns: 1fr; overflow: auto; }
  .console-panel, .records-panel { flex: none; }
  .contacts-panel, .records-panel { min-height: 380px; max-height: 48vh; }
}
@media (max-width: 560px) { .contacts-toolbar { flex-direction: column; align-items: stretch; } .contacts-toolbar .el-input { width: 100%; } }
</style>
