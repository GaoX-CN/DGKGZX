<template>
  <div class="aa-page">
    <!-- 搜索栏 -->
    <el-form :model="query" inline class="aa-search">
      <el-form-item label="姓名">
        <el-input v-model="query.keyword" placeholder="请输入姓名" clearable style="width: 190px" />
      </el-form-item>
      <el-form-item label="所属机构">
        <el-select v-model="query.org" placeholder="全部" clearable style="width: 190px">
          <el-option v-for="org in orgOptions" :key="org" :label="org" :value="org" />
        </el-select>
      </el-form-item>
      <el-form-item label="门禁点位">
        <el-select v-model="query.gateId" placeholder="全部" clearable filterable style="width: 215px">
          <el-option v-for="gate in gatePoints" :key="gate.id" :label="gate.name" :value="gate.id" />
        </el-select>
      </el-form-item>
      <el-form-item label="授权状态">
        <el-select v-model="query.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="正常" value="active" />
          <el-option label="待生效" value="pending" />
          <el-option label="已过期" value="expired" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <div class="aa-actions">
      <el-button :icon="Download" @click="handleExport">导出授权清单</el-button>
      <el-button :icon="Refresh" @click="handleRefresh">刷新</el-button>
      <span class="aa-actions__count">筛选结果 {{ total }} 人</span>
    </div>

    <!-- 人员列表 -->
    <el-table
      :data="tableData"
      v-loading="loading"
      border
      stripe
      style="width: 100%"
      @sort-change="handleSortChange"
    >
      <el-table-column type="index" label="序号" width="56" align="center" fixed />
      <el-table-column label="人员" width="110" fixed>
        <template #default="{ row }">
          <span class="aa-two-line__main">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="org" label="所属机构" width="190" show-overflow-tooltip />
      <el-table-column label="已授权门禁点位" prop="gateCount" min-width="360" sortable="custom">
        <template #default="{ row }">
          <div class="aa-gates">
            <el-tag
              v-for="gateName in row.gatePreview"
              :key="gateName"
              size="small"
              effect="plain"
              class="aa-gates__tag"
              :title="gateName"
            >{{ gateName }}</el-tag>
            <el-popover
              v-if="row.gateCount > row.gatePreview.length"
              placement="bottom"
              :width="320"
              trigger="hover"
            >
              <template #reference>
                <span class="aa-gates__more">+{{ row.gateCount - row.gatePreview.length }}</span>
              </template>
              <div class="aa-gates__pop">
                <div v-for="gateName in row.gateNames" :key="gateName" class="aa-gates__pop-item">{{ gateName }}</div>
              </div>
            </el-popover>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="授权有效期" width="196">
        <template #default="{ row }">
          <span class="aa-valid">{{ row.validText }}</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="88" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagTypeOf(row.overallStatus)" size="small" effect="dark">{{ statusLabelOf(row.overallStatus) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="最近变更" width="168">
        <template #default="{ row }">
          <div class="aa-two-line">
            <span class="aa-valid">{{ row.updatedAt }}</span>
            <span class="aa-two-line__sub">{{ row.updatedBy }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="72" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="aa-pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @change="applyFilters"
      />
    </div>

    <!-- 人员门禁授权详情 -->
    <el-drawer v-model="detailVisible" title="人员门禁授权详情" direction="rtl" size="min(880px, 100%)">
      <template v-if="detailRow">
        <div class="aa-detail-head">
          <span class="aa-detail-head__name">{{ detailRow.name }}</span>
          <el-tag size="small" :type="statusTagTypeOf(detailRow.overallStatus)" effect="dark">
            {{ statusLabelOf(detailRow.overallStatus) }}
          </el-tag>
          <span class="aa-detail-head__meta">{{ detailRow.personType }} · {{ detailRow.employment }}</span>
        </div>

        <el-descriptions :column="2" border size="small">
          <el-descriptions-item label="所属机构">{{ detailRow.org }}</el-descriptions-item>
          <el-descriptions-item label="岗位">{{ detailRow.post }}</el-descriptions-item>
          <el-descriptions-item label="门禁卡号">{{ detailRow.cardNo }}</el-descriptions-item>
          <el-descriptions-item label="手机号">{{ detailRow.phone }}</el-descriptions-item>
          <el-descriptions-item label="最近变更" :span="2">{{ detailRow.updatedAt }}（{{ detailRow.updatedBy }}）</el-descriptions-item>
        </el-descriptions>

        <div class="aa-detail-toolbar">
          <span class="aa-detail-toolbar__title">门禁点位明细（{{ detailRow.grants.length }} 个）</span>
        </div>

        <el-table :data="detailRow.grants" border stripe size="small" max-height="360">
          <el-table-column type="index" label="序号" width="52" align="center" />
          <el-table-column label="门禁点位" min-width="260">
            <template #default="{ row }">
              <div class="aa-two-line">
                <span class="aa-two-line__main">{{ gateNameOf(row.gateId) }}</span>
                <span class="aa-two-line__sub">{{ gateSpaceOf(row.gateId) }}</span>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="门禁分组" width="118" show-overflow-tooltip>
            <template #default="{ row }">{{ gateGroupOf(row.gateId) }}</template>
          </el-table-column>
          <el-table-column label="有效期" width="172">
            <template #default="{ row }">{{ validTextOf(row) }}</template>
          </el-table-column>
          <el-table-column label="状态" width="78" align="center">
            <template #default="{ row }">
              <el-tag size="small" :type="statusTagTypeOf(row.status)">{{ statusLabelOf(row.status) }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="设备" width="76" align="center">
            <template #default="{ row }">
              <el-tag size="small" effect="plain" :type="gateOnlineOf(row.gateId) ? 'success' : 'info'">
                {{ gateOnlineOf(row.gateId) ? '在线' : '离线' }}
              </el-tag>
            </template>
          </el-table-column>
        </el-table>
      </template>
      <template #footer>
        <el-button @click="exportPersonDetail">导出该人员清单</el-button>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
/**
 * 门禁授权明细（人员视角）
 *
 * 业务口径：
 *   · 门禁权限配置支持「按人员」「按部门」「按人员组」三种方式，三者叠加生效，
 *     最终都落到具体的人员与门禁点位（一对多）上；本页是该授权结果的查询视图。
 *   · 同一门禁点位被多来源授权时合并为一行，有效期取最宽范围。
 *   · 门禁点位数据基线来自 equip_device_instance 中 def_code=accessControl 的 7 台设备
 *     （冷链仓库门禁、A栋机房门禁、B栋办公区门禁、门禁控制器1F-1_门_1~4），
 *     其余点位按共享空间树 spaceTree 补齐为演示点位，真实点位以设备实例表为准。
 */
import { ref, reactive } from 'vue'
import { Search, Refresh, Download } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

type GrantSourceType = 'person' | 'department' | 'personGroup'
type GrantStatus = 'active' | 'pending' | 'expired'
type SortProp = '' | 'name' | 'gateCount'

interface GrantSource {
  type: GrantSourceType
  name: string
}

interface GrantRecord {
  gateId: string
  sources: GrantSource[]
  validFrom: string
  validTo: string
  status: GrantStatus
}

interface GatePoint {
  id: string
  name: string
  building: string
  floor: string
  area: string
  group: string
  deviceStatus: 'online' | 'offline'
}

interface OrgUnit {
  org: string
  dept: string
  team: string
  post: string
  personType: string
  noPrefix: string
  deptGates: string[]
  groupName: string
  groupGates: string[]
  personalGates: string[]
}

interface PersonRow {
  id: number
  name: string
  employeeNo: string
  org: string
  dept: string
  team: string
  post: string
  personType: string
  phone: string
  cardNo: string
  employment: '在职' | '已离职'
  grants: GrantRecord[]
  gateCount: number
  gateNames: string[]
  gatePreview: string[]
  overallStatus: GrantStatus
  validText: string
  updatedAt: string
  updatedBy: string
}

/* ---------------- 门禁点位 ---------------- */
const gatePoints: GatePoint[] = [
  { id: 'ct-l1-staff-1', name: 'CT楼L1员工出入口-门1', building: 'CT楼', floor: 'L1', area: '员工出入口', group: 'CT楼员工通道', deviceStatus: 'online' },
  { id: 'ct-l1-staff-2', name: 'CT楼L1员工出入口-门2', building: 'CT楼', floor: 'L1', area: '员工出入口', group: 'CT楼员工通道', deviceStatus: 'online' },
  { id: 'ct-l1-elev-1', name: 'CT楼L1电梯厅1号-门', building: 'CT楼', floor: 'L1', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l1-elev-5', name: 'CT楼L1电梯厅5号-门', building: 'CT楼', floor: 'L1', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'offline' },
  { id: 'ct-l2-elev-1', name: 'CT楼L2电梯厅1号-门', building: 'CT楼', floor: 'L2', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l2-dock-1', name: 'CT楼L2装卸货区1-4月台-门', building: 'CT楼', floor: 'L2', area: '装卸货区', group: 'CT楼作业区', deviceStatus: 'online' },
  { id: 'ct-l3-elev-1', name: 'CT楼L3电梯厅1号-门', building: 'CT楼', floor: 'L3', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l3-export-1', name: 'CT楼L3出口卸货区-门1', building: 'CT楼', floor: 'L3', area: '出口卸货区', group: 'CT楼作业区', deviceStatus: 'online' },
  { id: 'ct-l4-elev-1', name: 'CT楼L4电梯厅1号-门', building: 'CT楼', floor: 'L4', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l5-elev-1', name: 'CT楼L5电梯厅1号-门', building: 'CT楼', floor: 'L5', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l5-import-1', name: 'CT楼L5进口提货区-门1', building: 'CT楼', floor: 'L5', area: '进口提货区', group: 'CT楼作业区', deviceStatus: 'offline' },
  { id: 'ct-l6-elev-1', name: 'CT楼L6电梯厅1号-门', building: 'CT楼', floor: 'L6', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l7-elev-1', name: 'CT楼L7电梯厅1号-门', building: 'CT楼', floor: 'L7', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ff-l1-elev-1', name: 'FF楼L1电梯厅1号-门', building: 'FF楼', floor: 'L1', area: '电梯厅', group: 'FF楼通道', deviceStatus: 'online' },
  { id: 'ff-l1-export-1', name: 'FF楼L1货代出口卸货区-门1', building: 'FF楼', floor: 'L1', area: '货代出口卸货区', group: 'FF楼通道', deviceStatus: 'online' },
  { id: 'ff-l1-customs-1', name: 'FF楼L1出口海关查验停靠区-门1', building: 'FF楼', floor: 'L1', area: '出口海关查验停靠区', group: '海关监管区', deviceStatus: 'online' },
  { id: 'ff-l2-elev-1', name: 'FF楼L2电梯厅1号-门', building: 'FF楼', floor: 'L2', area: '电梯厅', group: 'FF楼通道', deviceStatus: 'online' },
  { id: 'ff-l6-elev-1', name: 'FF楼L6电梯厅1号-门', building: 'FF楼', floor: 'L6', area: '电梯厅', group: 'FF楼通道', deviceStatus: 'offline' },
  { id: 'hg-l1-check-1', name: '海关大楼L1查验通道-门1', building: '海关大楼', floor: 'L1', area: '查验通道', group: '海关监管区', deviceStatus: 'online' },
  { id: 'hg-l1-check-2', name: '海关大楼L1查验通道-门2', building: '海关大楼', floor: 'L1', area: '查验通道', group: '海关监管区', deviceStatus: 'online' },
  { id: 'hg-l2-office-1', name: '海关大楼L2办公区-门', building: '海关大楼', floor: 'L2', area: '办公区', group: '办公区', deviceStatus: 'online' },
  { id: 'cold-store', name: '冷链仓库门禁', building: '冷链仓库', floor: 'L1', area: '冷库作业区', group: '冷链作业区', deviceStatus: 'online' },
  { id: 'bldg-a-room', name: 'A栋机房门禁', building: 'A栋', floor: 'L1', area: '机房', group: '设备机房', deviceStatus: 'online' },
  { id: 'bldg-b-office', name: 'B栋办公区门禁', building: 'B栋', floor: '3F', area: '办公区', group: '办公区', deviceStatus: 'online' },
  { id: 'ctrl-1f-1', name: '门禁控制器1F-1_门_1', building: '1F', floor: '1F', area: '公共通道', group: '1F公共通道', deviceStatus: 'online' },
  { id: 'ctrl-1f-2', name: '门禁控制器1F-1_门_2', building: '1F', floor: '1F', area: '公共通道', group: '1F公共通道', deviceStatus: 'online' },
  { id: 'ctrl-1f-3', name: '门禁控制器1F-1_门_3', building: '1F', floor: '1F', area: '公共通道', group: '1F公共通道', deviceStatus: 'offline' },
  { id: 'ctrl-1f-4', name: '门禁控制器1F-1_门_4', building: '1F', floor: '1F', area: '公共通道', group: '1F公共通道', deviceStatus: 'online' },
]

const gateMap = new Map<string, GatePoint>(gatePoints.map(gate => [gate.id, gate]))

function gateNameOf(gateId: string): string {
  return gateMap.get(gateId)?.name || gateId
}
function gateSpaceOf(gateId: string): string {
  const gate = gateMap.get(gateId)
  return gate ? `${gate.building} / ${gate.floor} / ${gate.area}` : '-'
}
function gateGroupOf(gateId: string): string {
  return gateMap.get(gateId)?.group || '-'
}
function gateOnlineOf(gateId: string): boolean {
  return gateMap.get(gateId)?.deviceStatus === 'online'
}

/* ---------------- 组织与人员组 ---------------- */
const orgUnits: OrgUnit[] = [
  {
    org: '园区运营方（管理公司）',
    dept: '运维部',
    team: '机电一班',
    post: '机电运维工程师',
    personType: '园区员工',
    noPrefix: 'YQ',
    deptGates: ['ct-l1-elev-1', 'ct-l2-elev-1', 'ct-l3-elev-1', 'ct-l4-elev-1', 'bldg-a-room', 'ctrl-1f-1'],
    groupName: '机房运维组',
    groupGates: ['bldg-a-room', 'bldg-b-office', 'ctrl-1f-2'],
    personalGates: ['ct-l7-elev-1'],
  },
  {
    org: '园区运营方（管理公司）',
    dept: '运维部',
    team: '机电二班',
    post: '机电运维员',
    personType: '园区员工',
    noPrefix: 'YQ',
    deptGates: ['ct-l5-elev-1', 'ct-l6-elev-1', 'ct-l7-elev-1', 'bldg-a-room', 'ctrl-1f-3'],
    groupName: '消防应急组',
    groupGates: ['ct-l1-staff-1', 'ct-l1-elev-5', 'ct-l7-elev-1'],
    personalGates: ['ct-l4-elev-1'],
  },
  {
    org: '园区运营方（管理公司）',
    dept: '安保部',
    team: '巡逻班',
    post: '安保员',
    personType: '园区员工',
    noPrefix: 'YQ',
    deptGates: ['ct-l1-staff-1', 'ct-l1-staff-2', 'bldg-b-office', 'ctrl-1f-4', 'ff-l1-elev-1'],
    groupName: '夜班值守组',
    groupGates: ['ct-l1-staff-1', 'ct-l1-staff-2', 'ct-l2-dock-1', 'ctrl-1f-4'],
    personalGates: ['ff-l6-elev-1'],
  },
  {
    org: '园区运营方（管理公司）',
    dept: '工程部',
    team: '弱电班',
    post: '弱电技术员',
    personType: '园区员工',
    noPrefix: 'YQ',
    deptGates: ['ct-l2-elev-1', 'ct-l3-elev-1', 'ctrl-1f-1', 'ctrl-1f-2', 'bldg-a-room'],
    groupName: '机房运维组',
    groupGates: ['bldg-a-room', 'bldg-b-office', 'ctrl-1f-2'],
    personalGates: ['ct-l5-elev-1'],
  },
  {
    org: '园区运营方（管理公司）',
    dept: '客服部',
    team: '客服组',
    post: '客服专员',
    personType: '园区员工',
    noPrefix: 'YQ',
    deptGates: ['ct-l1-staff-1', 'ct-l1-elev-1', 'bldg-b-office'],
    groupName: '消防应急组',
    groupGates: ['ct-l1-staff-1', 'ct-l1-elev-5', 'ct-l7-elev-1'],
    personalGates: ['ff-l1-export-1'],
  },
  {
    org: '顺丰航空',
    dept: '操作部',
    team: '夜班作业组',
    post: '操作主管',
    personType: '租户员工',
    noPrefix: 'SF',
    deptGates: ['ct-l2-dock-1', 'ct-l3-export-1', 'ct-l5-import-1', 'ct-l2-elev-1'],
    groupName: '夜班值守组',
    groupGates: ['ct-l1-staff-1', 'ct-l1-staff-2', 'ct-l2-dock-1', 'ctrl-1f-4'],
    personalGates: ['ct-l6-elev-1'],
  },
  {
    org: '菜鸟供应链',
    dept: '仓储部',
    team: '冷链班',
    post: '冷链理货员',
    personType: '租户员工',
    noPrefix: 'CN',
    deptGates: ['cold-store', 'ct-l5-import-1', 'ct-l3-export-1', 'ct-l2-dock-1'],
    groupName: '冷链作业组',
    groupGates: ['cold-store', 'ct-l5-import-1', 'ct-l3-export-1'],
    personalGates: ['ff-l1-export-1'],
  },
  {
    org: '海关',
    dept: '查验科',
    team: '查验一组',
    post: '查验员',
    personType: '海关人员',
    noPrefix: 'HG',
    deptGates: ['hg-l1-check-1', 'hg-l1-check-2', 'hg-l2-office-1', 'ff-l1-customs-1'],
    groupName: '查验协助组',
    groupGates: ['hg-l1-check-1', 'ff-l1-customs-1', 'hg-l2-office-1'],
    personalGates: ['ct-l1-staff-1'],
  },
  {
    org: '边检',
    dept: '勤务科',
    team: '勤务一组',
    post: '勤务员',
    personType: '边检人员',
    noPrefix: 'BJ',
    deptGates: ['hg-l2-office-1', 'ff-l1-elev-1', 'ff-l2-elev-1', 'hg-l1-check-1'],
    groupName: '',
    groupGates: [],
    personalGates: ['hg-l1-check-2'],
  },
]

const personNames = [
  '张海涛', '李文博', '王建军', '陈晓峰', '刘志强', '赵敏华', '孙立新', '周文斌',
  '吴国栋', '郑雅琴', '冯超群', '蒋一帆', '韩雪梅', '杨承志', '徐伟东', '朱红梅',
  '高永强', '林俊杰', '何嘉怡', '罗文辉', '梁伟成', '宋嘉豪', '唐志鹏', '许海峰',
  '邓超然', '曹敏婷', '彭家豪', '曾繁兴', '萧志远', '田建华', '董明轩', '袁立群',
  '潘晓东', '于振海', '蔡文华', '余思远', '杜文杰', '程晓琳', '苏泽楷', '卢嘉荣',
  '范志豪', '石浩然',
]

/* ---------------- 字典 ---------------- */
const statusLabelMap: Record<GrantStatus, string> = {
  active: '正常',
  pending: '待生效',
  expired: '已过期',
}
const statusTagTypeMap: Record<GrantStatus, 'success' | 'warning' | 'danger'> = {
  active: 'success',
  pending: 'warning',
  expired: 'danger',
}

function statusLabelOf(status: GrantStatus): string {
  return statusLabelMap[status]
}
function statusTagTypeOf(status: GrantStatus): 'success' | 'warning' | 'danger' {
  return statusTagTypeMap[status]
}

/* ---------------- 日期工具 ---------------- */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}
function formatDate(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
function shiftDate(days: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  return formatDate(date)
}
const today = formatDate(new Date())

function grantStatusOf(grant: GrantRecord): GrantStatus {
  if (grant.validFrom > today) return 'pending'
  if (grant.validTo && grant.validTo < today) return 'expired'
  return 'active'
}
function mergedValidTo(first: string, second: string): string {
  if (first === '' || second === '') return ''
  return first > second ? first : second
}
function validTextOf(grant: GrantRecord): string {
  return grant.validTo ? `${grant.validFrom} ~ ${grant.validTo}` : `${grant.validFrom} 起 · 长期有效`
}

/* ---------------- Mock 数据 ---------------- */
function buildGrants(unit: OrgUnit, index: number): GrantRecord[] {
  const granted = new Map<string, GrantRecord>()
  const addGrant = (gateId: string, source: GrantSource, validFrom: string, validTo: string) => {
    const existed = granted.get(gateId)
    if (existed) {
      if (!existed.sources.some(item => item.type === source.type && item.name === source.name)) {
        existed.sources.push(source)
      }
      if (validFrom < existed.validFrom) existed.validFrom = validFrom
      existed.validTo = mergedValidTo(existed.validTo, validTo)
      return
    }
    granted.set(gateId, { gateId, sources: [source], validFrom, validTo, status: 'active' })
  }

  const resigned = index % 19 === 0
  const newHire = !resigned && index % 23 === 0

  // 按部门授权：跟随部门/班组，长期有效
  const deptFrom = resigned ? shiftDate(-420) : newHire ? shiftDate(3) : shiftDate(-120)
  const deptTo = resigned ? shiftDate(-6) : ''
  unit.deptGates.forEach(gateId => {
    addGrant(gateId, { type: 'department', name: unit.dept }, deptFrom, deptTo)
  })

  // 按人员组授权：跨机构的人员组，带固定期限
  if (unit.groupName) {
    const groupFrom = resigned ? shiftDate(-300) : newHire ? shiftDate(3) : shiftDate(-45)
    const groupTo = resigned ? shiftDate(-6) : shiftDate(180)
    unit.groupGates.forEach(gateId => {
      addGrant(gateId, { type: 'personGroup', name: unit.groupName }, groupFrom, groupTo)
    })
  }

  // 按人员单独授权：临时或补充授权，每人最多 1 个点位
  if (index % 3 === 0 || index % 7 === 0) {
    const personFrom = resigned ? shiftDate(-200) : newHire ? shiftDate(3) : index % 13 === 6 ? shiftDate(7) : shiftDate(-10)
    const personTo = resigned ? shiftDate(-6) : index % 5 === 0 ? '' : shiftDate(90)
    unit.personalGates.forEach(gateId => {
      addGrant(gateId, { type: 'person', name: '本人' }, personFrom, personTo)
    })
  }

  return Array.from(granted.values()).map(grant => ({ ...grant, status: grantStatusOf(grant) }))
}

function updatedByOf(org: string): string {
  if (org === '海关') return '海关通行管理员'
  if (org === '边检') return '边检通行管理员'
  if (org === '园区运营方（管理公司）') return '园区通行管理员'
  return '机构通行管理员'
}

function buildRows(): PersonRow[] {
  return personNames.map((name, index) => {
    const unit = orgUnits[index % orgUnits.length]
    const grants = buildGrants(unit, index)
    const resigned = index % 19 === 0
    const statuses = grants.map(grant => grant.status)
    const overallStatus: GrantStatus = statuses.includes('active')
      ? 'active'
      : statuses.includes('pending') ? 'pending' : 'expired'

    const effective = grants.filter(grant => grant.status !== 'expired')
    const scope = effective.length ? effective : grants
    const validFrom = scope.reduce((acc, grant) => (grant.validFrom < acc ? grant.validFrom : acc), scope[0].validFrom)
    const validTo = scope.some(grant => grant.validTo === '')
      ? ''
      : scope.reduce((acc, grant) => (grant.validTo > acc ? grant.validTo : acc), scope[0].validTo)

    const gateNames = grants.map(grant => gateNameOf(grant.gateId))

    return {
      id: index + 1,
      name,
      employeeNo: `${unit.noPrefix}${1001 + index}`,
      org: unit.org,
      dept: unit.dept,
      team: unit.team,
      post: unit.post,
      personType: unit.personType,
      phone: `138${String(10000000 + index * 137).slice(-8)}`,
      cardNo: `C${String(88000000 + index * 137).slice(-8)}`,
      employment: resigned ? '已离职' : '在职',
      grants,
      gateCount: grants.length,
      gateNames,
      gatePreview: gateNames.slice(0, 2),
      overallStatus,
      validText: validTo ? `${validFrom} ~ ${validTo}` : `${validFrom} 起 · 长期`,
      updatedAt: `${shiftDate(-(index % 21))} ${pad(8 + (index % 9))}:${pad((index * 7) % 60)}`,
      updatedBy: updatedByOf(unit.org),
    }
  })
}

const allData = ref<PersonRow[]>(buildRows())

/* ---------------- 列表状态 ---------------- */
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const tableData = ref<PersonRow[]>([])
const filteredData = ref<PersonRow[]>([])
const sortProp = ref<SortProp>('')
const sortOrder = ref<'' | 'ascending' | 'descending'>('')

const query = reactive({
  keyword: '',
  org: '',
  gateId: '',
  status: '' as '' | GrantStatus,
})

const orgOptions = Array.from(new Set(orgUnits.map(unit => unit.org)))

function applyFilters() {
  const keyword = query.keyword.trim().toLowerCase()
  let filtered = allData.value.filter(row => {
    const matchedKeyword = !keyword
      || row.name.toLowerCase().includes(keyword)
      || row.employeeNo.toLowerCase().includes(keyword)
      || row.cardNo.toLowerCase().includes(keyword)
      || row.phone.includes(keyword)
    const matchedOrg = !query.org || row.org === query.org
    const matchedGate = !query.gateId || row.grants.some(grant => grant.gateId === query.gateId)
    const matchedStatus = !query.status || row.overallStatus === query.status
    return matchedKeyword && matchedOrg && matchedGate && matchedStatus
  })

  if (sortProp.value === 'gateCount') {
    filtered = [...filtered].sort((a, b) => (sortOrder.value === 'ascending' ? a.gateCount - b.gateCount : b.gateCount - a.gateCount))
  } else if (sortProp.value === 'name') {
    filtered = [...filtered].sort((a, b) => {
      const result = a.name.localeCompare(b.name, 'zh-CN')
      return sortOrder.value === 'ascending' ? result : -result
    })
  }

  filteredData.value = filtered
  total.value = filtered.length
  const start = (page.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}

function handleSearch() {
  page.value = 1
  applyFilters()
}
function handleReset() {
  query.keyword = ''
  query.org = ''
  query.gateId = ''
  query.status = ''
  page.value = 1
  applyFilters()
}
function handleRefresh() {
  loading.value = true
  window.setTimeout(() => {
    allData.value = buildRows()
    applyFilters()
    loading.value = false
    ElMessage.success('授权数据已刷新')
  }, 400)
}
function handleSortChange({ prop, order }: { prop: string; order: string }) {
  sortProp.value = (prop === 'gateCount' || prop === 'name' ? prop : '') as SortProp
  sortOrder.value = (order === 'ascending' || order === 'descending' ? order : '') as '' | 'ascending' | 'descending'
  applyFilters()
}

/* ---------------- 详情 ---------------- */
const detailVisible = ref(false)
const detailRow = ref<PersonRow | null>(null)

function openDetail(row: PersonRow) {
  detailRow.value = row
  detailVisible.value = true
}

function downloadCsv(filename: string, header: string, lines: string[]) {
  const blob = new Blob(['\uFEFF' + header + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function handleExport() {
  if (!filteredData.value.length) {
    ElMessage.warning('当前筛选条件下无可导出数据')
    return
  }
  const header = '姓名,所属机构,岗位,人员类型,门禁点位数,门禁点位,授权有效期,状态\n'
  const lines = filteredData.value.map(row => [
    row.name,
    row.org,
    row.post,
    row.personType,
    String(row.gateCount),
    row.gateNames.join('、'),
    row.validText,
    statusLabelOf(row.overallStatus),
  ].join(','))
  downloadCsv(`门禁授权明细_${today}.csv`, header, lines)
  ElMessage.success(`已导出 ${filteredData.value.length} 名人员的授权清单`)
}

function exportPersonDetail() {
  const row = detailRow.value
  if (!row) return
  const header = '人员姓名,门禁点位,所属空间,门禁分组,有效期,状态,设备状态\n'
  const lines = row.grants.map(grant => [
    row.name,
    gateNameOf(grant.gateId),
    gateSpaceOf(grant.gateId).replace(/\//g, ' '),
    gateGroupOf(grant.gateId),
    validTextOf(grant),
    statusLabelOf(grant.status),
    gateOnlineOf(grant.gateId) ? '在线' : '离线',
  ].join(','))
  downloadCsv(`门禁授权明细_${row.name}.csv`, header, lines)
  ElMessage.success('已导出该人员的门禁授权清单')
}

applyFilters()
</script>

<style scoped>
.aa-page {
  max-width: 1560px;
  padding: 20px;
}
.aa-search {
  padding: 16px 16px 0;
  margin-bottom: 16px;
  border-radius: 4px;
  background: #fafbfc;
}
.aa-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}
.aa-actions__count {
  margin-left: auto;
  font-size: 13px;
  color: #909399;
}
.aa-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}
.aa-two-line {
  display: flex;
  flex-direction: column;
  gap: 2px;
  line-height: 18px;
}
.aa-two-line__main {
  color: #303133;
  font-weight: 500;
}
.aa-two-line__sub {
  font-size: 12px;
  color: #909399;
}
.aa-gates {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}
.aa-gates__tag {
  max-width: 152px;
}
.aa-gates__tag :deep(.el-tag__content) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.aa-gates__more {
  padding: 0 7px;
  font-size: 12px;
  line-height: 22px;
  color: #409eff;
  cursor: pointer;
  border: 1px dashed #b3d8ff;
  border-radius: 4px;
  background: #ecf5ff;
}
.aa-gates__pop {
  display: grid;
  gap: 6px;
  max-height: 260px;
  overflow: auto;
  font-size: 13px;
  color: #606266;
}
.aa-gates__pop-item {
  padding-bottom: 5px;
  border-bottom: 1px dashed #ebeef5;
}
.aa-gates__pop-item:last-child {
  border-bottom: 0;
}
.aa-valid {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}
.aa-detail-head {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}
.aa-detail-head__name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.aa-detail-head__meta {
  margin-left: 4px;
  font-size: 12px;
  color: #909399;
}
.aa-detail-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}
.aa-detail-toolbar__title {
  padding-left: 10px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  border-left: 3px solid #409eff;
}
</style>
