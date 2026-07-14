<template>
  <div>
    <div class="rm-page">
      <el-form :model="query" inline class="rm-search">
        <el-form-item label="报修单号">
          <el-input v-model="query.orderNo" placeholder="请输入" clearable style="width: 160px" />
        </el-form-item>
        <el-form-item label="报修类型">
          <el-select v-model="query.repairType" placeholder="全部" clearable style="width: 140px">
            <el-option label="物联设备报修" value="device" />
            <el-option label="月台报修" value="platform" />
            <el-option label="其他资产报修" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="当前状态">
          <el-select v-model="query.status" placeholder="全部" clearable style="width: 140px">
            <el-option v-for="s in statusOptions" :key="s.value" :label="s.label" :value="s.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-input v-model="query.chargePerson" placeholder="请输入" clearable style="width: 120px" />
        </el-form-item>
        <el-form-item label="紧急程度">
          <el-select v-model="query.urgency" placeholder="全部" clearable style="width: 120px">
            <el-option label="一般" value="normal" />
            <el-option label="紧急" value="urgent" />
            <el-option label="非常紧急" value="critical" />
          </el-select>
        </el-form-item>
        <el-form-item label="报修日期">
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
          <el-button :icon="Refresh" @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>

      <div class="rm-actions">
        <el-button type="primary" :icon="Plus" @click="openCreate">新建报修</el-button>
        <el-button type="warning" @click="openAbnormalDevices">巡检异常设备：{{ abnormalDeviceCount }}</el-button>
        <span class="rm-actions__count">共 {{ total }} 条记录</span>
      </div>

      <el-table :data="tableData" border stripe style="width: 100%" v-loading="loading">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="orderNo" label="报修单号" width="160" />
        <el-table-column label="报修类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag size="small">{{ repairTypeLabel(row.repairType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="targetName" label="报修对象" min-width="180" show-overflow-tooltip />
        <el-table-column prop="content" label="报修内容" min-width="200" show-overflow-tooltip />
        <el-table-column label="紧急程度" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="urgencyType(row.urgency)" size="small" effect="dark">
              {{ urgencyLabel(row.urgency) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="当前状态" width="130" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small" effect="dark">
              {{ statusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="reporter" label="报修人" width="90" />
        <el-table-column prop="chargePerson" label="负责人" width="90">
          <template #default="{ row }">{{ row.chargePerson || '-' }}</template>
        </el-table-column>
        <el-table-column prop="reportTime" label="报修时间" width="165" />
        <el-table-column label="操作" width="300" align="center" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetail(row)">详情</el-button>
            <el-button v-if="row.status === 'pending_review'" link type="primary" size="small" @click="openCheck(row)">核查</el-button>
            <el-button v-if="row.status === 'pending_review'" link type="warning" size="small" @click="openSubmitPlan(row)">维修</el-button>
            <el-button v-if="row.status === 'pending_review'" link type="primary" size="small" @click="openEdit(row)">编辑</el-button>
            <el-button v-if="row.status === 'pending_review'" link type="danger" size="small" @click="handleDelete(row)">删除</el-button>
            <el-button v-if="row.status === 'approved'" link type="warning" size="small" @click="openSubmitPlan(row)">提交方案</el-button>
            <el-button v-if="row.status === 'plan_pending'" link type="success" size="small" @click="openPlanAudit(row)">审核方案</el-button>
            <el-button v-if="row.status === 'plan_approved'" link type="warning" size="small" @click="openDispatch(row)">下发维修工单</el-button>
            <el-button v-if="row.status === 'plan_rejected'" link type="warning" size="small" @click="openSubmitPlan(row)">修改方案</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="rm-pagination">
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

    <!-- ==================== 新建报修抽屉 ==================== -->
    <el-drawer v-model="createVisible" title="新建报修" direction="rtl" size="620px" :close-on-click-modal="false">
      <template #header>
        <div class="rm-drawer-header">
          <span class="rm-drawer-header__title">新建报修</span>
          <el-steps :active="createStep" align-center size="small" class="rm-drawer-steps">
            <el-step title="选择类型" />
            <el-step title="填写信息" />
          </el-steps>
        </div>
      </template>
      <div class="rm-drawer-body">
        <!-- Step 0: 选择报修类型 -->
        <div v-show="createStep === 0" class="rm-create-type">
          <div
            v-for="t in repairTypes"
            :key="t.value"
            class="rm-type-card"
            :class="{ 'rm-type-card--selected': createForm.repairType === t.value }"
            @click="selectRepairType(t.value)"
          >
            <el-icon :size="28"><component :is="t.icon" /></el-icon>
            <span class="rm-type-card__name">{{ t.label }}</span>
            <span class="rm-type-card__desc">{{ t.desc }}</span>
          </div>
        </div>

        <!-- Step 1: 填写报修信息 -->
        <div v-show="createStep === 1">
          <el-form ref="createFormRef" :model="createForm" :rules="createRules" label-width="90px" size="small">

            <!-- 物联设备报修 - 选择设备 -->
            <template v-if="createForm.repairType === 'device'">
              <el-form-item label="报修设备" prop="deviceNames">
                <div class="rm-device-select-section">
                  <div class="rm-device-select-section__header">
                    <span class="rm-device-select-section__count">已选设备（{{ createForm.deviceNames.length }}）</span>
                    <el-button size="small" type="primary" @click="openRepairDevicePicker">添加报修设备</el-button>
                  </div>
                  <el-table :data="repairDeviceTable" border size="small" max-height="160" style="width: 100%" v-if="repairDeviceTable.length > 0">
                    <el-table-column prop="name" label="设备名称" min-width="160" show-overflow-tooltip />
                    <el-table-column label="类型" width="80" align="center">
                      <template #default="{ row }">{{ row.label ? '' : row.type }}</template>
                    </el-table-column>
                    <el-table-column prop="location" label="位置" min-width="140" show-overflow-tooltip />
                    <el-table-column label="操作" width="50" align="center">
                      <template #default="{ $index }">
                        <el-button link type="danger" size="small" @click="removeRepairDevice($index)">移除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  <div v-else class="rm-device-select-empty">暂未选择报修设备</div>
                </div>
              </el-form-item>
            </template>

            <!-- 月台报修 - 选择月台 -->
            <template v-if="createForm.repairType === 'platform'">
              <el-row :gutter="16">
                <el-col :span="12">
                  <el-form-item label="所属建筑" prop="platformBuilding">
                    <el-select v-model="createForm.platformBuilding" placeholder="请选择" style="width: 100%" @change="onPlatformBuildingChange">
                      <el-option v-for="b in platformBuildings" :key="b" :label="b" :value="b" />
                    </el-select>
                  </el-form-item>
                </el-col>
                <el-col :span="12">
                  <el-form-item label="报修月台" prop="platformName">
                    <el-select v-model="createForm.platformName" placeholder="请选择" style="width: 100%">
                      <el-option v-for="p in currentPlatforms" :key="p" :label="p" :value="p" />
                    </el-select>
                  </el-form-item>
                </el-col>
              </el-row>
            </template>

            <!-- 其他资产报修 - 手动填写 -->
            <template v-if="createForm.repairType === 'other'">
              <el-form-item label="资产位置" prop="assetLocation">
                <el-input v-model="createForm.assetLocation" placeholder="如：CT楼 1F 楼梯间防火门" />
              </el-form-item>
              <el-form-item label="资产名称" prop="assetName">
                <el-input v-model="createForm.assetName" placeholder="如：消防防火门（乙级）" />
              </el-form-item>
            </template>

            <el-form-item label="维修内容" prop="content">
              <el-input
                v-model="createForm.content"
                type="textarea"
                :rows="3"
                placeholder="请描述具体故障现象或维修需求"
              />
            </el-form-item>
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="报修人" prop="reporter">
                  <el-input v-model="createForm.reporter" placeholder="请输入姓名" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="联系方式" prop="phone">
                  <el-input v-model="createForm.phone" placeholder="请输入手机号" maxlength="11" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-form-item label="维修负责人" prop="chargePerson">
              <el-cascader
                v-model="createForm.chargePerson"
                :options="chargerCascaderOptions"
                :props="{ label: 'label', value: 'value' }"
                placeholder="请选择巡检班组和维修负责人"
                style="width: 100%"
                filterable
                clearable
              />
            </el-form-item>
            <el-form-item label="紧急程度" prop="urgency">
              <el-radio-group v-model="createForm.urgency">
                <el-radio value="normal">一般</el-radio>
                <el-radio value="urgent">紧急</el-radio>
                <el-radio value="critical">非常紧急</el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item label="附件">
              <el-upload
                v-model:file-list="createUploadList"
                :auto-upload="false"
                :limit="5"
                list-type="text"
              >
                <el-button size="small" type="primary">选择文件</el-button>
                <template #tip>
                  <div class="el-upload__tip">支持图片、PDF 等，最多 5 个文件</div>
                </template>
              </el-upload>
            </el-form-item>
          </el-form>
        </div>


      </div>
      <template #footer>
        <div class="rm-drawer-footer">
          <el-button v-if="createStep > 0" @click="createStep--">上一步</el-button>
          <el-button v-if="createStep === 0" type="primary" @click="goCreateStep2">下一步</el-button>
          <el-button v-if="createStep === 1" type="primary" @click="confirmCreate" :loading="submitting">提交</el-button>
          <el-button @click="createVisible = false">取消</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- ==================== 提交维修方案抽屉 ==================== -->
    <el-drawer v-model="planVisible" title="提交维修方案" direction="rtl" size="650px" :close-on-click-modal="false">
      <template #header>
        <span class="rm-drawer-header__title">提交维修方案</span>
      </template>
      <div class="rm-drawer-body">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="报修单号">{{ currentOrder?.orderNo }}</el-descriptions-item>
          <el-descriptions-item label="报修对象">{{ currentOrder?.targetName }}</el-descriptions-item>
          <el-descriptions-item label="维修内容">{{ currentOrder?.content }}</el-descriptions-item>
        </el-descriptions>
        <el-form ref="planFormRef" :model="planForm" :rules="planRules" label-width="90px" size="small" style="margin-top: 16px">
          <el-form-item label="维修方案" prop="planContent">
            <el-input v-model="planForm.planContent" type="textarea" :rows="4" placeholder="请详细描述维修方案，包括维修步骤、所需材料" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="预计开始" prop="planStartTime">
                <el-date-picker v-model="planForm.planStartTime" type="datetime" placeholder="选择时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="预计结束" prop="planEndTime">
                <el-date-picker v-model="planForm.planEndTime" type="datetime" placeholder="选择时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="费用明细">
            <div class="rm-cost-table">
              <div class="rm-cost-table__header">
                <span class="rm-cost-table__title">费用明细</span>
                <el-button size="small" type="primary" text :icon="Plus" @click="addCostItem">添加费用项</el-button>
              </div>
              <el-table :data="planForm.costItems" border size="small" style="width: 100%">
                <el-table-column label="费用类型" width="120">
                  <template #default="{ row }">
                    <el-select v-model="row.type" size="small" style="width: 100%">
                      <el-option label="人工费" value="人工费" />
                      <el-option label="材料费" value="材料费" />
                      <el-option label="设备费" value="设备费" />
                      <el-option label="运输费" value="运输费" />
                      <el-option label="其他" value="其他" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="金额（元）" width="130">
                  <template #default="{ row }">
                    <el-input-number v-model="row.amount" :min="0" :step="100" controls-position="right" size="small" style="width: 100%" />
                  </template>
                </el-table-column>
                <el-table-column label="备注" min-width="140">
                  <template #default="{ row }">
                    <el-input v-model="row.remark" size="small" placeholder="费用说明" />
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="55" align="center">
                  <template #default="{ $index }">
                    <el-button link type="danger" size="small" @click="removeCostItem($index)">删除</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div class="rm-cost-total">
                <span>费用合计：</span>
                <strong>{{ planTotalCost }} 元</strong>
              </div>
            </div>
          </el-form-item>
          <el-form-item label="附件">
            <el-upload
              v-model:file-list="planUploadList"
              :auto-upload="false"
              :limit="5"
              list-type="text"
            >
              <el-button size="small" type="primary">选择文件</el-button>
            </el-upload>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="rm-drawer-footer">
          <el-button @click="planVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmPlan">确认提交</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- ==================== 审核维修方案弹窗 ==================== -->
    <el-dialog v-model="planAuditVisible" title="审核维修方案" width="600px" :close-on-click-modal="false">
      <el-descriptions :column="1" border size="small">
        <el-descriptions-item label="报修单号">{{ currentOrder?.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="报修对象">{{ currentOrder?.targetName }}</el-descriptions-item>
        <el-descriptions-item label="维修方案">{{ currentOrder?.planContent }}</el-descriptions-item>
        <el-descriptions-item label="时间计划">{{ currentOrder?.planStartTime }} ~ {{ currentOrder?.planEndTime }}</el-descriptions-item>
      </el-descriptions>

      <div class="rm-cost-table" style="margin-top: 16px" v-if="currentOrder?.planCostItems?.length">
        <span class="rm-cost-table__title">费用明细</span>
        <el-table :data="currentOrder!.planCostItems" border size="small" style="width: 100%; margin-top: 8px">
          <el-table-column prop="type" label="费用类型" width="100" />
          <el-table-column prop="amount" label="金额（元）" width="120" align="right">
            <template #default="{ row }">{{ row.amount }}</template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
        </el-table>
        <div class="rm-cost-total" style="margin-top: 8px">
          <span>费用合计：</span>
          <strong>{{ currentOrder?.estimatedCost }} 元</strong>
        </div>
      </div>

      <el-form :model="planAuditForm" label-width="90px" size="small" style="margin-top: 16px">
        <el-form-item label="审核结果" prop="result">
          <el-radio-group v-model="planAuditForm.result">
            <el-radio value="approve">方案通过</el-radio>
            <el-radio value="reject">方案驳回</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="审核意见" prop="opinion">
          <el-input v-model="planAuditForm.opinion" type="textarea" :rows="3" placeholder="请输入审核意见" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="planAuditVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmPlanAudit">确认</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 下发维修工单抽屉 ==================== -->
    <el-drawer v-model="dispatchVisible" title="下发维修工单" direction="rtl" size="580px" :close-on-click-modal="false">
      <template #header>
        <span class="rm-drawer-header__title">下发维修工单</span>
      </template>
      <div class="rm-drawer-body">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="报修单号">{{ currentOrder?.orderNo }}</el-descriptions-item>
        </el-descriptions>
        <el-form ref="dispatchFormRef" :model="dispatchForm" :rules="dispatchRules" label-width="95px" size="small" style="margin-top: 16px">
          <el-form-item label="工单名称" prop="workOrderName">
            <el-input v-model="dispatchForm.workOrderName" placeholder="请输入工单名称" />
          </el-form-item>
          <el-form-item label="工单描述" prop="workOrderDesc">
            <el-input v-model="dispatchForm.workOrderDesc" type="textarea" :rows="3" placeholder="请输入工单描述" />
          </el-form-item>
          <el-form-item label="工单主题" prop="workOrderTheme">
            <el-input v-model="dispatchForm.workOrderTheme" type="textarea" :rows="2" placeholder="请输入工单主题" />
          </el-form-item>
          <el-form-item label="工单处理人" prop="worker">
            <el-cascader
              v-model="dispatchForm.worker"
              :options="chargerCascaderOptions"
              :props="{ label: 'label', value: 'value' }"
              placeholder="请选择巡检班组和处理人"
              style="width: 100%"
              filterable
              clearable
            />
          </el-form-item>
          <el-form-item label="紧急程度" prop="urgency">
            <el-radio-group v-model="dispatchForm.urgency">
              <el-radio value="normal">一般</el-radio>
              <el-radio value="urgent">紧急</el-radio>
              <el-radio value="critical">非常紧急</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="期望解决时间" prop="planStartTime">
            <el-date-picker v-model="dispatchForm.planStartTime" type="datetime" placeholder="选择时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          </el-form-item>
          <el-form-item label="备注">
            <el-input v-model="dispatchForm.remark" type="textarea" :rows="2" placeholder="工单备注信息" />
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="rm-drawer-footer">
          <el-button @click="dispatchVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmDispatch">确认下发</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- ==================== 下发核查单抽屉 ==================== -->
    <el-drawer v-model="checkVisible" title="下发核查单" direction="rtl" size="580px" :close-on-click-modal="false">
      <template #header>
        <span class="rm-drawer-header__title">下发核查单</span>
      </template>
      <div class="rm-drawer-body">
        <el-form ref="checkFormRef" :model="checkForm" :rules="checkRules" label-width="95px" size="small">
          <el-form-item label="工单名称" prop="title">
            <el-input v-model="checkForm.title" placeholder="请输入核查工单名称" />
          </el-form-item>
          <el-form-item label="工单内容" prop="content">
            <el-input v-model="checkForm.content" type="textarea" :rows="3" />
          </el-form-item>
          <el-form-item label="优先级" prop="priority">
            <el-radio-group v-model="checkForm.priority">
              <el-radio value="normal">一般</el-radio>
              <el-radio value="urgent">紧急</el-radio>
              <el-radio value="critical">非常紧急</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="期望解决时间" prop="dueTime">
            <el-date-picker v-model="checkForm.dueTime" type="datetime" placeholder="选择期望解决时间" value-format="YYYY-MM-DD HH:mm:ss" style="width: 100%" />
          </el-form-item>
          <el-form-item label="工单处理人" prop="handler">
            <el-cascader
              v-model="checkForm.handler"
              :options="chargerCascaderOptions"
              :props="{ label: 'label', value: 'value' }"
              placeholder="请选择巡检班组和处理人"
              style="width: 100%"
              filterable
              clearable
            />
          </el-form-item>
          <el-form-item label="附件">
            <el-upload v-model:file-list="checkUploadList" :auto-upload="false" :limit="5" list-type="text">
              <el-button size="small" type="primary">选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">支持图片、PDF 等，最多 5 个文件</div>
              </template>
            </el-upload>
          </el-form-item>
        </el-form>
      </div>
      <template #footer>
        <div class="rm-drawer-footer">
          <el-button @click="checkVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmCheck">确认下发</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- ==================== 编辑报修单抽屉 ==================== -->
    <el-drawer v-model="editVisible" title="编辑报修单" direction="rtl" size="620px" :close-on-click-modal="false">
      <template #header>
        <span class="rm-drawer-header__title">编辑报修单</span>
      </template>
      <div class="rm-drawer-body">
        <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="90px" size="small">
          <el-form-item label="报修类型" prop="repairType">
            <el-radio-group v-model="editForm.repairType">
              <el-radio value="device">物联设备报修</el-radio>
              <el-radio value="platform">月台报修</el-radio>
              <el-radio value="other">其他资产报修</el-radio>
            </el-radio-group>
          </el-form-item>

          <template v-if="editForm.repairType === 'device'">
              <el-form-item label="报修设备" prop="deviceNames">
                <div class="rm-device-select-section">
                  <div class="rm-device-select-section__header">
                    <span class="rm-device-select-section__count">已选设备（{{ editForm.deviceNames.length }}）</span>
                    <el-button size="small" type="primary" @click="openRepairDevicePickerEdit">添加报修设备</el-button>
                  </div>
                  <el-table :data="editRepairDeviceTable" border size="small" max-height="160" style="width: 100%" v-if="editRepairDeviceTable.length > 0">
                    <el-table-column prop="name" label="设备名称" min-width="160" show-overflow-tooltip />
                    <el-table-column label="类型" width="80" align="center">
                      <template #default="{ row }">{{ row.type }}</template>
                    </el-table-column>
                    <el-table-column prop="location" label="位置" min-width="140" show-overflow-tooltip />
                    <el-table-column label="操作" width="50" align="center">
                      <template #default="{ $index }">
                        <el-button link type="danger" size="small" @click="editForm.deviceNames.splice($index, 1)">移除</el-button>
                      </template>
                    </el-table-column>
                  </el-table>
                  <div v-else class="rm-device-select-empty">暂未选择报修设备</div>
                </div>
              </el-form-item>
          </template>

          <template v-if="editForm.repairType === 'platform'">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="所属建筑" prop="platformBuilding">
                  <el-select v-model="editForm.platformBuilding" placeholder="请选择" style="width: 100%" @change="editForm.platformName = ''">
                    <el-option v-for="b in platformBuildings" :key="b" :label="b" :value="b" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="报修月台" prop="platformName">
                  <el-select v-model="editForm.platformName" placeholder="请选择" style="width: 100%">
                    <el-option v-for="p in editPlatforms" :key="p" :label="p" :value="p" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </template>

          <template v-if="editForm.repairType === 'other'">
            <el-form-item label="资产位置" prop="assetLocation">
              <el-input v-model="editForm.assetLocation" placeholder="如：CT楼 1F 楼梯间防火门" />
            </el-form-item>
            <el-form-item label="资产名称" prop="assetName">
              <el-input v-model="editForm.assetName" placeholder="如：消防防火门（乙级）" />
            </el-form-item>
          </template>

          <el-form-item label="维修内容" prop="content">
            <el-input v-model="editForm.content" type="textarea" :rows="3" placeholder="请描述具体故障现象或维修需求" />
          </el-form-item>
          <el-row :gutter="16">
            <el-col :span="12">
              <el-form-item label="报修人" prop="reporter">
                <el-input v-model="editForm.reporter" placeholder="请输入姓名" />
              </el-form-item>
            </el-col>
            <el-col :span="12">
              <el-form-item label="联系方式" prop="phone">
                <el-input v-model="editForm.phone" placeholder="请输入手机号" maxlength="11" />
              </el-form-item>
            </el-col>
          </el-row>
          <el-form-item label="维修负责人" prop="chargePerson">
            <el-cascader
              v-model="editForm.chargePerson"
              :options="chargerCascaderOptions"
              :props="{ label: 'label', value: 'value' }"
              placeholder="请选择巡检班组和维修负责人"
              style="width: 100%"
              filterable
              clearable
            />
          </el-form-item>
          <el-form-item label="紧急程度" prop="urgency">
            <el-radio-group v-model="editForm.urgency">
              <el-radio value="normal">一般</el-radio>
              <el-radio value="urgent">紧急</el-radio>
              <el-radio value="critical">非常紧急</el-radio>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="附件">
            <el-upload v-model:file-list="editUploadList" :auto-upload="false" :limit="5" list-type="text">
              <el-button size="small" type="primary">选择文件</el-button>
              <template #tip>
                <div class="el-upload__tip">支持图片、PDF 等，最多 5 个文件</div>
              </template>
            </el-upload>
          </el-form-item>

        </el-form>
      </div>
      <template #footer>
        <div class="rm-drawer-footer">
          <el-button @click="editVisible = false">取消</el-button>
          <el-button type="primary" @click="confirmEdit">保存修改</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- ==================== 报修设备选择弹窗 ==================== -->
    <el-dialog v-model="repairDevicePickerVisible" title="添加报修设备" width="700px" :close-on-click-modal="false">
      <el-form inline size="small" class="rm-device-picker-filter">
        <el-form-item label="空间">
          <el-select v-model="repairPickerFilter.building" placeholder="全部建筑" clearable style="width: 140px" @change="repairPickerFilter.floor = ''">
            <el-option v-for="b in pickerBuildings" :key="b.value" :label="b.label" :value="b.value" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-select v-model="repairPickerFilter.floor" placeholder="全部楼层" clearable style="width: 120px">
            <el-option v-for="f in repairPickerFloors" :key="f.value" :label="f.label" :value="f.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="repairPickerFilter.type" placeholder="全部" clearable style="width: 130px">
            <el-option v-for="dt in deviceTypeOptions" :key="dt.value" :label="dt.label" :value="dt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="设备名称">
          <el-input v-model="repairPickerFilter.keyword" placeholder="请输入" clearable style="width: 140px" />
        </el-form-item>
      </el-form>

      <el-table
        :data="filteredRepairDevices"
        border size="small" style="width: 100%" max-height="320"
        @select="onRepairDeviceSelect"
        ref="repairDeviceTableRef"
      >
        <el-table-column type="selection" width="45" />
        <el-table-column prop="name" label="设备名称" min-width="200" show-overflow-tooltip />
        <el-table-column label="设备类型" width="90" align="center">
          <template #default="{ row }">{{ row.type }}</template>
        </el-table-column>
        <el-table-column prop="location" label="设备位置" width="160" show-overflow-tooltip />
      </el-table>
      <template #footer>
        <el-button @click="repairDevicePickerVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRepairDevicePick">确认选择</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 巡检异常设备抽屉 ==================== -->
    <el-drawer v-model="abnormalVisible" title="巡检异常设备" direction="rtl" size="750px" :close-on-click-modal="false">
      <template #header>
        <div class="rm-drawer-header">
          <span class="rm-drawer-header__title">巡检异常设备</span>
          <span class="rm-drawer-header__sub">共 {{ activeAbnormalDevices.length }} 个异常设备（来自巡检工单处置时标记为需维修的设备）</span>
        </div>
      </template>
      <div class="rm-drawer-body">
        <el-table
          :data="activeAbnormalDevices"
          border size="small" style="width: 100%"
          @selection-change="onAbnormalSelect"
          ref="abnormalTableRef"
          v-if="activeAbnormalDevices.length > 0"
        >
          <el-table-column type="selection" width="45" />
          <el-table-column prop="orderNo" label="巡检工单编号" width="170" />
          <el-table-column prop="deviceName" label="设备名称" width="130" />
          <el-table-column prop="location" label="设备位置" width="140" show-overflow-tooltip />
          <el-table-column label="设备类型" width="80" align="center">
            <template #default="{ row }">
              <el-tag size="small">{{ row.type }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="异常描述" min-width="280">
            <template #default="{ row }">
              <div v-for="(item, i) in row.items" :key="i" class="rm-ab-item">
                <span class="rm-ab-item__name">{{ item.name }}：</span>
                <span class="rm-ab-item__desc">{{ item.description }}</span>
              </div>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-else description="暂无异常设备" :image-size="60" />
      </div>
      <template #footer>
        <div class="rm-drawer-footer">
          <el-button @click="abnormalVisible = false">取消</el-button>
          <el-button type="info" @click="ignoreAbnormalDevices" :disabled="abnormalSelected.length === 0">忽略所选（{{ abnormalSelected.length }}）</el-button>
          <el-button type="primary" @click="repairAbnormalDevices" :disabled="abnormalSelected.length === 0">报修所选（{{ abnormalSelected.length }}）</el-button>
        </div>
      </template>
    </el-drawer>

    <!-- ==================== 详情抽屉 ==================== -->
    <el-drawer v-model="detailVisible" title="报修单详情" direction="rtl" size="680px">
      <template #header>
        <span class="rm-drawer-header__title">报修单详情</span>
      </template>
      <div class="rm-drawer-body">
        <template v-if="detailOrder">
          <div class="rm-detail">
            <div class="rm-detail__section">
              <h4 class="rm-detail__title">基本信息</h4>
              <el-descriptions :column="3" border size="small">
                <el-descriptions-item label="报修单号">{{ detailOrder.orderNo }}</el-descriptions-item>
                <el-descriptions-item label="报修类型">{{ repairTypeLabel(detailOrder.repairType) }}</el-descriptions-item>
                <el-descriptions-item label="紧急程度">
                  <el-tag :type="urgencyType(detailOrder.urgency)" size="small">{{ urgencyLabel(detailOrder.urgency) }}</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="报修对象" span="3">{{ detailOrder.targetName }}</el-descriptions-item>
                <el-descriptions-item label="维修内容" span="3">{{ detailOrder.content }}</el-descriptions-item>
                <el-descriptions-item label="报修人">{{ detailOrder.reporter }}</el-descriptions-item>
                <el-descriptions-item label="联系方式">{{ detailOrder.phone }}</el-descriptions-item>
                <el-descriptions-item label="维修负责人">{{ detailOrder.chargePerson || '-' }}</el-descriptions-item>
                <el-descriptions-item label="报修时间">{{ detailOrder.reportTime }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="rm-detail__section">
              <h4 class="rm-detail__title">现场核查情况</h4>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="核查工单号">{{ detailOrder.checkOrderNo || '-' }}</el-descriptions-item>
                <el-descriptions-item label="核查人">{{ detailOrder.checker || '-' }}</el-descriptions-item>
                <el-descriptions-item label="核查结果" span="2">
                  <el-tag v-if="detailOrder.checkResult === 'onsite'" type="success" size="small">已现场处置</el-tag>
                  <el-tag v-else-if="detailOrder.checkResult === 'repair'" type="warning" size="small">需要维修</el-tag>
                  <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="核查描述" span="2">{{ detailOrder.checkDesc || '-' }}</el-descriptions-item>
                <el-descriptions-item label="核查时间" span="2">{{ detailOrder.checkTime || '-' }}</el-descriptions-item>
                <el-descriptions-item label="核查附件" span="2">{{ detailOrder.checkAttachments || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="rm-detail__section">
              <h4 class="rm-detail__title">维修方案</h4>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="维修方案" span="2">{{ detailOrder.planContent || '-' }}</el-descriptions-item>
                <el-descriptions-item label="预计开始时间" span="1">{{ detailOrder.planStartTime || '-' }}</el-descriptions-item>
                <el-descriptions-item label="预计结束时间" span="1">{{ detailOrder.planEndTime || '-' }}</el-descriptions-item>
              </el-descriptions>
              <div v-if="detailOrder.planCostItems?.length" class="rm-cost-table" style="margin-top: 12px">
                <span class="rm-cost-table__title">费用明细</span>
                <el-table :data="detailOrder.planCostItems" border size="small" style="width: 100%; margin-top: 8px">
                  <el-table-column prop="type" label="费用类型" width="100" />
                  <el-table-column prop="amount" label="金额（元）" width="120" align="right">
                    <template #default="{ row }">{{ row.amount }}</template>
                  </el-table-column>
                  <el-table-column prop="remark" label="备注" min-width="160" show-overflow-tooltip />
                </el-table>
                <div class="rm-cost-total" style="margin-top: 8px">
                  <span>费用合计：</span>
                  <strong>{{ detailOrder.estimatedCost }} 元</strong>
                </div>
              </div>
              <div v-else style="margin-top: 4px; font-size: 13px; color: #909399">-</div>
            </div>

            <div class="rm-detail__section">
              <h4 class="rm-detail__title">维修工单信息</h4>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="维修工单号">{{ detailOrder.workOrderNo || '-' }}</el-descriptions-item>
                <el-descriptions-item label="工单处理人">{{ detailOrder.worker || '-' }}</el-descriptions-item>
                <el-descriptions-item label="处理结果">
                  <el-tag v-if="detailOrder.processResult === 'completed'" type="success" size="small">已完成</el-tag>
                  <el-tag v-else-if="detailOrder.processResult === 'repair'" type="warning" size="small">需维修</el-tag>
                  <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="处理时间">{{ detailOrder.handleTime || '-' }}</el-descriptions-item>
                <el-descriptions-item label="处理总结" span="2">{{ detailOrder.repairDescription || '-' }}</el-descriptions-item>
                <el-descriptions-item label="附件" span="2">{{ detailOrder.processAttachments || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="rm-detail__section">
              <h4 class="rm-detail__title">验收记录</h4>
              <el-descriptions :column="2" border size="small">
                <el-descriptions-item label="验收人">{{ detailOrder.acceptanceBy || '-' }}</el-descriptions-item>
                <el-descriptions-item label="验收结果" span="1">
                  <el-tag v-if="detailOrder.acceptanceResult === 'pass'" type="success" size="small">通过</el-tag>
                  <el-tag v-else-if="detailOrder.acceptanceResult === 'fail'" type="danger" size="small">不通过</el-tag>
                  <span v-else>-</span>
                </el-descriptions-item>
                <el-descriptions-item label="验收时间">{{ detailOrder.acceptanceTime || '-' }}</el-descriptions-item>
                <el-descriptions-item label="验收意见" span="2">{{ detailOrder.acceptanceOpinion || '-' }}</el-descriptions-item>
              </el-descriptions>
            </div>

            <div class="rm-detail__section">
              <h4 class="rm-detail__title">操作日志</h4>
              <el-timeline style="padding: 12px 0 0 8px">
                <el-timeline-item
                  v-for="(log, idx) in detailLogs"
                  :key="idx"
                  :timestamp="log.time"
                  :type="log.type"
                  placement="top"
                >
                  <span style="font-weight: 600; margin-right: 8px">{{ log.operator }}</span>
                  <span>{{ log.action }}</span>
                </el-timeline-item>
              </el-timeline>
            </div>
          </div>
        </template>
      </div>
      <template #footer>
        <div class="rm-drawer-footer">
          <el-button @click="detailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, nextTick, watch } from 'vue'
import { Plus, Search, Refresh, Tools, Van, OfficeBuilding } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { ElMessageBox } from 'element-plus'

interface RepairOrder {
  id: number
  orderNo: string
  repairType: string
  targetName: string
  content: string
  urgency: string
  status: string
  reporter: string
  phone: string
  reportTime: string
  deviceBuilding?: string
  deviceFloor?: string
  deviceName?: string
  planContent?: string
  estimatedCost?: number
  planCostItems?: { type: string; amount: number; remark: string }[]
  planStartTime?: string
  planEndTime?: string
  worker?: string
  workerPhone?: string
  dispatchUrgency?: string
  needCheck?: boolean
  checker?: string
  checkOrderNo?: string
  checkResult?: string
  checkDesc?: string
  checkTime?: string
  checkAttachments?: string
  chargePerson?: string
  repairDescription?: string
  actualCost?: number
  completeTime?: string
  acceptanceResult?: string
  acceptanceOpinion?: string
  acceptanceTime?: string
  acceptanceBy?: string
  workOrderNo?: string
  processResult?: string
  processAttachments?: string
  handleTime?: string
}

interface LogItem {
  time: string
  type: string
  operator: string
  action: string
}

const statusOptions = [
  { value: 'checking', label: '核查中' },
  { value: 'pending_review', label: '待处理' },
  { value: 'approved', label: '待提交方案' },
  { value: 'plan_pending', label: '方案待审核' },
  { value: 'plan_rejected', label: '方案已驳回' },
  { value: 'plan_approved', label: '待维修' },
  { value: 'executing', label: '维修中' },
  { value: 'pending_acceptance', label: '待验收' },
  { value: 'completed', label: '已完成' },
]

const deviceBuildings = ['CT楼', 'FF楼', '海关联检大楼(OB)']
const deviceFloors: Record<string, string[]> = {
  'CT楼': ['B1', '1F', '2F', '3F', '4F', '5F', '6F', '屋顶层'],
  'FF楼': ['1F', 'S夹层', '7F', '8F'],
  '海关联检大楼(OB)': ['1F', '2F'],
}

interface DeviceItem {
  name: string
  type: string
  location: string
}

const deviceDatabase: Record<string, DeviceItem[]> = {
  'CT楼|1F': [
    { name: '1F 东侧安全门', type: 'door', location: '1F 东侧' },
    { name: '1F 防火墙', type: 'fire', location: '1F 主走廊' },
    { name: 'CT-140 配电柜', type: 'electrical', location: '1F 配电房' },
    { name: 'CT-153 水泵', type: 'mechanical', location: '1F 泵房' },
    { name: '1F 货梯', type: 'elevator', location: '1F 大厅北侧' },
    { name: 'CT-142 网络交换机', type: 'it', location: '1F 通信机房' },
  ],
  'CT楼|2F': [
    { name: 'CT-216 发电机', type: 'electrical', location: '2F 发电机房' },
    { name: 'CT-237 制冷机组', type: 'mechanical', location: '2F 制冷机房' },
    { name: '2F 东侧防火门', type: 'fire', location: '2F 东侧楼梯间' },
    { name: '2F 走廊照明系统', type: 'electrical', location: '2F 走廊' },
  ],
  'CT楼|3F': [
    { name: '3F 东侧安全门', type: 'door', location: '3F 东侧' },
    { name: '3F 货运电梯', type: 'elevator', location: '3F 货运区' },
    { name: '3F 仓储区照明', type: 'electrical', location: '3F 仓储区' },
  ],
  'CT楼|4F': [
    { name: '4F 东侧安全门', type: 'door', location: '4F 东侧' },
    { name: '4F 防火卷帘', type: 'fire', location: '4F 通道' },
    { name: '4F 作业区照明', type: 'electrical', location: '4F 作业区' },
  ],
  'CT楼|5F': [
    { name: '5F 楼梯间防火门', type: 'fire', location: '5F 楼梯间' },
    { name: '5F 海关查验设备-扫描仪', type: 'it', location: '5F 海关功能区' },
  ],
  'CT楼|6F': [
    { name: 'CT-625 IT控制主机', type: 'it', location: '6F IT控制机房' },
    { name: '6F 东侧安全门', type: 'door', location: '6F 东侧' },
  ],
  'CT楼|屋顶层': [
    { name: 'CT-701 中央控制器', type: 'it', location: '屋顶层中央控制室' },
    { name: 'CT-704 排风机', type: 'mechanical', location: '屋顶层风机房' },
    { name: '屋顶层电梯机房设备', type: 'elevator', location: '屋顶层电梯机房' },
  ],
  'CT楼|B1': [
    { name: 'B1 加压风机', type: 'mechanical', location: '地下室加压机房' },
    { name: 'B1 消防水泵', type: 'mechanical', location: '地下室泵房' },
  ],
  'FF楼|1F': [
    { name: 'FF-105 北盘道限高杆', type: 'other', location: 'FF楼 北盘道' },
    { name: 'FF-130 变压器', type: 'electrical', location: '1F 变电所' },
    { name: 'FF-134 发电机组', type: 'electrical', location: '1F 发电机房' },
    { name: '1F 卸货平台液压升降台', type: 'mechanical', location: 'FF楼 装卸货平台' },
    { name: '1F 南侧卷帘门', type: 'door', location: 'FF楼 1F 南侧' },
  ],
  'FF楼|S夹层': [
    { name: 'S夹层卸货平台液压升降台', type: 'mechanical', location: 'FF楼 S夹层' },
    { name: 'S夹层货运电梯', type: 'elevator', location: 'FF楼 S夹层' },
  ],
  'FF楼|7F': [
    { name: 'FF-701 送风机', type: 'mechanical', location: '7F 送风机房' },
    { name: 'FF-702 排烟风机', type: 'mechanical', location: '7F 排烟机房' },
  ],
  'FF楼|8F': [
    { name: 'FF-801 电梯曳引机', type: 'elevator', location: '8F 电梯机房' },
    { name: 'FF-802 送风机', type: 'mechanical', location: '8F 送风机房' },
  ],
  '海关联检大楼(OB)|1F': [
    { name: 'OB-118 配电柜', type: 'electrical', location: 'OB 1F 配电间' },
    { name: 'OB-119 门禁控制器', type: 'door', location: 'OB 1F 控制室' },
    { name: 'OB 1F 正门电动门', type: 'door', location: 'OB 1F 正门' },
  ],
  '海关联检大楼(OB)|2F': [
    { name: 'OB 2F 空调外机', type: 'mechanical', location: 'OB 2F 室外' },
  ],
}

const platformBuildings = ['CT楼', 'FF楼']

interface TeamMember { name: string; phone: string }
const chargerTeams: { label: string; value: string; children: { label: string; value: string }[] }[] = [
  { label: '巡检一组', value: '巡检一组', children: [
    { label: '李建国', value: '李建国' }, { label: '陈师傅', value: '陈师傅' }, { label: '刘工', value: '刘工' },
  ]},
  { label: '巡检二组', value: '巡检二组', children: [
    { label: '王德发', value: '王德发' }, { label: '周技师', value: '周技师' }, { label: '孙班长', value: '孙班长' }, { label: '郑师傅', value: '郑师傅' },
  ]},
  { label: '巡检三组', value: '巡检三组', children: [
    { label: '赵志强', value: '赵志强' }, { label: '张维修', value: '张维修' },
  ]},
]
const chargerCascaderOptions = chargerTeams
const allChargers = chargerTeams.flatMap((team) => team.children.map((member) => member.value))
const platforms: Record<string, string[]> = {
  'CT楼': ['CT楼 1号月台', 'CT楼 2号月台', 'CT楼 3号月台', 'CT楼 4号月台'],
  'FF楼': ['FF楼 1号月台', 'FF楼 2号月台', 'FF楼 3号月台'],
}

const repairTypes = [
  { value: 'device', label: '物联设备报修', desc: '选择园区内已接入的物联设备进行报修', icon: Tools },
  { value: 'platform', label: '月台报修', desc: '对园区各建筑的装卸月台进行报修', icon: Van },
  { value: 'other', label: '其他资产报修', desc: '手动填写未在系统中登记的其他资产信息', icon: OfficeBuilding },
]

function repairTypeLabel(v: string): string {
  const map: Record<string, string> = { device: '物联设备', platform: '月台', other: '其他资产' }
  return map[v] || v
}
function urgencyType(v: string): string {
  const map: Record<string, string> = { normal: '', urgent: 'warning', critical: 'danger' }
  return map[v] || ''
}
function urgencyLabel(v: string): string {
  const map: Record<string, string> = { normal: '一般', urgent: '紧急', critical: '非常紧急' }
  return map[v] || v
}
function statusType(v: string): string {
  const map: Record<string, string> = {
    checking: 'primary', pending_review: 'warning', approved: 'primary', plan_pending: 'warning',
    plan_rejected: 'danger', plan_approved: 'primary', executing: '', pending_acceptance: 'warning',
    completed: 'success',
  }
  return map[v] || 'info'
}
function statusLabel(v: string): string {
  const map: Record<string, string> = {
    checking: '核查中', pending_review: '待处理', approved: '待提交方案', plan_pending: '方案待审核',
    plan_rejected: '方案已驳回', plan_approved: '待维修', executing: '维修中', pending_acceptance: '待验收',
    completed: '已完成',
  }
  return map[v] || v
}

// ==================== Mock 数据 ====================
let nextId = 100
function mockOrders(): RepairOrder[] {
  const statuses = ['pending_review', 'checking', 'approved', 'plan_pending', 'plan_rejected', 'plan_approved', 'executing', 'pending_acceptance', 'completed']
  const items: RepairOrder[] = []
  const baseDate = '2026-07-0'

  statuses.forEach((status, i) => {
    const day = String(i + 1)
    const order: RepairOrder = {
      id: 100 + i,
      orderNo: `BX202607${String(i + 1).padStart(4, '0')}`,
      repairType: 'device',
      targetName: 'CT-140 配电柜',
      content: '设备运行异常，频繁自动重启，需要检修',
      urgency: i % 3 === 0 ? 'critical' : i % 3 === 1 ? 'urgent' : 'normal',
      status,
      reporter: '张伟',
      phone: '138****8001',
      reportTime: `${baseDate}${day} 08:00:00`,
      deviceBuilding: 'CT楼',
      deviceFloor: '1F',
      deviceName: 'CT-140 配电柜',
      chargePerson: allChargers[i % allChargers.length],
    }

    if (['checking', 'approved', 'plan_pending', 'plan_rejected', 'plan_approved', 'executing', 'pending_acceptance', 'completed'].includes(status)) {
      order.checkOrderNo = `HC${order.orderNo.slice(2)}`
      order.checker = allChargers[(i + 1) % allChargers.length]
      order.checkResult = i % 2 === 0 ? 'onsite' : 'repair'
      order.checkDesc = i % 2 === 0 ? '故障已现场修复' : '需协调维修人员和备件'
      order.checkTime = `${baseDate}${day} 10:00:00`
      order.checkAttachments = i % 2 === 0 ? '核查报告.pdf, 现场照片.jpg' : ''
    }

    if (['plan_pending', 'plan_rejected', 'plan_approved', 'executing', 'pending_acceptance', 'completed'].includes(status)) {
      order.planContent = '维修方案：关闭设备电源后进行拆解检查，更换损坏电路板，使用备件库中储备件进行替换，完成后通电测试恢复正常运行。'
      order.estimatedCost = (i + 1) * 150
      order.planCostItems = [
        { type: '人工费', amount: (i + 1) * 80, remark: '维修技师工时费用' },
        { type: '材料费', amount: (i + 1) * 50, remark: i % 2 === 0 ? '原厂配件' : '通用备件' },
        { type: '运输费', amount: (i + 1) * 20, remark: '设备调配运费' },
      ]
      order.planStartTime = `${baseDate}${day} 09:00:00`
      order.planEndTime = `${baseDate}${day} 15:00:00`
    }

    if (['executing', 'pending_acceptance', 'completed'].includes(status)) {
      order.worker = ['李建国', '王德发', '赵志强'][i % 3]
      order.dispatchUrgency = order.urgency
      order.workOrderNo = `GX${order.orderNo.slice(2)}`
      order.processResult = i % 2 === 0 ? 'completed' : 'repair'
    }

    if (['pending_acceptance', 'completed'].includes(status)) {
      order.repairDescription = '已完成维修：更换了损坏的电路板，设备已恢复正常运行。'
      order.processAttachments = '维修后照片.jpg'
      order.handleTime = `${baseDate}${day} 16:00:00`
    }

    if (status === 'completed') {
      order.acceptanceResult = 'pass'
      order.acceptanceOpinion = '维修效果良好，设备恢复正常运行。'
      order.acceptanceTime = `${baseDate}${day} 17:00:00`
      order.acceptanceBy = '张主管'
    }

    items.push(order)
  })
  return items
}

// ==================== 列表状态 ====================
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const loading = ref(false)
const allData = ref<RepairOrder[]>(mockOrders())
const tableData = ref<RepairOrder[]>([])
const query = reactive({
  orderNo: '',
  repairType: '',
  status: '',
  urgency: '',
  chargePerson: '',
  dateRange: null as [string, string] | null,
})

function applyFilters() {
  let filtered = allData.value
  if (query.orderNo) filtered = filtered.filter(r => r.orderNo.includes(query.orderNo))
  if (query.repairType) filtered = filtered.filter(r => r.repairType === query.repairType)
  if (query.status) filtered = filtered.filter(r => r.status === query.status)
  if (query.urgency) filtered = filtered.filter(r => r.urgency === query.urgency)
  if (query.chargePerson) filtered = filtered.filter(r => (r.chargePerson || '').includes(query.chargePerson))
  if (query.dateRange && query.dateRange.length === 2) {
    const [start, end] = query.dateRange
    filtered = filtered.filter(r => {
      const day = r.reportTime.slice(0, 10)
      return day >= start && day <= end
    })
  }
  total.value = filtered.length
  const start = (page.value - 1) * pageSize.value
  tableData.value = filtered.slice(start, start + pageSize.value)
}
function handleSearch() { page.value = 1; applyFilters() }
function handleReset() {
  query.orderNo = ''
  query.repairType = ''
  query.status = ''
  query.chargePerson = ''
  query.urgency = ''
  query.dateRange = null
  page.value = 1
  applyFilters()
}

applyFilters()

// ==================== 新建报修 ====================
const createVisible = ref(false)
const createStep = ref(0)
const submitting = ref(false)
const createFormRef = ref<FormInstance>()
const createUploadList = ref<any[]>([])

const defaultCreateForm = () => ({
  repairType: '',
  deviceBuilding: '',
  deviceFloor: '',
  deviceTypeFilter: '' as string,
  deviceNames: [] as string[],
  platformBuilding: '',
  platformName: '',
  assetLocation: '',
  assetName: '',
  content: '',
  reporter: '',
  phone: '',
  urgency: 'normal' as string,
  chargePerson: '' as any,
})
const createForm = reactive(defaultCreateForm())

const createRules: FormRules = {
  deviceBuilding: [{ required: true, message: '请选择建筑', trigger: 'change' }],
  deviceFloor: [{ required: true, message: '请选择楼层', trigger: 'change' }],
  deviceNames: [{ type: 'array', required: true, min: 1, message: '请至少选择一个设备', trigger: 'change' }],
  platformBuilding: [{ required: true, message: '请选择建筑', trigger: 'change' }],
  platformName: [{ required: true, message: '请选择月台', trigger: 'change' }],
  assetLocation: [{ required: true, message: '请填写资产位置', trigger: 'blur' }],
  assetName: [{ required: true, message: '请填写资产名称', trigger: 'blur' }],
  content: [{ required: true, message: '请填写维修内容', trigger: 'blur' }],
  reporter: [{ required: true, message: '请填写报修人', trigger: 'blur' }],
  phone: [{ required: true, message: '请填写联系方式', trigger: 'blur' }],
  chargePerson: [{ required: true, validator: (_r: any, v: any, cb: Function) => { if (!v || (Array.isArray(v) && v.length === 0)) return cb(new Error('请选择维修负责人')); cb() }, trigger: 'change' }],
}

const deviceTypeOptions = [
  { value: 'ac', label: '空调' },
  { value: 'lighting', label: '照明' },
  { value: 'fire', label: '消防' },
  { value: 'elevator', label: '电梯' },
  { value: 'electrical', label: '配电' },
  { value: 'mechanical', label: '给排水' },
  { value: 'door', label: '门禁' },
  { value: 'it', label: '弱电' },
  { value: 'other', label: '其他' },
]

const currentDeviceFloors = computed(() => deviceFloors[createForm.deviceBuilding] || [])
const currentDeviceList = computed(() => {
  if (!createForm.deviceBuilding || !createForm.deviceFloor) return []
  const list = deviceDatabase[`${createForm.deviceBuilding}|${createForm.deviceFloor}`] || []
  if (!createForm.deviceTypeFilter) return list
  return list.filter(d => d.type === createForm.deviceTypeFilter)
})
const currentPlatforms = computed(() => platforms[createForm.platformBuilding] || [])

const allDevicesArr = computed(() => {
  const arr: { name: string; type: string; location: string; building: string; floor: string; space: string }[] = []
  Object.entries(deviceDatabase).forEach(([key, devices]) => {
    const [building, floor] = key.split('|')
    const typeLabelMap: Record<string, string> = { door: '门禁', fire: '消防', electrical: '配电', mechanical: '给排水', elevator: '电梯', lighting: '照明', it: '弱电', ac: '空调', other: '其他' }
    devices.forEach(d => {
      arr.push({ name: d.name, type: typeLabelMap[d.type] || d.type, location: `${building} ${d.location}`, building, floor, space: key })
    })
  })
  return arr
})

const pickerBuildings = [{ value: 'CT楼', label: 'CT楼' }, { value: 'FF楼', label: 'FF楼' }, { value: '海关联检大楼(OB)', label: '海关联检大楼(OB)' }]
const repairPickerFloors = computed(() => {
  if (!repairPickerFilter.building) return []
  const keys = Object.keys(deviceDatabase).filter(k => k.startsWith(repairPickerFilter.building))
  return [...new Set(keys.map(k => k.split('|')[1]))].map(f => ({ value: f, label: f }))
})

const repairPickerFilter = reactive({ building: '', floor: '', type: '', keyword: '' })
const filteredRepairDevices = computed(() => {
  let list = allDevicesArr.value
  if (repairPickerFilter.building) list = list.filter(d => d.building === repairPickerFilter.building)
  if (repairPickerFilter.floor) list = list.filter(d => d.floor === repairPickerFilter.floor)
  if (repairPickerFilter.type) list = list.filter(d => d.type === repairPickerFilter.type)
  if (repairPickerFilter.keyword) list = list.filter(d => d.name.includes(repairPickerFilter.keyword))
  return list
})

const repairDevicePickerVisible = ref(false)
const repairDeviceTableRef = ref()
const tempRepairDeviceNames = ref<string[]>([])
const syncingRepair = ref(false)

const repairDeviceTable = computed(() => {
  return createForm.deviceNames.map(name => {
    const dev = allDevicesArr.value.find(d => d.name === name)
    return dev || { name, type: '', location: '' }
  })
})

const editRepairDeviceTable = computed(() => {
  return (editForm.deviceNames || []).map((name: string) => {
    const dev = allDevicesArr.value.find(d => d.name === name)
    return dev || { name, type: '', location: '' }
  })
})

function openRepairDevicePicker() {
  repairPickerFilter.building = ''
  repairPickerFilter.floor = ''
  repairPickerFilter.type = ''
  repairPickerFilter.keyword = ''
  tempRepairDeviceNames.value = [...createForm.deviceNames]
  repairDevicePickerVisible.value = true
  nextTick(() => syncRepairTableSelection())
}

function openRepairDevicePickerEdit() {
  repairPickerFilter.building = ''
  repairPickerFilter.floor = ''
  repairPickerFilter.type = ''
  repairPickerFilter.keyword = ''
  tempRepairDeviceNames.value = [...editForm.deviceNames]
  repairDevicePickerVisible.value = true
  nextTick(() => syncRepairTableSelection())
}

watch(filteredRepairDevices, () => { nextTick(() => syncRepairTableSelection()) })

function syncRepairTableSelection() {
  if (!repairDeviceTableRef.value) return
  syncingRepair.value = true
  repairDeviceTableRef.value.clearSelection()
  filteredRepairDevices.value.forEach(d => {
    if (tempRepairDeviceNames.value.includes(d.name)) {
      repairDeviceTableRef.value.toggleRowSelection(d, true)
    }
  })
  nextTick(() => { syncingRepair.value = false })
}

function onRepairDeviceSelect(_selection: any, row: any) {
  if (syncingRepair.value) return
  const idx = tempRepairDeviceNames.value.indexOf(row.name)
  if (idx >= 0) tempRepairDeviceNames.value.splice(idx, 1)
  else tempRepairDeviceNames.value.push(row.name)
}

function confirmRepairDevicePick() {
  createForm.deviceNames = [...tempRepairDeviceNames.value]
  repairDevicePickerVisible.value = false
}

function removeRepairDevice(idx: number) {
  createForm.deviceNames.splice(idx, 1)
}

interface AbnormalDevice {
  key: string; deviceName: string; location: string; type: string; orderNo: string; items: { name: string; description: string }[]
}

const abnormalDevices = ref<AbnormalDevice[]>([
  { key: 'ab1', orderNo: 'XJ2026070002', deviceName: '1F 配电柜 A', location: 'CT楼 1F 配电房', type: '配电', items: [
    { name: '配电柜温度检测', description: '触点温度达95℃，超过70℃标准值' },
    { name: '电压电流测量', description: 'B相电压偏低15%，需检修' },
  ]},
  { key: 'ab2', orderNo: 'XJ2026070002', deviceName: '1F 空调主机', location: 'CT楼 1F 空调机房', type: '空调', items: [
    { name: '运行电流检测', description: '压缩机启动电流超过额定值20%' },
  ]},
  { key: 'ab3', orderNo: 'XJ2026070005', deviceName: '1F 消防泵', location: 'CT楼 1F 泵房', type: '消防', items: [
    { name: '消火栓出水测试', description: '出水压力不足，怀疑管道渗漏' },
  ]},
  { key: 'ab4', orderNo: 'XJ2026070008', deviceName: '2F 发电机', location: 'CT楼 2F 发电机房', type: '配电', items: [
    { name: '设备外观完整性', description: '外壳有明显的碰撞凹痕、指示灯部分不亮' },
    { name: '接地电阻检测', description: '接地电阻8Ω，超过4Ω标准' },
    { name: '运行参数读取', description: '输出频率不稳定，波动超±2%' },
  ]},
  { key: 'ab5', orderNo: 'XJ2026070011', deviceName: 'FF楼 变压器', location: 'FF楼 1F 变电所', type: '配电', items: [
    { name: '配电柜温度检测', description: '变压器运行温度异常升高' },
  ]},
])

const ignoredKeys = ref<Set<string>>(new Set())
const activeAbnormalDevices = computed(() => abnormalDevices.value.filter(d => !ignoredKeys.value.has(d.key)))
const abnormalDeviceCount = computed(() => activeAbnormalDevices.value.length)

const abnormalVisible = ref(false)
const abnormalTableRef = ref()
const abnormalSelected = ref<AbnormalDevice[]>([])

function onAbnormalSelect(rows: AbnormalDevice[]) {
  abnormalSelected.value = rows
}

function openAbnormalDevices() {
  abnormalSelected.value = []
  abnormalVisible.value = true
}

function ignoreAbnormalDevices() {
  abnormalSelected.value.forEach(d => ignoredKeys.value.add(d.key))
  abnormalSelected.value = []
}

function repairAbnormalDevices() {
  const names = abnormalSelected.value.map(d => d.deviceName)
  abnormalVisible.value = false
  Object.assign(createForm, defaultCreateForm())
  createForm.repairType = 'device'
  createForm.deviceNames = names
  createUploadList.value = []
  createStep.value = 1
  createVisible.value = true
}

function onDeviceBuildingChange() {
  createForm.deviceFloor = ''
  createForm.deviceTypeFilter = ''
  createForm.deviceNames = []
}
function onPlatformBuildingChange() {
  createForm.platformName = ''
}

function selectRepairType(v: string) {
  createForm.repairType = v
}

function openCreate() {
  Object.assign(createForm, defaultCreateForm())
  createUploadList.value = []
  createStep.value = 0
  createVisible.value = true
}

function goCreateStep2() {
  if (!createForm.repairType) return
  createStep.value = 1
}

function confirmCreate() {
  createFormRef.value?.validate((valid: boolean) => {
    if (!valid) return
    submitting.value = true
    const now = new Date()
    const ts = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    const id = Math.max(...allData.value.map(r => r.id), 0) + 1
    const orderNo = `BX${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}${String(id).padStart(4, '0')}`

  let targetName = ''
  let deviceBuilding = ''
  let deviceFloor = ''
  let deviceName = ''
  if (createForm.repairType === 'device') {
    targetName = createForm.deviceNames.join('、')
    deviceBuilding = createForm.deviceBuilding
    deviceFloor = createForm.deviceFloor
    deviceName = targetName
  } else if (createForm.repairType === 'platform') {
    targetName = createForm.platformName
  } else {
    targetName = `${createForm.assetLocation} - ${createForm.assetName}`
  }

  allData.value.unshift({
    id,
    orderNo,
    repairType: createForm.repairType,
    targetName,
    content: createForm.content,
    urgency: createForm.urgency,
    status: 'pending_review',
    reporter: createForm.reporter,
    phone: createForm.phone,
    reportTime: ts,
    deviceBuilding,
    deviceFloor,
    deviceName,
    chargePerson: Array.isArray(createForm.chargePerson) ? createForm.chargePerson[createForm.chargePerson.length - 1] : createForm.chargePerson,
  })
  applyFilters()
  submitting.value = false
  createVisible.value = false
  })
}

// ==================== 下发核查单 ====================
const checkVisible = ref(false)
const checkFormRef = ref<FormInstance>()
const checkUploadList = ref<any[]>([])
const checkForm = reactive({ title: '', content: '', priority: 'normal' as string, dueTime: '', handler: '' as any })
const checkRules: FormRules = {
  title: [{ required: true, message: '请输入工单名称', trigger: 'blur' }],
  content: [{ required: true, message: '请输入工单内容', trigger: 'blur' }],
  dueTime: [{ required: true, message: '请选择期望解决时间', trigger: 'change' }],
  handler: [{ required: true, message: '请选择工单处理人', trigger: 'change' }],
}
let checkingOrder: RepairOrder | null = null

function openCheck(row: RepairOrder) {
  checkingOrder = row
  checkForm.title = `核查${row.targetName}`
  checkForm.content = `${row.content}。报修人：${row.reporter}-${row.phone}`
  checkForm.priority = row.urgency
  checkForm.dueTime = ''
  checkForm.handler = ''
  checkUploadList.value = []
  checkVisible.value = true
}

function confirmCheck() {
  checkFormRef.value?.validate((valid: boolean) => {
    if (!valid || !checkingOrder) return
    checkingOrder.status = 'checking'
    checkVisible.value = false
    applyFilters()
  })
}

// ==================== 编辑报修单 ====================
const editVisible = ref(false)
const editingOrder = ref<RepairOrder | null>(null)
const editFormRef = ref<FormInstance>()
const editUploadList = ref<any[]>([])

const defaultEditForm = () => ({
  repairType: '' as string,
  deviceBuilding: '',
  deviceFloor: '',
  deviceTypeFilter: '' as string,
  deviceNames: [] as string[],
  platformBuilding: '',
  platformName: '',
  assetLocation: '',
  assetName: '',
  content: '',
  reporter: '',
  phone: '',
  urgency: 'normal' as string,
  chargePerson: '' as any,
})
const editForm = reactive(defaultEditForm())
const editRules: FormRules = {
  repairType: [{ required: true, message: '请选择报修类型', trigger: 'change' }],
  deviceBuilding: [{ required: true, message: '请选择建筑', trigger: 'change' }],
  deviceFloor: [{ required: true, message: '请选择楼层', trigger: 'change' }],
  deviceNames: [{ type: 'array', required: true, min: 1, message: '请至少选择一个设备', trigger: 'change' }],
  platformBuilding: [{ required: true, message: '请选择建筑', trigger: 'change' }],
  platformName: [{ required: true, message: '请选择月台', trigger: 'change' }],
  assetLocation: [{ required: true, message: '请填写资产位置', trigger: 'blur' }],
  assetName: [{ required: true, message: '请填写资产名称', trigger: 'blur' }],
  content: [{ required: true, message: '请填写维修内容', trigger: 'blur' }],
  reporter: [{ required: true, message: '请填写报修人', trigger: 'blur' }],
  phone: [{ required: true, message: '请填写联系方式', trigger: 'blur' }],
  chargePerson: [{ required: true, validator: (_r: any, v: any, cb: Function) => { if (!v || (Array.isArray(v) && v.length === 0)) return cb(new Error('请选择维修负责人')); cb() }, trigger: 'change' }],
}

const editDeviceFloors = computed(() => deviceFloors[editForm.deviceBuilding] || [])
const editDeviceList = computed(() => {
  if (!editForm.deviceBuilding || !editForm.deviceFloor) return []
  const list = deviceDatabase[`${editForm.deviceBuilding}|${editForm.deviceFloor}`] || []
  if (!editForm.deviceTypeFilter) return list
  return list.filter(d => d.type === editForm.deviceTypeFilter)
})
const editPlatforms = computed(() => platforms[editForm.platformBuilding] || [])

function onEditDeviceBuildingChange() {
  editForm.deviceFloor = ''
  editForm.deviceTypeFilter = ''
  editForm.deviceNames = []
}

function findChargerTeam(checkerName?: string): string | null {
  if (!checkerName) return null
  const found = chargerTeams.find((team) => team.children.some((member) => member.value === checkerName))
  return found?.value || null
}

function buildEditTarget() {
  let targetName = ''
  let deviceBuilding = ''
  let deviceFloor = ''
  let deviceName = ''
  if (editForm.repairType === 'device') {
    targetName = editForm.deviceNames.join('、')
    deviceBuilding = editForm.deviceBuilding
    deviceFloor = editForm.deviceFloor
    deviceName = targetName
  } else if (editForm.repairType === 'platform') {
    targetName = editForm.platformName
  } else {
    targetName = `${editForm.assetLocation} - ${editForm.assetName}`
  }
  return { targetName, deviceBuilding, deviceFloor, deviceName }
}

function openEdit(row: RepairOrder) {
  editingOrder.value = row
  editForm.repairType = row.repairType
  editForm.deviceBuilding = row.deviceBuilding || ''
  editForm.deviceFloor = row.deviceFloor || ''
  editForm.deviceTypeFilter = ''
  editForm.deviceNames = row.repairType === 'device' && row.targetName ? row.targetName.split('、') : []
  editForm.platformBuilding = row.repairType === 'platform' ? (platformBuildings.find((b) => row.targetName?.includes(b)) || '') : ''
  editForm.platformName = row.repairType === 'platform' ? row.targetName : ''
  editForm.assetLocation = row.repairType === 'other' ? String(row.targetName || '').split(' - ')[0] || '' : ''
  editForm.assetName = row.repairType === 'other' ? String(row.targetName || '').split(' - ')[1] || '' : ''
  editForm.content = row.content
  editForm.reporter = row.reporter
  editForm.phone = row.phone
  editForm.urgency = row.urgency
  editForm.chargePerson = row.chargePerson ? [findChargerTeam(row.chargePerson) || '', row.chargePerson] : ''
  editUploadList.value = []
  editVisible.value = true
}
function confirmEdit() {
  editFormRef.value?.validate((valid: boolean) => {
    if (!valid || !editingOrder.value) return
    const row = editingOrder.value
    const { targetName, deviceBuilding, deviceFloor, deviceName } = buildEditTarget()
    row.repairType = editForm.repairType
    row.targetName = targetName
    row.deviceBuilding = deviceBuilding
    row.deviceFloor = deviceFloor
    row.deviceName = deviceName
    row.content = editForm.content
    row.reporter = editForm.reporter
    row.phone = editForm.phone
    row.urgency = editForm.urgency
    row.chargePerson = Array.isArray(editForm.chargePerson) ? editForm.chargePerson[editForm.chargePerson.length - 1] : editForm.chargePerson
    editVisible.value = false
    applyFilters()
  })
}

// ==================== 删除报修单 ====================
function handleDelete(row: RepairOrder) {
  ElMessageBox.confirm(
    `确定要删除报修单「${row.orderNo}」吗？该操作不可撤销。`,
    '删除确认',
    { confirmButtonText: '确认删除', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    const idx = allData.value.findIndex(r => r.id === row.id)
    if (idx !== -1) allData.value.splice(idx, 1)
    applyFilters()
  }).catch(() => {})
}

// ==================== 提交维修方案 ====================
interface CostItem { type: string; amount: number; remark: string }

const currentOrder = ref<RepairOrder | null>(null)
const planVisible = ref(false)
const planFormRef = ref<FormInstance>()
const planUploadList = ref<any[]>([])
const planForm = reactive({
  planContent: '',
  planStartTime: '',
  planEndTime: '',
  costItems: [] as CostItem[],
})
const planTotalCost = computed(() => planForm.costItems.reduce((sum, item) => sum + (item.amount || 0), 0))
const planRules: FormRules = {
  planContent: [{ required: true, message: '请填写维修方案', trigger: 'blur' }],
  planStartTime: [{ required: true, message: '请选择预计开始时间', trigger: 'change' }],
  planEndTime: [{ required: true, message: '请选择预计结束时间', trigger: 'change' }],
}

function addCostItem() {
  planForm.costItems.push({ type: '人工费', amount: 0, remark: '' })
}
function removeCostItem(index: number) {
  planForm.costItems.splice(index, 1)
}

function openSubmitPlan(row: RepairOrder) {
  currentOrder.value = row
  planForm.planContent = row.planContent || ''
  planForm.planStartTime = row.planStartTime || ''
  planForm.planEndTime = row.planEndTime || ''
  planForm.costItems = row.estimatedCost ? [{ type: '人工费', amount: row.estimatedCost, remark: '' }] : []
  planUploadList.value = []
  planVisible.value = true
}
function confirmPlan() {
  planFormRef.value?.validate((valid: boolean) => {
    if (!valid || !currentOrder.value) return
    currentOrder.value.planContent = planForm.planContent
    currentOrder.value.planStartTime = planForm.planStartTime
    currentOrder.value.planEndTime = planForm.planEndTime
    currentOrder.value.estimatedCost = planTotalCost.value
    currentOrder.value.planCostItems = planForm.costItems.map(c => ({ ...c }))
    currentOrder.value.status = 'plan_pending'
    planVisible.value = false
    applyFilters()
  })
}

// ==================== 审核维修方案 ====================
const planAuditVisible = ref(false)
const planAuditForm = reactive({ result: 'approve', opinion: '' })

function openPlanAudit(row: RepairOrder) {
  currentOrder.value = row
  planAuditForm.result = 'approve'
  planAuditForm.opinion = ''
  planAuditVisible.value = true
}
function confirmPlanAudit() {
  if (!currentOrder.value) return
  if (planAuditForm.result === 'approve') {
    currentOrder.value.status = 'plan_approved'
  } else {
    currentOrder.value.status = 'plan_rejected'
  }
  planAuditVisible.value = false
  applyFilters()
}

const dispatchVisible = ref(false)
const dispatchFormRef = ref<FormInstance>()
const dispatchForm = reactive({ workOrderName: '', workOrderDesc: '', workOrderTheme: '', worker: '' as any, urgency: 'normal' as string, planStartTime: '', remark: '' })
const dispatchRules: FormRules = {
  workOrderName: [{ required: true, message: '请输入工单名称', trigger: 'blur' }],
  workOrderDesc: [{ required: true, message: '请输入工单描述', trigger: 'blur' }],
  worker: [{ required: true, message: '请选择工单处理人', trigger: 'change' }],
  planStartTime: [{ required: true, message: '请选择期望解决时间', trigger: 'change' }],
}

function openDispatch(row: RepairOrder) {
  currentOrder.value = row
  dispatchForm.workOrderName = `【维修】${row.targetName}`
  dispatchForm.workOrderDesc = `${row.content}。报修人：${row.reporter}-${row.phone}`
  dispatchForm.workOrderTheme = row.planContent || ''
  dispatchForm.worker = ''
  dispatchForm.urgency = row.urgency || 'normal'
  dispatchForm.planStartTime = row.planEndTime || ''
  dispatchForm.remark = row.targetName || ''
  dispatchVisible.value = true
}
function confirmDispatch() {
  dispatchFormRef.value?.validate((valid: boolean) => {
    if (!valid || !currentOrder.value) return
    currentOrder.value.worker = Array.isArray(dispatchForm.worker) ? dispatchForm.worker[dispatchForm.worker.length - 1] : dispatchForm.worker
    currentOrder.value.workerPhone = ''
    currentOrder.value.dispatchUrgency = dispatchForm.urgency
    currentOrder.value.planStartTime = dispatchForm.planStartTime
    currentOrder.value.status = 'executing'
    dispatchVisible.value = false
    applyFilters()
  })
}

// ==================== 详情 ====================
const detailVisible = ref(false)
const detailOrder = ref<RepairOrder | null>(null)
const detailLogs = ref<LogItem[]>([])

function openDetail(row: RepairOrder) {
  detailOrder.value = row

  const logs: LogItem[] = [
    { time: row.reportTime, type: 'primary', operator: row.reporter, action: '报修' },
  ]
  if (row.checkOrderNo) {
    logs.push({ time: row.checkTime || row.reportTime, type: 'primary', operator: row.chargePerson || '-', action: '派发核查' })
    logs.push({ time: row.checkTime || '', type: 'success', operator: row.checker || '-', action: `完成核查：${row.checkResult === 'onsite' ? '已现场处置' : '需要维修'}` })
  }
  if (row.planContent) {
    logs.push({ time: row.planStartTime || row.reportTime, type: 'primary', operator: row.chargePerson || '-', action: '提交维修方案' })
    logs.push({ time: row.planStartTime || '', type: 'primary', operator: '-', action: '审核维修方案' })
  }
  if (row.worker) {
    logs.push({ time: row.planStartTime || row.reportTime, type: 'warning', operator: row.chargePerson || '-', action: '下发维修工单' })
  }
  if (row.repairDescription) {
    logs.push({ time: row.handleTime || '', type: 'success', operator: row.worker || '-', action: '完成维修' })
  }
  if (row.acceptanceResult) {
    logs.push({ time: row.acceptanceTime || '', type: 'success', operator: row.acceptanceBy || '-', action: '完成验收' })
  }
  detailLogs.value = logs
  detailVisible.value = true
}
</script>

<style scoped>
.rm-page {
  max-width: 1600px;
}
.rm-search {
  background: #fafbfc;
  padding: 16px;
  border-radius: 4px;
  margin-bottom: 16px;
}
.rm-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}
.rm-actions__count {
  font-size: 13px;
  color: #909399;
}
.rm-pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* ===== 新建报修抽屉 ===== */
.rm-drawer-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  padding-right: 40px;
}
.rm-drawer-header__title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.rm-drawer-steps {
  max-width: 440px;
}
.rm-drawer-body {
  padding: 0 4px;
}
.rm-drawer-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}

/* 报修类型选择卡片 */
.rm-create-type {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.rm-type-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 32px 16px;
  border: 2px solid #ebeef5;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.rm-type-card:hover {
  border-color: #409eff;
  background: #ecf5ff;
}
.rm-type-card--selected {
  border-color: #409eff;
  background: #ecf5ff;
  box-shadow: 0 0 0 1px #409eff;
}
.rm-type-card__name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.rm-type-card__desc {
  font-size: 12px;
  color: #909399;
}

/* 费用明细表格 */
.rm-cost-table {
  width: 100%;
}
.rm-cost-table__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.rm-cost-table__title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}
.rm-cost-total {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 14px;
  color: #606266;
}
.rm-cost-total strong {
  font-size: 16px;
  color: #409eff;
}

/* ===== 详情 ===== */
.rm-detail__section {
  margin-bottom: 20px;
}
.rm-detail__title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 3px solid #409eff;
  line-height: 1.2;
}

.rm-device-select-section { margin-top: 0; }
.rm-device-select-section__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
.rm-device-select-section__count { font-size: 13px; color: #606266; }
.rm-device-select-empty { padding: 16px; text-align: center; font-size: 13px; color: #c0c4cc; border: 1px solid #ebeef5; border-radius: 4px; background: #fafbfc; }
.rm-device-picker-filter { background: #fafbfc; padding: 12px 16px; border-radius: 4px; margin-bottom: 12px; }

.rm-ab-item { padding: 4px 0; border-bottom: 1px solid #f2f3f5; font-size: 13px; }
.rm-ab-item:last-child { border-bottom: none; }
.rm-ab-item__name { font-weight: 600; color: #303133; }
.rm-ab-item__desc { color: #606266; }
</style>
