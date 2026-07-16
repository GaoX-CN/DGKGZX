<template>
  <div class="access-page">
    <main class="control-layout">
      <aside class="panel device-panel">
        <div class="panel-title"><div><h2>{{ deviceLabel }}终端</h2></div><el-icon class="panel-title__icon"><Menu /></el-icon></div>
        <div class="terminal-summary"><span>在线 <b class="status-count status-count--online">{{ onlineDevices }}</b></span><span>离线 <b class="status-count status-count--offline">{{ offlineDevices }}</b></span><span>设备数 <b class="status-count">{{ totalDevices }}</b></span></div>
        <div class="device-tree">
          <div class="tree-node tree-node--root"><el-icon><Location /></el-icon><b>主地块</b><el-icon class="tree-arrow"><ArrowDown /></el-icon></div>
          <div v-for="building in filteredBuildings" :key="building.name" class="tree-group">
            <div class="tree-node tree-node--building" @click="building.open = !building.open"><el-icon><OfficeBuilding /></el-icon><span>{{ building.name }}</span><el-icon class="tree-arrow"><ArrowDown v-if="building.open" /><ArrowRight v-else /></el-icon></div>
            <div v-if="building.open" class="tree-children">
              <div v-for="floor in building.floors" :key="floor.name" class="tree-floor">
                <div class="tree-node tree-node--floor" @click="floor.open = !floor.open"><el-icon><Menu /></el-icon><span>{{ floor.name }}</span><el-icon class="tree-arrow"><ArrowDown v-if="floor.open" /><ArrowRight v-else /></el-icon></div>
                <div v-if="floor.open" class="tree-devices">
                  <label v-for="device in floor.devices" :key="device.id" v-show="matchesDevice(device)" class="device-row" :class="{ 'device-row--offline': device.status === 'offline' }">
                    <el-checkbox v-model="device.selected" :disabled="device.status === 'offline'" @change="syncSelected" />
                    <span class="status-dot" :class="`status-dot--${device.status}`" />
                    <span class="device-name">{{ device.name }}</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div class="device-footer"><el-button type="primary" :icon="Unlock" :disabled="selectedDevices.length === 0" @click="openBatchConfirm">批量{{ actionLabel }}</el-button><span>仅支持在线设备</span></div>
      </aside>

      <section class="map-panel panel">
        <div class="map-canvas">
          <img :src="mapImage" alt="园区平面图" />
          <div class="map-overlay" />
          <div class="map-filter"><el-radio-group v-model="mapFilter" size="small"><el-radio-button value="all">全部</el-radio-button><el-radio-button value="online">在线</el-radio-button><el-radio-button value="offline">离线</el-radio-button></el-radio-group></div>
          <div v-for="device in visibleDevices" :key="device.id" class="map-marker" :class="[`map-marker--${device.status}`, { active: activeDevice?.id === device.id }]" :style="{ left: `${device.left}%`, top: `${device.top}%` }" @click="activeDevice = device">
            <span class="marker-ring" /><span class="marker-dot"><el-icon><Lock /></el-icon></span>
            <div v-if="activeDevice?.id === device.id" class="device-tooltip" @click.stop><div class="tooltip-title"><span class="status-dot" :class="`status-dot--${device.status}`" />{{ device.name }}</div><div class="tooltip-id">设备：{{ device.id }}</div><div class="tooltip-status">状态：<b>{{ device.status === 'online' ? '在线' : '离线' }}</b></div><el-button v-if="device.status === 'online'" type="primary" size="small" :icon="Unlock" @click="openDirectConfirm(device)">{{ actionLabel }}</el-button><div v-else class="offline-tip">设备离线，暂不可操作</div></div>
          </div>
          <div class="map-north">N</div>
        </div>
      </section>
    </main>

    <el-button class="log-trigger" :icon="Document" @click="logsVisible = true">操作日志</el-button>
    <el-drawer v-model="logsVisible" title="操作日志" direction="rtl" size="560px" :with-header="false" class="log-drawer"><header class="drawer-header"><div><h2>操作日志</h2><p>记录所有{{ deviceLabel }}控制操作</p></div><el-button text :icon="Close" @click="logsVisible = false" /></header><el-table :data="pagedLogs" stripe><el-table-column prop="time" label="操作时间" width="154" /><el-table-column prop="operator" label="操作人" width="74" /><el-table-column prop="device" label="操作设备" min-width="150" show-overflow-tooltip /><el-table-column prop="result" label="状态" width="72"><template #default="{ row }"><el-tag size="small" :type="row.result === '成功' ? 'success' : 'danger'">{{ row.result }}</el-tag></template></el-table-column></el-table><footer class="log-pagination"><span>共 {{ logs.length }} 条</span><el-pagination v-model:current-page="currentPage" small background layout="prev, pager, next" :page-size="5" :total="logs.length" /></footer></el-drawer>
    <el-dialog v-model="confirmVisible" :title="confirmMode === 'batch' ? `确认组${actionLabel}` : `确认${actionLabel}`" width="430px" center><div class="confirm-content"><div class="confirm-icon"><el-icon><Unlock /></el-icon></div><p>{{ confirmMode === 'batch' ? `是否${actionLabel}下列${deviceLabel}设备？` : `是否${actionLabel}设备「${pendingDevice?.name}」？` }}</p><div v-if="confirmMode === 'batch'" class="confirm-devices"><span v-for="device in selectedDevices" :key="device.id">{{ device.name }}</span></div><small>{{ actionLabel }}指令将立即下发，请确认操作对象无误。</small></div><template #footer><el-button @click="confirmVisible = false">取消</el-button><el-button type="primary" @click="executeOpen">确认{{ actionLabel }}</el-button></template></el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ArrowDown, ArrowRight, Close, Document, Location, Lock, Menu, OfficeBuilding, Unlock } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import mapImage from '@/map.png'

type Device = { id: string; name: string; status: 'online' | 'offline'; left: number; top: number; selected: boolean }
type Floor = { name: string; open: boolean; devices: Device[] }
type Building = { name: string; open: boolean; floors: Floor[] }
const props = withDefaults(defineProps<{ deviceType?: 'access' | 'barrier' }>(), { deviceType: 'access' })
const isBarrier = computed(() => props.deviceType === 'barrier')
const deviceLabel = computed(() => isBarrier.value ? '道闸' : '门禁')
const actionLabel = computed(() => isBarrier.value ? '抬杆' : '开门')
const deviceKeyword = ref('')
const logsVisible = ref(false)
const mapFilter = ref('all')
const activeDevice = ref<Device | null>(null)
const confirmVisible = ref(false)
const confirmMode = ref<'batch' | 'direct'>('batch')
const pendingDevice = ref<Device | null>(null)
const currentPage = ref(1)
const allDevices = ref<Device[]>([
  ...(isBarrier.value ? [
    { id: 'FF-入口道闸01', name: '南入口道闸', status: 'online' as const, left: 29, top: 39, selected: false },
    { id: 'FF-入口道闸02', name: '北入口道闸', status: 'online' as const, left: 43, top: 32, selected: false },
    { id: 'FF-出口道闸01', name: '货运出口道闸', status: 'online' as const, left: 57, top: 51, selected: false },
    { id: 'FF-出口道闸02', name: '停车场出口道闸', status: 'offline' as const, left: 51, top: 72, selected: false },
  ] : [
    { id: 'FF-1F-电梯厅1', name: '电梯厅左1', status: 'online' as const, left: 29, top: 39, selected: false },
    { id: 'FF-1F-电梯厅2', name: '电梯厅左2', status: 'online' as const, left: 43, top: 32, selected: false },
    { id: 'FF-1F-海关办公室1', name: '海关办公室1', status: 'online' as const, left: 57, top: 51, selected: false },
    { id: 'FF-1F-货运通道', name: '货运通道门', status: 'offline' as const, left: 51, top: 72, selected: false },
  ]),
])
const buildings = ref<Building[]>([{ name: 'FF', open: true, floors: [{ name: '1F', open: true, devices: allDevices.value }] }])
const logs = ref([{ time: '2026-04-09 10:28:36', operator: '张三', device: 'FF-1F-电梯厅1入口', result: '成功' }, { time: '2026-04-09 10:16:08', operator: '李四', device: 'FF-1F-海关办公室1', result: '失败' }, { time: '2026-04-09 09:42:51', operator: '张三', device: 'FF-1F-电梯厅2入口', result: '成功' }, { time: '2026-04-09 09:15:24', operator: '系统', device: 'FF-1F-货运通道', result: '失败' }, { time: '2026-04-08 18:31:02', operator: '王五', device: 'FF-1F-电梯厅1入口', result: '成功' }, { time: '2026-04-08 17:20:18', operator: '张三', device: 'FF-1F-海关办公室1', result: '成功' }])
const totalDevices = computed(() => allDevices.value.length)
const onlineDevices = computed(() => allDevices.value.filter((device) => device.status === 'online').length)
const offlineDevices = computed(() => totalDevices.value - onlineDevices.value)
const selectedDevices = computed(() => allDevices.value.filter((device) => device.selected))
const filteredBuildings = computed(() => buildings.value)
const visibleDevices = computed(() => allDevices.value.filter((device) => mapFilter.value === 'all' || device.status === mapFilter.value))
const pagedLogs = computed(() => logs.value.slice((currentPage.value - 1) * 5, currentPage.value * 5))
function matchesDevice(device: Device) { return !deviceKeyword.value || `${device.id}${device.name}`.toLowerCase().includes(deviceKeyword.value.toLowerCase()) }
function syncSelected() { activeDevice.value = null }
function openBatchConfirm() { confirmMode.value = 'batch'; pendingDevice.value = null; confirmVisible.value = true }
function openDirectConfirm(device: Device) { confirmMode.value = 'direct'; pendingDevice.value = device; confirmVisible.value = true }
function executeOpen() { const targets = confirmMode.value === 'batch' ? selectedDevices.value : pendingDevice.value ? [pendingDevice.value] : []; targets.forEach((device) => { logs.value.unshift({ time: `2026-04-09 ${new Date().toLocaleTimeString('zh-CN', { hour12: false })}`, operator: '当前用户', device: device.id, result: '成功' }); device.selected = false }); confirmVisible.value = false; currentPage.value = 1; ElMessage.success(`已向 ${targets.length} 个设备发送${actionLabel.value}指令`) }
</script>

<style lang="scss" scoped>
.access-page { position: relative; width: 100%; height: 100%; min-height: 100%; overflow: hidden; background: #dbe7dc; color: #1e2d45; }.page-header { display: none; }.control-layout { position: absolute; inset: 0; display: block; }.panel { border: 1px solid #e5eaf1; border-radius: 10px; background: #fff; box-shadow: 0 5px 20px rgba(38, 58, 90, .12); }.device-panel { position: absolute; z-index: 20; top: 16px; bottom: 16px; left: 16px; display: flex; width: 265px; min-height: 0; flex-direction: column; }.panel-title, .map-toolbar { display: flex; align-items: center; justify-content: space-between; padding: 17px 18px 13px; }.panel-title h2, .map-toolbar h2 { font-size: 15px; }.panel-title span, .map-toolbar span { display: block; margin-top: 5px; color: #9aa5b5; font-size: 11px; }.panel-title__icon { color: #94a1b2; }.device-search { padding: 3px 14px 11px; }.tree-summary { display: flex; justify-content: space-between; padding: 9px 15px; color: #98a3b2; background: #f8fafc; font-size: 11px; }.tree-summary b { color: #4776e6; }.device-tree { flex: 1; overflow: auto; padding: 9px 8px; }.tree-node { display: flex; align-items: center; gap: 7px; min-height: 32px; color: #53637b; font-size: 12px; cursor: pointer; }.tree-node .el-icon { color: #8c9aac; }.tree-node--root { padding: 0 8px; color: #253750; }.tree-node--building { padding-left: 16px; }.tree-node--floor { padding-left: 34px; }.tree-arrow { margin-left: auto; }.tree-children { border-left: 1px solid #e7ebf2; margin-left: 22px; }.tree-devices { padding: 1px 0 5px 18px; }.device-row { display: flex; align-items: center; gap: 6px; min-height: 37px; padding: 0 7px; border-radius: 6px; cursor: pointer; }.device-row:hover { background: #f4f7fc; }.device-row--offline { color: #9fa9b7; }.status-dot { display: inline-block; flex: none; width: 7px; height: 7px; border-radius: 50%; }.status-dot--online { background: #21b386; box-shadow: 0 0 0 3px #e0f7ef; }.status-dot--offline { background: #ed6269; box-shadow: 0 0 0 3px #ffe7e9; }.device-name { overflow: hidden; flex: 1; color: #4a5a70; font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.device-row small { color: #a4aebb; font-size: 9px; }.device-footer { padding: 13px 14px 15px; border-top: 1px solid #edf0f5; }.device-footer .el-button { width: 100%; }.device-footer span { display: block; margin-top: 8px; color: #a5afbd; text-align: center; font-size: 10px; }
.map-panel { position: absolute; z-index: 1; inset: 0; display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; border: 0; border-radius: 0; background: transparent; box-shadow: none; }.map-canvas { position: absolute; inset: 0; min-height: 0; overflow: hidden; background: #dbe7dc; }.map-canvas > img { width: 100%; height: 100%; object-fit: cover; filter: saturate(.66) contrast(.94); }.map-overlay { position: absolute; inset: 0; background: rgba(220, 236, 222, .12); }.map-filter { position: absolute; z-index: 5; top: 14px; left: 300px; padding: 5px; background: rgba(255,255,255,.9); border: 1px solid rgba(225,231,239,.9); border-radius: 6px; box-shadow: 0 3px 12px rgba(45,62,83,.1); }.map-marker { position: absolute; z-index: 3; transform: translate(-50%, -50%); cursor: pointer; }.marker-dot { display: grid; place-items: center; width: 28px; height: 28px; border: 3px solid #fff; border-radius: 50%; color: #fff; font-size: 12px; box-shadow: 0 2px 7px rgba(32, 54, 74, .3); }.map-marker--online .marker-dot { background: #20ad82; }.map-marker--offline .marker-dot { background: #e85e66; }.marker-ring { position: absolute; inset: -5px; border-radius: 50%; opacity: .3; animation: marker-pulse 2s infinite; }.map-marker--online .marker-ring { background: #20ad82; }.map-marker--offline .marker-ring { background: #e85e66; }.map-marker.active { z-index: 8; }.device-tooltip { position: absolute; top: 38px; left: 50%; width: 190px; padding: 12px; transform: translateX(-50%); border: 1px solid #e1e8f0; border-radius: 8px; background: #fff; box-shadow: 0 8px 22px rgba(29, 49, 78, .18); }.device-tooltip::before { position: absolute; top: -5px; left: calc(50% - 5px); width: 9px; height: 9px; background: #fff; border-top: 1px solid #e1e8f0; border-left: 1px solid #e1e8f0; content: ''; transform: rotate(45deg); }.tooltip-title { display: flex; align-items: center; gap: 7px; color: #273a55; font-size: 12px; font-weight: 600; }.tooltip-id, .tooltip-status { margin-top: 8px; color: #8794a5; font-size: 11px; }.tooltip-status b { color: #20ad82; }.map-marker--offline .tooltip-status b { color: #e85e66; }.device-tooltip .el-button { width: 100%; margin-top: 12px; }.offline-tip { margin-top: 12px; padding: 7px; color: #c35c64; background: #fff4f4; border-radius: 4px; text-align: center; font-size: 10px; }.map-north { position: absolute; right: 18px; bottom: 50px; color: #5a6d80; font: bold 18px Georgia; }.map-legend { position: absolute; right: 14px; bottom: 14px; display: flex; gap: 12px; padding: 7px 9px; background: rgba(255,255,255,.86); border-radius: 4px; color: #6d7b8c; font-size: 10px; }.map-legend i { display: inline-block; width: 7px; height: 7px; margin-right: 4px; border-radius: 50%; }.legend-online { background: #20ad82; }.legend-offline { background: #e85e66; }
.right-panel { position: absolute; z-index: 10; top: 14px; right: 14px; bottom: 14px; display: grid; grid-template-rows: auto 1fr; gap: 12px; width: 382px; min-width: 0; pointer-events: none; transition: width .2s ease; }.right-panel > * { pointer-events: auto; }.right-panel--collapsed { width: 0; }.float-panel__toggle { position: absolute; z-index: 2; top: 8px; left: -19px; }.right-panel--collapsed .float-panel__toggle { left: -36px; }.float-panel__toggle .el-button { color: #53647b; background: #fff; border-color: #e1e7ef; box-shadow: 0 4px 12px rgba(38, 58, 90, .12); }.kpi-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin: 4px 15px 16px; background: #edf0f4; border: 1px solid #edf0f4; border-radius: 7px; overflow: hidden; }.kpi-item { padding: 14px 5px; background: #fff; text-align: center; }.kpi-item strong { display: block; color: #4776e6; font-size: 25px; }.kpi-item span { display: block; margin-top: 5px; color: #99a4b3; font-size: 10px; }.kpi-item--online strong { color: #20ad82; }.kpi-item--offline strong { color: #e85e66; }.log-panel { min-height: 0; overflow: hidden; }.log-table { width: 100%; }.pagination { display: flex; align-items: center; justify-content: space-between; padding: 12px 14px; color: #a0aaba; font-size: 10px; }.confirm-content { text-align: center; }.confirm-icon { display: grid; place-items: center; width: 42px; height: 42px; margin: 0 auto 12px; color: #4776e6; background: #edf2ff; border-radius: 50%; font-size: 20px; }.confirm-content p { color: #45556d; font-size: 13px; }.confirm-content small { display: block; margin-top: 13px; color: #9da8b6; font-size: 11px; }.confirm-devices { display: flex; flex-wrap: wrap; gap: 7px; justify-content: center; margin-top: 14px; }.confirm-devices span { padding: 5px 8px; color: #51647c; background: #f3f6fa; border-radius: 4px; font-size: 11px; }
@keyframes marker-pulse { 0%, 100% { transform: scale(.7); opacity: .18; } 50% { transform: scale(1.1); opacity: .42; } }
@media (max-width: 1250px) { .device-panel { width: 240px; }.device-row small { display: none; }.right-panel { width: 340px; }.map-filter { left: 275px; } }
@media (max-width: 980px) { .device-panel { width: 230px; }.right-panel { width: 320px; }.map-canvas { min-height: 0; }.map-filter { left: 265px; } }
@media (max-width: 680px) { .access-page { min-height: 100%; }.device-panel { top: 10px; right: 10px; bottom: auto; left: 10px; width: auto; max-height: 45vh; }.map-filter { top: calc(45vh + 20px); left: 14px; }.map-panel { min-height: 100%; }.right-panel { top: 10px; right: 10px; bottom: 10px; width: calc(100% - 20px); }.float-panel__toggle { left: 8px; top: -3px; } }

.terminal-summary { display: flex; justify-content: space-around; padding: 11px; border-top: 1px solid #edf0f5; border-bottom: 1px solid #edf0f5; color: #9aa6b5; font-size: 11px; }
.status-count { margin-left: 3px; color: #4776e6; font-size: 15px; }
.status-count--online { color: #1cad80; }
.status-count--offline { color: #e5636a; }
.log-trigger { position: absolute; z-index: 15; top: 18px; right: 18px; box-shadow: 0 4px 14px rgba(38, 58, 90, .16); }
.drawer-header { display: flex; align-items: center; justify-content: space-between; padding: 17px 20px 14px; border-bottom: 1px solid #edf0f5; }.drawer-header h2 { margin: 0; color: #263950; font-size: 16px; }.drawer-header p { margin: 5px 0 0; color: #9aa5b5; font-size: 11px; }.log-pagination { display: flex; align-items: center; justify-content: space-between; padding: 14px 20px; color: #9ba6b5; font-size: 11px; }
</style>
