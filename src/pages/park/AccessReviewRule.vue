<template>
  <div class="ar-page">
    <!-- 规则说明 -->
    <div class="ar-tip">
      <el-icon class="ar-tip__icon"><InfoFilled /></el-icon>
      <div class="ar-tip__text">
        机构人员申请门禁授权时，系统按「受控机构 + 受控门禁点位」匹配本表：命中启用中的配置，
        则生成待审批记录，由园区运营方（物业）审批通过后才下发至门禁设备；未命中则直接下发、立即生效。
      </div>
    </div>

    <!-- 搜索栏 -->
    <el-form :model="query" inline class="ar-search">
      <el-form-item label="受控机构">
        <el-select v-model="query.org" placeholder="全部" clearable filterable style="width: 200px">
          <el-option v-for="org in orgOptions" :key="org" :label="org" :value="org" />
        </el-select>
      </el-form-item>
      <el-form-item label="受控门禁点位">
        <el-select v-model="query.gateId" placeholder="全部" clearable filterable style="width: 250px">
          <el-option-group v-for="group in gateGroups" :key="group.name" :label="group.name">
            <el-option v-for="gate in group.gates" :key="gate.id" :label="gate.name" :value="gate.id" />
          </el-option-group>
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="query.enabled" placeholder="全部" clearable style="width: 120px">
          <el-option label="启用" value="enabled" />
          <el-option label="停用" value="disabled" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <div class="ar-actions">
      <el-button type="primary" :icon="Plus" @click="openCreate">新增审核配置</el-button>
      <el-button :icon="Aim" @click="openSimulate">规则试算</el-button>
      <el-button :icon="Download" @click="handleExport">导出配置</el-button>
      <span class="ar-actions__count">
        共 {{ total }} 条配置 · 覆盖 {{ stats.orgCount }} 个机构 / {{ stats.gateCount }} 个门禁点位
      </span>
    </div>

    <!-- 配置列表 -->
    <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
      <el-table-column type="index" label="序号" width="56" align="center" fixed />
      <el-table-column label="配置名称" min-width="240">
        <template #default="{ row }">
          <div class="ar-two-line">
            <span class="ar-two-line__main">{{ row.name }}</span>
            <span class="ar-two-line__sub">{{ row.remark || '—' }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="受控机构" min-width="190">
        <template #default="{ row }">
          <div class="ar-tags">
            <el-tag
              v-for="org in row.orgs"
              :key="org"
              size="small"
              effect="plain"
              class="ar-tags__item"
            >{{ org }}</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="受控门禁点位" min-width="460">
        <template #default="{ row }">
          <div class="ar-tags">
            <el-tag
              v-for="gateName in row.gatePreview"
              :key="gateName"
              size="small"
              effect="plain"
              class="ar-tags__item ar-tags__item--gate"
              :title="gateName"
            >{{ gateName }}</el-tag>
            <el-popover
              v-if="row.gateCount > row.gatePreview.length"
              placement="bottom"
              :width="340"
              trigger="hover"
            >
              <template #reference>
                <span class="ar-tags__more">+{{ row.gateCount - row.gatePreview.length }}</span>
              </template>
              <div class="ar-pop">
                <div v-for="gateName in row.gateNames" :key="gateName" class="ar-pop__item">
                  <span class="ar-pop__dot" />{{ gateName }}
                </div>
              </div>
            </el-popover>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="88" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.enabled"
            size="small"
            @change="handleToggle(row)"
          />
        </template>
      </el-table-column>
      <el-table-column label="最近更新" width="150">
        <template #default="{ row }">
          <div class="ar-two-line">
            <span class="ar-valid">{{ row.updatedAt }}</span>
            <span class="ar-two-line__sub">{{ row.updatedBy }}</span>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div class="ar-pagination">
      <el-pagination
        v-model:current-page="page"
        v-model:page-size="pageSize"
        :page-sizes="[10, 20, 50]"
        :total="total"
        layout="total, sizes, prev, pager, next, jumper"
        @change="applyFilters"
      />
    </div>

    <!-- 新增 / 编辑 -->
    <el-dialog
      v-model="formVisible"
      :title="formMode === 'create' ? '新增门禁授权审核配置' : '编辑门禁授权审核配置'"
      width="760px"
      top="7vh"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="118px">
        <el-form-item label="配置名称" prop="name">
          <el-input
            v-model="form.name"
            maxlength="30"
            show-word-limit
            placeholder="如：顺丰航空 · 园区大门授权审核"
          />
        </el-form-item>

        <el-form-item label="受控机构" prop="orgs">
          <el-select
            v-model="form.orgs"
            multiple
            filterable
            collapse-tags
            collapse-tags-tooltip
            placeholder="选择需要受控的机构"
            style="width: 100%"
          >
            <el-option v-for="org in orgOptions" :key="org" :label="org" :value="org" />
          </el-select>
          <div class="ar-form-tip">园区运营方（管理公司）本身是审批方，其自身门禁授权无需纳入受控机构。</div>
        </el-form-item>

        <el-form-item label="受控门禁点位" prop="gateIds">
          <div class="ar-gate-picker">
            <div class="ar-gate-picker__quick">
              <span class="ar-gate-picker__quick-label">按分组快选</span>
              <el-check-tag
                v-for="group in gateGroups"
                :key="group.name"
                :checked="isGroupChecked(group)"
                class="ar-gate-picker__chip"
                @change="toggleGroup(group)"
              >
                {{ group.name }}<span class="ar-gate-picker__chip-count">{{ group.gates.length }}</span>
              </el-check-tag>
            </div>
            <el-select
              v-model="form.gateIds"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="按门禁分组或具体点位选择"
              style="width: 100%"
            >
              <el-option-group v-for="group in gateGroups" :key="group.name" :label="group.name">
                <el-option v-for="gate in group.gates" :key="gate.id" :label="gate.name" :value="gate.id" />
              </el-option-group>
            </el-select>
            <div class="ar-form-tip">
              已选 {{ form.gateIds.length }} 个点位{{ selectedGroupText }}
            </div>
          </div>
        </el-form-item>

        <el-form-item label="审核方">
          <el-tag type="warning" effect="plain">园区运营方（物业）· 园区通行管理员</el-tag>
          <span class="ar-form-tip ar-form-tip--inline">命中后自动生成待审批记录，由该角色审批</span>
        </el-form-item>

        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
          <span class="ar-form-tip ar-form-tip--inline">停用后该配置不再触发审批，相关授权直接下发。</span>
        </el-form-item>

        <el-form-item label="配置说明">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            maxlength="80"
            show-word-limit
            placeholder="选填，如依据的通行管理办法条款"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="formVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 规则试算 -->
    <el-dialog v-model="simulateVisible" title="规则试算" width="580px" top="12vh" destroy-on-close>
      <div class="ar-sim-tip">按「机构 + 门禁点位」校验该授权是否会触发物业审批，用于配置后自检。</div>
      <el-form label-width="96px">
        <el-form-item label="申请机构">
          <el-select v-model="simulate.org" placeholder="选择机构" style="width: 100%">
            <el-option v-for="org in orgOptions" :key="org" :label="org" :value="org" />
          </el-select>
        </el-form-item>
        <el-form-item label="门禁点位">
          <el-select v-model="simulate.gateId" filterable placeholder="选择门禁点位" style="width: 100%">
            <el-option-group v-for="group in gateGroups" :key="group.name" :label="group.name">
              <el-option v-for="gate in group.gates" :key="gate.id" :label="gate.name" :value="gate.id" />
            </el-option-group>
          </el-select>
        </el-form-item>
      </el-form>

      <div
        v-if="simulateResult"
        class="ar-sim-result"
        :class="simulateResult.needApproval ? 'ar-sim-result--warn' : 'ar-sim-result--ok'"
      >
        <el-icon class="ar-sim-result__icon">
          <WarningFilled v-if="simulateResult.needApproval" />
          <CircleCheckFilled v-else />
        </el-icon>
        <div class="ar-sim-result__body">
          <div class="ar-sim-result__title">
            {{ simulateResult.needApproval ? '需物业审批后下发' : '直接下发，立即生效' }}
          </div>
          <div v-if="simulateResult.needApproval" class="ar-sim-result__desc">
            命中配置「{{ simulateResult.ruleName }}」，审核方：{{ simulateResult.auditRole }}；
            审批通过后权限才写入对应门禁设备。
          </div>
          <div v-else-if="simulateResult.disabledRuleName" class="ar-sim-result__desc">
            存在已停用的配置「{{ simulateResult.disabledRuleName }}」，当前不生效，授权直接下发。
          </div>
          <div v-else class="ar-sim-result__desc">
            未命中任何启用中的审核配置，授权直接下发至门禁设备。
          </div>
        </div>
      </div>

      <template #footer>
        <el-button @click="simulateVisible = false">关闭</el-button>
        <el-button type="primary" :disabled="!simulate.org || !simulate.gateId" @click="runSimulate">校验</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Download,
  Aim,
  InfoFilled,
  WarningFilled,
  CircleCheckFilled,
} from '@element-plus/icons-vue'

/* ---------------- 类型 ---------------- */
interface GatePoint {
  id: string
  name: string
  building: string
  floor: string
  area: string
  group: string
  deviceStatus: 'online' | 'offline'
}

interface ReviewRule {
  id: number
  name: string
  orgs: string[]
  gateIds: string[]
  auditRole: string
  enabled: boolean
  remark: string
  updatedBy: string
  updatedAt: string
}

interface RuleRow extends ReviewRule {
  gateCount: number
  gateNames: string[]
  gatePreview: string[]
}

interface SimulateResult {
  needApproval: boolean
  ruleName: string
  auditRole: string
  disabledRuleName: string
}

/* ---------------- 门禁点位 ---------------- */
const gatePoints: GatePoint[] = [
  { id: 'park-main-gate', name: '园区主大门-人行通道门禁', building: '园区周界', floor: '—', area: '主大门人行通道', group: '园区大门', deviceStatus: 'online' },
  { id: 'park-cargo-gate', name: '园区货运通道大门-门禁', building: '园区周界', floor: '—', area: '货运通道', group: '园区大门', deviceStatus: 'online' },
  { id: 'park-staff-gate', name: '园区员工通道大门-门禁', building: '园区周界', floor: '—', area: '员工通道', group: '园区大门', deviceStatus: 'online' },
  { id: 'park-visitor-gate', name: '园区访客通道大门-门禁', building: '园区周界', floor: '—', area: '访客通道', group: '园区大门', deviceStatus: 'offline' },
  { id: 'ct-l1-staff-1', name: 'CT楼L1员工出入口-门1', building: 'CT楼', floor: 'L1', area: '员工出入口', group: 'CT楼员工通道', deviceStatus: 'online' },
  { id: 'ct-l1-staff-2', name: 'CT楼L1员工出入口-门2', building: 'CT楼', floor: 'L1', area: '员工出入口', group: 'CT楼员工通道', deviceStatus: 'online' },
  { id: 'ct-l1-elev-1', name: 'CT楼L1电梯厅1号-门', building: 'CT楼', floor: 'L1', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l1-elev-5', name: 'CT楼L1电梯厅5号-门', building: 'CT楼', floor: 'L1', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'offline' },
  { id: 'ct-l2-elev-1', name: 'CT楼L2电梯厅1号-门', building: 'CT楼', floor: 'L2', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l3-elev-1', name: 'CT楼L3电梯厅1号-门', building: 'CT楼', floor: 'L3', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l4-elev-1', name: 'CT楼L4电梯厅1号-门', building: 'CT楼', floor: 'L4', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l5-elev-1', name: 'CT楼L5电梯厅1号-门', building: 'CT楼', floor: 'L5', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l6-elev-1', name: 'CT楼L6电梯厅1号-门', building: 'CT楼', floor: 'L6', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l7-elev-1', name: 'CT楼L7电梯厅1号-门', building: 'CT楼', floor: 'L7', area: '电梯厅', group: 'CT楼电梯厅', deviceStatus: 'online' },
  { id: 'ct-l2-dock-1', name: 'CT楼L2装卸货区1-4月台-门', building: 'CT楼', floor: 'L2', area: '装卸货区', group: 'CT楼作业区', deviceStatus: 'online' },
  { id: 'ct-l3-export-1', name: 'CT楼L3出口卸货区-门1', building: 'CT楼', floor: 'L3', area: '出口卸货区', group: 'CT楼作业区', deviceStatus: 'online' },
  { id: 'ct-l5-import-1', name: 'CT楼L5进口提货区-门1', building: 'CT楼', floor: 'L5', area: '进口提货区', group: 'CT楼作业区', deviceStatus: 'offline' },
  { id: 'ff-l1-elev-1', name: 'FF楼L1电梯厅1号-门', building: 'FF楼', floor: 'L1', area: '电梯厅', group: 'FF楼通道', deviceStatus: 'online' },
  { id: 'ff-l1-export-1', name: 'FF楼L1货代出口卸货区-门1', building: 'FF楼', floor: 'L1', area: '货代出口卸货区', group: 'FF楼通道', deviceStatus: 'online' },
  { id: 'ff-l2-elev-1', name: 'FF楼L2电梯厅1号-门', building: 'FF楼', floor: 'L2', area: '电梯厅', group: 'FF楼通道', deviceStatus: 'online' },
  { id: 'ff-l6-elev-1', name: 'FF楼L6电梯厅1号-门', building: 'FF楼', floor: 'L6', area: '电梯厅', group: 'FF楼通道', deviceStatus: 'offline' },
  { id: 'ff-l1-customs-1', name: 'FF楼L1出口海关查验停靠区-门1', building: 'FF楼', floor: 'L1', area: '出口海关查验停靠区', group: '海关监管区', deviceStatus: 'online' },
  { id: 'hg-l1-check-1', name: '海关大楼L1查验通道-门1', building: '海关大楼', floor: 'L1', area: '查验通道', group: '海关监管区', deviceStatus: 'online' },
  { id: 'hg-l1-check-2', name: '海关大楼L1查验通道-门2', building: '海关大楼', floor: 'L1', area: '查验通道', group: '海关监管区', deviceStatus: 'online' },
  { id: 'hg-l2-office-1', name: '海关大楼L2办公区-门', building: '海关大楼', floor: 'L2', area: '办公区', group: '办公区', deviceStatus: 'online' },
  { id: 'bldg-b-office', name: 'B栋办公区门禁', building: 'B栋', floor: '3F', area: '办公区', group: '办公区', deviceStatus: 'online' },
  { id: 'cold-store', name: '冷链仓库门禁', building: '冷链仓库', floor: 'L1', area: '冷库作业区', group: '冷链作业区', deviceStatus: 'online' },
  { id: 'bldg-a-room', name: 'A栋机房门禁', building: 'A栋', floor: 'L1', area: '机房', group: '设备机房', deviceStatus: 'online' },
  { id: 'ctrl-1f-1', name: '门禁控制器1F-1_门_1', building: '1F', floor: '1F', area: '公共通道', group: '1F公共通道', deviceStatus: 'online' },
  { id: 'ctrl-1f-2', name: '门禁控制器1F-1_门_2', building: '1F', floor: '1F', area: '公共通道', group: '1F公共通道', deviceStatus: 'online' },
  { id: 'ctrl-1f-3', name: '门禁控制器1F-1_门_3', building: '1F', floor: '1F', area: '公共通道', group: '1F公共通道', deviceStatus: 'offline' },
  { id: 'ctrl-1f-4', name: '门禁控制器1F-1_门_4', building: '1F', floor: '1F', area: '公共通道', group: '1F公共通道', deviceStatus: 'online' },
]

const gateMap = new Map<string, GatePoint>(gatePoints.map(gate => [gate.id, gate]))
const gateNameOf = (gateId: string): string => gateMap.get(gateId)?.name || gateId

const gateGroups = computed(() => {
  const order: string[] = []
  const bucket = new Map<string, GatePoint[]>()
  gatePoints.forEach(gate => {
    if (!bucket.has(gate.group)) {
      bucket.set(gate.group, [])
      order.push(gate.group)
    }
    bucket.get(gate.group)!.push(gate)
  })
  return order.map(name => ({ name, gates: bucket.get(name) || [] }))
})

const orgOptions = ['顺丰航空', '菜鸟供应链', '海关', '边检', '园区运营方（管理公司）']

/* ---------------- 审核配置数据 ---------------- */
const seedRules: ReviewRule[] = [
  {
    id: 1,
    name: '顺丰航空 · 园区大门授权审核',
    orgs: ['顺丰航空'],
    gateIds: ['park-main-gate', 'park-cargo-gate', 'park-staff-gate'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '园区周界大门属公共安全重点部位',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-02 10:24',
  },
  {
    id: 2,
    name: '菜鸟供应链 · 园区大门授权审核',
    orgs: ['菜鸟供应链'],
    gateIds: ['park-main-gate', 'park-cargo-gate'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '园区周界大门属公共安全重点部位',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-02 10:31',
  },
  {
    id: 3,
    name: '边检 · 园区大门授权审核',
    orgs: ['边检'],
    gateIds: ['park-main-gate', 'park-visitor-gate'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-01 16:08',
  },
  {
    id: 4,
    name: '海关 · 海关监管区授权审核',
    orgs: ['海关'],
    gateIds: ['hg-l1-check-1', 'hg-l1-check-2', 'ff-l1-customs-1', 'park-cargo-gate'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '含监管区通道，需与海关确认后开通',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-30 09:45',
  },
  {
    id: 5,
    name: '顺丰航空 · 冷链作业区授权审核',
    orgs: ['顺丰航空'],
    gateIds: ['cold-store', 'ct-l2-dock-1'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '冷链区域作业安全管控',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-28 14:12',
  },
  {
    id: 6,
    name: '菜鸟供应链 · 冷链作业区授权审核',
    orgs: ['菜鸟供应链'],
    gateIds: ['cold-store', 'ct-l5-import-1'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-28 14:20',
  },
  {
    id: 7,
    name: '顺丰航空 · 1F公共通道授权审核',
    orgs: ['顺丰航空'],
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2', 'ctrl-1f-3', 'ctrl-1f-4'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '1F 公共通道连通货站与办公区',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-25 11:05',
  },
  {
    id: 8,
    name: '菜鸟供应链 · 1F公共通道授权审核',
    orgs: ['菜鸟供应链'],
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2'],
    auditRole: '园区运营方（物业）',
    enabled: false,
    remark: '2026-10 起改由机构通行管理员自行管控',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-22 15:37',
  },
  {
    id: 9,
    name: '顺丰航空 / 菜鸟供应链 · CT楼电梯厅授权审核',
    orgs: ['顺丰航空', '菜鸟供应链'],
    gateIds: ['ct-l1-elev-1', 'ct-l2-elev-1', 'ct-l3-elev-1'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '跨机构共用电梯厅，统一由物业管控',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-20 09:18',
  },
  {
    id: 10,
    name: '边检 · 查验通道授权审核',
    orgs: ['边检'],
    gateIds: ['hg-l1-check-1', 'hg-l2-office-1'],
    auditRole: '园区运营方（物业）',
    enabled: true,
    remark: '',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-18 17:02',
  },
  {
    id: 11,
    name: '海关 · 园区访客通道授权审核',
    orgs: ['海关'],
    gateIds: ['park-visitor-gate'],
    auditRole: '园区运营方（物业）',
    enabled: false,
    remark: '专项保障期临时配置，保障期结束后已停用',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-08 10:50',
  },
]

const rules = ref<ReviewRule[]>(seedRules.map(rule => ({ ...rule, orgs: [...rule.orgs], gateIds: [...rule.gateIds] })))

/* ---------------- 行数据 ---------------- */
function toRow(rule: ReviewRule): RuleRow {
  const gateNames = rule.gateIds.map(gateNameOf)
  return {
    ...rule,
    gateCount: gateNames.length,
    gateNames,
    gatePreview: gateNames.slice(0, 2),
  }
}

/* ---------------- 列表 ---------------- */
const query = reactive({
  org: '',
  gateId: '',
  enabled: '' as '' | 'enabled' | 'disabled',
})

const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const tableData = ref<RuleRow[]>([])
const filteredRows = ref<RuleRow[]>([])

const stats = computed(() => {
  const rows = rules.value
  const orgs = new Set<string>()
  const gates = new Set<string>()
  rows.forEach(rule => {
    rule.orgs.forEach(org => orgs.add(org))
    rule.gateIds.forEach(gateId => gates.add(gateId))
  })
  return { orgCount: orgs.size, gateCount: gates.size }
})

function applyFilters() {
  const source = rules.value
    .filter(rule => {
      const matchedOrg = !query.org || rule.orgs.includes(query.org)
      const matchedGate = !query.gateId || rule.gateIds.includes(query.gateId)
      const matchedEnabled =
        !query.enabled || (query.enabled === 'enabled' ? rule.enabled : !rule.enabled)
      return matchedOrg && matchedGate && matchedEnabled
    })
    .map(toRow)

  filteredRows.value = source
  total.value = source.length
  const start = (page.value - 1) * pageSize.value
  tableData.value = source.slice(start, start + pageSize.value)
}

function handleSearch() {
  loading.value = true
  page.value = 1
  applyFilters()
  window.setTimeout(() => {
    loading.value = false
    ElMessage.success(`查询完成，共 ${total.value} 条配置`)
  }, 200)
}

function handleReset() {
  query.org = ''
  query.gateId = ''
  query.enabled = ''
  page.value = 1
  applyFilters()
}

/* ---------------- 启用 / 停用 ---------------- */
function handleToggle(row: RuleRow) {
  const index = rules.value.findIndex(rule => rule.id === row.id)
  if (index < 0) return
  const next = !rules.value[index].enabled
  rules.value[index].enabled = next
  rules.value[index].updatedAt = nowText()
  rules.value[index].updatedBy = '园区通行管理员'
  applyFilters()
  ElMessage.success(next ? `已启用「${row.name}」，该机构授权相关点位将进入物业审批` : `已停用「${row.name}」，相关授权将直接下发`)
}

/* ---------------- 新增 / 编辑 ---------------- */
const formVisible = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formRef = ref<FormInstance>()

const form = reactive({
  id: 0,
  name: '',
  orgs: [] as string[],
  gateIds: [] as string[],
  enabled: true,
  remark: '',
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  orgs: [{ required: true, message: '请至少选择一个受控机构', trigger: 'change' }],
  gateIds: [{ required: true, message: '请至少选择一个受控门禁点位', trigger: 'change' }],
}

function isGroupChecked(group: { name: string; gates: GatePoint[] }): boolean {
  return group.gates.length > 0 && group.gates.every(gate => form.gateIds.includes(gate.id))
}

function toggleGroup(group: { name: string; gates: GatePoint[] }) {
  if (isGroupChecked(group)) {
    const ids = group.gates.map(gate => gate.id)
    form.gateIds = form.gateIds.filter(id => !ids.includes(id))
    return
  }
  const merged = new Set(form.gateIds)
  group.gates.forEach(gate => merged.add(gate.id))
  form.gateIds = Array.from(merged)
}

const selectedGroupText = computed(() => {
  if (!form.gateIds.length) return ''
  const names = gateGroups.value
    .filter(group => group.gates.some(gate => form.gateIds.includes(gate.id)))
    .map(group => group.name)
  return names.length ? `，涉及 ${names.join('、')}` : ''
})

function resetForm() {
  form.id = 0
  form.name = ''
  form.orgs = []
  form.gateIds = []
  form.enabled = true
  form.remark = ''
}

function openCreate() {
  formMode.value = 'create'
  resetForm()
  formVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

function openEdit(row: RuleRow) {
  formMode.value = 'edit'
  form.id = row.id
  form.name = row.name
  form.orgs = [...row.orgs]
  form.gateIds = [...row.gateIds]
  form.enabled = row.enabled
  form.remark = row.remark
  formVisible.value = true
  nextTick(() => formRef.value?.clearValidate())
}

async function handleSubmit() {
  const instance = formRef.value
  if (!instance) return
  const valid = await instance.validate().catch(() => false)
  if (!valid) return

  if (formMode.value === 'create') {
    const nextId = rules.value.reduce((max, rule) => (rule.id > max ? rule.id : max), 0) + 1
    rules.value.unshift({
      id: nextId,
      name: form.name.trim(),
      orgs: [...form.orgs],
      gateIds: [...form.gateIds],
      auditRole: '园区运营方（物业）',
      enabled: form.enabled,
      remark: form.remark.trim(),
      updatedBy: '园区通行管理员',
      updatedAt: nowText(),
    })
    ElMessage.success('审核配置已新增，命中该配置的授权将进入物业审批')
  } else {
    const index = rules.value.findIndex(rule => rule.id === form.id)
    if (index >= 0) {
      rules.value[index] = {
        ...rules.value[index],
        name: form.name.trim(),
        orgs: [...form.orgs],
        gateIds: [...form.gateIds],
        enabled: form.enabled,
        remark: form.remark.trim(),
        updatedBy: '园区通行管理员',
        updatedAt: nowText(),
      }
      ElMessage.success('审核配置已更新')
    }
  }

  formVisible.value = false
  page.value = 1
  applyFilters()
}

/* ---------------- 删除 ---------------- */
async function handleDelete(row: RuleRow) {
  const confirmed = await ElMessageBox.confirm(
    `删除后，「${row.orgs.join('、')}」授权该配置下 ${row.gateCount} 个门禁点位将不再触发物业审批，直接下发。是否继续？`,
    '删除审核配置',
    { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  ).catch(() => false)
  if (!confirmed) return

  rules.value = rules.value.filter(rule => rule.id !== row.id)
  if (tableData.value.length === 1 && page.value > 1) page.value -= 1
  applyFilters()
  ElMessage.success('审核配置已删除')
}

/* ---------------- 规则试算 ---------------- */
const simulateVisible = ref(false)
const simulate = reactive({ org: '', gateId: '' })
const simulateResult = ref<SimulateResult | null>(null)

function openSimulate() {
  simulate.org = ''
  simulate.gateId = ''
  simulateResult.value = null
  simulateVisible.value = true
}

function runSimulate() {
  const matched = rules.value.find(
    rule => rule.orgs.includes(simulate.org) && rule.gateIds.includes(simulate.gateId)
  )

  if (matched && matched.enabled) {
    simulateResult.value = {
      needApproval: true,
      ruleName: matched.name,
      auditRole: matched.auditRole,
      disabledRuleName: '',
    }
    return
  }

  simulateResult.value = {
    needApproval: false,
    ruleName: '',
    auditRole: '',
    disabledRuleName: matched ? matched.name : '',
  }
}

/* ---------------- 导出 ---------------- */
function downloadCsv(filename: string, header: string, lines: string[]) {
  const content = `\ufeff${header}${lines.join('\n')}`
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function handleExport() {
  const rows = filteredRows.value
  if (!rows.length) {
    ElMessage.warning('当前筛选条件下没有可导出的配置')
    return
  }
  const header = '配置名称,受控机构,受控门禁点位,状态,配置说明,更新人,更新时间\n'
  const lines = rows.map(row => [
    row.name,
    row.orgs.join('/'),
    row.gateNames.join('、'),
    row.enabled ? '启用' : '停用',
    row.remark || '',
    row.updatedBy,
    row.updatedAt,
  ].join(','))
  downloadCsv(`门禁授权审核配置_${todayText()}.csv`, header, lines)
  ElMessage.success(`已导出 ${rows.length} 条审核配置`)
}

/* ---------------- 工具 ---------------- */
function pad(value: number): string {
  return String(value).padStart(2, '0')
}

function todayText(): string {
  const date = new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

function nowText(): string {
  const date = new Date()
  return `${todayText()} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

applyFilters()
</script>

<style scoped lang="scss">
.ar-page {
  max-width: 1560px;
  padding: 20px;
}

.ar-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 14px;
  padding: 10px 14px;
  border: 1px solid #d9ecff;
  border-radius: 4px;
  background: #f4f8ff;
}

.ar-tip__icon {
  margin-top: 2px;
  color: #409eff;
  flex-shrink: 0;
}

.ar-tip__text {
  font-size: 13px;
  line-height: 1.7;
  color: #606266;
}

.ar-search {
  padding: 16px 16px 0;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fff;
}

.ar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 0;
}

.ar-actions__count {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.ar-two-line {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.ar-two-line__main {
  font-size: 13px;
  color: #303133;
}

.ar-two-line__sub {
  font-size: 12px;
  color: #a8abb2;
}

.ar-tags {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
}

.ar-tags__item {
  max-width: 210px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ar-tags__item--gate {
  max-width: 168px;
}

.ar-tags__more {
  padding: 0 4px;
  font-size: 12px;
  color: #409eff;
  cursor: pointer;
}

.ar-pop {
  max-height: 260px;
  overflow: auto;
}

.ar-pop__item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  font-size: 12px;
  color: #606266;
}

.ar-pop__dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #c0c4cc;
  flex-shrink: 0;
}

.ar-valid {
  font-size: 12px;
  color: #606266;
}

.ar-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

.ar-form-tip {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.6;
  color: #a8abb2;
}

.ar-form-tip--inline {
  width: auto;
  margin-top: 0;
  margin-left: 10px;
}

.ar-gate-picker {
  width: 100%;
}

.ar-gate-picker__quick {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}

.ar-gate-picker__quick-label {
  font-size: 12px;
  color: #909399;
}

.ar-gate-picker__chip {
  font-size: 12px;
}

.ar-gate-picker__chip-count {
  margin-left: 4px;
  color: #a8abb2;
}

.ar-sim-tip {
  margin-bottom: 14px;
  padding: 8px 12px;
  border-radius: 4px;
  background: #f5f7fa;
  font-size: 12px;
  line-height: 1.6;
  color: #606266;
}

.ar-sim-result {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 4px;
  padding: 12px 14px;
  border-radius: 4px;
}

.ar-sim-result--warn {
  border: 1px solid #faecd8;
  background: #fdf6ec;
}

.ar-sim-result--ok {
  border: 1px solid #e1f3d8;
  background: #f0f9eb;
}

.ar-sim-result__icon {
  margin-top: 2px;
  font-size: 18px;
  flex-shrink: 0;
}

.ar-sim-result--warn .ar-sim-result__icon {
  color: #e6a23c;
}

.ar-sim-result--ok .ar-sim-result__icon {
  color: #67c23a;
}

.ar-sim-result__title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.ar-sim-result__desc {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.7;
  color: #606266;
}

@media (max-width: 1200px) {
  .ar-page {
    padding: 14px;
  }

  .ar-actions {
    flex-wrap: wrap;
  }

  .ar-actions__count {
    width: 100%;
    margin-left: 0;
  }
}
</style>
