<template>
  <div class="lighting-page">
    <aside class="lighting-panel panel">
      <header class="panel-header"><div><h2>照明分布</h2></div><el-icon><Sunny /></el-icon></header>
      <div class="filter-row">
        <el-checkbox v-model="onlyOnline">只看在线 <b>15/20</b></el-checkbox>
        <el-checkbox v-model="onlyOn">只看已开启 <b>1/20</b></el-checkbox>
      </div>
      <div class="tree-list">
        <div class="tree-root"><el-icon><Location /></el-icon><b>主地块</b><el-icon class="tree-arrow"><ArrowDown /></el-icon></div>
        <section v-for="group in deviceTree" :key="group.name" class="tree-group">
          <button class="tree-node tree-node--space" type="button" @click="toggleGroup(group.name)"><el-icon><ArrowDown v-if="group.open" /><ArrowRight v-else /></el-icon><el-icon><OfficeBuilding /></el-icon><b>{{ group.name }}</b></button>
          <template v-if="group.open">
            <div v-for="room in group.rooms" :key="room.name" class="tree-room"><div class="tree-node tree-node--room"><el-icon><Menu /></el-icon><span>{{ room.name }}</span></div>
              <div v-for="device in room.devices" :key="device.id" class="device-row" :class="{ offline: device.status === 'offline', pending: device.pending }">
                <el-checkbox v-model="device.selected" :disabled="device.status === 'offline' || device.pending" />
                <span class="status-dot" :class="device.status" />
                <div class="device-info"><span>{{ device.name }}</span><small>{{ device.id }}</small></div>
                <el-tooltip :disabled="device.status === 'online' && !device.pending" :content="device.status === 'offline' ? '设备离线，不可操作' : '指令执行中，请稍候'" placement="top"><span><el-switch :model-value="device.on" size="small" :loading="device.pending" :disabled="device.status === 'offline' || device.pending" @change="requestDeviceState(device, $event)" /></span></el-tooltip>
              </div>
            </div>
          </template>
        </section>
      </div>
      <footer class="batch-actions"><el-button type="primary" :icon="Sunny" :loading="batchPending" :disabled="selectedDevices.length === 0 || batchPending" @click="setBatchState(true)">批量开灯</el-button><el-button :icon="MoonNight" :loading="batchPending" :disabled="selectedDevices.length === 0 || batchPending" @click="setBatchState(false)">批量关灯</el-button></footer>
    </aside>

    <main class="map-canvas" @click.self="activeDevice = null">
      <img :src="mapImage" alt="园区平面图" /><div class="map-wash" />
      <div class="map-filter"><el-radio-group v-model="mapFilter" size="small"><el-radio-button value="all">全部</el-radio-button><el-radio-button value="online">在线</el-radio-button><el-radio-button value="offline">离线</el-radio-button></el-radio-group></div>
      <button v-for="device in visibleMapDevices" :key="device.id" class="map-marker" :class="[device.status, { lit: device.on, active: activeDevice?.id === device.id }]" type="button" :style="{ left: `${device.left}%`, top: `${device.top}%` }" @click.stop="activeDevice = device">
        <span class="pulse" /><span class="marker-body"><el-icon><Sunny /></el-icon></span>
        <article v-if="activeDevice?.id === device.id" class="map-card" @click.stop><header><span class="status-dot" :class="device.status" /><strong>{{ device.id }}</strong><el-button text :icon="Close" @click="activeDevice = null" /></header><p>{{ device.name }}</p><div class="light-state"><span>灯光状态</span><b :class="{ on: device.on }">{{ device.pending ? '指令执行中' : device.on ? '已开启' : '已关闭' }}</b></div><el-tooltip :disabled="device.status === 'online' && !device.pending" :content="device.status === 'offline' ? '设备离线，不可操作' : '指令执行中，请稍候'" placement="bottom"><span class="card-switch"><el-switch :model-value="device.on" :loading="device.pending" :disabled="device.status === 'offline' || device.pending" active-text="开灯" inactive-text="关灯" @change="requestDeviceState(device, $event)" /></span></el-tooltip></article>
      </button>
      <div class="north">N</div>
    </main>

    <el-button class="log-trigger" :icon="Document" @click="logsVisible = true">操作日志</el-button>
    <el-drawer v-model="logsVisible" title="操作日志" direction="rtl" size="560px" :with-header="false" class="log-drawer"><header class="drawer-header"><div><h2>操作日志</h2><p>记录所有照明控制操作</p></div><el-button text :icon="Close" @click="logsVisible = false" /></header><el-table :data="pagedLogs" stripe><el-table-column prop="time" label="时间" width="154" /><el-table-column prop="operator" label="操作人" width="74" /><el-table-column prop="device" label="操作设备" min-width="150" show-overflow-tooltip /><el-table-column prop="action" label="执行操作" width="82" /><el-table-column prop="result" label="状态" width="72"><template #default="{ row }"><el-tag size="small" :type="row.result === '成功' ? 'success' : 'danger'">{{ row.result }}</el-tag></template></el-table-column></el-table><footer class="log-pagination"><span>共 {{ logs.length }} 条</span><el-pagination v-model:current-page="currentPage" small background layout="prev, pager, next" :page-size="5" :total="logs.length" /></footer></el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowRight, Close, Document, Location, Menu, MoonNight, OfficeBuilding, Sunny } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import mapImage from '@/map.png'

type Status = 'online' | 'offline'
type Device = { id: string; name: string; room: string; status: Status; on: boolean; selected: boolean; pending: boolean; left: number; top: number }
type Group = { name: string; open: boolean; rooms: { name: string; devices: Device[] }[] }
const devices = ref<Device[]>([
  { id: 'FF-1F-电梯厅1', name: '电梯厅1', room: '综合办公室', status: 'online', on: false, selected: false, pending: false, left: 29, top: 39 },
  { id: 'FF-1F-综合办公室', name: '综合办公室主灯', room: '综合办公室', status: 'online', on: true, selected: true, pending: false, left: 44, top: 31 },
  { id: 'FF-1F-物业室', name: '物业室主灯', room: '物业室', status: 'online', on: false, selected: true, pending: false, left: 57, top: 52 },
  { id: 'FF-1F-卫生间', name: '卫生间照明', room: '卫生间', status: 'offline', on: false, selected: false, pending: false, left: 52, top: 72 },
])
const onlyOnline = ref(false)
const onlyOn = ref(false)
const mapFilter = ref<'all' | Status>('all')
const activeDevice = ref<Device | null>(null)
const logsVisible = ref(false)
const currentPage = ref(1)
const batchPending = ref(false)
const groups = ref<Group[]>([{ name: 'CT-1F', open: true, rooms: [] }])
const logs = ref([
  { time: '2026-07-16 10:28:36', operator: '张三', device: 'FF-1F综合办公室', action: '开灯', result: '成功' },
  { time: '2026-07-16 10:16:08', operator: '李四', device: 'FF-1F电梯厅1', action: '关灯', result: '成功' },
  { time: '2026-07-16 09:42:51', operator: '张三', device: 'FF-1F物业室', action: '开灯', result: '成功' },
  { time: '2026-07-16 09:15:24', operator: '系统', device: 'FF-1F卫生间', action: '开灯', result: '失败' },
  { time: '2026-07-15 18:31:02', operator: '王五', device: 'FF-1F综合办公室', action: '关灯', result: '成功' },
  { time: '2026-07-15 17:20:18', operator: '张三', device: 'FF-1F电梯厅1', action: '开灯', result: '成功' },
])
const selectedDevices = computed(() => devices.value.filter((device) => device.selected && device.status === 'online'))
const deviceTree = computed(() => groups.value.map((group) => ({ ...group, rooms: ['综合办公室', '物业室', '卫生间'].map((room) => ({ name: room, devices: devices.value.filter((device) => device.room === room && (!onlyOnline.value || device.status === 'online') && (!onlyOn.value || device.on)) })).filter((room) => room.devices.length) })))
const visibleMapDevices = computed(() => devices.value.filter((device) => mapFilter.value === 'all' || device.status === mapFilter.value))
const pagedLogs = computed(() => logs.value.slice((currentPage.value - 1) * 5, currentPage.value * 5))
function record(device: Device, targetState: boolean, result: '成功' | '失败') { logs.value.unshift({ time: `2026-07-16 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`, operator: '当前用户', device: device.id, action: targetState ? '开灯' : '关灯', result }); currentPage.value = 1 }
function sendLightingCommand(device: Device, targetState: boolean) { return new Promise<boolean>((resolve) => { window.setTimeout(() => resolve(Math.random() >= 0.5), 800) }) }
async function requestDeviceState(device: Device, targetState: boolean) { if (device.status === 'offline' || device.pending || device.on === targetState) return false; device.pending = true; const accepted = await sendLightingCommand(device, targetState); device.pending = false; record(device, targetState, accepted ? '成功' : '失败'); if (accepted) { device.on = targetState; ElMessage.success(`${device.name}已${targetState ? '开启' : '关闭'}`) } else { ElMessage.error(`${device.name}${targetState ? '开灯' : '关灯'}失败，当前状态未变更`) } return accepted }
async function setBatchState(on: boolean) { const targets = selectedDevices.value.filter((device) => device.on !== on && !device.pending); if (!targets.length) { ElMessage.info('所选设备已处于目标状态或正在执行指令'); return } batchPending.value = true; const results = await Promise.all(targets.map((device) => requestDeviceState(device, on))); targets.forEach((device) => { device.selected = false }); batchPending.value = false; const successes = results.filter(Boolean).length; ElMessage[successes === targets.length ? 'success' : 'warning'](`批量${on ? '开灯' : '关灯'}完成：成功 ${successes} 台，失败 ${targets.length - successes} 台`) }
function toggleGroup(name: string) { const group = groups.value.find((item) => item.name === name); if (group) group.open = !group.open }
</script>

<style lang="scss" scoped>
.lighting-page { position: relative; width: 100%; height: 100%; min-height: 100%; overflow: hidden; color: #1f304a; background: #dce8dd; }.panel { border: 1px solid #e5eaf1; border-radius: 10px; background: #fff; box-shadow: 0 5px 20px rgba(38,58,90,.12); }.lighting-panel { position: absolute; z-index: 20; top: 16px; bottom: 16px; left: 16px; display: flex; width: 286px; flex-direction: column; }.panel-header,.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 17px 18px 13px; }.panel-header h2,.drawer-header h2 { margin: 0; font-size: 15px; }.panel-header p,.drawer-header p { margin: 5px 0 0; color: #9aa5b5; font-size: 11px; }.panel-header>.el-icon { color: #d69b22; font-size: 20px; }.filter-row { display: grid; gap: 9px; padding: 12px 15px; border-block: 1px solid #edf0f5; color: #54647b; font-size: 12px; }.filter-row b { color: #4776e6; }.tree-list { flex: 1; overflow: auto; padding: 10px; }.tree-root,.tree-node { display: flex; align-items: center; gap: 7px; min-height: 33px; color: #53647b; font-size: 12px; }.tree-root { padding: 0 5px; color: #2c405b; }.tree-arrow { margin-left: auto; }.tree-node--space { width: 100%; border: 0; background: transparent; cursor: pointer; }.tree-room { margin-left: 15px; border-left: 1px solid #e8edf4; }.tree-node--room { padding-left: 20px; }.device-row { display: flex; align-items: center; gap: 7px; min-height: 48px; padding: 4px 5px 4px 35px; border-radius: 6px; }.device-row:hover { background: #f4f7fc; }.device-row.offline { color: #a5afbc; }.device-info { display: grid; min-width: 0; flex: 1; gap: 2px; font-size: 12px; }.device-info span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }.device-info small { color: #9aa6b6; font-size: 10px; }.status-dot { display: inline-block; flex: none; width: 7px; height: 7px; border-radius: 50%; }.status-dot.online { background: #22b486; box-shadow: 0 0 0 3px #dff6ed; }.status-dot.offline { background: #e85f66; box-shadow: 0 0 0 3px #fde7e8; }.batch-actions { display: flex; gap: 8px; padding: 14px; border-top: 1px solid #edf0f5; }.batch-actions .el-button { flex: 1; margin: 0; }.map-canvas { position: absolute; inset: 0; overflow: hidden; background: #dce8dd; }.map-canvas>img { width: 100%; height: 100%; object-fit: cover; filter: saturate(.66) contrast(.94); }.map-wash { position: absolute; inset: 0; background: rgba(220,236,222,.13); }.map-filter { position: absolute; z-index: 5; top: 14px; left: 320px; padding: 5px; border: 1px solid rgba(225,231,239,.9); border-radius: 6px; background: rgba(255,255,255,.9); box-shadow: 0 3px 12px rgba(45,62,83,.1); }.map-marker { position: absolute; z-index: 3; border: 0; background: none; transform: translate(-50%,-50%); cursor: pointer; }.marker-body { display: grid; place-items: center; width: 30px; height: 30px; border: 3px solid #fff; border-radius: 50%; color: #fff; font-size: 14px; box-shadow: 0 2px 7px rgba(32,54,74,.3); }.map-marker.online .marker-body { background: #8f9ba9; }.map-marker.online.lit .marker-body { background: #efa927; }.map-marker.offline .marker-body { background: #e85e66; }.pulse { position: absolute; inset: -5px; border-radius: 50%; opacity: 0; }.lit .pulse { background: #efa927; animation: marker-pulse 2s infinite; }.map-marker.active { z-index: 10; }.map-card { position: absolute; top: 40px; left: 50%; width: 210px; padding: 12px; transform: translateX(-50%); border: 1px solid #e1e8f0; border-radius: 8px; background: #fff; box-shadow: 0 8px 22px rgba(29,49,78,.18); text-align: left; }.map-card::before { position: absolute; top: -5px; left: calc(50% - 5px); width: 9px; height: 9px; transform: rotate(45deg); border-top: 1px solid #e1e8f0; border-left: 1px solid #e1e8f0; background: #fff; content: ''; }.map-card header { display: flex; align-items: center; gap: 7px; }.map-card header strong { flex: 1; color: #273a55; font-size: 12px; }.map-card p { margin: 8px 0 12px 14px; color: #8b98aa; font-size: 11px; }.light-state { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-block: 1px solid #edf0f5; color: #8390a2; font-size: 12px; }.light-state b { color: #77869a; }.light-state b.on { color: #d99519; }.card-switch { display: block; padding-top: 12px; text-align: center; }.north { position: absolute; right: 22px; bottom: 22px; display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: rgba(255,255,255,.83); color: #526278; font-size: 12px; font-weight: 700; }.log-trigger { position: absolute; z-index: 15; top: 16px; right: 16px; box-shadow: 0 3px 12px rgba(45,62,83,.14); }.log-drawer :deep(.el-drawer__body) { padding: 0; }.drawer-header { border-bottom: 1px solid #edf0f5; }.log-pagination { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; color: #96a1b0; font-size: 12px; } @keyframes marker-pulse { 0%,100% { transform: scale(.7); opacity: .18; } 50% { transform: scale(1.15); opacity: .42; } } @media (max-width: 720px) { .lighting-panel { top: 10px; bottom: auto; width: calc(100% - 20px); max-height: 48vh; }.map-filter { top: calc(48vh + 20px); left: 14px; }.log-trigger { top: calc(48vh + 20px); }.log-drawer { --el-drawer-size: 100% !important; } }
</style>
