<template>
  <div>
    <div class="io-page">
      <el-form :model="query" inline class="io-search">
        <el-form-item label="工单号">
          <el-input v-model="query.orderNo" placeholder="请输入" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="巡检计划">
          <el-select v-model="query.plan" placeholder="全部" clearable style="width: 180px">
            <el-option v-for="p in planOptions" :key="p" :label="p" :value="p" />
          </el-select>
        </el-form-item>
        <el-form-item label="工单来源">
          <el-select v-model="query.source" placeholder="全部" clearable style="width: 120px">
            <el-option label="计划生成" value="plan" />
            <el-option label="人工提报" value="manual" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="待接收" value="pending" />
            <el-option label="待处置" value="draft" />
            <el-option label="处置中" value="handling" />
            <el-option label="已处置" value="completed" />
          </el-select>
        </el-form-item>
        <el-form-item label="计划时间">
          <el-date-picker v-model="query.dateRange" type="daterange" range-separator="至" start-placeholder="开始" end-placeholder="结束" value-format="YYYY-MM-DD" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="applyFilters">查询</el-button>
          <el-button :icon="Refresh" @click="resetQuery">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="io-actions">
        <el-button type="primary" :icon="Plus" @click="openCreateOrder">新建工单</el-button>
        <span class="io-actions__count">共 {{ total }} 条记录</span>
      </div>

      <el-table :data="tableData" border stripe style="width: 100%">
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="orderNo" label="工单号" width="170" />
        <el-table-column prop="planName" label="巡检计划" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">{{ row.source === 'manual' ? '-' : row.planName }}</template>
        </el-table-column>
        <el-table-column label="工单来源" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.source === 'manual' ? 'warning' : ''" size="small">{{ row.source === 'manual' ? '人工提报' : '计划生成' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="scopeLabel" label="巡检范围" min-width="160" show-overflow-tooltip />
        <el-table-column prop="scheduledTime" label="工单时间" width="165" />
        <el-table-column label="巡检班组" width="110">
          <template #default="{ row }">
            {{ row.inspectionTeam || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="执行人" width="90">
          <template #default="{ row }">
            {{ row.assignee || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="orderStatusType(row.status)" size="small" effect="dark">
              {{ orderStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'pending' && row.source === 'manual'" link type="primary" size="small" @click="openEditOrder(row)">编辑</el-button>
            <el-button v-if="row.status === 'pending' && row.source === 'manual'" link type="danger" size="small" @click="handleDeleteOrder(row)">删除</el-button>
            <el-button v-if="row.status === 'pending'" link type="success" size="small" @click="receiveOrder(row)">接收</el-button>
            <el-button v-if="row.status === 'draft'" link type="danger" size="small" @click="returnOrder(row)">退回</el-button>
            <el-button v-if="row.status === 'draft' || row.status === 'handling'" link type="warning" size="small" @click="openHandle(row)">处置</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="io-pagination">
        <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" @change="applyFilters" />
      </div>
    </div>

    <!-- 处置抽屉 -->
    <el-drawer v-model="handleVisible" title="巡检处置" direction="rtl" size="850px" :close-on-click-modal="false">
      <template #header>
        <div class="io-drawer-header">
          <span class="io-drawer-header__title">巡检处置</span>
          <span class="io-drawer-header__sub">{{ currentOrder?.orderNo }} · {{ currentOrder?.planName }}</span>
        </div>
      </template>
      <div class="io-drawer-body">
        <div class="io-handle-layout">
          <div class="io-handle-left">
            <div class="io-handle-left__title">巡检设备（{{ handleDevices.length }}）</div>
            <div class="io-handle-left__list">
              <div
                v-for="(dev, idx) in handleDevices"
                :key="dev.key"
                class="io-device-item"
                :class="{ 'io-device-item--active': currentDeviceIdx === idx, 'io-device-item--done': isDeviceDone(idx) }"
                @click="currentDeviceIdx = idx"
              >
                <div class="io-device-item__status">
                  <el-icon v-if="isDeviceAllNormal(idx)" :size="14" color="#67c23a"><CircleCheckFilled /></el-icon>
                  <el-icon v-else-if="isDeviceDone(idx)" :size="14" color="#f56c6c"><WarningFilled /></el-icon>
                  <el-icon v-else :size="14" color="#c0c4cc"><CircleCheck /></el-icon>
                </div>
                <div class="io-device-item__info">
                  <span class="io-device-item__name">{{ dev.name }}</span>
                  <span class="io-device-item__meta">{{ dev.type }} · {{ dev.location }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="io-handle-right" v-if="currentDevice">
            <div class="io-handle-right__header">
              <span class="io-handle-right__title">{{ currentDevice.name }}</span>
              <el-button size="small" type="primary" @click="setAllNormal">全部正常</el-button>
            </div>
            <div class="io-handle-right__items">
              <div v-for="(item, i) in currentDevice.items" :key="i" class="io-inspect-item">
                <div class="io-inspect-item__row">
                  <div class="io-inspect-item__info">
                    <span class="io-inspect-item__name">{{ item.name }}</span>
                    <span class="io-inspect-item__std">{{ item.standard }}</span>
                  </div>
                  <el-radio-group v-model="item.result" size="small">
                    <el-radio value="normal">正常</el-radio>
                    <el-radio value="abnormal">异常</el-radio>
                  </el-radio-group>
                </div>
                <div v-if="item.result === 'abnormal'" class="io-inspect-item__abnormal">
                  <el-radio-group v-model="item.fixType" size="small">
                    <el-radio value="onsite">现场处理</el-radio>
                    <el-radio value="repair">需维修</el-radio>
                  </el-radio-group>
                  <el-input v-model="item.fixDesc" size="small" placeholder="请描述处理方式或异常情况" style="margin-top: 8px" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="io-drawer-footer">
          <el-button @click="handleVisible = false">取消</el-button>
          <el-button @click="saveDraft">暂存</el-button>
          <el-button type="primary" @click="confirmHandle">提交处置</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 新建/编辑工单抽屉 -->
    <el-drawer v-model="createOrderVisible" :title="editingOrderId ? '编辑工单' : '新建工单'" direction="rtl" size="580px" :close-on-click-modal="false">
      <template #header>
        <span class="io-drawer-header__title">{{ editingOrderId ? '编辑工单' : '新建工单' }}</span>
      </template>
      <div class="io-drawer-body">
        <el-form ref="createOrderFormRef" :model="createOrderForm" :rules="createOrderRules" label-width="95px" size="small">
          <el-form-item label="巡检班组" prop="inspectionTeam">
            <el-select v-model="createOrderForm.inspectionTeam" placeholder="请选择" style="width: 100%">
              <el-option v-for="t in inspectionTeams" :key="t" :label="t" :value="t" />
            </el-select>
          </el-form-item>
          <el-form-item label="工单时间" prop="scheduledTime">
            <el-date-picker v-model="createOrderForm.scheduledTime" type="datetime" placeholder="选择时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          </el-form-item>
          <el-form-item label="发布人" prop="publisher">
            <el-input v-model="createOrderForm.publisher" placeholder="默认当前登录人" />
          </el-form-item>
          <el-form-item label="巡检范围">
            <div class="io-create-device-section">
              <div class="io-create-device-section__header">
                <span class="io-create-device-section__count">已选设备（{{ createOrderDevices.length }}）</span>
                <el-button size="small" type="primary" @click="openDevicePicker">选择巡检设备</el-button>
              </div>
              <el-table :data="createOrderDevices" border size="small" max-height="180" style="width: 100%" v-if="createOrderDevices.length > 0">
                <el-table-column prop="name" label="设备名称" min-width="160" show-overflow-tooltip />
                <el-table-column label="类型" width="70" align="center">
                  <template #default="{ row }">
                    <el-tag size="small">{{ deviceTypeLabel(row.type) }}</el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="location" label="位置" min-width="140" show-overflow-tooltip />
                <el-table-column label="操作" width="50" align="center">
                  <template #default="{ $index }">
                    <el-button link type="danger" size="small" @click="createOrderDevices.splice($index, 1)">移除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div v-else class="io-device-empty">暂未选择巡检设备</div>
            </div>
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="createOrderForm.remark" type="textarea" :rows="2" placeholder="可填写备注信息" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="io-drawer-footer">
          <el-button @click="createOrderVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCreateOrder">{{ editingOrderId ? '保存修改' : '确认创建' }}</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 设备选择弹窗 -->
    <el-dialog v-model="devicePickerVisible" title="选择巡检设备" width="700px" :close-on-click-modal="false">
      <el-form inline size="small" class="io-device-picker-filter">
        <el-form-item label="空间">
          <el-select v-model="pickerFilter.building" placeholder="全部建筑" clearable style="width: 140px" @change="pickerFilter.floor = ''">
            <el-option v-for="b in pickerBuildings" :key="b.value" :label="b.label" :value="b.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="pickerFilter.floor" placeholder="全部楼层" clearable style="width: 120px">
            <el-option v-for="f in pickerFloors" :key="f.value" :label="f.label" :value="f.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="pickerFilter.type" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="dt in pickerDeviceTypes" :key="dt.value" :label="dt.label" :value="dt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input v-model="pickerFilter.keyword" placeholder="请输入" clearable style="width: 140px" />
        </el-form-item>
      </el-form>

      <el-checkbox-group v-model="tempDeviceKeys" class="io-device-picker">
        <div v-for="d in filteredPickerDevices" :key="d.key" class="io-device-picker__item">
          <el-checkbox :value="d.key">
            <span class="io-device-picker__name">{{ d.name }}</span>
            <span class="io-device-picker__meta">{{ deviceTypeLabel(d.type) }} · {{ d.location }}</span>
          </el-checkbox>
        </div>
        <el-empty v-if="filteredPickerDevices.length === 0" description="无匹配设备" :image-size="40" />
      </el-checkbox-group>
      <template #footer>
        <el-button @click="devicePickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmDevicePick">确认选择</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉 -->
    <el-drawer v-model="detailVisible" title="工单详情" direction="rtl" size="850px">
      <template #header>
        <div class="io-drawer-header">
          <span class="io-drawer-header__title">工单详情</span>
          <span class="io-drawer-header__sub">{{ detailOrder?.orderNo }} · {{ detailOrder?.planName }}</span>
        </div>
      </template>
      <div class="io-drawer-body" v-if="detailOrder">
          <el-descriptions :column="3" border size="small" style="margin-bottom: 16px">
            <el-descriptions-item label="巡检计划">{{ detailOrder.source === 'manual' ? '-' : detailOrder.planName }}</el-descriptions-item>
            <el-descriptions-item label="巡检班组">{{ detailOrder.inspectionTeam || '-' }}</el-descriptions-item>
            <el-descriptions-item label="执行人">{{ detailOrder.assignee || '-' }}</el-descriptions-item>
            <el-descriptions-item label="工单时间" span="2">{{ detailOrder.scheduledTime }}</el-descriptions-item>
            <el-descriptions-item label="发布人">{{ detailOrder.publisher || '-' }}</el-descriptions-item>
            <el-descriptions-item label="发布部门">{{ detailOrder.dept || '-' }}</el-descriptions-item>
            <el-descriptions-item label="状态">
              <el-tag :type="orderStatusType(detailOrder.status)" size="small">{{ orderStatusLabel(detailOrder.status) }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>

        <div class="io-handle-layout">
          <div class="io-handle-left">
            <div class="io-handle-left__title">巡检设备（{{ detailDevices.length }}）</div>
            <div class="io-handle-left__list">
              <div
                v-for="(dev, idx) in detailDevices"
                :key="dev.key"
                class="io-device-item"
                :class="{ 'io-device-item--active': detailDeviceIdx === idx }"
                @click="detailDeviceIdx = idx"
              >
                <div class="io-device-item__info">
                  <span class="io-device-item__name">{{ dev.name }}</span>
                  <span class="io-device-item__meta">{{ dev.type }} · {{ dev.location }}</span>
                </div>
                <el-tag v-if="getAbnormalCount(dev) > 0" size="small" type="danger" effect="dark">
                  异常{{ getAbnormalCount(dev) }}项
                </el-tag>
              </div>
            </div>
          </div>

          <div class="io-handle-right" v-if="currentDetailDevice">
            <div class="io-handle-right__header">
              <span class="io-handle-right__title">{{ currentDetailDevice.name }}</span>
            </div>
            <div class="io-handle-right__items">
              <div v-for="(item, i) in currentDetailDevice.items" :key="i" class="io-inspect-item">
                <div class="io-inspect-item__row">
                  <div class="io-inspect-item__info">
                    <span class="io-inspect-item__name">{{ item.name }}</span>
                    <span class="io-inspect-item__std">{{ item.standard }}</span>
                  </div>
                  <div style="text-align: right">
                    <el-tag :type="item.result === 'normal' ? 'success' : item.result === 'abnormal' ? 'danger' : 'info'" size="small" effect="dark">
                      {{ item.result === 'normal' ? '正常' : item.result === 'abnormal' ? '异常' : '未检' }}
                    </el-tag>
                    <div v-if="item.result === 'abnormal'" style="margin-top: 4px; font-size: 12px; color: #606266">
                      {{ item.fixType === 'onsite' ? '现场处理' : '需维修' }}
                    </div>
                    <div v-if="item.fixDesc" style="margin-top: 2px; font-size: 11px; color: #909399">{{ item.fixDesc }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <div class="io-drawer-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { Plus, Search, Refresh, CircleCheck, CircleCheckFilled, WarningFilled } from '@element-plus/icons-vue'
import { ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

interface HandleItem { name: string; standard: string; result: string; fixType: string; fixDesc: string }
interface HandleDevice { key: string; name: string; type: string; location: string; items: HandleItem[] }

interface InspectionOrder {
  id: number; orderNo: string; planName: string; source: string; inspectionTeam: string; scopeLabel: string
  scheduledTime: string; status: string; assignee: string; handleTime: string; handleData: HandleDevice[]
  publisher?: string; dept?: string
}

function orderStatusType(s: string) { const m: Record<string,string>={pending:'info',draft:'warning',handling:'',completed:'success'}; return m[s]||'' }
function orderStatusLabel(s: string) { const m: Record<string,string>={pending:'待接收',draft:'待处置',handling:'处置中',completed:'已处置'}; return m[s]||s }

const planOptions = ['CT楼配电设备日检', '全区域消防设备周检', 'CT楼1F设备月检', 'FF楼全设备周检']
const inspectionTeams = ['巡检一组', '巡检二组', '巡检三组']

const standardMap: Record<string, string> = {
  '配电柜温度检测': '用红外测温仪检测各开关触点、母排连接处温度≤70℃',
  '电压电流测量': '用万用表测量三相电压平衡度、各回路电流在额定范围内',
  '接地电阻检测': '用接地电阻测试仪测量接地电阻≤4Ω',
  '运行电流检测': '用钳形表测量压缩机运行电流应在额定值±10%以内',
  '冷凝器外观检查': '目视检查冷凝器翅片清洁无损坏变形',
  '制冷效果测试': '出风口与进风口温差应在8-12℃',
  '过滤网清洗': '检查过滤网积灰情况并清洗或更换',
  '冷媒压力检查': '接压力表检测高低压侧压力应与标准值一致',
  '灭火器压力检查': '目视检查灭火器压力表指针在绿色区域、瓶体无锈蚀',
  '烟感报警测试': '用烟感测试器触发探测器验证火警信号正常上报',
  '消火栓出水测试': '连接水带开启阀门确认水压满足要求且无渗漏',
  '灯具点亮测试': '逐路开启照明回路确认所有灯具正常点亮无闪烁',
  '照度检测': '用照度计在工作面测量照度不低于标准值300lux',
  '应急灯功能测试': '断开主电源确认应急灯自动点亮持续60分钟以上',
  '轿厢运行平稳性': '乘坐感受轿厢启停是否平稳、有无异常抖动和异响',
  '层门开关测试': '逐层测试厅门开关门动作顺畅、防夹保护是否生效',
  '紧急呼叫测试': '按下紧急呼叫按钮确认与值班室通话清晰',
  '门禁读卡测试': '用有效卡和无效卡分别刷卡验证控制器开/拒动作正常',
  '电锁状态检查': '检查电控锁通电吸合和断电释放动作灵敏可靠',
  '交换机指示灯': '目视检查网络交换机各端口和状态指示灯无红灯告警',
  '机房温湿度': '读取温湿度传感器数值温度18-26℃、湿度40-70%',
  '设备外观完整性': '目视检查设备外壳面板完好无破损变形',
  '防火门闭合检查': '检查防火门自闭器功能正常关闭后密封条无缝隙',
  '水泵运行噪音': '靠近水泵判断运行声音是否正常无异常撞击声',
  '管路渗漏检查': '目视检查各法兰接头阀门密封处是否有水渍或渗漏',
  '压力表读数': '记录进出水压力表读数与系统设计值对比',
}

function getStandard(name: string): string {
  return standardMap[name] || '按设备巡检标准执行'
}

// Mock 工单数据
function mockOrders(): InspectionOrder[] {
  const plans = ['CT楼配电设备日检', '全区域消防设备周检', 'CT楼1F设备月检', 'FF楼全设备周检']
  const scopes = ['4台设备', '3台设备', '6台设备', '4台设备']
  const teams = ['巡检一组', '巡检二组', '巡检三组', '巡检一组']
  const assignees = ['张伟', '李强', '王芳', '赵刚']
  const statuses: string[] = ['completed', 'handling', 'draft', 'pending']

  const orders: InspectionOrder[] = []
  for (let i = 0; i < 22; i++) {
    const day = String(1 + Math.floor(i / 3)).padStart(2, '0')
    const status = i < 14 ? statuses[i % statuses.length] : 'pending'
    orders.push({
      id: 1001 + i,
      orderNo: `XJ202607${String(i + 1).padStart(4, '0')}`,
      planName: plans[i % plans.length],
      source: 'plan',
      inspectionTeam: teams[i % teams.length],
      scopeLabel: scopes[i % scopes.length],
      scheduledTime: `2026-07-${day} ${String(3 + (i % 8) * 3).padStart(2, '0')}:00`,
      status,
      assignee: i < 15 ? assignees[i % assignees.length] : '',
      handleTime: status === 'completed' ? `2026-07-${day} ${String(4 + (i % 8) * 3).padStart(2, '0')}:30` : '',
      handleData: status === 'completed' ? generateHandleResult() : [],
    })
  }
  orders.unshift({ id: 999, orderNo: 'XJ2026070001', planName: '人工提报', source: 'manual', inspectionTeam: '巡检一组', scopeLabel: '2台设备', scheduledTime: '2026-07-08 14:00:00', status: 'pending', assignee: '', handleTime: '', handleData: [] })
  orders.unshift({ id: 998, orderNo: 'XJ2026070002', planName: '人工提报', source: 'manual', inspectionTeam: '巡检二组', scopeLabel: '1台设备', scheduledTime: '2026-07-06 09:00:00', status: 'pending', assignee: '', handleTime: '', handleData: [] })
  return orders
}

function generateHandleResult(): HandleDevice[] {
  return [
    { key: 'dev1', name: '配电柜 A', type: '配电', location: '1F 配电房', items: [
      { name: '配电柜温度检测', standard: getStandard('配电柜温度检测'), result: 'normal', fixType: '', fixDesc: '' },
      { name: '电压电流测量', standard: getStandard('电压电流测量'), result: 'normal', fixType: '', fixDesc: '' },
      { name: '接地电阻检测', standard: getStandard('接地电阻检测'), result: 'normal', fixType: '', fixDesc: '' },
    ]},
    { key: 'dev2', name: '空调主机', type: '空调', location: '1F 空调机房', items: [
      { name: '运行电流检测', standard: getStandard('运行电流检测'), result: 'abnormal', fixType: 'onsite', fixDesc: '调整冷媒压力至标准值' },
      { name: '过滤网清洗', standard: getStandard('过滤网清洗'), result: 'normal', fixType: '', fixDesc: '' },
    ]},
  ]
}

const allOrders = ref<InspectionOrder[]>(mockOrders())

const page = ref(1)
const pageSize = ref(10)
const query = reactive({ orderNo: '', plan: '', source: '', status: '', dateRange: null as [string,string] | null })
const filtered = computed(() => {
  let list = allOrders.value
  if (query.orderNo) list = list.filter(o => o.orderNo.includes(query.orderNo))
  if (query.plan) list = list.filter(o => o.planName === query.plan)
  if (query.source) list = list.filter(o => o.source === query.source)
  if (query.status) list = list.filter(o => o.status === query.status)
  if (query.dateRange?.length === 2) {
    const [s, e] = query.dateRange
    list = list.filter(o => o.scheduledTime.slice(0,10) >= s && o.scheduledTime.slice(0,10) <= e)
  }
  return list
})
const total = computed(() => filtered.value.length)
const tableData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filtered.value.slice(start, start + pageSize.value)
})
function applyFilters() { page.value = 1 }
function resetQuery() { query.orderNo = ''; query.plan = ''; query.source = ''; query.status = ''; query.dateRange = null; page.value = 1 }

function receiveOrder(row: InspectionOrder) {
  ElMessageBox.confirm(
    `确认接收工单「${row.orderNo}」？接收后由您负责执行巡检。`,
    '接收确认',
    { confirmButtonText: '确认接收', cancelButtonText: '取消', type: 'info' }
  ).then(() => {
    row.status = 'draft'
    row.assignee = '张伟'
  }).catch(() => {})
}

function returnOrder(row: InspectionOrder) {
  ElMessageBox.confirm(
    `确认退回工单「${row.orderNo}」？退回后将由班组内其他人重新接收。`,
    '退回确认',
    { confirmButtonText: '确认退回', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    row.status = 'pending'
    row.assignee = ''
  }).catch(() => {})
}

function deviceTypeLabel(v: string): string {
  const m: Record<string, string> = { ac: '空调', lighting: '照明', fire: '消防', elevator: '电梯', electrical: '配电', mechanical: '给排水', door: '门禁', it: '弱电', other: '其他' }
  return m[v] || v
}

const allDeviceList = [
  { key: 'd1', name: '1F 配电柜 A', type: '电气', location: 'CT楼 1F 配电房', space: 'ct-1f' },
  { key: 'd2', name: '1F 空调主机', type: '空调', location: 'CT楼 1F 空调机房', space: 'ct-1f' },
  { key: 'd3', name: '1F 消防泵', type: '消防', location: 'CT楼 1F 泵房', space: 'ct-1f' },
  { key: 'd4', name: '1F 货梯', type: '电梯', location: 'CT楼 1F 大厅北侧', space: 'ct-1f' },
  { key: 'd5', name: '1F 照明回路 A', type: '照明', location: 'CT楼 1F 走廊', space: 'ct-1f' },
  { key: 'd6', name: '1F 门禁控制器 A', type: '门禁', location: 'CT楼 1F 主入口', space: 'ct-1f' },
  { key: 'd7', name: '2F 发电机', type: '电气', location: 'CT楼 2F 发电机房', space: 'ct-2f' },
  { key: 'd8', name: '2F 制冷机组', type: '空调', location: 'CT楼 2F 制冷机房', space: 'ct-2f' },
  { key: 'd9', name: '2F 照明回路 B', type: '照明', location: 'CT楼 2F 办公区', space: 'ct-2f' },
  { key: 'd10', name: 'FF楼 变压器', type: '电气', location: 'FF楼 1F 变电所', space: 'ff-1f' },
  { key: 'd11', name: 'FF楼 发电机组', type: '电气', location: 'FF楼 1F 发电机房', space: 'ff-1f' },
  { key: 'd12', name: 'FF楼 照明回路', type: '照明', location: 'FF楼 S夹层', space: 'ff-s' },
  { key: 'd13', name: 'OB 配电柜', type: '电气', location: 'OB 1F 配电间', space: 'ob-1f' },
  { key: 'd14', name: 'OB 门禁控制器', type: '门禁', location: 'OB 1F 控制室', space: 'ob-1f' },
]

const pickerBuildings = [
  { value: 'ct', label: 'CT楼' }, { value: 'ff', label: 'FF楼' }, { value: 'ob', label: '海关联检大楼(OB)' },
]
const pickerFloorMap: Record<string, { value: string; label: string }[]> = {
  ct: [{ value: 'ct-1f', label: '1F' }, { value: 'ct-2f', label: '2F' }],
  ff: [{ value: 'ff-1f', label: '1F' }, { value: 'ff-s', label: 'S夹层' }],
  ob: [{ value: 'ob-1f', label: '1F' }],
}
const pickerDeviceTypes = [
  { value: '电气', label: '电气' }, { value: '空调', label: '空调' }, { value: '消防', label: '消防' },
  { value: '电梯', label: '电梯' }, { value: '照明', label: '照明' }, { value: '门禁', label: '门禁' },
]
const pickerFilter = reactive({ building: '', floor: '', type: '', keyword: '' })
const pickerFloors = computed(() => pickerFilter.building ? (pickerFloorMap[pickerFilter.building] || []) : [])

const filteredPickerDevices = computed(() => {
  let list = allDeviceList
  if (pickerFilter.building) list = list.filter(d => d.space.startsWith(pickerFilter.building))
  if (pickerFilter.floor) list = list.filter(d => d.space === pickerFilter.floor)
  if (pickerFilter.type) list = list.filter(d => d.type === pickerFilter.type)
  if (pickerFilter.keyword) list = list.filter(d => d.name.includes(pickerFilter.keyword))
  return list
})

let createOrderNextId = 2000
const createOrderVisible = ref(false)
const editingOrderId = ref(0)
const createOrderFormRef = ref<FormInstance>()
const createOrderForm = reactive({ inspectionTeam: '', scheduledTime: '', publisher: '张伟', remark: '' })
const createOrderRules: FormRules = {
  inspectionTeam: [{ required: true, message: '请选择巡检班组', trigger: 'change' }],
  scheduledTime: [{ required: true, message: '请选择计划执行时间', trigger: 'change' }],
}
const createOrderDevices = ref<typeof allDeviceList>([])
const devicePickerVisible = ref(false)
const tempDeviceKeys = ref<string[]>([])

function openCreateOrder() {
  editingOrderId.value = 0
  createOrderForm.inspectionTeam = ''
  const now = new Date()
  createOrderForm.scheduledTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
  createOrderForm.publisher = '张伟'
  createOrderForm.remark = ''
  createOrderDevices.value = []
  createOrderVisible.value = true
}

function openEditOrder(row: InspectionOrder) {
  editingOrderId.value = row.id
  createOrderForm.inspectionTeam = row.inspectionTeam
  createOrderForm.scheduledTime = row.scheduledTime
  createOrderForm.remark = ''
  createOrderDevices.value = []
  createOrderVisible.value = true
}

function openDevicePicker() {
  pickerFilter.building = ''
  pickerFilter.floor = ''
  pickerFilter.type = ''
  pickerFilter.keyword = ''
  tempDeviceKeys.value = createOrderDevices.value.map(d => d.key)
  devicePickerVisible.value = true
}

function confirmDevicePick() {
  createOrderDevices.value = allDeviceList.filter(d => tempDeviceKeys.value.includes(d.key))
  devicePickerVisible.value = false
}

function confirmCreateOrder() {
  createOrderFormRef.value?.validate((valid: boolean) => {
    if (!valid) return
    if (editingOrderId.value) {
      const order = allOrders.value.find(o => o.id === editingOrderId.value)
      if (order) {
        order.inspectionTeam = createOrderForm.inspectionTeam
        order.scheduledTime = createOrderForm.scheduledTime
        order.scopeLabel = `${createOrderDevices.value.length}台设备`
      }
    } else {
      const id = createOrderNextId++
      allOrders.value.unshift({
        id,
        orderNo: `XJ202607${String(id).padStart(4, '0')}`,
        planName: '人工提报',
        source: 'manual',
        inspectionTeam: createOrderForm.inspectionTeam,
        scopeLabel: `${createOrderDevices.value.length}台设备`,
        scheduledTime: createOrderForm.scheduledTime,
        status: 'pending',
        assignee: '',
        handleTime: '',
        handleData: [],
        publisher: createOrderForm.publisher,
        dept: '运维部',
      })
    }
    createOrderVisible.value = false
    applyFilters()
  })
}

function handleDeleteOrder(row: InspectionOrder) {
  ElMessageBox.confirm(
    `确定要删除工单「${row.orderNo}」吗？`,
    '删除确认',
    { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    const idx = allOrders.value.findIndex(o => o.id === row.id)
    if (idx >= 0) allOrders.value.splice(idx, 1)
    applyFilters()
  }).catch(() => {})
}

// 处置状态
const handleVisible = ref(false)
const currentOrder = ref<InspectionOrder | null>(null)
const handleDevices = ref<HandleDevice[]>([])
const currentDeviceIdx = ref(0)
const currentDevice = computed(() => handleDevices.value[currentDeviceIdx.value] || null)

function isDeviceDone(idx: number): boolean {
  return handleDevices.value[idx]?.items.every(i => i.result !== '')
}

function isDeviceAllNormal(idx: number): boolean {
  return handleDevices.value[idx]?.items.every(i => i.result === 'normal')
}

function getAbnormalCount(dev: HandleDevice): number {
  return dev.items.filter(i => i.result === 'abnormal').length
}

function isAllDone(): boolean {
  return handleDevices.value.every(d => d.items.every(i => i.result !== ''))
}

function isAbnormalValid(): boolean {
  return handleDevices.value.every(d => d.items.every(i => {
    if (i.result !== 'abnormal') return true
    return !!i.fixType
  }))
}

function openHandle(row: InspectionOrder) {
  currentOrder.value = row
  currentDeviceIdx.value = 0
  handleDevices.value = [
    { key: 'd1', name: '1F 配电柜 A', type: '配电', location: '1F 配电房', items: [
      { name: '配电柜温度检测', standard: getStandard('配电柜温度检测'), result: '', fixType: '', fixDesc: '' },
      { name: '电压电流测量', standard: getStandard('电压电流测量'), result: '', fixType: '', fixDesc: '' },
      { name: '接地电阻检测', standard: getStandard('接地电阻检测'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd2', name: '1F 空调主机', type: '空调', location: '1F 空调机房', items: [
      { name: '运行电流检测', standard: getStandard('运行电流检测'), result: '', fixType: '', fixDesc: '' },
      { name: '冷凝器外观检查', standard: getStandard('冷凝器外观检查'), result: '', fixType: '', fixDesc: '' },
      { name: '制冷效果测试', standard: getStandard('制冷效果测试'), result: '', fixType: '', fixDesc: '' },
      { name: '过滤网清洗', standard: getStandard('过滤网清洗'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd3', name: '1F 消防泵', type: '消防', location: '1F 泵房', items: [
      { name: '灭火器压力检查', standard: getStandard('灭火器压力检查'), result: '', fixType: '', fixDesc: '' },
      { name: '烟感报警测试', standard: getStandard('烟感报警测试'), result: '', fixType: '', fixDesc: '' },
      { name: '消火栓出水测试', standard: getStandard('消火栓出水测试'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd4', name: '1F 货梯', type: '电梯', location: '1F 大厅北侧', items: [
      { name: '轿厢运行平稳性', standard: getStandard('轿厢运行平稳性'), result: '', fixType: '', fixDesc: '' },
      { name: '层门开关测试', standard: getStandard('层门开关测试'), result: '', fixType: '', fixDesc: '' },
      { name: '紧急呼叫测试', standard: getStandard('紧急呼叫测试'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd5', name: '1F 照明回路 A', type: '照明', location: '1F 走廊', items: [
      { name: '灯具点亮测试', standard: getStandard('灯具点亮测试'), result: '', fixType: '', fixDesc: '' },
      { name: '应急灯功能测试', standard: getStandard('应急灯功能测试'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd6', name: '1F 门禁控制器 A', type: '门禁', location: '1F 主入口', items: [
      { name: '门禁读卡测试', standard: getStandard('门禁读卡测试'), result: '', fixType: '', fixDesc: '' },
      { name: '电锁状态检查', standard: getStandard('电锁状态检查'), result: '', fixType: '', fixDesc: '' },
    ]},
  ]
  handleVisible.value = true
}

function setAllNormal() {
  if (!currentDevice.value) return
  currentDevice.value.items.forEach(i => { i.result = 'normal'; i.fixType = ''; i.fixDesc = '' })
}

function saveDraft() {
  if (!currentOrder.value) return
  currentOrder.value.status = 'handling'
  handleVisible.value = false
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
  currentOrder.value.status = 'completed'
  currentOrder.value.handleTime = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:00`
  handleVisible.value = false
}

// 详情
const detailVisible = ref(false)
const detailOrder = ref<InspectionOrder | null>(null)
const detailDeviceIdx = ref(0)

const detailDevices = computed(() => {
  if (!detailOrder.value) return []
  return detailOrder.value.handleData && detailOrder.value.handleData.length > 0
    ? detailOrder.value.handleData
    : generateDetailDevices()
})
const currentDetailDevice = computed(() => detailDevices.value[detailDeviceIdx.value] || null)

function generateDetailDevices(): HandleDevice[] {
  return [
    { key: 'd1', name: '1F 配电柜 A', type: '配电', location: '1F 配电房', items: [
      { name: '配电柜温度检测', standard: getStandard('配电柜温度检测'), result: '', fixType: '', fixDesc: '' },
      { name: '电压电流测量', standard: getStandard('电压电流测量'), result: '', fixType: '', fixDesc: '' },
      { name: '接地电阻检测', standard: getStandard('接地电阻检测'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd2', name: '1F 空调主机', type: '空调', location: '1F 空调机房', items: [
      { name: '运行电流检测', standard: getStandard('运行电流检测'), result: '', fixType: '', fixDesc: '' },
      { name: '冷凝器外观检查', standard: getStandard('冷凝器外观检查'), result: '', fixType: '', fixDesc: '' },
      { name: '制冷效果测试', standard: getStandard('制冷效果测试'), result: '', fixType: '', fixDesc: '' },
      { name: '过滤网清洗', standard: getStandard('过滤网清洗'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd3', name: '1F 消防泵', type: '消防', location: '1F 泵房', items: [
      { name: '灭火器压力检查', standard: getStandard('灭火器压力检查'), result: '', fixType: '', fixDesc: '' },
      { name: '烟感报警测试', standard: getStandard('烟感报警测试'), result: '', fixType: '', fixDesc: '' },
      { name: '消火栓出水测试', standard: getStandard('消火栓出水测试'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd4', name: '1F 货梯', type: '电梯', location: '1F 大厅北侧', items: [
      { name: '轿厢运行平稳性', standard: getStandard('轿厢运行平稳性'), result: '', fixType: '', fixDesc: '' },
      { name: '层门开关测试', standard: getStandard('层门开关测试'), result: '', fixType: '', fixDesc: '' },
      { name: '紧急呼叫测试', standard: getStandard('紧急呼叫测试'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd5', name: '1F 照明回路 A', type: '照明', location: '1F 走廊', items: [
      { name: '灯具点亮测试', standard: getStandard('灯具点亮测试'), result: '', fixType: '', fixDesc: '' },
      { name: '应急灯功能测试', standard: getStandard('应急灯功能测试'), result: '', fixType: '', fixDesc: '' },
    ]},
    { key: 'd6', name: '1F 门禁控制器 A', type: '门禁', location: '1F 主入口', items: [
      { name: '门禁读卡测试', standard: getStandard('门禁读卡测试'), result: '', fixType: '', fixDesc: '' },
      { name: '电锁状态检查', standard: getStandard('电锁状态检查'), result: '', fixType: '', fixDesc: '' },
    ]},
  ]
}

function openDetail(row: InspectionOrder) {
  detailOrder.value = row
  detailDeviceIdx.value = 0
  detailVisible.value = true
}
</script>

<style scoped>
.io-page { max-width: 1600px; }
.io-search { background: #fafbfc; padding: 16px; border-radius: 4px; margin-bottom: 16px; }
.io-pagination { display: flex; justify-content: flex-end; margin-top: 12px; }

.io-drawer-header { display: flex; flex-direction: column; gap: 4px; width: 100%; padding-right: 40px; }
.io-drawer-header__title { font-size: 18px; font-weight: 600; color: #303133; }
.io-drawer-header__sub { font-size: 13px; color: #909399; }
.io-drawer-body { padding: 0; }
.io-drawer-footer { display: flex; justify-content: flex-end; gap: 8px; }

.io-handle-layout { display: flex; gap: 0; height: 520px; border: 1px solid #ebeef5; border-radius: 4px; overflow: hidden; }

.io-handle-left { width: 200px; min-width: 200px; border-right: 1px solid #ebeef5; display: flex; flex-direction: column; background: #fafbfc; }
.io-handle-left__title { padding: 10px 12px; font-size: 13px; font-weight: 600; color: #303133; border-bottom: 1px solid #ebeef5; }
.io-handle-left__list { flex: 1; overflow-y: auto; }
.io-device-item { display: flex; align-items: center; gap: 8px; padding: 10px 12px; cursor: pointer; font-size: 13px; color: #606266; border-bottom: 1px solid #f2f3f5; transition: all 0.15s; }
.io-device-item:hover { background: #ecf5ff; }
.io-device-item--active { background: #ecf5ff; color: #409eff; font-weight: 600; }
.io-device-item--done { color: #67c23a; }
.io-device-item__name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: block; font-size: 13px; }
.io-device-item__meta { font-size: 11px; color: #909399; display: block; margin-top: 2px; }
.io-device-item__info { flex: 1; min-width: 0; }

.io-handle-right { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.io-handle-right__header { display: flex; align-items: center; justify-content: space-between; padding: 10px 12px; border-bottom: 1px solid #ebeef5; }
.io-handle-right__title { font-size: 14px; font-weight: 600; color: #303133; }
.io-handle-right__items { flex: 1; overflow-y: auto; padding: 8px 12px; }

.io-inspect-item { padding: 12px; border: 1px solid #ebeef5; border-radius: 4px; margin-bottom: 8px; background: #fff; }
.io-inspect-item__row { display: flex; align-items: center; justify-content: space-between; }
.io-inspect-item__info { flex: 1; min-width: 0; padding-right: 12px; }
.io-inspect-item__name { font-size: 13px; font-weight: 600; color: #303133; display: block; }
.io-inspect-item__std { font-size: 11px; color: #909399; display: block; margin-top: 2px; line-height: 1.4; }
.io-inspect-item__abnormal { margin-top: 8px; padding: 10px; background: #fef0f0; border-radius: 4px; }

.io-actions { margin-bottom: 16px; display: flex; align-items: center; gap: 16px; }
.io-actions__count { font-size: 13px; color: #909399; }
.io-create-device-section { margin-top: 0; }
.io-create-device-section__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.io-create-device-section__count { font-size: 13px; color: #606266; }
.io-device-empty { padding: 16px; text-align: center; font-size: 13px; color: #c0c4cc; border: 1px solid #ebeef5; border-radius: 4px; background: #fafbfc; }
.io-device-picker { display: flex; flex-direction: column; gap: 4px; }
.io-device-picker__item { padding: 6px 0; border-bottom: 1px solid #f2f3f5; }
.io-device-picker__name { font-weight: 500; }
.io-device-picker__meta { margin-left: 8px; font-size: 12px; color: #909399; }
.io-device-picker-filter { background: #fafbfc; padding: 12px 16px; border-radius: 4px; margin-bottom: 12px; }
</style>
