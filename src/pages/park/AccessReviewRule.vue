<template>
  <div class="ar-page">
    <!-- 搜索栏 -->
    <el-form :model="query" inline class="ar-search">
      <el-form-item label="受控类型">
        <el-select v-model="query.orgType" placeholder="全部" clearable style="width: 150px">
          <el-option v-for="type in orgTypeOptions" :key="type" :label="type" :value="type" />
        </el-select>
      </el-form-item>
      <el-form-item label="受控机构">
        <el-select v-model="query.org" placeholder="全部" clearable filterable style="width: 210px">
          <el-option-group v-for="group in orgGroups" :key="group.type" :label="group.type">
            <el-option v-for="org in group.items" :key="org.name" :label="org.name" :value="org.name" />
          </el-option-group>
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
      <el-button :icon="FolderOpened" @click="openGroupDrawer">受控点位组</el-button>
    </div>

    <!-- 配置列表 -->
    <el-table :data="tableData" v-loading="loading" border stripe style="width: 100%">
      <el-table-column type="index" label="序号" width="56" align="center" fixed />
      <el-table-column prop="name" label="配置名称" min-width="200" show-overflow-tooltip />
      <el-table-column label="受控机构/机构类型" min-width="210" show-overflow-tooltip>
        <template #default="{ row }">{{ row.orgText }}</template>
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
      <el-table-column label="说明" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">
          {{ row.remark || '—' }}
        </template>
      </el-table-column>
      <el-table-column prop="updatedAt" label="更新时间" width="150" />
      <el-table-column prop="updatedBy" label="更新人" width="120" show-overflow-tooltip />
      <el-table-column label="操作" width="190" fixed="right" align="center">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click="handleToggle(row)">{{ row.enabled ? '停用' : '启用' }}</el-button>
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
    <el-drawer
      v-model="formVisible"
      :title="formMode === 'create' ? '新增门禁授权审核配置' : '编辑门禁授权审核配置'"
      direction="rtl"
      size="min(760px, 100%)"
      :close-on-click-modal="false"
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

        <el-form-item>
          <template #label>
            <span class="ar-form-label">
              受控机构
              <el-tooltip placement="top">
                <template #content>
                  <div class="ar-hint-pop">
                    按机构类型：该类型下现有机构与未来新增机构自动纳入（例如新租户入驻即生效），无需再次配置。按具体机构：仅对所选机构生效
                  </div>
                </template>
                <el-icon class="ar-form-hint"><QuestionFilled /></el-icon>
              </el-tooltip>
            </span>
          </template>
          <div class="ar-org-picker">
            <el-radio-group v-model="form.orgMode" size="small" @change="handleOrgModeChange">
              <el-radio-button label="type">按机构类型</el-radio-button>
              <el-radio-button label="org">按具体机构</el-radio-button>
            </el-radio-group>

            <div v-if="form.orgMode === 'type'" class="ar-org-picker__types">
              <el-check-tag
                v-for="type in orgTypeOptions"
                :key="type"
                :checked="form.orgTypes.includes(type)"
                class="ar-org-picker__chip"
                @change="toggleOrgType(type)"
              >{{ type }}</el-check-tag>
            </div>

            <el-select
              v-else
              v-model="form.orgs"
              multiple
              filterable
              collapse-tags
              collapse-tags-tooltip
              placeholder="选择需要受控的机构"
              style="width: 100%"
            >
              <el-option-group v-for="group in orgGroups" :key="group.type" :label="group.type">
                <el-option v-for="org in group.items" :key="org.name" :label="org.name" :value="org.name" />
              </el-option-group>
            </el-select>
          </div>
        </el-form-item>

        <el-form-item label="受控门禁点位" prop="gateIds">
          <div class="ar-grp-gate-section">
            <div class="ar-grp-gate-section__head">
              <span class="ar-grp-gate-section__count">已选门禁点位（{{ formSelectedGates.length }}）</span>
              <el-button size="small" type="primary" @click="openGateDialog('rule')">选择门禁点位</el-button>
            </div>
            <el-table
              v-if="formSelectedGates.length > 0"
              :data="formSelectedGates"
              border
              size="small"
              max-height="240"
              style="width: 100%"
            >
              <el-table-column prop="name" label="门禁点位" min-width="180" show-overflow-tooltip />
              <el-table-column label="位置" min-width="130" show-overflow-tooltip>
                <template #default="{ row }">{{ row.floor }} · {{ row.area }}</template>
              </el-table-column>
              <el-table-column label="操作" width="56" align="center">
                <template #default="{ row }">
                  <el-button link type="danger" size="small" @click="removeFormGate(row.id)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-else class="ar-grp-gate-empty">暂未选择门禁点位</div>
          </div>
        </el-form-item>

        <el-form-item label="状态">
          <el-switch v-model="form.enabled" active-text="启用" inactive-text="停用" />
          <el-tooltip
            placement="top"
            content="停用后该配置不再触发审批，相关门禁授权直接下发。"
          >
            <el-icon class="ar-form-hint"><QuestionFilled /></el-icon>
          </el-tooltip>
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
    </el-drawer>

    <!-- 受控点位组（右侧滑出列表） -->
    <el-drawer
      v-model="groupDrawerVisible"
      title="受控点位组"
      direction="rtl"
      size="min(780px, 100%)"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="ar-grp-toolbar">
        <el-button type="primary" :icon="Plus" @click="openGroupCreate">新增受控点位组</el-button>
      </div>

      <el-table :data="pagedGroupRows" border stripe size="small" style="width: 100%">
        <el-table-column type="index" label="序号" width="52" align="center" />
        <el-table-column prop="name" label="组名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="包含门禁点位" width="130" align="center">
          <template #default="{ row }">
            <el-popover
              v-if="row.gates.length"
              placement="bottom"
              :width="300"
              trigger="hover"
            >
              <template #reference>
                <span class="ar-gate-count">{{ row.gateCount }}</span>
              </template>
              <div class="ar-pop">
                <div v-for="gate in row.gates" :key="gate.id" class="ar-pop__item">
                  <span class="ar-pop__dot" />{{ gate.name }}
                </div>
              </div>
            </el-popover>
            <span v-else class="ar-gate-count ar-gate-count--empty">0</span>
          </template>
        </el-table-column>
        <el-table-column label="说明" min-width="220" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.remark || '—' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="96" align="center">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openGroupEdit(row)">编辑</el-button>
            <el-button link type="danger" size="small" @click="deleteGroup(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="ar-pagination">
        <el-pagination
          v-model:current-page="groupPage"
          v-model:page-size="groupPageSize"
          :page-sizes="[10, 20, 50]"
          :total="groupRows.length"
          layout="total, sizes, prev, pager, next, jumper"
        />
      </div>
    </el-drawer>

    <!-- 新增 / 编辑受控点位组（二级抽屉） -->
    <el-drawer
      v-model="groupFormVisible"
      :title="groupFormMode === 'create' ? '新增受控点位组' : '编辑受控点位组'"
      direction="rtl"
      size="min(640px, 100%)"
      :close-on-click-modal="false"
      append-to-body
    >
      <el-form ref="groupFormRef" :model="groupForm" :rules="groupFormRules" label-width="112px">
        <el-form-item label="组名称" prop="name">
          <el-input v-model="groupForm.name" placeholder="如 园区大门、CT楼电梯厅" maxlength="30" show-word-limit />
        </el-form-item>

        <el-form-item label="包含门禁点位" prop="gateIds">
          <div class="ar-grp-gate-section">
            <div class="ar-grp-gate-section__head">
              <span class="ar-grp-gate-section__count">已选门禁点位（{{ groupSelectedGates.length }}）</span>
              <el-button size="small" type="primary" @click="openGateDialog('group')">选择门禁点位</el-button>
            </div>
            <el-table
              v-if="groupSelectedGates.length > 0"
              :data="groupSelectedGates"
              border
              size="small"
              max-height="240"
              style="width: 100%"
            >
              <el-table-column prop="name" label="门禁点位" min-width="180" show-overflow-tooltip />
              <el-table-column label="位置" min-width="130" show-overflow-tooltip>
                <template #default="{ row }">{{ row.floor }} · {{ row.area }}</template>
              </el-table-column>
              <el-table-column label="操作" width="56" align="center">
                <template #default="{ row }">
                  <el-button link type="danger" size="small" @click="removeGroupGate(row.id)">移除</el-button>
                </template>
              </el-table-column>
            </el-table>
            <div v-else class="ar-grp-gate-empty">暂未选择门禁点位</div>
          </div>
        </el-form-item>

        <el-form-item label="说明">
          <el-input
            v-model="groupForm.remark"
            type="textarea"
            :rows="3"
            maxlength="100"
            show-word-limit
            placeholder="说明该分组的用途或纳入范围"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="groupFormVisible = false">取消</el-button>
        <el-button type="primary" @click="submitGroupForm">保存</el-button>
      </template>
    </el-drawer>

    <!-- 选择门禁点位 -->
    <el-dialog
      v-model="gateDialogVisible"
      title="选择门禁点位"
      width="920px"
      :close-on-click-modal="false"
      append-to-body
    >
      <div class="ar-gate-select">
        <div class="ar-gate-select__side">
          <el-radio-group
            v-if="gatePickTarget === 'rule'"
            v-model="gatePickMode"
            size="small"
            class="ar-gate-select__mode"
          >
            <el-radio-button label="group">按分组选择</el-radio-button>
            <el-radio-button label="space">按空间选择</el-radio-button>
          </el-radio-group>

          <div class="ar-gate-select__side-body">
            <template v-if="gatePickMode === 'group'">
              <div v-if="groupRows.length" class="ar-gate-group-list">
                <div
                  v-for="group in groupRows"
                  :key="group.id"
                  class="ar-gate-group-item"
                  :class="{ 'is-active': group.id === selectedGroupId }"
                  @click="selectPickGroup(group.id)"
                >
                  <span class="ar-gate-group-item__name">{{ group.name }}</span>
                  <span class="ar-gate-group-item__count">{{ group.gateCount }}</span>
                </div>
              </div>
              <div v-else class="ar-gate-group-empty">暂未维护受控点位组</div>
            </template>

            <template v-else>
              <el-input
                v-model="spaceKeyword"
                placeholder="请输入空间名称"
                clearable
                size="small"
                class="ar-space-search"
                :prefix-icon="Search"
              />
              <el-tree
                ref="spaceTreeRef"
                :data="gateSpaceData"
                node-key="key"
                :props="{ label: 'label', children: 'children' }"
                :default-expanded-keys="defaultExpandedSpaceKeys"
                :filter-node-method="filterSpaceNode"
                v-model:current-node-key="selectedSpaceKey"
                highlight-current
                @node-click="onSpaceNodeClick"
              />
            </template>
          </div>
        </div>

        <div class="ar-gate-select__right">
          <el-form inline size="small" class="ar-gate-select__filter">
            <el-form-item label="点位名称">
              <el-input
                v-model="gateFilter.keyword"
                placeholder="请输入"
                clearable
                style="width: 170px"
                @keyup.enter="applyGateFilter"
              />
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="applyGateFilter">查询</el-button>
            </el-form-item>
          </el-form>

          <el-table
            ref="gateTableRef"
            :data="filteredGateTable"
            border
            size="small"
            style="width: 100%"
            max-height="340"
            :empty-text="gatePickMode === 'group' ? '该受控点位组下暂无门禁点位' : '暂无数据'"
            @select="onGateRowSelect"
            @select-all="onGateSelectAll"
          >
            <el-table-column type="selection" width="45" />
            <el-table-column prop="name" label="门禁点位" min-width="200" show-overflow-tooltip />
            <el-table-column label="位置" min-width="160" show-overflow-tooltip>
              <template #default="{ row }">{{ row.floor }} · {{ row.area }}</template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <template #footer>
        <div class="ar-gate-select__footer">
          <span class="ar-gate-select__count">已选 {{ tempSelectedIds.length }} 个门禁点位</span>
          <div>
            <el-button @click="gateDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="confirmGateSelect">确认选择</el-button>
          </div>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  FolderOpened,
  QuestionFilled,
} from '@element-plus/icons-vue'

/* ---------------- 类型 ---------------- */
interface GatePoint {
  id: string
  name: string
  building: string
  floor: string
  area: string
}

type OrgType = '租户' | '监管单位' | '内部单位' | '物业单位' | '服务外包单位'

interface OrgItem {
  name: string
  type: OrgType
}

interface ReviewRule {
  id: number
  name: string
  orgTypes: OrgType[]
  orgs: string[]
  gateIds: string[]
  enabled: boolean
  remark: string
  updatedBy: string
  updatedAt: string
}

interface RuleRow extends ReviewRule {
  orgText: string
  gateCount: number
  gateNames: string[]
  gatePreview: string[]
}


/* ---------------- 门禁点位 ---------------- */
const gatePoints: GatePoint[] = [
  { id: 'park-main-gate', name: '园区主大门-人行通道门禁', building: '园区周界', floor: '—', area: '主大门人行通道' },
  { id: 'park-cargo-gate', name: '园区货运通道大门-门禁', building: '园区周界', floor: '—', area: '货运通道' },
  { id: 'park-staff-gate', name: '园区员工通道大门-门禁', building: '园区周界', floor: '—', area: '员工通道' },
  { id: 'park-visitor-gate', name: '园区访客通道大门-门禁', building: '园区周界', floor: '—', area: '访客通道' },
  { id: 'ct-l1-staff-1', name: 'CT楼L1员工出入口-门1', building: 'CT楼', floor: 'L1', area: '员工出入口' },
  { id: 'ct-l1-staff-2', name: 'CT楼L1员工出入口-门2', building: 'CT楼', floor: 'L1', area: '员工出入口' },
  { id: 'ct-l1-elev-1', name: 'CT楼L1电梯厅1号-门', building: 'CT楼', floor: 'L1', area: '电梯厅' },
  { id: 'ct-l1-elev-5', name: 'CT楼L1电梯厅5号-门', building: 'CT楼', floor: 'L1', area: '电梯厅' },
  { id: 'ct-l2-elev-1', name: 'CT楼L2电梯厅1号-门', building: 'CT楼', floor: 'L2', area: '电梯厅' },
  { id: 'ct-l3-elev-1', name: 'CT楼L3电梯厅1号-门', building: 'CT楼', floor: 'L3', area: '电梯厅' },
  { id: 'ct-l4-elev-1', name: 'CT楼L4电梯厅1号-门', building: 'CT楼', floor: 'L4', area: '电梯厅' },
  { id: 'ct-l5-elev-1', name: 'CT楼L5电梯厅1号-门', building: 'CT楼', floor: 'L5', area: '电梯厅' },
  { id: 'ct-l6-elev-1', name: 'CT楼L6电梯厅1号-门', building: 'CT楼', floor: 'L6', area: '电梯厅' },
  { id: 'ct-l7-elev-1', name: 'CT楼L7电梯厅1号-门', building: 'CT楼', floor: 'L7', area: '电梯厅' },
  { id: 'ct-l2-dock-1', name: 'CT楼L2装卸货区1-4月台-门', building: 'CT楼', floor: 'L2', area: '装卸货区' },
  { id: 'ct-l3-export-1', name: 'CT楼L3出口卸货区-门1', building: 'CT楼', floor: 'L3', area: '出口卸货区' },
  { id: 'ct-l5-import-1', name: 'CT楼L5进口提货区-门1', building: 'CT楼', floor: 'L5', area: '进口提货区' },
  { id: 'ff-l1-elev-1', name: 'FF楼L1电梯厅1号-门', building: 'FF楼', floor: 'L1', area: '电梯厅' },
  { id: 'ff-l1-export-1', name: 'FF楼L1货代出口卸货区-门1', building: 'FF楼', floor: 'L1', area: '货代出口卸货区' },
  { id: 'ff-l2-elev-1', name: 'FF楼L2电梯厅1号-门', building: 'FF楼', floor: 'L2', area: '电梯厅' },
  { id: 'ff-l6-elev-1', name: 'FF楼L6电梯厅1号-门', building: 'FF楼', floor: 'L6', area: '电梯厅' },
  { id: 'ff-l1-customs-1', name: 'FF楼L1出口海关查验停靠区-门1', building: 'FF楼', floor: 'L1', area: '出口海关查验停靠区' },
  { id: 'hg-l1-check-1', name: '海关大楼L1查验通道-门1', building: '海关大楼', floor: 'L1', area: '查验通道' },
  { id: 'hg-l1-check-2', name: '海关大楼L1查验通道-门2', building: '海关大楼', floor: 'L1', area: '查验通道' },
  { id: 'hg-l2-office-1', name: '海关大楼L2办公区-门', building: '海关大楼', floor: 'L2', area: '办公区' },
  { id: 'bldg-b-office', name: 'B栋办公区门禁', building: 'B栋', floor: '3F', area: '办公区' },
  { id: 'cold-store', name: '冷链仓库门禁', building: '冷链仓库', floor: 'L1', area: '冷库作业区' },
  { id: 'bldg-a-room', name: 'A栋机房门禁', building: 'A栋', floor: 'L1', area: '机房' },
  { id: 'ctrl-1f-1', name: '门禁控制器1F-1_门_1', building: '1F', floor: '1F', area: '公共通道' },
  { id: 'ctrl-1f-2', name: '门禁控制器1F-1_门_2', building: '1F', floor: '1F', area: '公共通道' },
  { id: 'ctrl-1f-3', name: '门禁控制器1F-1_门_3', building: '1F', floor: '1F', area: '公共通道' },
  { id: 'ctrl-1f-4', name: '门禁控制器1F-1_门_4', building: '1F', floor: '1F', area: '公共通道' },
]

const gateMap = new Map<string, GatePoint>(gatePoints.map(gate => [gate.id, gate]))
const gateNameOf = (gateId: string): string => gateMap.get(gateId)?.name || gateId

/* ---------------- 受控点位组 ---------------- */
interface CtrlGroup {
  id: number
  name: string
  gateIds: string[]
  remark: string
  updatedBy: string
  updatedAt: string
}

interface CtrlGroupRow extends CtrlGroup {
  gates: GatePoint[]
  gateCount: number
}

const seedCtrlGroups: CtrlGroup[] = [
  {
    id: 1,
    name: '园区大门',
    gateIds: ['park-main-gate', 'park-cargo-gate', 'park-staff-gate', 'park-visitor-gate'],
    remark: '园区周界四类通道，进出一律受控',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-04 10:20',
  },
  {
    id: 2,
    name: 'CT楼员工通道',
    gateIds: ['ct-l1-staff-1', 'ct-l1-staff-2'],
    remark: 'CT楼一层员工出入口',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-02 15:05',
  },
  {
    id: 3,
    name: 'CT楼电梯厅',
    gateIds: [
      'ct-l1-elev-1',
      'ct-l1-elev-5',
      'ct-l2-elev-1',
      'ct-l3-elev-1',
      'ct-l4-elev-1',
      'ct-l5-elev-1',
      'ct-l6-elev-1',
      'ct-l7-elev-1',
    ],
    remark: 'CT楼各层电梯厅，跨机构共用',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-31 09:40',
  },
  {
    id: 4,
    name: 'CT楼作业区',
    gateIds: ['ct-l2-dock-1', 'ct-l3-export-1', 'ct-l5-import-1'],
    remark: '装卸货、进出口提货区',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-29 14:18',
  },
  {
    id: 5,
    name: 'FF楼通道',
    gateIds: ['ff-l1-elev-1', 'ff-l1-export-1', 'ff-l2-elev-1', 'ff-l6-elev-1'],
    remark: 'FF楼电梯厅与货代卸货区',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-29 14:22',
  },
  {
    id: 6,
    name: '海关监管区',
    gateIds: ['ff-l1-customs-1', 'hg-l1-check-1', 'hg-l1-check-2'],
    remark: '查验通道与监管停靠区，开通前需与海关确认',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-30 09:45',
  },
  {
    id: 7,
    name: '办公区',
    gateIds: ['hg-l2-office-1', 'bldg-b-office'],
    remark: '海关大楼L2与B栋办公区通道',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-28 16:02',
  },
  {
    id: 8,
    name: '冷链作业区',
    gateIds: ['cold-store'],
    remark: '冷库使用方进入需审批',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-28 14:12',
  },
  {
    id: 9,
    name: '设备机房',
    gateIds: ['bldg-a-room'],
    remark: '重点部位，任何单位进入均需审批',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-03 16:40',
  },
  {
    id: 10,
    name: '1F公共通道',
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2', 'ctrl-1f-3', 'ctrl-1f-4'],
    remark: '一层公共通道连接货站与办公区',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-25 11:05',
  },
]

const ctrlGroups = ref<CtrlGroup[]>(
  seedCtrlGroups.map(group => ({ ...group, gateIds: [...group.gateIds] }))
)

function toGroupRow(group: CtrlGroup): CtrlGroupRow {
  const gates = group.gateIds
    .map(gateId => gateMap.get(gateId))
    .filter((gate): gate is GatePoint => gate !== undefined)
  return {
    ...group,
    gates,
    gateCount: gates.length,
  }
}

/* 审核配置里的分组口径：受控点位组（未纳入任何分组的点位归入「未分组点位」） */
const gateGroups = computed<CtrlGroupRow[]>(() => {
  const rows = ctrlGroups.value.map(toGroupRow)
  const assigned = new Set<string>()
  ctrlGroups.value.forEach(group => group.gateIds.forEach(gateId => assigned.add(gateId)))
  const rest = gatePoints.filter(gate => !assigned.has(gate.id))
  if (rest.length) {
    rows.push({
      id: 0,
      name: '未分组点位',
      gateIds: rest.map(gate => gate.id),
      remark: '',
      updatedBy: '',
      updatedAt: '',
      gates: rest,
      gateCount: rest.length,
    })
  }
  return rows
})

/* 楼栋 → 门禁点位（点位选择弹窗左侧空间树） */
const buildingOptions = computed(() => {
  const order: string[] = []
  const bucket = new Map<string, GatePoint[]>()
  gatePoints.forEach(gate => {
    if (!bucket.has(gate.building)) {
      bucket.set(gate.building, [])
      order.push(gate.building)
    }
    bucket.get(gate.building)!.push(gate)
  })
  return order.map(name => ({ name, gates: bucket.get(name) || [] }))
})

/* ---------------- 机构与机构类型 ---------------- */
const orgTypeOptions: OrgType[] = ['租户', '监管单位', '内部单位', '物业单位', '服务外包单位']

const orgList: OrgItem[] = [
  { name: '顺丰航空', type: '租户' },
  { name: '菜鸟供应链', type: '租户' },
  { name: '海关', type: '监管单位' },
  { name: '边检', type: '监管单位' },
  { name: '园区运营方（管理公司）', type: '内部单位' },
  { name: '园区物业服务中心', type: '物业单位' },
  { name: '安保外包服务商', type: '服务外包单位' },
  { name: '保洁外包服务商', type: '服务外包单位' },
]

const orgGroups = computed(() =>
  orgTypeOptions
    .map(type => ({ type, items: orgList.filter(org => org.type === type) }))
    .filter(group => group.items.length > 0)
)

function orgTypeOf(name: string): OrgType | '' {
  return orgList.find(org => org.name === name)?.type || ''
}

function orgTextOf(rule: ReviewRule): string {
  const names = [...rule.orgTypes, ...rule.orgs]
  return names.length ? names.join('、') : '—'
}

/* ---------------- 审核配置数据 ---------------- */
const seedRules: ReviewRule[] = [
  {
    id: 1,
    name: '租户类机构 · 园区大门授权审核',
    orgTypes: ['租户'],
    orgs: [],
    gateIds: ['park-main-gate', 'park-cargo-gate', 'park-staff-gate'],
    enabled: true,
    remark: '按机构类型配置，新入驻租户自动纳入',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-04 09:12',
  },
  {
    id: 2,
    name: '监管单位 · 园区大门授权审核',
    orgTypes: ['监管单位'],
    orgs: [],
    gateIds: ['park-main-gate', 'park-cargo-gate', 'park-visitor-gate'],
    enabled: true,
    remark: '海关、边检等监管单位共用园区大门',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-04 09:15',
  },
  {
    id: 3,
    name: '服务外包单位 · 公共通道授权审核',
    orgTypes: ['服务外包单位'],
    orgs: [],
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2', 'ctrl-1f-3', 'ctrl-1f-4', 'park-staff-gate'],
    enabled: true,
    remark: '保洁、安保等外包人员流动性大，统一受控',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-04 09:20',
  },
  {
    id: 4,
    name: '内部单位 · 设备机房授权审核',
    orgTypes: ['内部单位'],
    orgs: [],
    gateIds: ['bldg-a-room', 'ctrl-1f-1'],
    enabled: true,
    remark: '机房属重点部位，内部单位同样需审批',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-03 16:40',
  },
  {
    id: 5,
    name: '物业单位 · 设备机房授权审核',
    orgTypes: ['物业单位'],
    orgs: [],
    gateIds: ['bldg-a-room', 'ctrl-1f-2'],
    enabled: true,
    remark: '',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-11-03 16:42',
  },
  {
    id: 6,
    name: '顺丰航空 · 冷链作业区授权审核',
    orgTypes: [],
    orgs: ['顺丰航空'],
    gateIds: ['cold-store', 'ct-l2-dock-1'],
    enabled: true,
    remark: '仅冷库使用方需受控，按具体机构配置',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-28 14:12',
  },
  {
    id: 7,
    name: '菜鸟供应链 · 冷链作业区授权审核',
    orgTypes: [],
    orgs: ['菜鸟供应链'],
    gateIds: ['cold-store', 'ct-l5-import-1'],
    enabled: true,
    remark: '',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-28 14:20',
  },
  {
    id: 8,
    name: '监管单位 · 海关监管区授权审核',
    orgTypes: ['监管单位'],
    orgs: [],
    gateIds: ['hg-l1-check-1', 'hg-l1-check-2', 'ff-l1-customs-1'],
    enabled: true,
    remark: '含监管区通道，需与海关确认后开通',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-30 09:45',
  },
  {
    id: 9,
    name: '顺丰航空 · 1F公共通道授权审核',
    orgTypes: [],
    orgs: ['顺丰航空'],
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2', 'ctrl-1f-3', 'ctrl-1f-4'],
    enabled: true,
    remark: '1F 公共通道连通货站与办公区',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-25 11:05',
  },
  {
    id: 10,
    name: '菜鸟供应链 · 1F公共通道授权审核',
    orgTypes: [],
    orgs: ['菜鸟供应链'],
    gateIds: ['ctrl-1f-1', 'ctrl-1f-2'],
    enabled: false,
    remark: '2026-10 起改由机构通行管理员自行管控',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-22 15:37',
  },
  {
    id: 11,
    name: '顺丰航空 / 菜鸟供应链 · CT楼电梯厅授权审核',
    orgTypes: [],
    orgs: ['顺丰航空', '菜鸟供应链'],
    gateIds: ['ct-l1-elev-1', 'ct-l2-elev-1', 'ct-l3-elev-1'],
    enabled: true,
    remark: '跨机构共用电梯厅，统一由物业管控',
    updatedBy: '园区通行管理员',
    updatedAt: '2026-10-20 09:18',
  },
]

const rules = ref<ReviewRule[]>(
  seedRules.map(rule => ({
    ...rule,
    orgTypes: [...rule.orgTypes],
    orgs: [...rule.orgs],
    gateIds: [...rule.gateIds],
  }))
)

/* ---------------- 行数据 ---------------- */
function toRow(rule: ReviewRule): RuleRow {
  const gateNames = rule.gateIds.map(gateNameOf)
  return {
    ...rule,
    orgText: orgTextOf(rule),
    gateCount: gateNames.length,
    gateNames,
    gatePreview: gateNames.slice(0, 2),
  }
}

/* ---------------- 列表 ---------------- */
const query = reactive({
  orgType: '' as '' | OrgType,
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

function applyFilters() {
  const queryOrgType = query.org ? orgTypeOf(query.org) : ''
  const source = rules.value
    .filter(rule => {
      const matchedOrgType =
        !query.orgType ||
        rule.orgTypes.includes(query.orgType) ||
        rule.orgs.some(org => orgTypeOf(org) === query.orgType)
      const matchedOrg =
        !query.org ||
        rule.orgs.includes(query.org) ||
        (queryOrgType !== '' && rule.orgTypes.includes(queryOrgType))
      const matchedGate = !query.gateId || rule.gateIds.includes(query.gateId)
      const matchedEnabled =
        !query.enabled || (query.enabled === 'enabled' ? rule.enabled : !rule.enabled)
      return matchedOrgType && matchedOrg && matchedGate && matchedEnabled
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
  query.orgType = ''
  query.org = ''
  query.gateId = ''
  query.enabled = ''
  page.value = 1
  applyFilters()
}

/* ---------------- 启用 / 停用 ---------------- */
async function handleToggle(row: RuleRow) {
  const next = !row.enabled
  const confirmed = await ElMessageBox.confirm(
    next
      ? `启用「${row.name}」后，该机构授权其受控门禁点位时，需物业审批通过才下发。是否确认启用？`
      : `停用「${row.name}」后，该机构授权其受控门禁点位将直接下发、不再进入物业审批。是否确认停用？`,
    next ? '启用审核配置' : '停用审核配置',
    {
      type: 'warning',
      confirmButtonText: next ? '确认启用' : '确认停用',
      cancelButtonText: '取消',
    }
  ).catch(() => false)
  if (!confirmed) return

  const index = rules.value.findIndex(rule => rule.id === row.id)
  if (index < 0) return
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
  orgMode: 'type' as 'type' | 'org',
  orgTypes: [] as OrgType[],
  orgs: [] as string[],
  gateIds: [] as string[],
  enabled: true,
  remark: '',
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  gateIds: [{ required: true, message: '请至少选择一个受控门禁点位', trigger: 'change' }],
}

function handleOrgModeChange() {
  if (form.orgMode === 'type') {
    form.orgs = []
    return
  }
  form.orgTypes = []
}

function toggleOrgType(type: OrgType) {
  form.orgTypes = form.orgTypes.includes(type)
    ? form.orgTypes.filter(item => item !== type)
    : [...form.orgTypes, type]
}

const formSelectedGates = computed<GatePoint[]>(() =>
  form.gateIds
    .map(gateId => gateMap.get(gateId))
    .filter((gate): gate is GatePoint => gate !== undefined)
)

function removeFormGate(gateId: string) {
  form.gateIds = form.gateIds.filter(id => id !== gateId)
  formRef.value?.validateField('gateIds', () => undefined)
}

function resetForm() {
  form.id = 0
  form.name = ''
  form.orgMode = 'type'
  form.orgTypes = []
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
  form.orgMode = row.orgTypes.length ? 'type' : 'org'
  form.orgTypes = [...row.orgTypes]
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

  if (form.orgMode === 'type' && !form.orgTypes.length) {
    ElMessage.warning('请至少选择一个受控机构类型')
    return
  }
  if (form.orgMode === 'org' && !form.orgs.length) {
    ElMessage.warning('请至少选择一个受控机构')
    return
  }

  const orgTypes = form.orgMode === 'type' ? [...form.orgTypes] : []
  const orgs = form.orgMode === 'org' ? [...form.orgs] : []

  if (formMode.value === 'create') {
    const nextId = rules.value.reduce((max, rule) => (rule.id > max ? rule.id : max), 0) + 1
    rules.value.unshift({
      id: nextId,
      name: form.name.trim(),
      orgTypes,
      orgs,
      gateIds: [...form.gateIds],
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
        orgTypes,
        orgs,
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
    `删除后，「${row.orgText}」授权该配置下 ${row.gateCount} 个门禁点位将不再触发物业审批，直接下发。是否继续？`,
    '删除审核配置',
    { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  ).catch(() => false)
  if (!confirmed) return

  rules.value = rules.value.filter(rule => rule.id !== row.id)
  if (tableData.value.length === 1 && page.value > 1) page.value -= 1
  applyFilters()
  ElMessage.success('审核配置已删除')
}

/* ---------------- 受控点位组维护（右侧抽屉） ---------------- */
const groupDrawerVisible = ref(false)

const groupRows = computed<CtrlGroupRow[]>(() => ctrlGroups.value.map(toGroupRow))

const groupPage = ref(1)
const groupPageSize = ref(10)

const pagedGroupRows = computed<CtrlGroupRow[]>(() => {
  const start = (groupPage.value - 1) * groupPageSize.value
  return groupRows.value.slice(start, start + groupPageSize.value)
})

function openGroupDrawer() {
  groupPage.value = 1
  groupDrawerVisible.value = true
}

const groupFormVisible = ref(false)
const groupFormMode = ref<'create' | 'edit'>('create')
const groupFormRef = ref<FormInstance>()

const groupForm = reactive({
  id: 0,
  name: '',
  gateIds: [] as string[],
  remark: '',
})

const groupFormRules: FormRules = {
  name: [{ required: true, message: '请输入组名称', trigger: 'blur' }],
  gateIds: [
    {
      required: true,
      validator: (_rule, value: string[], callback) => {
        if (!value || value.length === 0) callback(new Error('请至少选择一个门禁点位'))
        else callback()
      },
      trigger: 'change',
    },
  ],
}

const groupSelectedGates = computed<GatePoint[]>(() =>
  groupForm.gateIds
    .map(gateId => gateMap.get(gateId))
    .filter((gate): gate is GatePoint => gate !== undefined)
)

function removeGroupGate(gateId: string) {
  groupForm.gateIds = groupForm.gateIds.filter(id => id !== gateId)
  groupFormRef.value?.validateField('gateIds', () => undefined)
}

function resetGroupForm() {
  groupForm.id = 0
  groupForm.name = ''
  groupForm.gateIds = []
  groupForm.remark = ''
}

function openGroupCreate() {
  groupFormMode.value = 'create'
  resetGroupForm()
  groupFormVisible.value = true
  nextTick(() => groupFormRef.value?.clearValidate())
}

function openGroupEdit(row: CtrlGroupRow) {
  groupFormMode.value = 'edit'
  resetGroupForm()
  groupForm.id = row.id
  groupForm.name = row.name
  groupForm.gateIds = [...row.gateIds]
  groupForm.remark = row.remark
  groupFormVisible.value = true
  nextTick(() => groupFormRef.value?.clearValidate())
}

async function submitGroupForm() {
  const instance = groupFormRef.value
  if (!instance) return
  const valid = await instance.validate().catch(() => false)
  if (!valid) return

  const name = groupForm.name.trim()

  if (ctrlGroups.value.some(group => group.name === name && group.id !== groupForm.id)) {
    ElMessage.warning('组名称已存在，请换一个名称')
    return
  }

  if (groupFormMode.value === 'create') {
    const nextId = ctrlGroups.value.reduce((max, group) => (group.id > max ? group.id : max), 0) + 1
    ctrlGroups.value.unshift({
      id: nextId,
      name,
      gateIds: [...groupForm.gateIds],
      remark: groupForm.remark.trim(),
      updatedBy: '园区通行管理员',
      updatedAt: nowText(),
    })
    ElMessage.success('受控点位组已新增')
    groupPage.value = 1
  } else {
    const index = ctrlGroups.value.findIndex(group => group.id === groupForm.id)
    if (index >= 0) {
      ctrlGroups.value[index] = {
        ...ctrlGroups.value[index],
        name,
        gateIds: [...groupForm.gateIds],
        remark: groupForm.remark.trim(),
        updatedBy: '园区通行管理员',
        updatedAt: nowText(),
      }
      ElMessage.success('受控点位组已更新')
    }
  }

  groupFormVisible.value = false
}

async function deleteGroup(row: CtrlGroupRow) {
  const confirmed = await ElMessageBox.confirm(
    `确定删除受控点位组「${row.name}」？删除后该组的 ${row.gateCount} 个门禁点位将不再可批量快选。`,
    '删除受控点位组',
    { type: 'warning', confirmButtonText: '确认删除', cancelButtonText: '取消' }
  ).catch(() => false)
  if (!confirmed) return

  ctrlGroups.value = ctrlGroups.value.filter(group => group.id !== row.id)
  if (groupPage.value > 1 && (groupPage.value - 1) * groupPageSize.value >= groupRows.value.length) {
    groupPage.value -= 1
  }
  ElMessage.success('受控点位组已删除')
}

/* ---------------- 选择门禁点位（参照巡检计划选择设备） ---------------- */
interface GateSpaceNode {
  key: string
  label: string
  children?: GateSpaceNode[]
}

const gateSpaceTree = computed<GateSpaceNode[]>(() =>
  buildingOptions.value.map(building => {
    const buildingKey = `bldg:${building.name}`
    const areaOrder: string[] = []
    building.gates.forEach(gate => {
      if (!areaOrder.includes(gate.area)) areaOrder.push(gate.area)
    })
    return {
      key: buildingKey,
      label: building.name,
      children: areaOrder.map(area => ({ key: `${buildingKey}|area:${area}`, label: area })),
    }
  })
)

const gateSpaceData = computed<GateSpaceNode[]>(() => [
  { key: 'all', label: '全部门禁点位', children: gateSpaceTree.value },
])

function collectNodeKeys(node: GateSpaceNode): string[] {
  const keys: string[] = [node.key]
  ;(node.children || []).forEach(child => {
    keys.push(...collectNodeKeys(child))
  })
  return keys
}

function findGateSpaceNode(nodes: GateSpaceNode[], key: string): GateSpaceNode | undefined {
  for (const node of nodes) {
    if (node.key === key) return node
    const found = node.children ? findGateSpaceNode(node.children, key) : undefined
    if (found) return found
  }
  return undefined
}

function gateSpaceKeysOf(gate: GatePoint): string[] {
  const buildingKey = `bldg:${gate.building}`
  return [buildingKey, `${buildingKey}|area:${gate.area}`]
}

const gateDialogVisible = ref(false)
const gateTableRef = ref()
const tempSelectedIds = ref<string[]>([])
const gatePickTarget = ref<'group' | 'rule'>('group')
const gatePickMode = ref<'group' | 'space'>('group')
const selectedGroupId = ref(0)
const gateFilter = reactive({ keyword: '' })
const appliedGateFilter = reactive({ keyword: '' })

const spaceTreeRef = ref()
const selectedSpaceKey = ref('all')
const defaultExpandedSpaceKeys = ['all']
const spaceKeyword = ref('')

function filterSpaceNode(value: string, data: GateSpaceNode): boolean {
  if (!value) return true
  return data.label.includes(value)
}

watch(spaceKeyword, (val: string) => {
  spaceTreeRef.value?.filter(val)
})

const selectedSpaceKeys = computed<string[]>(() => {
  const node = findGateSpaceNode(gateSpaceData.value, selectedSpaceKey.value)
  return node ? collectNodeKeys(node) : []
})

function onSpaceNodeClick(node: GateSpaceNode) {
  selectedSpaceKey.value = node.key
}

function selectPickGroup(groupId: number) {
  selectedGroupId.value = groupId
}

const filteredGateTable = computed<GatePoint[]>(() => {
  let list: GatePoint[]
  if (gatePickMode.value === 'group') {
    const active = groupRows.value.find(group => group.id === selectedGroupId.value)
    list = active ? active.gates : []
  } else {
    const keys = selectedSpaceKeys.value
    list = gatePoints.filter(gate => gateSpaceKeysOf(gate).some(key => keys.includes(key)))
  }
  if (appliedGateFilter.keyword) list = list.filter(gate => gate.name.includes(appliedGateFilter.keyword))
  return list
})

function applyGateFilter() {
  appliedGateFilter.keyword = gateFilter.keyword.trim()
}

const gateSyncing = ref(false)

function syncGateSelection() {
  const table = gateTableRef.value
  if (!table) return
  gateSyncing.value = true
  table.clearSelection()
  filteredGateTable.value.forEach(gate => {
    if (tempSelectedIds.value.includes(gate.id)) table.toggleRowSelection(gate, true)
  })
  nextTick(() => {
    gateSyncing.value = false
  })
}

function onGateRowSelect(_selection: GatePoint[], row: GatePoint) {
  if (gateSyncing.value) return
  const index = tempSelectedIds.value.indexOf(row.id)
  if (index >= 0) tempSelectedIds.value.splice(index, 1)
  else tempSelectedIds.value.push(row.id)
}

function onGateSelectAll(selection: GatePoint[]) {
  if (gateSyncing.value) return
  const visibleIds = filteredGateTable.value.map(gate => gate.id)
  if (selection.length === 0) {
    tempSelectedIds.value = tempSelectedIds.value.filter(id => !visibleIds.includes(id))
  } else {
    visibleIds.forEach(id => {
      if (!tempSelectedIds.value.includes(id)) tempSelectedIds.value.push(id)
    })
  }
}

function openGateDialog(target: 'group' | 'rule' = 'group') {
  // 兜底：避免事件对象等非预期入参导致入口判定失效
  const scope: 'group' | 'rule' = target === 'rule' ? 'rule' : 'group'
  gatePickTarget.value = scope
  gatePickMode.value = scope === 'group' ? 'space' : 'group'
  selectedGroupId.value = groupRows.value[0]?.id ?? 0
  gateFilter.keyword = ''
  appliedGateFilter.keyword = ''
  spaceKeyword.value = ''
  selectedSpaceKey.value = 'all'
  tempSelectedIds.value = [
    ...(scope === 'group' ? groupForm.gateIds : form.gateIds),
  ]
  gateDialogVisible.value = true
  nextTick(() => syncGateSelection())
}

watch(filteredGateTable, () => {
  nextTick(() => syncGateSelection())
})

function confirmGateSelect() {
  const picked = [...tempSelectedIds.value]
  if (gatePickTarget.value === 'group') {
    groupForm.gateIds = picked
    groupFormRef.value?.validateField('gateIds', () => undefined)
  } else {
    form.gateIds = picked
    formRef.value?.validateField('gateIds', () => undefined)
  }
  gateDialogVisible.value = false
}

/* ---------------- 导出 ---------------- */
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

.ar-pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 14px;
}

.ar-form-label {
  display: inline-flex;
  align-items: center;
}

.ar-form-hint {
  margin-left: 8px;
  font-size: 14px;
  color: #a8abb2;
  cursor: help;
  vertical-align: middle;
}

.ar-hint-pop {
  max-width: 300px;
  line-height: 1.6;
  white-space: normal;
}

.ar-org-picker {
  width: 100%;
}

.ar-org-picker__types {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.ar-org-picker__chip {
  font-size: 12px;
}

/* ---------------- 受控点位组抽屉 ---------------- */
.ar-grp-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 10px;
}

.ar-gate-count {
  display: inline-block;
  min-width: 30px;
  padding: 1px 8px;
  font-size: 12px;
  line-height: 20px;
  color: #409eff;
  text-align: center;
  border: 1px solid #d9ecff;
  border-radius: 10px;
  background: #ecf5ff;
  cursor: pointer;
}

.ar-gate-count:hover {
  color: #337ecc;
  border-color: #a0cfff;
}

.ar-gate-count--empty {
  color: #c0c4cc;
  border-color: #ebeef5;
  background: #fafafa;
  cursor: default;
}

.ar-grp-gate-section {
  width: 100%;
}

.ar-grp-gate-section__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ar-grp-gate-section__count {
  font-size: 13px;
  color: #606266;
}

.ar-grp-gate-empty {
  padding: 16px;
  font-size: 13px;
  text-align: center;
  color: #c0c4cc;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafbfc;
}

/* ---------------- 选择门禁点位弹窗 ---------------- */
.ar-gate-select {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.ar-gate-select__side {
  width: 240px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ar-gate-select__mode {
  display: flex;
}

.ar-gate-select__mode :deep(.el-radio-button) {
  flex: 1;
}

.ar-gate-select__mode :deep(.el-radio-button__inner) {
  width: 100%;
  padding: 6px 0;
  font-size: 12px;
}

.ar-gate-select__side-body {
  flex: 1;
  min-height: 300px;
  max-height: 420px;
  padding: 8px;
  overflow: auto;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  background: #fafbfc;
}

.ar-gate-group-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ar-gate-group-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 7px 10px;
  font-size: 13px;
  color: #606266;
  border-radius: 4px;
  cursor: pointer;

  &:hover {
    background: #f0f2f5;
  }

  &.is-active {
    color: #409eff;
    font-weight: 500;
    background: #ecf5ff;
  }
}

.ar-gate-group-item__name {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.ar-gate-group-item__count {
  flex-shrink: 0;
  font-size: 12px;
  color: #a8abb2;
}

.ar-gate-group-item.is-active .ar-gate-group-item__count {
  color: #409eff;
}

.ar-gate-group-empty {
  padding: 24px 8px;
  font-size: 12px;
  color: #a8abb2;
  text-align: center;
}

.ar-space-search {
  margin-bottom: 8px;
}

.ar-gate-select__right {
  flex: 1;
  min-width: 0;
}

.ar-gate-select__filter {
  padding: 12px 16px;
  margin-bottom: 12px;
  border-radius: 4px;
  background: #fafbfc;
}

.ar-gate-select__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ar-gate-select__count {
  font-size: 13px;
  color: #606266;
}

@media (max-width: 1200px) {
  .ar-page {
    padding: 14px;
  }

  .ar-actions {
    flex-wrap: wrap;
  }
}
</style>
