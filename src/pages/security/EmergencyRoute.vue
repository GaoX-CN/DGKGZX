<template>
  <div>
    <!-- 查询过滤 -->
    <el-form :model="filters" inline class="er-search">
      <el-form-item label="路线名称">
        <el-input v-model="filters.keyword" placeholder="请输入" clearable style="width: 160px" />
      </el-form-item>
      <el-form-item label="所属建筑">
        <el-select v-model="filters.building" placeholder="全部" clearable style="width: 140px">
          <el-option v-for="b in buildings" :key="b" :label="b" :value="b" />
        </el-select>
      </el-form-item>
      <el-form-item label="状态">
        <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px">
          <el-option label="已启用" value="active" />
          <el-option label="已停用" value="inactive" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" :icon="Search" @click="handleSearch">查询</el-button>
        <el-button :icon="Refresh" @click="handleReset">重置</el-button>
      </el-form-item>
    </el-form>

    <!-- 操作栏 -->
    <div class="er-actions-bar">
      <el-button type="primary" :icon="Plus" @click="openAddDrawer">新增路线</el-button>
      <span class="er-actions-bar__hint">共 {{ filteredRouteList.length }} 条逃生路线</span>
    </div>

    <!-- 路线列表 -->
    <el-table
      :data="filteredRouteList"
      border
      stripe
      style="width: 100%"
      @row-click="openEditDrawer"
      highlight-current-row
    >
      <el-table-column type="index" label="序号" width="60" align="center" />
      <el-table-column prop="name" label="路线名称" min-width="180" />
      <el-table-column prop="building" label="所属建筑" width="150" />
      <el-table-column prop="floor" label="所在楼层" width="100" align="center" />
      <el-table-column prop="status" label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
            {{ row.status === 'active' ? '已启用' : '已停用' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="关联设备" width="180" align="center">
        <template #default="{ row }">
          <span class="er-device-badge"><el-icon :size="12"><Lock /></el-icon> {{ countDevices(row.devices, 'door') }}</span>
          <span class="er-device-badge" style="margin-left: 8px"><el-icon :size="12"><Lightning /></el-icon> {{ countDevices(row.devices, 'lighting') }}</span>
          <span class="er-device-badge" style="margin-left: 8px"><el-icon :size="12"><Switch /></el-icon> {{ countDevices(row.devices, 'barrier') }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="200" align="center" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" size="small" @click.stop="openDetailDialog(row)">详情</el-button>
          <el-button link type="primary" size="small" @click.stop="openEditDrawer(row)">编辑</el-button>
          <el-button link type="danger" size="small" @click.stop="handleDeleteClick(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增/编辑 右侧滑出抽屉 -->
    <el-drawer
      v-model="showDrawer"
      :title="isEditing ? '编辑路线' : '新增路线'"
      direction="rtl"
      size="680px"
      :close-on-click-modal="false"
    >
      <template #header>
        <div class="er-drawer-header">
          <span class="er-drawer-header__title">{{ isEditing ? '编辑路线' : '新增路线' }}</span>
          <el-steps :active="step" align-center size="small" class="er-drawer-steps">
            <el-step title="基本信息" :status="step > 0 ? 'success' : step === 0 ? 'process' : 'wait'" />
            <el-step title="设备配置" :status="step > 1 ? 'success' : step === 1 ? 'process' : 'wait'" />
          </el-steps>
        </div>
      </template>

      <!-- Step 1: 基本信息 -->
      <div v-show="step === 0" class="er-drawer-body">
        <el-form ref="routeFormRef" :model="routeForm" :rules="routeRules" label-width="90px" size="small">
          <el-form-item label="路线名称" prop="name">
            <el-input v-model="routeForm.name" placeholder="请输入路线名称" />
          </el-form-item>
          <el-row :gutter="20">
            <el-col :span="12">
              <el-form-item label="所属建筑" prop="building">
                <el-select v-model="routeForm.building" placeholder="请选择" style="width: 100%">
                  <el-option v-for="b in buildings" :key="b" :label="b" :value="b" />
                </el-select>
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="所在楼层" prop="floor">
                <el-select v-model="routeForm.floor" placeholder="请选择" style="width: 100%">
                  <el-option v-for="f in floors" :key="f" :label="f" :value="f" />
                </el-select>
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="路线描述" prop="description">
            <el-input v-model="routeForm.description" type="textarea" :rows="3" placeholder="描述逃生路线的路径走向" />
          </el-form-item>
          <el-form-item label="路线图片">
            <div class="er-upload-wrap">
              <img v-if="routeForm.imageUrl" :src="routeForm.imageUrl" class="er-upload-preview" />
              <el-upload
                action="#"
                :auto-upload="false"
                :show-file-list="false"
                accept="image/png,image/jpeg"
                @change="handleUploadChange"
              >
                <el-button type="primary" plain size="small" :icon="Upload">
                  {{ routeForm.imageUrl ? '替换图片' : '上传图片' }}
                </el-button>
              </el-upload>
              <el-button v-if="routeForm.imageUrl" text size="small" type="danger" @click="routeForm.imageUrl = ''">移除</el-button>
              <span class="er-upload-hint">支持 JPG/PNG 格式的逃生路线平面图</span>
            </div>
          </el-form-item>
          <el-form-item label="启用状态">
            <el-switch
              v-model="routeForm.status"
              active-value="active"
              inactive-value="inactive"
              active-text="启用"
              inactive-text="停用"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- Step 2: 设备配置 -->
      <div v-show="step === 1" class="er-drawer-body">
        <div class="er-drawer-section">
          <div class="er-drawer-section__header">
            <span style="font-weight: 600; font-size: 14px">关联设备</span>
            <el-button size="small" type="primary" :icon="Plus" @click="openDeviceSelector">添加设备</el-button>
          </div>

          <el-table :data="editingDevices" border stripe style="width: 100%" max-height="360">
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="name" label="设备名称" width="130" />
            <el-table-column label="类型" width="68" align="center">
              <template #default="{ row }">
                <el-tag :type="deviceTypeTag(row.type)" size="small">{{ deviceTypeLabel(row.type) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="location" label="安装位置" width="120" />
            <el-table-column label="应急响应状态" min-width="160">
              <template #default="{ row, $index }">
                <el-select v-model="row.emergencyState" style="width: 100%" size="small">
                  <el-option v-for="opt in stateOptions(row.type)" :key="opt.value" :label="opt.label" :value="opt.value">
                    <span style="float: left">{{ opt.label }}</span>
                    <span style="float: right; color: #909399; font-size: 12px">{{ opt.description }}</span>
                  </el-option>
                </el-select>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="60" align="center">
              <template #default="{ $index }">
                <el-button text type="danger" size="small" @click="handleRemoveDeviceClick($index)">移除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div v-if="editingDevices.length === 0" class="er-device-empty">
            <el-icon :size="24" style="color: #c0c4cc"><Switch /></el-icon>
            <p>暂无关联设备</p>
            <span>点击「添加设备」从空间中选择要关联的应急设备</span>
          </div>
        </div>
      </div>

      <template #footer>
        <div class="er-drawer-footer">
          <el-button v-if="step === 1" @click="step = 0">上一步</el-button>
          <el-button v-if="step === 0" type="primary" @click="goToStep2">下一步</el-button>
          <el-button v-if="step === 1" type="primary" @click="confirmSave">完成</el-button>
          <el-button @click="showDrawer = false">取消</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- 设备选择器对话框（空间树 + 设备列表） -->
    <el-dialog
      v-model="showDeviceSelector"
      title="添加关联设备"
      width="740px"
      :close-on-click-modal="false"
    >
      <div class="er-device-selector">
        <!-- 左侧：空间树 -->
        <div class="er-ds-tree">
          <div class="er-ds-tree__title">空间结构</div>
          <div class="er-ds-tree__scroll">
            <el-tree
              ref="deviceTreeRef"
              :data="deviceTreeData"
              :props="deviceTreeProps"
              node-key="value"
              default-expand-all
              highlight-current
              :current-node-key="deviceTreeSelectedKey"
              @node-click="handleDeviceTreeNodeClick"
            />
          </div>
        </div>
        <!-- 右侧：设备列表 -->
        <div class="er-ds-list">
          <div class="er-ds-list__header">
            <span class="er-ds-list__title">{{ deviceListTitle }}</span>
          </div>
          <!-- 类型过滤 -->
          <el-radio-group v-model="deviceTypeFilter" size="small" class="er-ds-filter">
            <el-radio-button value="">全部</el-radio-button>
            <el-radio-button value="door">门禁</el-radio-button>
            <el-radio-button value="lighting">照明</el-radio-button>
            <el-radio-button value="barrier">道闸</el-radio-button>
          </el-radio-group>
          <!-- 设备列表 -->
          <div class="er-ds-list__scroll">
            <div
              v-for="dev in filteredDeviceList"
              :key="dev.name"
              class="er-ds-item"
              :class="{ 'er-ds-item--selected': isDeviceSelected(dev) }"
              @click="toggleDevice(dev)"
            >
              <el-checkbox
                :model-value="isDeviceSelected(dev)"
                size="small"
                @click.stop
                @change="() => toggleDevice(dev)"
              />
              <div class="er-ds-item__info">
                <span class="er-ds-item__name">{{ dev.name }}</span>
                <span class="er-ds-item__location">{{ dev.location }}</span>
              </div>
              <el-tag :type="deviceTypeTag(dev.type)" size="small">{{ deviceTypeLabel(dev.type) }}</el-tag>
            </div>
          </div>
          <div v-if="filteredDeviceList.length === 0" class="er-ds-empty">
            请先在左侧选择一个楼层
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showDeviceSelector = false">取消</el-button>
        <el-button type="primary" @click="confirmAddDevices">确认添加（已选 {{ selectedDeviceCount }} 个）</el-button>
      </template>
    </el-dialog>

    <!-- 删除确认 -->
    <el-dialog v-model="showDeleteConfirm" title="删除路线" width="400px">
      <p style="margin: 0; font-size: 14px; color: #606266;">
        确定要删除逃生路线「<strong>{{ deletingRoute?.name }}</strong>」吗？该操作不可撤销，关联的设备配置也将一并移除。
      </p>
      <template #footer>
        <el-button @click="showDeleteConfirm = false">取消</el-button>
        <el-button type="danger" @click="confirmDeleteRoute">确认删除</el-button>
      </template>
    </el-dialog>

    <!-- 移除设备确认 -->
    <el-dialog v-model="showRemoveDeviceConfirm" title="移除设备" width="400px">
      <p style="margin: 0; font-size: 14px; color: #606266;">
        确定要移除设备「<strong>{{ removingDeviceName }}</strong>」吗？
      </p>
      <template #footer>
        <el-button @click="showRemoveDeviceConfirm = false">取消</el-button>
        <el-button type="danger" @click="confirmRemoveDevice">确认移除</el-button>
      </template>
    </el-dialog>

    <!-- 路线详情弹窗 -->
    <el-dialog v-model="showDetailDialog" title="路线详情" width="700px">
      <template v-if="detailRoute">
        <div class="er-detail">
          <div class="er-detail__section">
            <h4 class="er-detail__section-title">基本信息</h4>
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="路线名称" span="2">{{ detailRoute.name }}</el-descriptions-item>
              <el-descriptions-item label="所属建筑">{{ detailRoute.building }}</el-descriptions-item>
              <el-descriptions-item label="所在楼层">{{ detailRoute.floor }}</el-descriptions-item>
              <el-descriptions-item label="启用状态" span="2">
                <el-tag :type="detailRoute.status === 'active' ? 'success' : 'info'" size="small">
                  {{ detailRoute.status === 'active' ? '已启用' : '已停用' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item v-if="detailRoute.description" label="路线描述" span="2">
                {{ detailRoute.description }}
              </el-descriptions-item>
            </el-descriptions>
          </div>

          <div class="er-detail__section">
            <h4 class="er-detail__section-title">路线平面图</h4>
            <div class="er-detail__image-box">
              <template v-if="detailRoute.imageUrl">
                <el-image
                  :src="detailRoute.imageUrl"
                  fit="contain"
                  class="er-detail__image"
                  :preview-src-list="[detailRoute.imageUrl]"
                  preview-teleported
                />
              </template>
              <div v-else class="er-detail__image-placeholder">
                <el-icon :size="32"><Picture /></el-icon>
                <p>暂无平面图</p>
              </div>
            </div>
          </div>

          <div class="er-detail__section">
            <h4 class="er-detail__section-title">
              关联设备（共 {{ detailRoute.devices.length }} 个）
            </h4>
            <el-table :data="detailRoute.devices" border stripe style="width: 100%">
              <el-table-column type="index" label="序号" width="50" align="center" />
              <el-table-column prop="name" label="设备名称" width="140" />
              <el-table-column label="类型" width="70" align="center">
                <template #default="{ row }">
                  <el-tag :type="deviceTypeTag(row.type)" size="small">{{ deviceTypeLabel(row.type) }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="location" label="安装位置" width="130" />
              <el-table-column label="应急响应状态" width="100" align="center">
                <template #default="{ row }">
                  <el-tag :type="row.emergencyState === 'open' ? 'success' : 'danger'" size="small">
                    {{ row.emergencyState === 'open' ? '打开' : '关闭' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </template>
      <template #footer>
        <el-button @click="showDetailDialog = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick } from 'vue'
import {
  Plus, Search, Refresh, Lock, Lightning, Switch, View, Upload, Picture
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules, ElTree } from 'element-plus'

// ==================== 设备类型选项 ====================

function countDevices(devices: AssociatedDevice[], type: string): number {
  return devices.filter(d => d.type === type).length
}

interface StateOption {
  value: string
  label: string
  description: string
}

const deviceStateMap: Record<string, StateOption[]> = {
  door: [
    { value: 'open', label: '打开', description: '' },
    { value: 'close', label: '关闭', description: '' },
  ],
  lighting: [
    { value: 'open', label: '打开', description: '' },
    { value: 'close', label: '关闭', description: '' },
  ],
  barrier: [
    { value: 'open', label: '打开', description: '' },
    { value: 'close', label: '关闭', description: '' },
  ],
}

function stateOptions(type: string): StateOption[] {
  return deviceStateMap[type] || []
}

function deviceTypeLabel(type: string): string {
  const map: Record<string, string> = { door: '门禁', lighting: '照明', barrier: '道闸' }
  return map[type] || type
}

function deviceTypeTag(type: string): string {
  const map: Record<string, string> = { door: 'primary', lighting: 'warning', barrier: 'success' }
  return map[type] || ''
}

// ==================== 基础数据 ====================

const buildings = ['CT楼', 'FF楼', '海关联检大楼(OB)']
const floors = ['B1', '1F', '2F', '3F', '4F', '5F', '6F', 'S夹层', '7F', '8F', '屋顶层']

// ==================== 设备数据库（按空间索引） ====================

interface DeviceCatalog {
  name: string
  type: string
  location: string
}

const deviceDatabase: Record<string, DeviceCatalog[]> = {
  'CT楼|1F': [
    { name: '1F 东侧安全门', type: 'door', location: '1F 东侧' },
    { name: '1F 西侧安全门', type: 'door', location: '1F 西侧' },
    { name: '1F 大门人脸门禁', type: 'door', location: '1F 主入口' },
    { name: '1F 走廊应急灯组', type: 'lighting', location: '1F 主走廊' },
    { name: '1F 大厅照明', type: 'lighting', location: '1F 大厅' },
    { name: '1F 东侧道闸', type: 'barrier', location: '1F 东侧出口' },
    { name: '1F 西侧道闸', type: 'barrier', location: '1F 西侧出口' },
  ],
  'CT楼|2F': [
    { name: '2F 东侧楼梯间门', type: 'door', location: '2F 东侧' },
    { name: '2F 西侧楼梯间门', type: 'door', location: '2F 西侧' },
    { name: '2F 走廊应急灯组', type: 'lighting', location: '2F 主走廊' },
    { name: '2F 办公区照明', type: 'lighting', location: '2F 办公区' },
  ],
  'CT楼|3F': [
    { name: '3F 东侧安全门', type: 'door', location: '3F 东侧' },
    { name: '3F 西侧安全门', type: 'door', location: '3F 西侧' },
    { name: '3F 走廊应急灯组', type: 'lighting', location: '3F 主走廊' },
    { name: '3F 仓储区照明', type: 'lighting', location: '3F 仓储区' },
    { name: '3F 北侧道闸', type: 'barrier', location: '3F 北侧' },
  ],
  'CT楼|4F': [
    { name: '4F 东侧安全门', type: 'door', location: '4F 东侧' },
    { name: '4F 走廊应急灯组', type: 'lighting', location: '4F 主走廊' },
    { name: '4F 作业区照明', type: 'lighting', location: '4F 作业区' },
  ],
  'CT楼|5F': [
    { name: '5F 楼梯间门', type: 'door', location: '5F 楼梯间' },
    { name: '5F 走廊应急灯组', type: 'lighting', location: '5F 主走廊' },
    { name: '5F 南侧道闸', type: 'barrier', location: '5F 南侧' },
  ],
  'CT楼|6F': [
    { name: '6F 东侧安全门', type: 'door', location: '6F 东侧' },
    { name: '6F 走廊应急灯组', type: 'lighting', location: '6F 主走廊' },
  ],
  'CT楼|屋顶层': [
    { name: '屋顶层应急门', type: 'door', location: '屋顶层' },
    { name: '屋顶层照明', type: 'lighting', location: '屋顶层' },
  ],
  'CT楼|地下室': [
    { name: '地下室防火门', type: 'door', location: '地下室入口' },
    { name: '地下室应急照明', type: 'lighting', location: '地下室' },
    { name: '地下室道闸', type: 'barrier', location: '地下室出口' },
  ],
  'FF楼|1F': [
    { name: '1F 南侧卷帘门', type: 'door', location: 'FF楼 1F 南侧' },
    { name: '1F 北侧卷帘门', type: 'door', location: 'FF楼 1F 北侧' },
    { name: '1F 西侧安全门', type: 'door', location: 'FF楼 1F 西侧' },
    { name: '1F 作业区照明', type: 'lighting', location: 'FF楼 1F 作业区' },
    { name: '1F 走廊应急灯组', type: 'lighting', location: 'FF楼 1F 走廊' },
    { name: '1F 南侧道闸', type: 'barrier', location: 'FF楼 1F 南侧' },
    { name: '1F 北侧道闸', type: 'barrier', location: 'FF楼 1F 北侧' },
  ],
  'FF楼|S夹层': [
    { name: 'S夹层安全门', type: 'door', location: 'FF楼 S夹层' },
    { name: 'S夹层应急照明', type: 'lighting', location: 'FF楼 S夹层' },
  ],
  'FF楼|7F': [
    { name: '7F 安全门', type: 'door', location: 'FF楼 7F' },
    { name: '7F 应急照明', type: 'lighting', location: 'FF楼 7F' },
    { name: '7F 道闸', type: 'barrier', location: 'FF楼 7F' },
  ],
  'FF楼|8F': [
    { name: '8F 安全门', type: 'door', location: 'FF楼 8F' },
    { name: '8F 照明', type: 'lighting', location: 'FF楼 8F' },
  ],
  '海关联检大楼(OB)|1F': [
    { name: 'OB 1F 正门门禁', type: 'door', location: 'OB 1F 正门' },
    { name: 'OB 1F 侧门门禁', type: 'door', location: 'OB 1F 侧门' },
    { name: 'OB 1F 大厅照明', type: 'lighting', location: 'OB 1F 大厅' },
    { name: 'OB 1F 走廊应急灯', type: 'lighting', location: 'OB 1F 走廊' },
    { name: 'OB 1F 道闸', type: 'barrier', location: 'OB 1F 出口' },
  ],
  '海关联检大楼(OB)|2F': [
    { name: 'OB 2F 安全门', type: 'door', location: 'OB 2F' },
    { name: 'OB 2F 应急照明', type: 'lighting', location: 'OB 2F 走廊' },
  ],
}

function getDevicesForLocation(building: string, floor: string): DeviceCatalog[] {
  return deviceDatabase[`${building}|${floor}`] || []
}

// ==================== 路线数据 ====================

interface AssociatedDevice {
  name: string
  type: string
  location: string
  emergencyState: string
}

interface EscapeRoute {
  id: string
  name: string
  description: string
  building: string
  floor: string
  status: 'active' | 'inactive'
  imageUrl: string
  devices: AssociatedDevice[]
}

let nextId = 4

const routeList = reactive<EscapeRoute[]>([
  {
    id: '1',
    name: 'CT楼 1F 主逃生路线',
    description: '从各功能区经东西两侧安全门疏散至室外集结点',
    building: 'CT楼',
    floor: '1F',
    status: 'active',
    imageUrl: '',
    devices: [
      { name: '1F 东侧安全门', type: 'door', location: '1F 东侧', emergencyState: 'open' },
      { name: '1F 西侧安全门', type: 'door', location: '1F 西侧', emergencyState: 'open' },
      { name: '1F 走廊应急灯组', type: 'lighting', location: '1F 主走廊', emergencyState: 'open' },
      { name: '1F 东侧道闸', type: 'barrier', location: '1F 东侧出口', emergencyState: 'open' },
      { name: '1F 西侧道闸', type: 'barrier', location: '1F 西侧出口', emergencyState: 'open' },
    ]
  },
  {
    id: '2',
    name: 'CT楼 2F 主逃生路线',
    description: '经楼梯间下楼至1F，从东侧安全门疏散',
    building: 'CT楼',
    floor: '2F',
    status: 'active',
    imageUrl: '',
    devices: [
      { name: '2F 东侧楼梯间门', type: 'door', location: '2F 东侧', emergencyState: 'open' },
      { name: '2F 西侧楼梯间门', type: 'door', location: '2F 西侧', emergencyState: 'open' },
      { name: '2F 走廊应急灯组', type: 'lighting', location: '2F 主走廊', emergencyState: 'close' },
    ]
  },
  {
    id: '3',
    name: 'FF楼 1F 主逃生路线',
    description: '从物流作业区经南北两侧出口疏散',
    building: 'FF楼',
    floor: '1F',
    status: 'active',
    imageUrl: '',
    devices: [
      { name: '1F 南侧卷帘门', type: 'door', location: 'FF楼 1F 南侧', emergencyState: 'open' },
      { name: '1F 北侧卷帘门', type: 'door', location: 'FF楼 1F 北侧', emergencyState: 'open' },
      { name: '1F 作业区照明', type: 'lighting', location: 'FF楼 1F 作业区', emergencyState: 'open' },
    ]
  },
])

// ==================== 查询过滤 ====================

const filters = reactive({
  keyword: '',
  building: '',
  status: '',
})

const filteredRouteList = computed(() => {
  return routeList.filter(route => {
    if (filters.keyword && !route.name.includes(filters.keyword)) return false
    if (filters.building && route.building !== filters.building) return false
    if (filters.status && route.status !== filters.status) return false
    return true
  })
})

function handleSearch() {}
function handleReset() {
  filters.keyword = ''
  filters.building = ''
  filters.status = ''
}

// ==================== 右侧抽屉 + 两步流程 ====================

const showDrawer = ref(false)
const isEditing = ref(false)
const editingRouteId = ref('')
const step = ref(0)

const routeForm = reactive({
  name: '',
  description: '',
  building: '',
  floor: '',
  status: 'active' as 'active' | 'inactive',
  imageUrl: '',
})

const routeRules: FormRules = {
  name: [{ required: true, message: '请输入路线名称', trigger: 'blur' }],
  building: [{ required: true, message: '请选择建筑', trigger: 'change' }],
  floor: [{ required: true, message: '请选择楼层', trigger: 'change' }],
}

const routeFormRef = ref<FormInstance>()

const editingDevices = ref<AssociatedDevice[]>([])

function openAddDrawer() {
  isEditing.value = false
  editingRouteId.value = ''
  step.value = 0
  routeForm.name = ''
  routeForm.description = ''
  routeForm.building = 'CT楼'
  routeForm.floor = '1F'
  routeForm.status = 'active'
  routeForm.imageUrl = ''
  editingDevices.value = []
  showDrawer.value = true
  nextTick(() => routeFormRef.value?.clearValidate())
}

function openEditDrawer(route: EscapeRoute) {
  isEditing.value = true
  editingRouteId.value = route.id
  step.value = 0
  routeForm.name = route.name
  routeForm.description = route.description
  routeForm.building = route.building
  routeForm.floor = route.floor
  routeForm.status = route.status
  routeForm.imageUrl = route.imageUrl
  editingDevices.value = route.devices.map(d => ({ ...d }))
  showDrawer.value = true
  nextTick(() => routeFormRef.value?.clearValidate())
}

function goToStep2() {
  routeFormRef.value?.validate((valid) => {
    if (valid) step.value = 1
  })
}

function confirmSave() {
  if (isEditing.value) {
    const target = routeList.find(r => r.id === editingRouteId.value)
    if (target) {
      target.name = routeForm.name
      target.description = routeForm.description
      target.building = routeForm.building
      target.floor = routeForm.floor
      target.status = routeForm.status
      target.imageUrl = routeForm.imageUrl
      target.devices = editingDevices.value.map(d => ({ ...d }))
    }
  } else {
    const id = String(nextId++)
    routeList.unshift({
      id,
      name: routeForm.name,
      description: routeForm.description,
      building: routeForm.building,
      floor: routeForm.floor,
      status: routeForm.status,
      imageUrl: routeForm.imageUrl,
      devices: editingDevices.value.map(d => ({ ...d })),
    })
  }
  showDrawer.value = false
}

// ==================== 设备选择器（空间树 + 设备列表） ====================

const showDeviceSelector = ref(false)

interface DeviceTreeNode {
  value: string
  label: string
  children?: DeviceTreeNode[]
}

const deviceTreeData = computed<DeviceTreeNode[]>(() => [
  {
    value: '__all__',
    label: '全部区域',
    children: buildings.map(b => ({
      value: b,
      label: b,
      children: floors
        .filter(f => deviceDatabase[`${b}|${f}`])
        .map(f => ({ value: f, label: f })),
    })),
  },
])

const deviceTreeProps = { children: 'children', label: 'label' }

const deviceTreeRef = ref<InstanceType<typeof ElTree>>()
const deviceTreeSelected = ref<{ building: string; floor: string } | null>(null)
const deviceTreeSelectedKey = computed(() => {
  if (!deviceTreeSelected.value) return '__all__'
  return deviceTreeSelected.value.floor
})

function handleDeviceTreeNodeClick(data: DeviceTreeNode) {
  // 只处理楼层节点（叶子节点）
  const allBuildings = buildings
  for (const b of allBuildings) {
    const children = floors.filter(f => deviceDatabase[`${b}|${f}`])
    if (children.includes(data.value)) {
      deviceTreeSelected.value = { building: b, floor: data.value }
      return
    }
  }
  deviceTreeSelected.value = null
}

const deviceTypeFilter = ref('')

const currentFloorDevices = computed(() => {
  if (!deviceTreeSelected.value) return []
  return getDevicesForLocation(deviceTreeSelected.value.building, deviceTreeSelected.value.floor)
})

const filteredDeviceList = computed(() => {
  const list = currentFloorDevices.value
  if (!deviceTypeFilter.value) return list
  return list.filter(d => d.type === deviceTypeFilter.value)
})

// 已选设备集合（按 name 去重）
const selectedDeviceNames = ref<Set<string>>(new Set())

const selectedDeviceCount = computed(() => selectedDeviceNames.value.size)

function isDeviceSelected(dev: DeviceCatalog): boolean {
  return selectedDeviceNames.value.has(dev.name)
}

function toggleDevice(dev: DeviceCatalog) {
  if (selectedDeviceNames.value.has(dev.name)) {
    selectedDeviceNames.value.delete(dev.name)
  } else {
    selectedDeviceNames.value.add(dev.name)
  }
}

const deviceListTitle = computed(() => {
  if (!deviceTreeSelected.value) return '请选择楼层'
  const b = deviceTreeSelected.value.building
  const f = deviceTreeSelected.value.floor
  const total = currentFloorDevices.value.length
  return `${b} ${f}（共 ${total} 台设备）`
})

const defaultEmergencyState: Record<string, string> = {
  door: 'open',
  lighting: 'open',
  barrier: 'open',
}

function openDeviceSelector() {
  deviceTreeSelected.value = null
  deviceTypeFilter.value = ''
  selectedDeviceNames.value = new Set()
  showDeviceSelector.value = true
}

function confirmAddDevices() {
  if (!deviceTreeSelected.value) {
    alert('请先在左侧选择楼层')
    return
  }
  const allDevices = currentFloorDevices.value
  const toAdd = allDevices.filter(d => selectedDeviceNames.value.has(d.name))
  for (const dev of toAdd) {
    // 避免重复添加（已在 editingDevices 中）
    if (!editingDevices.value.find(e => e.name === dev.name)) {
      editingDevices.value.push({
        name: dev.name,
        type: dev.type,
        location: dev.location,
        emergencyState: defaultEmergencyState[dev.type] || '',
      })
    }
  }
  showDeviceSelector.value = false
}

// ==================== 删除路线 ====================

const showDeleteConfirm = ref(false)
const deletingRoute = ref<EscapeRoute | null>(null)

function handleDeleteClick(route: EscapeRoute) {
  deletingRoute.value = route
  showDeleteConfirm.value = true
}

function confirmDeleteRoute() {
  if (!deletingRoute.value) return
  const idx = routeList.findIndex(r => r.id === deletingRoute.value!.id)
  if (idx !== -1) routeList.splice(idx, 1)
  showDeleteConfirm.value = false
  deletingRoute.value = null
}

// ==================== 移除设备 ====================

const showRemoveDeviceConfirm = ref(false)
const removingDeviceIndex = ref(-1)
const removingDeviceName = ref('')

function handleRemoveDeviceClick(index: number) {
  removingDeviceIndex.value = index
  removingDeviceName.value = editingDevices.value[index].name
  showRemoveDeviceConfirm.value = true
}

function confirmRemoveDevice() {
  editingDevices.value.splice(removingDeviceIndex.value, 1)
  showRemoveDeviceConfirm.value = false
  removingDeviceIndex.value = -1
  removingDeviceName.value = ''
}

// ==================== 上传路线图片 ====================

function handleUploadChange(uploadFile: any) {
  const file = uploadFile.raw
  if (!file) return
  const reader = new FileReader()
  reader.onload = (e) => {
    routeForm.imageUrl = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// ==================== 查看详情 ====================

const showDetailDialog = ref(false)
const detailRoute = ref<EscapeRoute | null>(null)

function openDetailDialog(route: EscapeRoute) {
  detailRoute.value = route
  showDetailDialog.value = true
}
</script>

<style scoped>
.er-search {
  background: #fafbfc;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}

.er-actions-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.er-actions-bar__hint {
  font-size: 13px;
  color: #909399;
}

.er-device-badge {
  font-size: 12px;
  color: #606266;
  white-space: nowrap;
}

/* 抽屉头部 */
.er-drawer-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding-right: 40px;
}
.er-drawer-header__title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.er-drawer-steps {
  max-width: 400px;
}

.er-drawer-body {
  padding: 0 4px;
}

.er-drawer-section {
  margin-bottom: 16px;
}
.er-drawer-section__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.er-device-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 0;
  color: #c0c4cc;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  background: #fafbfc;
}
.er-device-empty p {
  margin: 8px 0 2px;
  font-size: 14px;
  color: #909399;
}
.er-device-empty span {
  font-size: 12px;
}

.er-drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* ===== 设备选择器弹窗 ===== */
.er-device-selector {
  display: flex;
  gap: 0;
  height: 420px;
  border: 1px solid #ebeef5;
  border-radius: 4px;
  overflow: hidden;
}

/* 左侧空间树 */
.er-ds-tree {
  width: 220px;
  min-width: 220px;
  border-right: 1px solid #ebeef5;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}
.er-ds-tree__title {
  padding: 10px 12px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}
.er-ds-tree__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

/* 右侧设备列表 */
.er-ds-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.er-ds-list__header {
  padding: 10px 12px;
  border-bottom: 1px solid #ebeef5;
}
.er-ds-list__title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.er-ds-filter {
  padding: 8px 12px;
  border-bottom: 1px solid #ebeef5;
}
.er-ds-list__scroll {
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;
}

.er-ds-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
  border-bottom: 1px solid #f2f3f5;
}
.er-ds-item:hover {
  background: #ecf5ff;
}
.er-ds-item--selected {
  background: #f0f9eb;
}
.er-ds-item--selected:hover {
  background: #e1f3d8;
}

.er-ds-item__info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.er-ds-item__name {
  font-size: 13px;
  color: #303133;
}
.er-ds-item__location {
  font-size: 11px;
  color: #909399;
}

.er-ds-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  color: #c0c4cc;
  font-size: 13px;
}

/* ===== 上传图片 ===== */
.er-upload-wrap {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.er-upload-preview {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 4px;
  border: 1px solid #dcdfe6;
}
.er-upload-hint {
  width: 100%;
  font-size: 12px;
  color: #c0c4cc;
}

/* ===== 详情弹窗 ===== */
.er-detail__section {
  margin-bottom: 20px;
}
.er-detail__section-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  line-height: 1.2;
}
.er-detail__image-box {
  border: 1px solid #ebeef5;
  border-radius: 4px;
  padding: 8px;
  background: #fafbfc;
}
.er-detail__image {
  width: 100%;
  max-height: 260px;
  display: block;
  cursor: pointer;
}
.er-detail__image-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 120px;
  color: #c0c4cc;
}
.er-detail__image-placeholder p {
  margin: 6px 0 0;
  font-size: 13px;
  color: #909399;
}
</style>
