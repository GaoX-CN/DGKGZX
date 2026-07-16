<template>
  <div>
    <div class="mv-page">
      <!-- 搜索栏 -->
      <el-form :model="query" inline class="mv-search">
        <el-form-item label="车牌号">
          <el-input v-model="query.plateNumber" placeholder="请输入" clearable style="width: 150px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="待通行" value="pending" />
            <el-option label="已通行" value="passed" />
            <el-option label="已过期" value="expired" />
            <el-option label="已作废" value="cancelled" />
          </el-select>
        </el-form-item>
        <el-form-item label="登记日期">
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
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 操作栏 -->
      <div class="mv-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新增登记</el-button>
        <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      </div>

      <!-- 记录列表 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        border
        stripe
        style="width: 100%"
        @sort-change="handleSortChange"
      >
        <el-table-column type="index" label="序号" width="60" align="center" fixed />
        <el-table-column prop="plateNumber" label="车牌号" width="130" fixed sortable />
        <el-table-column prop="vehicleType" label="车辆类型" width="100" />
        <el-table-column prop="driver" label="驾驶员" width="100" />
        <el-table-column prop="phone" label="联系方式" width="130" />
        <el-table-column prop="repairItem" label="维修项目" min-width="160" show-overflow-tooltip />
        <el-table-column label="通行时间段" width="170">
          <template #default="{ row }">
            <span class="mv-time-range">{{ row.startTime?.slice(5, 16) }} ~ {{ row.endTime?.slice(5, 16) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center" sortable>
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small" effect="dark">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="registerTime" label="登记时间" width="165" sortable />
        <el-table-column prop="registerBy" label="登记人" width="80" />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">查看</el-button>
            <el-button
              link
              type="primary"
              size="small"
              :disabled="row.status === 'passed' || row.status === 'expired'"
              @click="openEdit(row)"
            >编辑</el-button>
            <el-popconfirm
              v-if="row.status === 'pending'"
              title="确认作废该维修车辆登记？"
              @confirm="cancelRecord(row)"
            >
              <template #reference>
                <el-button link type="warning" size="small">作废</el-button>
              </template>
            </el-popconfirm>
            <el-popconfirm
              v-if="row.status === 'cancelled'"
              title="确认删除该条记录？"
            >
              <template #reference>
                <el-button link type="danger" size="small">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="mv-pagination">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="total, sizes, prev, pager, next, jumper"
          @change="applyFilters"
        />
      </div>
    </div>

    <!-- 新增/编辑抽屉 -->
    <el-drawer
      v-model="formVisible"
      :title="isEditing ? '编辑维修车辆登记' : '新增维修车辆登记'"
      direction="rtl"
      size="min(720px, 100%)"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="110px"
        label-position="right"
      >
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="车牌号" prop="plateNumber">
              <el-input v-model="form.plateNumber" placeholder="如：粤B·12345" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="车辆类型" prop="vehicleType">
              <el-select v-model="form.vehicleType" placeholder="请选择" style="width: 100%">
                <el-option label="小型车" value="小型车" />
                <el-option label="中型车" value="中型车" />
                <el-option label="大型车" value="大型车" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="16">
          <el-col :span="12">
            <el-form-item label="驾驶员" prop="driver">
              <el-input v-model="form.driver" placeholder="请输入姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="联系方式" prop="phone">
              <el-input v-model="form.phone" placeholder="请输入手机号" maxlength="11" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="驾驶员证件号">
          <el-input v-model="form.driverIdNo" placeholder="请输入身份证或其他有效证件号（非必填）" maxlength="30" />
        </el-form-item>
        <el-form-item label="关联报修单">
          <div class="mv-repair-link">
            <el-button link type="primary" @click="openRepairOrderSelector">关联报修单</el-button>
            <span class="mv-form__hint">可关联多条待维修或维修中的报修单</span>
            <div v-if="form.repairOrders.length" class="mv-repair-link__list">
              <div v-for="order in form.repairOrders" :key="order.orderNo" class="mv-repair-link__item">
                <div>
                  <el-link type="primary" :underline="false">{{ order.orderNo }}</el-link>
                  <span class="mv-repair-link__target">{{ order.targetName }}</span>
                </div>
                <el-button link type="danger" :icon="Close" @click="removeRepairOrder(order.orderNo)">移除</el-button>
              </div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="维修项目" prop="repairItem">
           <el-input
             v-model="form.repairItem"
             type="textarea"
             :rows="2"
             placeholder="请描述维修内容"
           />
         </el-form-item>
         <el-row :gutter="16">
           <el-col :span="12">
             <el-form-item label="开始时间" prop="startTime">
               <el-date-picker
                 v-model="form.startTime"
                 type="datetime"
                 placeholder="选择生效时间"
                 value-format="YYYY-MM-DD HH:mm:ss"
                 style="width: 100%"
               />
             </el-form-item>
           </el-col>
           <el-col :span="12">
             <el-form-item label="结束时间" prop="endTime">
               <el-date-picker
                 v-model="form.endTime"
                 type="datetime"
                 placeholder="选择失效时间"
                 value-format="YYYY-MM-DD HH:mm:ss"
                 style="width: 100%"
               />
             </el-form-item>
           </el-col>
          </el-row>
          <el-form-item label="通行道闸" prop="gates">
            <div class="mv-gate-selector">
              <el-button type="primary" plain @click="openGateSelector">选择通行道闸</el-button>
              <div v-if="form.gates.length" class="mv-gate-selector__tags">
                <el-tag v-for="gateId in form.gates" :key="gateId" closable @close="removeGate(gateId)">
                  {{ getGateLabel(gateId) }}
                </el-tag>
              </div>
            </div>
            <div v-if="form.gates.length === 0" class="mv-form__hint">请至少选择一个通行道闸</div>
          </el-form-item>
         <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
        <el-form-item label="附件">
          <el-upload
            :file-list="uploadList"
            multiple
            :auto-upload="false"
            :limit="5"
            list-type="text"
            :on-change="handleUploadChange"
            :on-remove="handleUploadRemove"
          >
            <el-button size="small" type="primary">选择文件</el-button>
            <template #tip>
              <div class="el-upload__tip">支持图片、PDF、Word 等，最多 5 个文件，非必填</div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="submitForm" :loading="submitting">确认</el-button>
      </template>
    </el-drawer>

    <el-dialog
      v-model="gateSelectorVisible"
      title="选择通行道闸"
      width="min(680px, 94vw)"
      :close-on-click-modal="false"
    >
      <el-tree
        ref="gateTreeRef"
        :data="gateTree"
        show-checkbox
        node-key="id"
        :props="{ label: 'label', children: 'children' }"
        @check="handleGateCheck"
        class="mv-gate-tree"
      />
      <template #footer>
        <el-button @click="gateSelectorVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmGateSelection">确认</el-button>
      </template>
    </el-dialog>

    <!-- 详情抽屉（含通行记录） -->
    <el-drawer v-model="detailVisible" title="维修车辆登记详情" direction="rtl" size="min(720px, 100%)">
      <el-descriptions :column="2" border>
        <el-descriptions-item label="车牌号" span="1">{{ detailRow.plateNumber }}</el-descriptions-item>
        <el-descriptions-item label="车辆类型" span="1">{{ detailRow.vehicleType }}</el-descriptions-item>
        <el-descriptions-item label="驾驶员" span="1">{{ detailRow.driver }}</el-descriptions-item>
        <el-descriptions-item label="联系方式" span="1">{{ detailRow.phone }}</el-descriptions-item>
        <el-descriptions-item label="驾驶员证件号" span="2">{{ detailRow.driverIdNo || '-' }}</el-descriptions-item>
        <el-descriptions-item label="关联报修单" span="2">
          <div v-if="detailRow.repairOrders?.length" class="mv-detail__orders">
            <div v-for="order in detailRow.repairOrders" :key="order.orderNo">
              <el-link type="primary" :underline="false">{{ order.orderNo }}</el-link>
              <span> / {{ order.targetName }}</span>
            </div>
          </div>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="维修项目" span="2">{{ detailRow.repairItem }}</el-descriptions-item>
        <el-descriptions-item label="通行时间段" span="2">{{ detailRow.startTime }} ~ {{ detailRow.endTime }}</el-descriptions-item>
        <el-descriptions-item label="通行道闸" span="2">
          <el-tag v-for="g in detailRow.gates" :key="g" size="small" style="margin-right: 6px">{{ getGateLabel(g) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="当前状态" span="1">
          <el-tag :type="statusType(detailRow.status)" size="small" effect="dark">{{ statusLabel(detailRow.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="登记时间" span="1">{{ detailRow.registerTime }}</el-descriptions-item>
        <el-descriptions-item label="登记人" span="1">{{ detailRow.registerBy }}</el-descriptions-item>
        <el-descriptions-item v-if="detailRow.remark" label="备注" span="2">{{ detailRow.remark }}</el-descriptions-item>
        <el-descriptions-item v-if="detailRow.attachments && detailRow.attachments.length > 0" label="附件" span="2">
          <div v-for="a in detailRow.attachments" :key="a.name" class="mv-detail__file">
            <el-icon :size="14" color="#409eff"><Document /></el-icon>
            <el-link type="primary" :underline="false" href="javascript:void(0)">{{ a.name }}</el-link>
          </div>
        </el-descriptions-item>
      </el-descriptions>

      <el-divider />
      <h4 class="mv-detail__section-title">通行记录</h4>
      <el-table
        v-if="detailRow.status === 'passed' || detailRow.status === 'expired'"
        :data="detailPassageRecords"
        border
        style="width: 100%"
      >
        <el-table-column type="index" label="序号" width="55" align="center" />
        <el-table-column prop="gateName" label="道闸名称" width="130" />
        <el-table-column prop="direction" label="方向" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.direction === '进入' ? 'success' : 'info'" size="small">
              {{ row.direction }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="passTime" label="通行时间" width="170" />
        <el-table-column prop="status" label="通行结果" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'success' ? 'success' : 'danger'" size="small" effect="dark">
              {{ row.status === 'success' ? '成功' : '失败' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="mv-detail__empty-passage">
        <el-empty description="该记录暂无通行数据" :image-size="70" />
      </div>

      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-drawer>

    <!-- 关联报修单选择弹窗 -->
    <el-dialog
      v-model="repairOrderVisible"
      title="关联报修单"
      width="min(980px, 94vw)"
      :close-on-click-modal="false"
    >
      <el-alert
        title="仅可关联待维修或维修中的报修单"
        type="info"
        :closable="false"
        show-icon
        class="mv-repair-dialog__alert"
      />
      <el-form :model="repairOrderQuery" inline class="mv-repair-dialog__search">
        <el-form-item label="报修单">
          <el-input
            v-model="repairOrderQuery.keyword"
            placeholder="请输入报修单号或报修对象"
            clearable
            style="width: 230px"
          />
        </el-form-item>
        <el-form-item label="当前状态">
          <el-select v-model="repairOrderQuery.status" placeholder="全部" clearable style="width: 130px">
            <el-option label="待维修" value="plan_approved" />
            <el-option label="维修中" value="executing" />
          </el-select>
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="repairOrderQuery.urgency" placeholder="全部" clearable style="width: 130px">
            <el-option label="一般" value="normal" />
            <el-option label="紧急" value="urgent" />
            <el-option label="非常紧急" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search">查询</el-button>
          <el-button @click="resetRepairOrderQuery">重置</el-button>
        </el-form-item>
      </el-form>
      <el-table
        ref="repairOrderTableRef"
        :data="filteredRepairOrders"
        row-key="orderNo"
        border
        stripe
        max-height="420"
        @selection-change="handleRepairOrderSelection"
      >
        <el-table-column type="selection" width="48" reserve-selection />
        <el-table-column prop="orderNo" label="报修单号" width="150" />
        <el-table-column prop="targetName" label="报修对象" min-width="180" show-overflow-tooltip />
        <el-table-column label="紧急程度" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="repairUrgencyType(row.urgency)" size="small">{{ repairUrgencyLabel(row.urgency) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'executing' ? 'warning' : 'primary'" size="small">
              {{ repairStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="chargePerson" label="负责人" width="90" />
        <el-table-column prop="reportTime" label="报修时间" width="165" />
      </el-table>
      <template #footer>
        <span class="mv-repair-dialog__selected">已选择 {{ pendingRepairOrders.length }} 条</span>
        <el-button @click="repairOrderVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRepairOrders">确认关联</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { Plus, Search, Refresh, Close, Document } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

interface AttachmentItem {
  name: string
  url: string
}

interface RepairOrderLink {
  orderNo: string
  targetName: string
}

interface RepairOrderOption extends RepairOrderLink {
  urgency: 'normal' | 'urgent' | 'critical'
  status: 'plan_approved' | 'executing'
  chargePerson: string
  reportTime: string
}

interface MaintenanceRecord {
  id: number
  plateNumber: string
  vehicleType: string
  driver: string
  driverIdNo: string
  phone: string
  repairItem: string
  repairOrders: RepairOrderLink[]
  gates: string[]
  status: string
  startTime: string
  endTime: string
  registerTime: string
  registerBy: string
  remark: string
  attachments: AttachmentItem[]
}

interface PassageRecord {
  gateName: string
  direction: '进入' | '离开'
  passTime: string
  status: 'success' | 'failed'
}

// Mock 数据生成
function generateMockRecords(): MaintenanceRecord[] {
  const plates = ['粤B·89234', '粤S·6M812', '粤B·A123K', '粤L·3Q567', '粤B·99T21', '粤S·H7089', '粤B·8E432', '粤F·1W035']
  const drivers = ['张伟', '李强', '王芳', '赵刚', '陈丽', '刘洋', '周明', '吴敏']
  const phones = ['13800138001', '13912345678', '15888886666', '13688889999', '15011112222', '18612349876', '13766554433', '15900001111']
  const items = ['空调主机维修', '配电柜检修', '给水管网阀门更换', '消防报警系统调试', '电梯导轨校正', '监控摄像头更换', '发电机组保养', '污水泵维修']
  const gateSets = [['admin-in-1'], ['admin-in-1', 'admin-in-2'], ['admin-out-1'], ['admin-out-1', 'cargo-in-1'], ['cargo-in-1'], ['staff-in-1'], ['admin-in-1', 'cargo-in-1'], ['admin-out-1', 'staff-out-1']]
  const statuses = ['pending', 'passed', 'expired', 'cancelled']
  const registrars = ['管理员', '李主管', '王调度', '赵安全员']

  const records: MaintenanceRecord[] = []
  for (let i = 1; i <= 28; i++) {
    const idx = i % plates.length
    const day = String(6 + Math.floor((i - 1) / 4)).padStart(2, '0')
    const hour = String(8 + (i * 3) % 10).padStart(2, '0')
    const min = String((i * 7) % 60).padStart(2, '0')
    const startH = String(8 + (i * 3) % 8).padStart(2, '0')
    const endH = String(Number(startH) + 2 + (i % 4)).padStart(2, '0')
    records.push({
      id: i,
      plateNumber: plates[idx],
      vehicleType: ['小型车', '中型车', '大型车'][i % 3],
      driver: drivers[idx],
      driverIdNo: i % 3 === 0 ? `440101199${i % 10}010100${i % 10}` : '',
      phone: phones[idx],
      repairItem: items[idx],
      repairOrders: i % 4 === 0 ? [{ orderNo: `BX202607${String((i % 8) + 1).padStart(4, '0')}`, targetName: items[idx] }] : [],
      gates: gateSets[idx],
      status: statuses[i % statuses.length],
      startTime: `2026-06-${day} ${startH}:00:00`,
      endTime: `2026-06-${day} ${endH}:00:00`,
      registerTime: `2026-06-${day} ${hour}:${min}:00`,
      registerBy: registrars[i % registrars.length],
      remark: i % 4 === 0 ? '需提前沟通维修方案' : '',
      attachments: i % 5 === 0 ? [{ name: '维修方案确认单.pdf', url: '#' }, { name: '车辆照片.jpg', url: '#' }] : [],
    })
  }
  return records
}

// 状态映射
function statusType(s: string) {
  return { pending: 'warning', passed: 'primary', expired: 'danger', cancelled: 'info' }[s] || 'info'
}
function statusLabel(s: string) {
  return { pending: '待通行', passed: '已通行', expired: '已过期', cancelled: '已作废' }[s] || s
}

// 常量配置
interface GateTreeNode {
  id: string
  label: string
  children?: GateTreeNode[]
}

const gateTree: GateTreeNode[] = [
  {
    id: 'main',
    label: '主地块',
    children: [
      {
        id: 'admin',
        label: '行政出入口',
        children: [
          { id: 'admin-in-1', label: '进口1' },
          { id: 'admin-in-2', label: '进口2' },
          { id: 'admin-out-1', label: '出口1' },
        ]
      },
      {
        id: 'cargo',
        label: '货运出入口',
        children: [
          { id: 'cargo-in-1', label: '进口1' },
          { id: 'cargo-out-1', label: '出口1' },
          { id: 'cargo-out-2', label: '出口2' },
        ]
      },
      {
        id: 'staff',
        label: '员工通道',
        children: [
          { id: 'staff-in-1', label: '进口1' },
          { id: 'staff-out-1', label: '出口1' },
        ]
      }
    ]
  }
]

const gateLeafIds = ['admin-in-1', 'admin-in-2', 'admin-out-1', 'cargo-in-1', 'cargo-out-1', 'cargo-out-2', 'staff-in-1', 'staff-out-1']

const gateLabelMap: Record<string, string> = {
  'admin-in-1': '行政出入口-进口1',
  'admin-in-2': '行政出入口-进口2',
  'admin-out-1': '行政出入口-出口1',
  'cargo-in-1': '货运出入口-进口1',
  'cargo-out-1': '货运出入口-出口1',
  'cargo-out-2': '货运出入口-出口2',
  'staff-in-1': '员工通道-进口1',
  'staff-out-1': '员工通道-出口1',
}

function getGateLabel(id: string) {
  return gateLabelMap[id] || id
}

// 列表状态
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const allData = ref<MaintenanceRecord[]>([])
const tableData = ref<MaintenanceRecord[]>([])
const query = reactive({
  plateNumber: '',
  status: '',
  dateRange: null as [string, string] | null,
})
const sortBy = ref('')
const sortOrder = ref('')

// 表单状态
const formRef = ref<FormInstance>()
const formVisible = ref(false)
const isEditing = ref(false)
const editingId = ref<number | null>(null)
const submitting = ref(false)
const gateTreeRef = ref()
const uploadList = ref<any[]>([])
const gateSelectorVisible = ref(false)
const pendingGateKeys = ref<string[]>([])
const repairOrderVisible = ref(false)
const repairOrderTableRef = ref()
const pendingRepairOrders = ref<RepairOrderOption[]>([])
const repairOrderQuery = reactive({ keyword: '', status: '', urgency: '' })

const repairOrderOptions: RepairOrderOption[] = [
  { orderNo: 'BX2026070006', targetName: 'CT-140 配电柜', urgency: 'critical', status: 'plan_approved', chargePerson: '刘工', reportTime: '2026-07-06 08:00:00' },
  { orderNo: 'BX2026070007', targetName: 'CT-237 制冷机组', urgency: 'urgent', status: 'executing', chargePerson: '周技师', reportTime: '2026-07-07 08:00:00' },
  { orderNo: 'BX2026070010', targetName: 'FF-130 变压器', urgency: 'normal', status: 'plan_approved', chargePerson: '陈师傅', reportTime: '2026-07-09 10:25:00' },
  { orderNo: 'BX2026070011', targetName: 'FF-701 送风机', urgency: 'urgent', status: 'executing', chargePerson: '孙班长', reportTime: '2026-07-10 09:18:00' },
  { orderNo: 'BX2026070012', targetName: 'OB-119 门禁控制器', urgency: 'critical', status: 'plan_approved', chargePerson: '郑师傅', reportTime: '2026-07-11 14:30:00' },
  { orderNo: 'BX2026070013', targetName: '1F 卸货平台液压升降台', urgency: 'normal', status: 'executing', chargePerson: '赵志强', reportTime: '2026-07-12 16:05:00' },
]

const filteredRepairOrders = computed(() => repairOrderOptions.filter(order => {
  const keyword = repairOrderQuery.keyword.trim().toLowerCase()
  const matchesKeyword = !keyword || order.orderNo.toLowerCase().includes(keyword) || order.targetName.toLowerCase().includes(keyword)
  const matchesStatus = !repairOrderQuery.status || order.status === repairOrderQuery.status
  const matchesUrgency = !repairOrderQuery.urgency || order.urgency === repairOrderQuery.urgency
  return matchesKeyword && matchesStatus && matchesUrgency
}))

function repairUrgencyType(urgency: string) {
  return { normal: 'info', urgent: 'warning', critical: 'danger' }[urgency] || 'info'
}

function repairUrgencyLabel(urgency: string) {
  return { normal: '一般', urgent: '紧急', critical: '非常紧急' }[urgency] || urgency
}

function repairStatusLabel(status: string) {
  return { plan_approved: '待维修', executing: '维修中' }[status] || status
}

function openRepairOrderSelector() {
  resetRepairOrderQuery()
  pendingRepairOrders.value = repairOrderOptions.filter(order => form.repairOrders.some(item => item.orderNo === order.orderNo))
  repairOrderVisible.value = true
  nextTick(() => {
    repairOrderTableRef.value?.clearSelection()
    pendingRepairOrders.value.forEach(order => repairOrderTableRef.value?.toggleRowSelection(order, true))
  })
}

function handleRepairOrderSelection(rows: RepairOrderOption[]) {
  pendingRepairOrders.value = rows
}

function resetRepairOrderQuery() {
  repairOrderQuery.keyword = ''
  repairOrderQuery.status = ''
  repairOrderQuery.urgency = ''
}

function confirmRepairOrders() {
  form.repairOrders = pendingRepairOrders.value.map(({ orderNo, targetName }) => ({ orderNo, targetName }))
  repairOrderVisible.value = false
}

function removeRepairOrder(orderNo: string) {
  form.repairOrders = form.repairOrders.filter(order => order.orderNo !== orderNo)
}

function handleUploadChange(file: any) {
    const idx = uploadList.value.findIndex(f => f.uid === file.uid)
    if (idx === -1) uploadList.value.push(file)
  }
  function handleUploadRemove(_file: any) {
    // el-upload 自动维护 fileList
  }
  function syncUploadToForm() {
    form.attachments = uploadList.value.map(f => ({ name: f.name, url: URL.createObjectURL(f.raw) }))
  }

function handleGateCheck() {
  pendingGateKeys.value = gateTreeRef.value?.getCheckedKeys()?.filter((k: string) => gateLeafIds.includes(k)) ?? []
}

function openGateSelector() {
  pendingGateKeys.value = [...form.gates]
  gateSelectorVisible.value = true
  nextTick(() => {
    gateTreeRef.value?.setCheckedKeys(form.gates)
  })
}

function confirmGateSelection() {
  form.gates = [...pendingGateKeys.value]
  gateSelectorVisible.value = false
}

function removeGate(gateId: string) {
  form.gates = form.gates.filter(id => id !== gateId)
}

const defaultForm = () => {
    const now = new Date()
    const curTime = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:00`
    return {
      plateNumber: '',
      vehicleType: '',
      driver: '',
      driverIdNo: '',
      phone: '',
      repairItem: '',
      repairOrders: [] as RepairOrderLink[],
      gates: [] as string[],
      startTime: curTime,
      endTime: '',
      remark: '',
      attachments: [] as AttachmentItem[],
    }
  }
const form = reactive(defaultForm())

const formRules: FormRules = {
    plateNumber: [{ required: true, message: '请输入车牌号', trigger: 'blur' }],
    vehicleType: [{ required: true, message: '请选择车辆类型', trigger: 'change' }],
    driver: [{ required: true, message: '请输入驾驶员姓名', trigger: 'blur' }],
    phone: [{ required: true, message: '请输入联系方式', trigger: 'blur' }],
    repairItem: [{ required: true, message: '请填写维修项目', trigger: 'blur' }],
    startTime: [
      { required: true, message: '请选择开始时间', trigger: 'change' },
      { validator: (_rule: any, v: string, cb: Function) => {
          if (v && new Date(v) < new Date()) return cb(new Error('开始时间不能早于当前时间'))
          cb()
        }, trigger: 'change' },
    ],
    endTime: [
      { required: true, message: '请选择结束时间', trigger: 'change' },
      { validator: (_rule: any, v: string, cb: Function) => {
          if (v && form.startTime && new Date(v) <= new Date(form.startTime)) return cb(new Error('结束时间必须晚于开始时间'))
          cb()
        }, trigger: 'change' },
    ],
    gates: [{ type: 'array', min: 1, message: '请至少选择一个通行道闸', trigger: 'change' }],
  }

// 详情状态
const detailVisible = ref(false)
const detailRow = ref<MaintenanceRecord>({} as MaintenanceRecord)
const detailPassageRecords = ref<PassageRecord[]>([])

function generatePassageRecords(vehicle: MaintenanceRecord): PassageRecord[] {
  const gates = vehicle.gates
  const baseDay = vehicle.registerTime.slice(0, 10)
  const records: PassageRecord[] = []
  gates.forEach((gateId, idx) => {
    records.push({
      gateName: getGateLabel(gateId),
      direction: '进入',
      passTime: `${baseDay} ${8 + idx * 2}:${idx * 15 + 5}`.replace(/\b(\d)\b/g, '0$1'),
      status: 'success',
    })
    records.push({
      gateName: getGateLabel(gateId),
      direction: '离开',
      passTime: `${baseDay} ${8 + idx * 2 + 1}:${idx * 15 + 20}`.replace(/\b(\d)\b/g, '0$1'),
      status: idx % 3 === 2 ? 'failed' : 'success',
    })
  })
  return records
}

function cancelRecord(row: MaintenanceRecord) {
  const idx = allData.value.findIndex(r => r.id === row.id)
  if (idx !== -1) {
    allData.value[idx].status = 'cancelled'
    applyFilters()
  }
}

// 列表过滤
function applyFilters() {
  let filtered = allData.value
  if (query.plateNumber) {
    filtered = filtered.filter(r => r.plateNumber.includes(query.plateNumber))
  }
  if (query.status) {
    filtered = filtered.filter(r => r.status === query.status)
  }
  if (query.dateRange && query.dateRange.length === 2) {
    const [start, end] = query.dateRange
    filtered = filtered.filter(r => {
      const day = r.registerTime.slice(0, 10)
      return day >= start && day <= end
    })
  }
  if (sortBy.value) {
    filtered = [...filtered].sort((a, b) => {
      const va = (a as any)[sortBy.value]
      const vb = (b as any)[sortBy.value]
      if (typeof va === 'string') {
        return sortOrder.value === 'ascending' ? va.localeCompare(vb) : vb.localeCompare(va)
      }
      return sortOrder.value === 'ascending' ? va - vb : vb - va
    })
  }
  total.value = filtered.length
  const start = (page.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

function handleSearch() { page.value = 1; applyFilters() }
function handleReset() {
  query.plateNumber = ''
  query.status = ''
  query.dateRange = null
  page.value = 1
  applyFilters()
}
function handleRefresh() {
  loading.value = true
  setTimeout(() => {
    allData.value = generateMockRecords()
    applyFilters()
    loading.value = false
  }, 400)
}
function handleSortChange({ prop, order }: { prop: string; order: string }) {
  sortBy.value = prop || ''
  sortOrder.value = order || ''
  applyFilters()
}

// 新增/编辑
function openCreate() {
  isEditing.value = false
  editingId.value = null
  Object.assign(form, defaultForm())
  uploadList.value = []
  formVisible.value = true
  pendingGateKeys.value = []
}
function openEdit(row: MaintenanceRecord) {
  isEditing.value = true
  editingId.value = row.id
  Object.assign(form, {
    plateNumber: row.plateNumber,
    vehicleType: row.vehicleType,
    driver: row.driver,
    driverIdNo: row.driverIdNo,
    phone: row.phone,
    repairItem: row.repairItem,
    repairOrders: row.repairOrders.map(order => ({ ...order })),
    gates: [...row.gates],
    startTime: row.startTime,
    endTime: row.endTime,
    remark: row.remark,
    attachments: [...row.attachments],
  })
  uploadList.value = row.attachments.map(a => ({ name: a.name, url: a.url, uid: Date.now() + Math.random() }))
  pendingGateKeys.value = [...row.gates]
  formVisible.value = true
}
function submitForm() {
  formRef.value?.validate(valid => {
    if (!valid) return
    syncUploadToForm()
    submitting.value = true
    setTimeout(() => {
      const now = new Date()
      const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
      if (isEditing.value && editingId.value) {
        const idx = allData.value.findIndex(r => r.id === editingId.value)
        if (idx !== -1) {
          const wasCancelled = allData.value[idx].status === 'cancelled'
          allData.value[idx] = { ...allData.value[idx], ...form, id: editingId.value }
          allData.value[idx].repairOrders = form.repairOrders.map(order => ({ ...order }))
          if (wasCancelled) allData.value[idx].status = 'pending'
        }
      } else {
        const newId = Math.max(...allData.value.map(r => r.id), 0) + 1
        allData.value.unshift({
          id: newId,
          ...form,
          gates: [...form.gates],
          repairOrders: form.repairOrders.map(order => ({ ...order })),
          status: 'pending',
          registerTime: ts,
          registerBy: '当前管理员',
        })
      }
      applyFilters()
      submitting.value = false
      formVisible.value = false
    }, 500)
  })
}
// 详情
function openDetail(row: MaintenanceRecord) {
  detailRow.value = row
  detailPassageRecords.value = (row.status === 'passed')
    ? generatePassageRecords(row)
    : []
  detailVisible.value = true
}

// 初始化
allData.value = generateMockRecords()
applyFilters()
</script>

<style scoped>
.mv-page {
  max-width: 1400px;
}
.mv-search {
  background: #fafbfc;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}
.mv-actions {
  margin-bottom: 16px;
  display: flex;
  gap: 8px;
}
.mv-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.mv-form__hint {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}
.mv-repair-link {
  width: 100%;
}
.mv-gate-selector {
  width: 100%;
}
.mv-gate-selector__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}
.mv-repair-link > .mv-form__hint {
  margin-left: 8px;
}
.mv-repair-link__list {
  margin-top: 6px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
}
.mv-repair-link__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
}
.mv-repair-link__item:last-child {
  border-bottom: 0;
}
.mv-repair-link__target {
  margin-left: 10px;
  color: #606266;
}
.mv-repair-dialog__alert {
  margin-bottom: 16px;
}
.mv-repair-dialog__search {
  padding: 12px 12px 0;
  margin-bottom: 16px;
  background: #f5f7fa;
  border-radius: 4px;
}
.mv-repair-dialog__selected {
  margin-right: 12px;
  color: #606266;
}
.mv-detail__orders {
  display: grid;
  gap: 4px;
}
.mv-time-range {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}
.mv-gate-popover {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.mv-detail__section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}
.mv-detail__empty-passage {
  margin: 8px 0;
}
.mv-detail__file {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-right: 16px;
  margin-bottom: 4px;
}
.mv-gate-tree {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 6px 12px;
  max-height: 150px;
  overflow-y: auto;
  width: 100%;
}
@media (max-width: 640px) {
  .mv-repair-link > .mv-form__hint {
    display: block;
    margin-left: 0;
  }
  .mv-repair-link__item {
    align-items: flex-start;
  }
  .mv-repair-link__target {
    display: block;
    margin-left: 0;
  }
}
</style>
