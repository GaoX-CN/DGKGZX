<template>
  <div class="telephone-page">
    <!-- 左侧：通讯录列表（70%） -->
    <aside class="panel contacts-panel">
      <div class="panel-title"><h2>通讯录</h2><el-icon><Iphone /></el-icon></div>
      <div class="contacts-toolbar">
        <el-input v-model="keyword" clearable size="small" placeholder="搜索姓名或分机号" :prefix-icon="Search" />
        <el-radio-group v-model="contactFilter" size="small">
          <el-radio-button value="all">全部</el-radio-button>
          <el-radio-button value="normal">正常</el-radio-button>
          <el-radio-button value="dnd">免打扰</el-radio-button>
          <el-radio-button value="offline">离线</el-radio-button>
        </el-radio-group>
      </div>
      <div class="contacts-table-wrap">
        <el-table :data="filteredContacts" height="100%" row-key="ext">
          <el-table-column label="姓名" min-width="130">
            <template #default="{ row }"><span class="status-dot" :class="row.status" /><span class="name-cell">{{ row.name }}</span></template>
          </el-table-column>
          <el-table-column prop="ext" label="分机号" width="90" />
          <el-table-column label="话机状态" width="96">
            <template #default="{ row }"><el-tag size="small" :type="statusTagType(row.status)" effect="light">{{ statusText(row.status) }}</el-tag></template>
          </el-table-column>
          <el-table-column label="操作" width="64" align="center">
            <template #default="{ row }"><el-button circle text :icon="Phone" :disabled="row.status === 'offline'" title="拨打" @click="openCall(row)" /></template>
          </el-table-column>
        </el-table>
      </div>
      <div class="contacts-footer"><span>离线或免打扰话机可能无法接通，请留意状态标识</span></div>
    </aside>

    <!-- 右侧：通话记录（30%） -->
    <aside class="panel records-panel">
      <div class="panel-title"><h2>通话记录</h2></div>
      <div class="records-filter">
        <el-date-picker v-model="dateRange" type="daterange" size="small" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" :clearable="false" :shortcuts="dateShortcuts" />
      </div>
      <div class="records-list">
        <article v-for="record in pagedRecords" :key="record.id" class="record-item">
          <span class="record-icon"><el-icon><Phone /></el-icon></span>
          <div class="record-main"><strong>{{ record.name }} <small>分机 {{ record.ext }}</small></strong><span>{{ record.time }}</span></div>
          <div class="record-side"><b>{{ record.duration || '—' }}</b><span class="side-label">通话时长</span></div>
        </article>
        <div v-if="pagedRecords.length === 0" class="list-empty"><el-icon><ChatLineSquare /></el-icon><strong>暂无通话记录</strong><span>该时间范围内没有通话记录</span></div>
      </div>
      <div class="records-footer">
        <span>共 {{ filteredRecords.length }} 条记录</span>
        <el-pagination v-model:current-page="currentPage" small background layout="prev, pager, next" :page-size="pageSize" :total="filteredRecords.length" />
      </div>
    </aside>

    <!-- 通话界面 -->
    <el-dialog v-model="callVisible" width="420px" class="call-dialog" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="!callConnected" :before-close="beforeCallClose" destroy-on-close>
      <div class="call-content">
        <div class="call-avatar" :class="{ connected: callConnected }"><el-icon><Phone /></el-icon></div>
        <h2 class="call-name">{{ callingContact?.name }}</h2>
        <p class="call-ext">分机号 {{ callingContact?.ext }}</p>
        <p class="call-status" :class="{ connected: callConnected }"><span class="live-dot" />{{ callConnected ? `已接通 · ${callElapsed}` : '呼叫中...' }}</p>
        <transition name="el-fade-in">
          <div v-if="callConnected" class="call-warning"><el-icon><WarningFilled /></el-icon><span>正在通话中，请勿关闭或切换当前页面</span></div>
        </transition>
        <div class="call-controls">
          <el-button v-if="!callConnected" text class="cancel-btn" :icon="Close" @click="cancelCall">取消</el-button>
          <el-button type="danger" round size="large" :icon="Phone" @click="hangUp">挂断</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ChatLineSquare, Close, Iphone, Phone, Search, WarningFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

type ContactStatus = 'normal' | 'dnd' | 'offline'
type Contact = { name: string; ext: string; status: ContactStatus }
type CallRecord = { id: number; name: string; ext: string; time: string; duration: string | null }

/* ---------- 通讯录 ---------- */
const contacts = ref<Contact[]>([
  { name: '张三', ext: '8102', status: 'normal' },
  { name: '李四', ext: '8103', status: 'normal' },
  { name: '王五', ext: '8104', status: 'dnd' },
  { name: '陈强', ext: '8106', status: 'offline' },
  { name: '赵敏', ext: '8108', status: 'normal' },
  { name: '林芳', ext: '8110', status: 'dnd' },
  { name: '周涛', ext: '8112', status: 'normal' },
  { name: '吴琼', ext: '8115', status: 'normal' },
  { name: '郑浩', ext: '8117', status: 'offline' },
  { name: '孙丽', ext: '8120', status: 'normal' },
  { name: '马俊', ext: '8123', status: 'normal' },
  { name: '刘洋', ext: '8126', status: 'normal' },
  { name: '黄颖', ext: '8128', status: 'normal' },
  { name: '许峰', ext: '8130', status: 'offline' },
  { name: '朱琳', ext: '8133', status: 'normal' },
])
const keyword = ref('')
const contactFilter = ref<'all' | ContactStatus>('all')
const filteredContacts = computed(() => contacts.value.filter((c) => (contactFilter.value === 'all' || c.status === contactFilter.value) && `${c.name}${c.ext}`.includes(keyword.value)))
function statusText(status: ContactStatus) { return status === 'normal' ? '正常' : status === 'dnd' ? '免打扰' : '离线' }
function statusTagType(status: ContactStatus): 'success' | 'warning' | 'info' {
  if (status === 'normal') return 'success'
  if (status === 'dnd') return 'warning'
  return 'info'
}

/* ---------- 通话记录 ---------- */
const records = ref<CallRecord[]>([
  { id: 18, name: '李四', ext: '8103', time: '2026-08-20 10:23:15', duration: '00:45' },
  { id: 17, name: '赵敏', ext: '8108', time: '2026-08-20 09:41:02', duration: '01:12' },
  { id: 16, name: '王五', ext: '8104', time: '2026-08-20 08:57:40', duration: null },
  { id: 15, name: '陈强', ext: '8106', time: '2026-08-19 17:20:11', duration: null },
  { id: 14, name: '林芳', ext: '8110', time: '2026-08-19 16:05:32', duration: '03:08' },
  { id: 13, name: '吴琼', ext: '8115', time: '2026-08-19 15:44:19', duration: '00:11' },
  { id: 12, name: '周涛', ext: '8112', time: '2026-08-19 11:12:45', duration: null },
  { id: 11, name: '孙丽', ext: '8120', time: '2026-08-18 18:26:03', duration: '05:22' },
  { id: 10, name: '马俊', ext: '8123', time: '2026-08-18 10:02:18', duration: null },
  { id: 9, name: '黄颖', ext: '8128', time: '2026-08-17 15:33:41', duration: '00:58' },
  { id: 8, name: '张三', ext: '8102', time: '2026-08-16 20:14:07', duration: '02:15' },
  { id: 7, name: '刘洋', ext: '8126', time: '2026-08-15 09:05:22', duration: '00:37' },
  { id: 6, name: '朱琳', ext: '8133', time: '2026-08-14 14:52:30', duration: null },
  { id: 5, name: '许峰', ext: '8130', time: '2026-08-12 11:28:09', duration: '04:41' },
  { id: 4, name: '李四', ext: '8103', time: '2026-08-10 16:40:55', duration: '01:26' },
  { id: 3, name: '赵敏', ext: '8108', time: '2026-08-08 09:17:34', duration: '00:19' },
  { id: 2, name: '周涛', ext: '8112', time: '2026-08-06 17:55:12', duration: null },
  { id: 1, name: '孙丽', ext: '8120', time: '2026-08-05 10:44:28', duration: '06:03' },
])
function pad(n: number) { return String(n).padStart(2, '0') }
function fmt(d: Date) { return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` }
const dateShortcuts = [
  { text: '近 7 天', value: () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 6); return [start, end] } },
  { text: '近 30 天', value: () => { const end = new Date(); const start = new Date(); start.setDate(end.getDate() - 29); return [start, end] } },
  { text: '本月', value: () => { const end = new Date(); const start = new Date(end.getFullYear(), end.getMonth(), 1); return [start, end] } },
]
const endDate = new Date()
const startDate = new Date(); startDate.setDate(endDate.getDate() - 6)
const dateRange = ref<[string, string]>([fmt(startDate), fmt(endDate)])
const currentPage = ref(1)
const pageSize = ref(8)
const filteredRecords = computed(() => records.value.filter((r) => {
  const day = r.time.slice(0, 10)
  return day >= dateRange.value[0] && day <= dateRange.value[1]
}))
const pagedRecords = computed(() => filteredRecords.value.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value))
watch(dateRange, () => { currentPage.value = 1 })
let nextId = 100

/* ---------- 通话流程 ---------- */
const callVisible = ref(false)
const callingContact = ref<Contact | null>(null)
const callConnected = ref(false)
const callElapsed = ref('00:00')
let connectTimer: ReturnType<typeof setTimeout> | undefined
let elapsedTimer: ReturnType<typeof setInterval> | undefined
let elapsedSeconds = 0

function nowString() {
  const d = new Date()
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}
function formatDuration(seconds: number) { return `${pad(Math.floor(seconds / 60))}:${pad(seconds % 60)}` }

function openCall(contact: Contact) {
  callingContact.value = contact
  callConnected.value = false
  callElapsed.value = '00:00'
  elapsedSeconds = 0
  callVisible.value = true
  connectTimer = setTimeout(() => {
    callConnected.value = true
    elapsedTimer = setInterval(() => {
      elapsedSeconds += 1
      callElapsed.value = formatDuration(elapsedSeconds)
    }, 1000)
    ElMessage.warning({ message: '正在通话中，请勿关闭或切换当前页面', duration: 4000, showClose: true })
  }, 3000)
}
function stopCallTimers() {
  if (connectTimer) clearTimeout(connectTimer)
  if (elapsedTimer) clearInterval(elapsedTimer)
  connectTimer = undefined
  elapsedTimer = undefined
}
function pushRecord(contact: Contact, duration: string | null) {
  records.value.unshift({ id: nextId++, name: contact.name, ext: contact.ext, time: nowString(), duration })
}
function hangUp() {
  const contact = callingContact.value
  if (!contact) return
  if (callConnected.value) {
    pushRecord(contact, formatDuration(elapsedSeconds))
    ElMessage.success(`与 ${contact.name}（分机 ${contact.ext}）的通话已结束`)
  } else {
    pushRecord(contact, null)
    ElMessage.info('已取消呼叫')
  }
  callVisible.value = false
}
function cancelCall() {
  const contact = callingContact.value
  if (!contact) return
  pushRecord(contact, null)
  callVisible.value = false
}
function beforeCallClose(done: () => void) {
  if (callConnected.value) {
    ElMessage.warning('通话进行中，请先挂断电话')
    return
  }
  cancelCall()
  done()
}
watch(callVisible, (visible) => {
  if (!visible) {
    stopCallTimers()
    callingContact.value = null
  }
})
onBeforeUnmount(stopCallTimers)
</script>

<style lang="scss" scoped>
.telephone-page {
  position: relative; width: 100%; height: 100%; min-height: 100%;
  display: grid; grid-template-columns: 7fr 3fr; gap: 16px;
  padding: 16px; overflow: hidden; box-sizing: border-box;
  background: #dbe7dc; color: #1e2d45;
}
.panel { display: flex; flex-direction: column; min-height: 0; border: 1px solid #e5eaf1; border-radius: 10px; background: #fff; box-shadow: 0 5px 20px rgba(38, 58, 90, .12); }
.panel-title { display: flex; align-items: center; justify-content: space-between; padding: 17px 18px 13px; }
.panel-title h2 { margin: 0; font-size: 15px; }
.panel-title span { display: block; margin-top: 5px; color: #9aa5b5; font-size: 11px; }
.panel-title > .el-icon { color: #8d9aac; font-size: 19px; }

/* ---------- 通讯录列表 ---------- */
.contacts-toolbar { display: flex; align-items: center; gap: 10px; padding: 4px 14px 12px; }
.contacts-toolbar .el-input { width: 200px; flex: none; }
.contacts-table-wrap { flex: 1; min-height: 0; padding: 0 12px 12px; }
.status-dot { display: inline-block; flex: none; width: 7px; height: 7px; margin-right: 6px; border-radius: 50%; vertical-align: middle; }
.status-dot.normal { background: #21b486; box-shadow: 0 0 0 3px #dff6ed; }
.status-dot.dnd { background: #e8a13a; box-shadow: 0 0 0 3px #fbeeda; }
.status-dot.offline { background: #e85f66; box-shadow: 0 0 0 3px #fae4e5; }
.name-cell { color: #2c405b; font-size: 13px; }
.contacts-table-wrap :deep(.el-table__row) { height: 44px; }
.contacts-table-wrap :deep(.el-table .cell) { line-height: 20px; }
.contacts-table-wrap :deep(.el-button.is-text) { padding: 4px; color: #4b77df; }
.contacts-table-wrap :deep(.el-button.is-text:hover) { background: #e8f0ff; color: #335ebd; }
.contacts-table-wrap :deep(.el-button.is-text.is-disabled) { color: #c4cdd9; }
.contacts-footer { padding: 11px 14px; border-top: 1px solid #edf0f5; color: #a2adba; font-size: 10px; text-align: center; }

/* ---------- 通话记录 ---------- */
.records-filter { padding: 2px 14px 10px; }
.records-filter :deep(.el-date-editor) { width: 100%; }
.records-list { flex: 1; padding: 3px 9px; overflow: auto; }
.record-item { display: flex; align-items: center; gap: 10px; min-height: 58px; padding: 8px 6px; border-bottom: 1px solid #f0f3f7; border-radius: 6px; }
.record-item:hover { background: #f4f7fc; }
.record-icon { display: flex; flex: none; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #edf2ff; color: #4b77df; font-size: 14px; }
.record-main { flex: 1; min-width: 0; }
.record-main strong { display: block; color: #2c405b; font-size: 13px; }
.record-main strong small { margin-left: 6px; color: #9aa7b7; font-size: 10px; font-weight: 400; }
.record-main span { display: block; margin-top: 4px; color: #8a97a8; font-size: 12px; }
.record-side { flex: none; text-align: right; }
.record-side b { display: block; color: #53647b; font-size: 13px; }
.record-side .side-label { display: block; margin-top: 3px; color: #aeb8c5; font-size: 9px; }
.list-empty { display: flex; flex-direction: column; align-items: center; gap: 4px; padding: 44px 10px; color: #a6b0bd; text-align: center; }
.list-empty .el-icon { margin-bottom: 6px; font-size: 26px; color: #bcc6d4; }
.list-empty strong { color: #8392a7; font-size: 12px; }
.list-empty span { color: #b3bdc9; font-size: 10px; }
.records-footer { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 11px 14px; border-top: 1px solid #edf0f5; color: #a2adba; font-size: 10px; }

/* ---------- 通话界面 ---------- */
.call-dialog :deep(.el-dialog) { border-radius: 14px; overflow: hidden; }
.call-dialog :deep(.el-dialog__header) { padding: 0; }
.call-dialog :deep(.el-dialog__body) { padding: 30px 34px 32px; }
.call-content { text-align: center; }
.call-avatar { display: flex; align-items: center; justify-content: center; width: 84px; height: 84px; margin: 2px auto 16px; border-radius: 50%; background: linear-gradient(135deg, #4b77df, #6f9bf7); color: #fff; font-size: 34px; box-shadow: 0 10px 24px rgba(75, 119, 223, .28); }
.call-avatar.connected { background: linear-gradient(135deg, #1cad80, #3ecf9c); box-shadow: 0 10px 24px rgba(28, 173, 128, .3); }
.call-name { margin: 0; color: #24395c; font-size: 19px; }
.call-ext { margin: 8px 0 0; color: #9aa7b7; font-size: 12px; }
.call-status { display: flex; align-items: center; justify-content: center; margin: 16px 0 0; color: #6b7c94; font-size: 13px; font-weight: 600; }
.call-status .live-dot { display: inline-block; width: 7px; height: 7px; margin-right: 7px; border-radius: 50%; background: #4b77df; box-shadow: 0 0 0 4px #e3ecff; animation: dotPulse 1.2s ease-in-out infinite; }
.call-status.connected { color: #1cad80; }
.call-status.connected .live-dot { background: #1cad80; box-shadow: 0 0 0 4px #dff6ed; animation: none; }
@keyframes dotPulse { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }
.call-warning { display: flex; align-items: center; justify-content: center; gap: 8px; margin: 16px 0 0; padding: 11px 12px; border: 1px solid #f2cd90; border-radius: 8px; background: #fff4e2; color: #b25e0b; font-size: 12px; font-weight: 600; animation: warnPulse 1.8s ease-in-out infinite; }
.call-warning .el-icon { flex: none; color: #e8a13a; font-size: 16px; }
@keyframes warnPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(232, 161, 58, .3); } 50% { box-shadow: 0 0 0 5px rgba(232, 161, 58, .05); } }
.call-controls { display: flex; flex-direction: column; align-items: center; gap: 12px; margin-top: 26px; }
.call-controls .el-button--large { min-width: 156px; }

@media (max-width: 1080px) { .telephone-page { grid-template-columns: 1fr; overflow: auto; } .contacts-panel, .records-panel { min-height: 380px; max-height: 48vh; } }
@media (max-width: 560px) { .contacts-toolbar { flex-direction: column; align-items: stretch; } .contacts-toolbar .el-input { width: 100%; } }
</style>
