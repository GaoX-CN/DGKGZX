<template>
  <div class="arp-page">
    <!-- 搜索栏 -->
    <el-form :model="query" inline class="arp-search">
      <el-form-item label="被授权人员">
        <el-input v-model="query.keyword" placeholder="请输入姓名/卡号" clearable style="width: 190px" />
      </el-form-item>
      <el-form-item label="所属机构">
        <el-select v-model="query.org" placeholder="全部" clearable style="width: 200px">
          <el-option v-for="org in orgOptions" :key="org" :label="org" :value="org" />
        </el-select>
      </el-form-item>
      <el-form-item label="受控门禁点位">
        <el-select v-model="query.gateId" placeholder="全部" clearable filterable style="width: 240px">
          <el-option v-for="gate in gatePoints" :key="gate.id" :label="gate.name" :value="gate.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <div class="arp-actions">
      <el-button type="primary" :disabled="selection.length === 0" @click="openBatchReview">批量审核</el-button>
      <span v-if="selection.length > 0" class="arp-actions__count">已选 {{ selection.length }} 人</span>
    </div>

    <!-- 待审核列表 -->
    <el-table
      ref="tableRef"
      :data="tableData"
      v-loading="loading"
      border
      stripe
      style="width: 100%"
      row-key="id"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="45" reserve-selection />
      <el-table-column type="index" label="序号" width="56" align="center" fixed />
      <el-table-column prop="personName" label="被授权人员" width="120" fixed show-overflow-tooltip />
      <el-table-column prop="org" label="所属机构" width="190" show-overflow-tooltip />
      <el-table-column label="受控门禁点位" min-width="380">
        <template #default="{ row }">
          <div class="arp-gates">
            <el-tag
              v-for="gateName in row.gatePreview"
              :key="gateName"
              size="small"
              effect="plain"
              class="arp-gates__tag"
              :title="gateName"
            >{{ gateName }}</el-tag>
            <el-popover
              v-if="row.gateCount > row.gatePreview.length"
              placement="bottom"
              :width="320"
              trigger="hover"
            >
              <template #reference>
                <span class="arp-gates__more">+{{ row.gateCount - row.gatePreview.length }}</span>
              </template>
              <div class="arp-gates__pop">
                <div v-for="gateName in row.gateNames" :key="gateName" class="arp-gates__pop-item">{{ gateName }}</div>
              </div>
            </el-popover>
          </div>
        </template>
      </el-table-column>
      <el-table-column prop="submittedBy" label="提交人" width="130" show-overflow-tooltip />
      <el-table-column prop="submittedAt" label="提交时间" width="150" />
      <el-table-column label="操作" width="96" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openReview(row)">审核</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="arp-pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
      />
    </div>

    <!-- 审核抽屉 -->
    <el-drawer
      v-model="reviewVisible"
      title="门禁授权审核"
      direction="rtl"
      size="min(760px, 100%)"
      :close-on-click-modal="false"
    >
      <template v-if="currentRow">
        <div class="arp-detail-head">
          <span class="arp-detail-head__name">{{ currentRow.personName }}</span>
          <el-tag size="small" type="warning" effect="dark">待审核</el-tag>
          <span class="arp-detail-head__meta">{{ currentRow.org }} · {{ currentRow.post }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="门禁卡号">{{ currentRow.cardNo }}</el-descriptions-item>
          <el-descriptions-item label="提交人">{{ currentRow.submittedBy }}</el-descriptions-item>
          <el-descriptions-item label="提交时间" :span="2">{{ currentRow.submittedAt }}</el-descriptions-item>
        </el-descriptions>

        <div class="arp-section-title">申请门禁点位（{{ currentRow.gateCount }} 个）</div>
        <el-table :data="currentGates" border stripe size="small" max-height="300">
          <el-table-column type="index" label="序号" width="52" align="center" />
          <el-table-column label="门禁点位" min-width="240">
            <template #default="{ row }">
              <div class="arp-two-line">
                <span class="arp-two-line__main">{{ row.name }}</span>
                <span class="arp-two-line__sub">{{ gateSpaceOf(row.id) }}</span>
              </div>
            </template>
          </el-table-column>
        </el-table>

        <div class="arp-section-title">审核意见</div>
        <el-input
          v-model="reviewRemark"
          type="textarea"
          :rows="3"
          maxlength="80"
          show-word-limit
          placeholder="选填；选择不同意时须填写原因"
        />
      </template>

      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button type="danger" @click="submitReview('reject')">不同意</el-button>
        <el-button type="primary" @click="submitReview('approve')">同意</el-button>
      </template>
    </el-drawer>

    <!-- 批量审核 -->
    <el-dialog
      v-model="batchVisible"
      title="批量审核"
      width="680px"
      top="10vh"
      :close-on-click-modal="false"
    >
      <div class="arp-batch-tip">
        本次共选择 {{ selection.length }} 名被授权人员，统一审核为同一结果。
      </div>

      <el-table :data="selection" border stripe size="small" max-height="280">
        <el-table-column type="index" label="序号" width="52" align="center" />
        <el-table-column prop="personName" label="被授权人员" width="120" show-overflow-tooltip />
        <el-table-column prop="org" label="所属机构" min-width="180" show-overflow-tooltip />
        <el-table-column prop="gateCount" label="门禁点位数" width="110" align="center" />
      </el-table>

      <div class="arp-section-title">审核意见</div>
      <el-input
        v-model="batchRemark"
        type="textarea"
        :rows="3"
        maxlength="80"
        show-word-limit
        placeholder="选填；选择不同意时须填写原因"
      />

      <template #footer>
        <el-button @click="batchVisible = false">取消</el-button>
        <el-button type="danger" @click="submitBatchReview('reject')">不同意</el-button>
        <el-button type="primary" @click="submitBatchReview('approve')">同意</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'

/* ---------------- 类型 ---------------- */
interface GatePoint {
  id: string
  name: string
  building: string
  floor: string
  area: string
}

type ReviewResult = 'approve' | 'reject'

interface PendingRecord {
  id: number
  personName: string
  org: string
  post: string
  cardNo: string
  gateIds: string[]
  submittedBy: string
  submittedAt: string
}

interface PendingRow extends PendingRecord {
  gateNames: string[]
  gatePreview: string[]
  gateCount: number
}

/* ---------------- 门禁点位 ---------------- */
const gatePoints: GatePoint[] = [
  { id: 'park-main-gate', name: '园区主大门-人行通道门禁', building: '园区周界', floor: '—', area: '主大门人行通道' },
  { id: 'park-cargo-gate', name: '园区货运通道大门-门禁', building: '园区周界', floor: '—', area: '货运通道' },
  { id: 'park-staff-gate', name: '园区员工通道大门-门禁', building: '园区周界', floor: '—', area: '员工通道' },
  { id: 'park-visitor-gate', name: '园区访客通道大门-门禁', building: '园区周界', floor: '—', area: '访客通道' },
  { id: 'ct-l1-elev-1', name: 'CT楼L1电梯厅1号-门', building: 'CT楼', floor: 'L1', area: '电梯厅' },
  { id: 'ct-l2-elev-1', name: 'CT楼L2电梯厅1号-门', building: 'CT楼', floor: 'L2', area: '电梯厅' },
  { id: 'ct-l3-elev-1', name: 'CT楼L3电梯厅1号-门', building: 'CT楼', floor: 'L3', area: '电梯厅' },
  { id: 'ct-l2-dock-1', name: 'CT楼L2装卸货区1-4月台-门', building: 'CT楼', floor: 'L2', area: '装卸货区' },
  { id: 'ct-l5-import-1', name: 'CT楼L5进口提货区-门1', building: 'CT楼', floor: 'L5', area: '进口提货区' },
  { id: 'ff-l1-customs-1', name: 'FF楼L1出口海关查验停靠区-门1', building: 'FF楼', floor: 'L1', area: '出口海关查验停靠区' },
  { id: 'hg-l1-check-1', name: '海关大楼L1查验通道-门1', building: '海关大楼', floor: 'L1', area: '查验通道' },
  { id: 'hg-l1-check-2', name: '海关大楼L1查验通道-门2', building: '海关大楼', floor: 'L1', area: '查验通道' },
  { id: 'cold-store', name: '冷链仓库门禁', building: '冷链仓库', floor: 'L1', area: '冷库作业区' },
  { id: 'bldg-a-room', name: 'A栋机房门禁', building: 'A栋', floor: 'L1', area: '机房' },
  { id: 'ctrl-1f-1', name: '门禁控制器1F-1_门_1', building: '1F', floor: '1F', area: '公共通道' },
  { id: 'ctrl-1f-2', name: '门禁控制器1F-1_门_2', building: '1F', floor: '1F', area: '公共通道' },
  { id: 'ctrl-1f-3', name: '门禁控制器1F-1_门_3', building: '1F', floor: '1F', area: '公共通道' },
  { id: 'ctrl-1f-4', name: '门禁控制器1F-1_门_4', building: '1F', floor: '1F', area: '公共通道' },
]

const gateMap = new Map<string, GatePoint>(gatePoints.map(gate => [gate.id, gate]))
const gateNameOf = (gateId: string): string => gateMap.get(gateId)?.name || gateId

function gateSpaceOf(gateId: string): string {
  const gate = gateMap.get(gateId)
  if (!gate) return '—'
  return `${gate.building} · ${gate.floor} · ${gate.area}`
}

/* ---------------- 待审核记录 ---------------- */
const seedRecords: PendingRecord[] = [
  {
    id: 1,
    personName: '陈志强',
    org: '顺丰航空',
    post: '分拣主管',
    cardNo: 'SF-20241',
    gateIds: ['park-main-gate', 'park-cargo-gate', 'park-staff-gate'],
    submittedBy: '李伟',
    submittedAt: '2026-11-05 09:12',
  },
  {
    id: 2,
    personName: '黄丽娜',
    org: '菜鸟供应链',
    post: '关务专员',
    cardNo: 'CN-20318',
    gateIds: ['park-main-gate', 'park-visitor-gate'],
    submittedBy: '周敏',
    submittedAt: '2026-11-05 09:05',
  },
  {
    id: 3,
    personName: '吴天成',
    org: '海关',
    post: '查验关员',
    cardNo: 'HG-1072',
    gateIds: ['hg-l1-check-1', 'hg-l1-check-2', 'ff-l1-customs-1'],
    submittedBy: '赵鹏',
    submittedAt: '2026-11-05 08:58',
  },
  {
    id: 4,
    personName: '郑婉仪',
    org: '边检',
    post: '查验员',
    cardNo: 'BJ-2043',
    gateIds: ['park-main-gate', 'park-cargo-gate', 'park-visitor-gate'],
    submittedBy: '何静',
    submittedAt: '2026-11-05 08:47',
  },
  {
    id: 5,
    personName: '林国栋',
    org: '园区物业服务中心',
    post: '设备维修技师',
    cardNo: 'WY-3310',
    gateIds: ['bldg-a-room', 'ctrl-1f-2'],
    submittedBy: '邓超',
    submittedAt: '2026-11-04 17:36',
  },
  {
    id: 6,
    personName: '苏晓云',
    org: '园区运营方（管理公司）',
    post: '弱电工程师',
    cardNo: 'YQ-1108',
    gateIds: ['bldg-a-room', 'ctrl-1f-1'],
    submittedBy: '邓超',
    submittedAt: '2026-11-04 17:20',
  },
  {
    id: 7,
    personName: '罗建平',
    org: '安保外包服务商',
    post: '安保员',
    cardNo: 'AB-5087',
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2', 'ctrl-1f-3', 'ctrl-1f-4', 'park-staff-gate'],
    submittedBy: '邓超',
    submittedAt: '2026-11-04 16:52',
  },
  {
    id: 8,
    personName: '谢丽娟',
    org: '保洁外包服务商',
    post: '保洁员',
    cardNo: 'BJF-2160',
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2'],
    submittedBy: '邓超',
    submittedAt: '2026-11-04 16:40',
  },
  {
    id: 9,
    personName: '麦嘉俊',
    org: '顺丰航空',
    post: '冷链操作员',
    cardNo: 'SF-20655',
    gateIds: ['cold-store', 'ct-l2-dock-1'],
    submittedBy: '李伟',
    submittedAt: '2026-11-04 15:28',
  },
  {
    id: 10,
    personName: '冯雪梅',
    org: '菜鸟供应链',
    post: '仓储调度',
    cardNo: 'CN-20477',
    gateIds: ['cold-store', 'ct-l5-import-1'],
    submittedBy: '周敏',
    submittedAt: '2026-11-04 15:10',
  },
  {
    id: 11,
    personName: '谭志明',
    org: '顺丰航空',
    post: '分拣员',
    cardNo: 'SF-20512',
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2', 'ctrl-1f-3', 'ctrl-1f-4'],
    submittedBy: '李伟',
    submittedAt: '2026-11-04 14:35',
  },
  {
    id: 12,
    personName: '蔡洁仪',
    org: '菜鸟供应链',
    post: '关务助理',
    cardNo: 'CN-20390',
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2'],
    submittedBy: '周敏',
    submittedAt: '2026-11-04 14:12',
  },
  {
    id: 13,
    personName: '高伟豪',
    org: '顺丰航空',
    post: '装卸主管',
    cardNo: 'SF-20488',
    gateIds: ['ct-l1-elev-1', 'ct-l2-elev-1', 'ct-l3-elev-1'],
    submittedBy: '李伟',
    submittedAt: '2026-11-04 11:50',
  },
  {
    id: 14,
    personName: '石嘉欣',
    org: '菜鸟供应链',
    post: '运输协调',
    cardNo: 'CN-20501',
    gateIds: ['ct-l1-elev-1', 'ct-l2-elev-1', 'ct-l3-elev-1'],
    submittedBy: '周敏',
    submittedAt: '2026-11-04 11:32',
  },
  {
    id: 15,
    personName: '何家豪',
    org: '海关',
    post: '监管关员',
    cardNo: 'HG-1105',
    gateIds: ['hg-l1-check-1', 'hg-l1-check-2'],
    submittedBy: '赵鹏',
    submittedAt: '2026-11-04 10:26',
  },
  {
    id: 16,
    personName: '温美玲',
    org: '边检',
    post: '旅检员',
    cardNo: 'BJ-2088',
    gateIds: ['park-main-gate', 'park-visitor-gate'],
    submittedBy: '何静',
    submittedAt: '2026-11-04 10:04',
  },
]

const records = ref<PendingRecord[]>(seedRecords.map(record => ({ ...record, gateIds: [...record.gateIds] })))

function toRow(record: PendingRecord): PendingRow {
  const gateNames = record.gateIds.map(gateNameOf)
  return {
    ...record,
    gateNames,
    gatePreview: gateNames.slice(0, 2),
    gateCount: gateNames.length,
  }
}

/* ---------------- 列表 ---------------- */
const orgOptions = Array.from(new Set(seedRecords.map(record => record.org)))

const query = reactive({
  keyword: '',
  org: '',
  gateId: '',
})

const applied = reactive({
  keyword: '',
  org: '',
  gateId: '',
})

const page = ref(1)
const pageSize = ref(10)
const loading = ref(false)

const filteredRows = computed<PendingRow[]>(() => {
  const keyword = applied.keyword.trim().toLowerCase()
  return records.value
    .map(toRow)
    .filter(row => {
      if (keyword && !row.personName.toLowerCase().includes(keyword) && !row.cardNo.toLowerCase().includes(keyword)) {
        return false
      }
      if (applied.org && row.org !== applied.org) return false
      if (applied.gateId && !row.gateIds.includes(applied.gateId)) return false
      return true
    })
})

const total = computed(() => filteredRows.value.length)

const tableData = computed(() => {
  const start = (page.value - 1) * pageSize.value
  return filteredRows.value.slice(start, start + pageSize.value)
})

function handleSearch() {
  applied.keyword = query.keyword
  applied.org = query.org
  applied.gateId = query.gateId
  page.value = 1
}

function handleReset() {
  query.keyword = ''
  query.org = ''
  query.gateId = ''
  handleSearch()
}

/* ---------------- 多选 ---------------- */
const tableRef = ref()
const selection = ref<PendingRow[]>([])

function handleSelectionChange(rows: PendingRow[]) {
  selection.value = rows
}

function clearSelection() {
  tableRef.value?.clearSelection()
  selection.value = []
}

/* ---------------- 审核 ---------------- */
const reviewVisible = ref(false)
const reviewRemark = ref('')
const currentRow = ref<PendingRow | null>(null)

const currentGates = computed<GatePoint[]>(() => {
  const row = currentRow.value
  if (!row) return []
  return row.gateIds.map(gateId => gateMap.get(gateId)).filter((gate): gate is GatePoint => Boolean(gate))
})

function openReview(row: PendingRow) {
  currentRow.value = row
  reviewRemark.value = ''
  reviewVisible.value = true
}

function submitReview(result: ReviewResult) {
  const row = currentRow.value
  if (!row) return

  const opinion = reviewRemark.value.trim()
  if (result === 'reject' && !opinion) {
    ElMessage.warning('请填写不同意原因')
    return
  }

  records.value = records.value.filter(record => record.id !== row.id)
  reviewVisible.value = false
  clearSelection()
  if (tableData.value.length === 0 && page.value > 1) page.value -= 1

  ElMessage.success(
    result === 'approve'
      ? `已同意「${row.personName}」的 ${row.gateCount} 个门禁点位授权，权限已下发至门禁设备`
      : `已不同意「${row.personName}」的授权申请，本次授权不生效`
  )
}

/* ---------------- 批量审核 ---------------- */
const batchVisible = ref(false)
const batchRemark = ref('')

function openBatchReview() {
  if (selection.value.length === 0) {
    ElMessage.warning('请先勾选需要审核的人员')
    return
  }
  batchRemark.value = ''
  batchVisible.value = true
}

function submitBatchReview(result: ReviewResult) {
  const rows = selection.value
  if (rows.length === 0) return

  const opinion = batchRemark.value.trim()
  if (result === 'reject' && !opinion) {
    ElMessage.warning('请填写不同意原因')
    return
  }

  const ids = rows.map(row => row.id)
  const gateTotal = rows.reduce((sum, row) => sum + row.gateCount, 0)
  records.value = records.value.filter(record => !ids.includes(record.id))
  batchVisible.value = false
  clearSelection()
  if (tableData.value.length === 0 && page.value > 1) page.value -= 1

  ElMessage.success(
    result === 'approve'
      ? `已同意 ${rows.length} 名人员的 ${gateTotal} 个门禁点位授权，权限已下发至门禁设备`
      : `已不同意 ${rows.length} 名人员的授权申请，本次授权均不生效`
  )
}
</script>

<style scoped lang="scss">
.arp-page {
  max-width: 1560px;
  padding: 20px;
}

.arp-search {
  margin-bottom: 4px;
}

.arp-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.arp-actions__count {
  font-size: 12px;
  color: #909399;
}

.arp-batch-tip {
  margin-bottom: 12px;
  padding: 8px 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafbfc;
}

.arp-gates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.arp-gates__tag {
  max-width: 168px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.arp-gates__more {
  padding: 0 4px;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
}

.arp-gates__pop-item {
  padding: 2px 0;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
}

.arp-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

.arp-detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 12px;
}

.arp-detail-head__name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.arp-detail-head__meta {
  font-size: 12px;
  color: #909399;
}

.arp-section-title {
  margin: 16px 0 8px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.arp-two-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.arp-two-line__main {
  font-size: 13px;
  color: #303133;
}

.arp-two-line__sub {
  font-size: 12px;
  color: #a8abb2;
}
</style>
