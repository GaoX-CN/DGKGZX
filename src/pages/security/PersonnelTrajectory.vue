<template>
  <div class="trajectory-page">
    <!-- 左侧：告警事件列表 -->
    <aside class="panel alert-panel">
      <div class="panel-title panel-title--action">
        <div>
          <h2>告警人员</h2>
        </div>
        <el-button text :icon="Refresh" size="small" @click="onRefreshAlerts">刷新</el-button>
      </div>
      <div class="alert-range">
        <el-date-picker
          v-model="dateRange"
          type="datetimerange"
          range-separator="至"
          start-placeholder="开始时间"
          end-placeholder="结束时间"
          size="small"
          value-format="YYYY-MM-DD HH:mm:ss"
          format="MM-DD HH:mm"
          :shortcuts="dateShortcuts"
        />
      </div>
      <div class="alert-filter">
        <el-input v-model="alertKeyword" placeholder="搜索姓名" :prefix-icon="Search" clearable size="small" />
        <el-select v-model="alertSeverity" placeholder="风险等级" size="small" clearable>
          <el-option label="高风险" value="high" />
          <el-option label="中风险" value="medium" />
          <el-option label="低风险" value="low" />
        </el-select>
      </div>
      <div class="alert-list">
        <article
          v-for="alert in filteredAlerts"
          :key="alert.id"
          class="alert-item"
          :class="[
            { active: activeAlertId === alert.id },
            `alert-item--${alert.severity}`,
          ]"
          @click="selectAlert(alert.id)"
        >
          <div class="alert-item__body">
            <div class="alert-item__photo">
              <img class="alert-item__photo-img" :src="personImage" alt="人脸抓拍" />
            </div>
            <div class="alert-item__info">
              <div class="alert-item__name">
                {{ alert.targetName }}
                <el-tag size="small" :type="severityTag(alert.severity)" effect="light">{{ severityLabel(alert.severity) }}</el-tag>
              </div>
              <div class="alert-item__meta">
                <span>最近抓拍：{{ formatShortTime(alert.lastCaptureTime) }}</span>
              </div>
              <div class="alert-item__meta">
                <span>经过 {{ alert.cameraCount }} 个点位 · 抓拍 {{ alert.captureCount }} 次</span>
              </div>
            </div>
          </div>
        </article>
        <el-empty v-if="filteredAlerts.length === 0" description="暂无符合条件的告警" :image-size="80" />
      </div>
    </aside>

    <!-- 中间：地图区 -->
    <main class="map-panel panel">
      <div class="map-canvas">
        <img :src="mapImage" alt="园区平面图" />
        <div class="map-overlay" />

        <!-- 摄像头位置（不带轨迹连线，多次抓拍用 chip 堆叠表达） -->
        <button
          v-for="cam in visibleCameras"
          :key="cam.id"
          type="button"
          class="cam-marker"
          :class="markerClasses(cam)"
          :style="{ left: cam.left + '%', top: cam.top + '%' }"
          @click.stop="selectCamera(cam.id)"
        >
          <span class="cam-marker__ring" />
          <span class="cam-marker__dot">
            <el-icon :size="11"><VideoCamera /></el-icon>
          </span>
          <span v-if="cameraVisits(cam.id).length === 1" class="cam-marker__badge">{{ cameraVisits(cam.id)[0].sequence }}</span>
          <div v-if="cameraVisits(cam.id).length > 1" class="cam-marker__chips">
            <span
              v-for="v in cameraVisits(cam.id).slice(0, 2)"
              :key="v.sequence"
              class="cam-marker__chip"
              :class="[{ 'cam-marker__chip--active': activeCameraId === cam.id && activeVisitSequence === v.sequence },
              ]"
            >{{ v.sequence }}</span>
            <span v-if="cameraVisits(cam.id).length > 2" class="cam-marker__chip cam-marker__chip--more">...</span>
          </div>
          <span class="cam-marker__label">{{ cam.name }}</span>
        </button>

        <!-- 摄像头 popover 详情（支持多次抓拍列表） -->
        <div
          v-if="activeCamera"
          class="cam-tooltip"
          :style="activeCameraTooltipStyle"
          @click.stop
        >
          <header>
            <span class="cam-tooltip__building">{{ activeAlert?.targetName }}</span>
            <el-button text :icon="Close" size="small" @click="activeCameraId = null" />
          </header>
          <div class="cam-tooltip__title">
            <el-icon><VideoCamera /></el-icon>
            <strong>{{ activeCamera.name }}</strong>
            <el-tag v-if="cameraVisits(activeCamera.id).length > 0" type="danger" size="small" effect="dark">
              抓拍 {{ cameraVisits(activeCamera.id).length }} 次
            </el-tag>
          </div>
          <div class="cam-tooltip__body">
            <div class="cam-tooltip__row"><span>摄像头编号</span><b>{{ activeCamera.id }}</b></div>
            <div class="cam-tooltip__visits">
              <div class="cam-tooltip__visits-title">经过该摄像头的抓拍记录</div>
              <div
                v-for="v in cameraVisits(activeCamera.id)"
                :key="v.sequence"
                class="cam-tooltip__visit"
                :class="[
                  { 'cam-tooltip__visit--active': activeVisitSequence === v.sequence },
                ]"
                @click="openVisitPreview(activeCamera.id, v.sequence)"
              >
                <span class="cam-tooltip__visit-seq">第 {{ v.sequence }} 次</span>
                <span class="cam-tooltip__visit-time">{{ v.captureTime }}</span>
                <span class="cam-tooltip__visit-sim">相似度 {{ v.similarity }}%</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 告警起点 / 终点 角标（已移除：不在地图上额外标注起讫，由 marker 自身的 chips 表达顺序） -->

        <div class="map-legend">
          <span><i class="dot dot--capture" />抓拍摄像头</span>
          <span><i class="dot dot--multi" />多次经过</span>
        </div>

        <div class="map-empty" v-if="!activeAlert">
          <el-icon :size="40"><User /></el-icon>
          <strong>请从左侧选择告警事件</strong>
          <span>选择后将自动还原该人员活动轨迹与抓拍记录</span>
          <div class="map-empty__steps">
            <span class="map-empty__step"><b>1</b> 筛选告警</span>
            <span class="map-empty__step"><b>2</b> 点击告警项</span>
            <span class="map-empty__step"><b>3</b> 查看活动轨迹</span>
          </div>
        </div>
      </div>
    </main>

    <!-- 右侧：目标详情 + 抓拍时间线 -->
    <aside class="panel detail-panel">
      <div class="panel-title">
        <div>
          <h2>目标信息</h2>
        </div>
        <el-icon><UserFilled /></el-icon>
      </div>

      <div v-if="activeAlert" class="target-card">
        <div class="target-card__photo">
          <img class="target-card__photo-img" :src="personImage" alt="人脸抓拍" />
          <span class="target-card__badge" :class="`target-card__badge--${activeAlert.severity}`">{{ severityLabel(activeAlert.severity) }}</span>
        </div>
        <div class="target-card__info">
          <h3>{{ activeAlert.targetName }}</h3>
          <div class="target-card__meta">
            <div><span>所属库</span><b>{{ activeAlert.library }}</b></div>
            <div><span>最新识别</span><b>{{ activeAlert.firstBuilding }} · {{ activeAlert.firstCamera }}</b></div>
            <div><span>识别时间</span><b>{{ formatShortTime(activeAlert.lastCaptureTime) }}</b></div>
          </div>
        </div>
      </div>
      <div v-else class="target-card target-card--empty">
        <el-icon :size="40"><User /></el-icon>
        <span>未选择告警事件</span>
      </div>

      <div v-if="activeAlert" class="target-stats">
        <div class="target-stats__item">
          <span>抓拍次数</span>
          <b>{{ activeAlert.captureCount }}</b>
          <small>张抓拍图</small>
        </div>
                <div class="target-stats__item">
          <span>途经摄像头</span>
          <b>{{ activeAlert.cameraCount }}</b>
          <small>个点位</small>
        </div>
        <div class="target-stats__item">
          <span>最高相似度</span>
          <b>{{ activeAlert.maxSimilarity }}%</b>
          <small>本次告警</small>
        </div>
      </div>

      <div class="timeline-header">
        <h3>抓拍时间线</h3>
        <span v-if="activeAlert">{{ formatShortTime(activeAlert.alertTime) }} ~ {{ formatShortTime(activeAlert.lastCaptureTime) }}</span>
      </div>

      <div v-if="activeAlert" class="timeline">
        <el-timeline>
          <el-timeline-item
            v-for="(point, idx) in trajectoryPoints"
            :key="point.cameraId"
            :type="timelineType(idx)"
            :timestamp="point.captureTime"
            :hollow="idx !== 0 && idx !== trajectoryPoints.length - 1"
            placement="top"
          >
            <div class="timeline-point" :class="{ 'timeline-point--active': activeCameraId === point.cameraId }" @click="selectCamera(point.cameraId)">
              <strong class="timeline-point__name">{{ point.cameraName }}</strong>
              <em class="timeline-point__sim">相似 {{ point.similarity }}%</em>
              <el-button text :icon="VideoPlay" size="small" @click.stop="openPreview(point)">查看</el-button>
            </div>
          </el-timeline-item>
        </el-timeline>
      </div>
      <div v-else class="timeline-empty">
        <el-icon :size="32"><Clock /></el-icon>
        <span>选择告警事件后展示抓拍时间线</span>
      </div>
    </aside>

    <!-- 抓拍预览弹窗 -->
    <el-drawer v-model="previewVisible" title="抓拍记录" direction="rtl" size="420px" destroy-on-close>
      <template #header>
        <span class="preview-drawer__title">抓拍记录 · {{ previewing?.camera?.name || '' }}</span>
      </template>
      <div v-if="previewing" class="preview-dialog">
        <div class="preview-dialog__photo">
          <img class="preview-dialog__photo-img" :src="personImage" alt="人脸抓拍" />
          <div class="preview-dialog__overlay">
            <span class="preview-dialog__seq">第 {{ previewing.visit.sequence }} 次抓拍</span>
            <span class="preview-dialog__similarity">相似度 {{ previewing.visit.similarity }}%</span>
          </div>
        </div>
        <el-descriptions :column="1" border size="default" class="preview-dialog__desc">
          <el-descriptions-item label="摄像头编号">{{ previewing.camera.id }}</el-descriptions-item>
          <el-descriptions-item label="摄像头名称">{{ previewing.camera.name }}</el-descriptions-item>
          <el-descriptions-item label="抓拍时间">{{ previewing.visit.captureTime }}</el-descriptions-item>
          <el-descriptions-item label="相似度">
            <span >{{ previewing.visit.similarity }}%</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  Close, Clock, Refresh, Search, User, UserFilled, VideoCamera, VideoPlay,
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import mapImage from '@/map.png'
import personImage from '@/photo/person.jpeg'

// ==================== 类型定义 ====================

type Severity = 'high' | 'medium' | 'low'

interface AlertEvent {
  id: string
  photo: string
  alertTime: string
  lastCaptureTime: string
  targetName: string
  controlId: string
  library: string
  gender: string
  ageRange: string
  severity: Severity
  firstBuilding: string
  firstCamera: string
  captureCount: number
  cameraCount: number
  similarity: number
  maxSimilarity: number
  visits: CameraVisit[]
}

interface Camera {
  id: string
  name: string
  building: string
  zone: string
  left: number
  top: number
}

interface CameraVisit {
  cameraId: string
  sequence: number
  captureTime: string
  similarity: number
}

interface TrajectoryPoint {
  cameraId: string
  cameraName: string
  building: string
  zone: string
  captureTime: string
  similarity: number
  sequence: number
}

// ==================== 摄像头空间分布 ====================

const allCameras: Camera[] = [
  { id: 'CT-1F-CAM-01', name: 'CT楼1F东区入口', building: 'CT楼', zone: '1F 物流作业区', left: 27, top: 35 },
  { id: 'CT-1F-CAM-02', name: 'CT楼1F安检通道', building: 'CT楼', zone: '1F 安检区', left: 30, top: 45 },
  { id: 'CT-1F-CAM-03', name: 'CT楼1F海关查验区', building: 'CT楼', zone: '1F 海关查验', left: 32, top: 55 },
  { id: 'CT-2F-CAM-01', name: 'CT楼2F电梯厅', building: 'CT楼', zone: '2F 电梯厅', left: 35, top: 28 },
  { id: 'CT-2F-CAM-02', name: 'CT楼2F办公走廊', building: 'CT楼', zone: '2F 办公走廊', left: 38, top: 24 },
  { id: 'CT-3F-CAM-01', name: 'CT楼3F会议室走廊', building: 'CT楼', zone: '3F 会议区', left: 33, top: 20 },
  { id: 'CT-EF-CAM-01', name: 'CT楼东出口', building: 'CT楼', zone: '1F 出口', left: 40, top: 50 },
  { id: 'FF-1F-CAM-01', name: 'FF楼1F入口', building: 'FF楼', zone: '1F 入口', left: 52, top: 38 },
  { id: 'FF-1F-CAM-02', name: 'FF楼1F海关作业区', building: 'FF楼', zone: '1F 海关作业', left: 55, top: 45 },
  { id: 'FF-1F-CAM-03', name: 'FF楼1F西侧走廊', building: 'FF楼', zone: '1F 西走廊', left: 48, top: 48 },
  { id: 'FF-2F-CAM-01', name: 'FF楼2F电梯厅', building: 'FF楼', zone: '2F 电梯厅', left: 58, top: 35 },
  { id: 'FF-2F-CAM-02', name: 'FF楼2F走廊', building: 'FF楼', zone: '2F 走廊', left: 60, top: 30 },
  { id: 'FF-7F-CAM-01', name: 'FF楼7F洽谈室门口', building: 'FF楼', zone: '7F 洽谈区', left: 56, top: 22 },
  { id: 'OB-1F-CAM-01', name: '海关联检1F大厅', building: '海关联检大楼(OB)', zone: '1F 大厅', left: 70, top: 45 },
  { id: 'OB-1F-CAM-02', name: '海关联检1F出口', building: '海关联检大楼(OB)', zone: '1F 出口', left: 75, top: 50 },
  { id: 'OB-2F-CAM-01', name: '海关联检2F会议室', building: '海关联检大楼(OB)', zone: '2F 会议室', left: 72, top: 36 },
  { id: 'OB-2F-CAM-02', name: '海关联检2F走廊', building: '海关联检大楼(OB)', zone: '2F 走廊', left: 68, top: 32 },
  { id: 'PK-AREA-CAM-01', name: '停车场入口', building: '园区', zone: '停车场', left: 50, top: 70 },
  { id: 'PK-AREA-CAM-02', name: '停车场西出口', building: '园区', zone: '停车场', left: 45, top: 75 },
  { id: 'GATE-N-CAM-01', name: '北门门禁', building: '园区', zone: '北门', left: 50, top: 28 },
  { id: 'GATE-S-CAM-01', name: '南门门禁', building: '园区', zone: '南门', left: 50, top: 82 },
]

// ==================== 告警事件 ====================

const alerts: AlertEvent[] = [
  {
    id: 'AL-20260723-0012',
    photo: 'PH',
    alertTime: '2026-07-23 09:12:42',
    lastCaptureTime: '2026-07-23 10:02:46',
    targetName: '张某某',
    controlId: 'BK-2026-071',
    library: '重点人员布控库',
    gender: '男',
    ageRange: '35-40',
    severity: 'high',
    firstBuilding: 'CT楼',
    firstCamera: 'CT楼1F东区入口',
    captureCount: 12,
    cameraCount: 9,
    similarity: 96,
    maxSimilarity: 97,
    visits: [
      { cameraId: 'CT-1F-CAM-01', sequence: 1, captureTime: '2026-07-23 09:12:42', similarity: 96 },
      { cameraId: 'CT-1F-CAM-02', sequence: 2, captureTime: '2026-07-23 09:14:18', similarity: 95 },
      { cameraId: 'CT-1F-CAM-03', sequence: 3, captureTime: '2026-07-23 09:18:36', similarity: 97 },
      { cameraId: 'CT-1F-CAM-02', sequence: 4, captureTime: '2026-07-23 09:24:50', similarity: 94 },
      { cameraId: 'CT-2F-CAM-02', sequence: 5, captureTime: '2026-07-23 09:32:07', similarity: 92 },
      { cameraId: 'CT-1F-CAM-02', sequence: 6, captureTime: '2026-07-23 09:40:15', similarity: 93 },
    ],
  },
  {
    id: 'AL-20260723-0011',
    photo: 'PH',
    alertTime: '2026-07-23 08:46:18',
    lastCaptureTime: '2026-07-23 08:52:03',
    targetName: '李某某',
    controlId: 'BK-2026-068',
    library: '内部关注人员库',
    gender: '女',
    ageRange: '28-32',
    severity: 'medium',
    firstBuilding: 'FF楼',
    firstCamera: 'FF楼1F入口',
    captureCount: 4,
    cameraCount: 3,
    similarity: 89,
    maxSimilarity: 92,
    visits: [
      { cameraId: 'FF-1F-CAM-01', sequence: 1, captureTime: '2026-07-23 08:46:18', similarity: 89 },
      { cameraId: 'FF-1F-CAM-02', sequence: 2, captureTime: '2026-07-23 08:48:32', similarity: 91 },
      { cameraId: 'FF-2F-CAM-01', sequence: 3, captureTime: '2026-07-23 08:50:46', similarity: 92 },
      { cameraId: 'FF-2F-CAM-01', sequence: 4, captureTime: '2026-07-23 08:52:03', similarity: 90 },
    ],
  },
  {
    id: 'AL-20260723-0010',
    photo: 'PH',
    alertTime: '2026-07-23 08:22:51',
    lastCaptureTime: '2026-07-23 08:31:16',
    targetName: '王某',
    controlId: 'BK-2026-052',
    library: '黑名单库',
    gender: '男',
    ageRange: '40-45',
    severity: 'high',
    firstBuilding: '海关联检大楼(OB)',
    firstCamera: '海关联检1F大厅',
    captureCount: 3,
    cameraCount: 2,
    similarity: 94,
    maxSimilarity: 95,
    visits: [
      { cameraId: 'OB-1F-CAM-01', sequence: 1, captureTime: '2026-07-23 08:22:51', similarity: 94 },
      { cameraId: 'OB-1F-CAM-02', sequence: 2, captureTime: '2026-07-23 08:27:14', similarity: 95 },
      { cameraId: 'OB-1F-CAM-01', sequence: 3, captureTime: '2026-07-23 08:31:16', similarity: 92 },
    ],
  },
  {
    id: 'AL-20260722-0089',
    photo: 'PH',
    alertTime: '2026-07-22 17:38:22',
    lastCaptureTime: '2026-07-22 18:02:15',
    targetName: '陈某某',
    controlId: 'BK-2026-103',
    library: '重点人员布控库',
    gender: '男',
    ageRange: '45-50',
    severity: 'medium',
    firstBuilding: 'CT楼',
    firstCamera: 'CT楼1F东区入口',
    captureCount: 8,
    cameraCount: 6,
    similarity: 87,
    maxSimilarity: 90,
    visits: [
      { cameraId: 'CT-1F-CAM-01', sequence: 1, captureTime: '2026-07-22 17:38:22', similarity: 87 },
      { cameraId: 'CT-1F-CAM-02', sequence: 2, captureTime: '2026-07-22 17:42:09', similarity: 88 },
      { cameraId: 'CT-2F-CAM-02', sequence: 3, captureTime: '2026-07-22 17:48:35', similarity: 90 },
      { cameraId: 'CT-2F-CAM-02', sequence: 4, captureTime: '2026-07-22 17:53:41', similarity: 86 },
      { cameraId: 'FF-1F-CAM-01', sequence: 5, captureTime: '2026-07-22 17:58:22', similarity: 88 },
      { cameraId: 'FF-2F-CAM-01', sequence: 6, captureTime: '2026-07-22 18:02:15', similarity: 90 },
    ],
  },
  {
    id: 'AL-20260722-0088',
    photo: 'PH',
    alertTime: '2026-07-22 15:21:09',
    lastCaptureTime: '2026-07-22 15:21:09',
    targetName: '陌生人',
    controlId: '',
    library: '陌生人识别',
    gender: '',
    ageRange: '',
    severity: 'low',
    firstBuilding: '海关联检大楼(OB)',
    firstCamera: '海关联检1F出口',
    captureCount: 1,
    cameraCount: 1,
    similarity: 82,
    maxSimilarity: 82,
    visits: [
      { cameraId: 'OB-1F-CAM-02', sequence: 1, captureTime: '2026-07-22 15:21:09', similarity: 82 },
    ],
  },
  {
    id: 'AL-20260722-0087',
    photo: 'PH',
    alertTime: '2026-07-22 14:08:46',
    lastCaptureTime: '2026-07-22 14:35:12',
    targetName: '黄某某',
    controlId: 'BK-2026-091',
    library: '内部关注人员库',
    gender: '男',
    ageRange: '38-42',
    severity: 'medium',
    firstBuilding: 'CT楼',
    firstCamera: 'CT楼1F安检通道',
    captureCount: 6,
    cameraCount: 4,
    similarity: 90,
    maxSimilarity: 93,
    visits: [
      { cameraId: 'CT-1F-CAM-02', sequence: 1, captureTime: '2026-07-22 14:08:46', similarity: 90 },
      { cameraId: 'CT-1F-CAM-03', sequence: 2, captureTime: '2026-07-22 14:14:35', similarity: 93 },
      { cameraId: 'CT-2F-CAM-02', sequence: 3, captureTime: '2026-07-22 14:22:17', similarity: 88 },
      { cameraId: 'CT-1F-CAM-02', sequence: 4, captureTime: '2026-07-22 14:28:09', similarity: 91 },
      { cameraId: 'CT-EF-CAM-01', sequence: 5, captureTime: '2026-07-22 14:32:48', similarity: 89 },
      { cameraId: 'PK-AREA-CAM-01', sequence: 6, captureTime: '2026-07-22 14:35:12', similarity: 87 },
    ],
  },
  {
    id: 'AL-20260722-0086',
    photo: 'PH',
    alertTime: '2026-07-22 11:42:33',
    lastCaptureTime: '2026-07-22 11:55:48',
    targetName: '赵某某',
    controlId: 'BK-2026-077',
    library: '黑名单库',
    gender: '男',
    ageRange: '50-55',
    severity: 'high',
    firstBuilding: 'FF楼',
    firstCamera: 'FF楼1F西侧走廊',
    captureCount: 5,
    cameraCount: 3,
    similarity: 92,
    maxSimilarity: 94,
    visits: [
      { cameraId: 'FF-1F-CAM-03', sequence: 1, captureTime: '2026-07-22 11:42:33', similarity: 92 },
      { cameraId: 'FF-1F-CAM-02', sequence: 2, captureTime: '2026-07-22 11:47:21', similarity: 94 },
      { cameraId: 'FF-1F-CAM-03', sequence: 3, captureTime: '2026-07-22 11:50:18', similarity: 91 },
      { cameraId: 'FF-1F-CAM-01', sequence: 4, captureTime: '2026-07-22 11:53:42', similarity: 90 },
      { cameraId: 'FF-2F-CAM-01', sequence: 5, captureTime: '2026-07-22 11:55:48', similarity: 93 },
    ],
  },
]

// ==================== 状态 ====================

const alertKeyword = ref('')
const alertSeverity = ref<Severity | ''>('')

// 起止时间筛选：默认当天（原型阶段不做筛选，只做 UI 展示）
function startOfToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 00:00:00`
}
function endOfToday(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 23:59:59`
}
const dateRange = ref<[string, string]>([startOfToday(), endOfToday()])
const dateShortcuts = [
  { text: '今天', value: () => [startOfToday(), endOfToday()] },
  { text: '最近 24 小时', value: () => {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const end = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
      const past = new Date(d.getTime() - 24 * 60 * 60 * 1000)
      const start = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())} ${pad(past.getHours())}:${pad(past.getMinutes())}:${pad(past.getSeconds())}`
      return [start, end]
    } },
  { text: '最近 7 天', value: () => {
      const d = new Date()
      const pad = (n: number) => String(n).padStart(2, '0')
      const end = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} 23:59:59`
      const past = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000)
      const start = `${past.getFullYear()}-${pad(past.getMonth() + 1)}-${pad(past.getDate())} 00:00:00`
      return [start, end]
    } },
]
const activeAlertId = ref(alerts[0].id)
const activeCameraId = ref<string | null>(null)
const activeVisitSequence = ref<number | null>(null)
const previewVisible = ref(false)
const previewingCameraId = ref<string | null>(null)
const previewingSequence = ref<number | null>(null)
const flashCameraId = ref<string | null>(null)  // 时间线"抓拍"点击后地图 marker 短暂闪烁

// ==================== 计算属性 ====================

const filteredAlerts = computed(() => {
  return alerts.filter((alert) => {
    if (alertSeverity.value && alert.severity !== alertSeverity.value) return false
    if (alertKeyword.value) {
      const kw = alertKeyword.value.toLowerCase()
      if (!alert.id.toLowerCase().includes(kw) && !alert.targetName.toLowerCase().includes(kw)) return false
    }
    return true
  })
})

const activeAlert = computed(() => alerts.find((a) => a.id === activeAlertId.value) || null)

// 当前告警的访问序列（按 sequence 升序）
const activeVisits = computed<CameraVisit[]>(() => {
  if (!activeAlert.value) return []
  return [...activeAlert.value.visits].sort((a, b) => a.sequence - b.sequence)
})

// 当前告警包含的摄像头 ID 集合
const visitedCameraIds = computed(() => new Set(activeVisits.value.map((v) => v.cameraId)))

// 当前告警在每个摄像头上的访问序列（按 sequence 升序）
const cameraVisitMap = computed<Map<string, CameraVisit[]>>(() => {
  const map = new Map<string, CameraVisit[]>()
  activeVisits.value.forEach((v) => {
    if (!map.has(v.cameraId)) map.set(v.cameraId, [])
    map.get(v.cameraId)!.push(v)
  })
  return map
})

// 右侧时间线使用的轨迹点（每个抓拍序号一条）
const trajectoryPoints = computed<TrajectoryPoint[]>(() => {
  if (!activeAlert.value) return []
  return activeVisits.value.map((v) => {
    const cam = allCameras.find((c) => c.id === v.cameraId)!
    return {
      cameraId: v.cameraId,
      cameraName: cam.name,
      building: cam.building,
      zone: cam.zone,
      captureTime: v.captureTime,
      similarity: v.similarity,
      sequence: v.sequence,
    }
  })
})

// 仅渲染被本次告警经过的摄像头，未被抓拍到的摄像头不在地图上展示
const visibleCameras = computed<Camera[]>(() => allCameras.filter((c) => visitedCameraIds.value.has(c.id)))

const activeCamera = computed<Camera | null>(() => {
  if (!activeCameraId.value) return null
  return allCameras.find((c) => c.id === activeCameraId.value) || null
})

const previewing = computed<{ camera: Camera; visit: CameraVisit } | null>(() => {
  if (!previewingCameraId.value || previewingSequence.value === null) return null
  const cam = allCameras.find((c) => c.id === previewingCameraId.value)
  if (!cam) return null
  const visit = activeVisits.value.find((v) => v.cameraId === previewingCameraId.value && v.sequence === previewingSequence.value)
  if (!visit) return null
  return { camera: cam, visit }
})

const activeCameraTooltipStyle = computed(() => {
  if (!activeCamera.value) return { display: 'none' }
  const left = Math.min(72, Math.max(8, activeCamera.value.left + 4))
  const top = Math.max(6, activeCamera.value.top - 4)
  return {
    left: `${left}%`,
    top: `${top}%`,
  }
})

// ==================== 辅助方法 ====================

function cameraVisits(cameraId: string): CameraVisit[] {
  return cameraVisitMap.value.get(cameraId) || []
}

function markerClasses(cam: Camera) {
  const visits = cameraVisits(cam.id)
  const isStart = activeVisits.value[0]?.cameraId === cam.id
  const isEnd = activeVisits.value[activeVisits.value.length - 1]?.cameraId === cam.id
  return {
    active: activeCameraId.value === cam.id,
    'cam-marker--flash': flashCameraId.value === cam.id,
    'cam-marker--has-visits': visits.length > 0,
    'cam-marker--multi': visits.length > 1,
    'cam-marker--start': isStart && !isEnd,
    'cam-marker--end': isEnd && !isStart,
    'cam-marker--start-end': isStart && isEnd,
  }
}

function severityLabel(severity: Severity) {
  return { high: '高风险', medium: '中风险', low: '低风险' }[severity]
}

function severityTag(severity: Severity) {
  return { high: 'danger', medium: 'warning', low: 'info' }[severity] as 'danger' | 'warning' | 'info'
}


function timelineType(idx: number) {
  if (idx === 0) return 'primary'
  if (idx === trajectoryPoints.value.length - 1) return 'danger'
  return 'warning'
}

// ==================== 交互 ====================

function selectAlert(id: string) {
  activeAlertId.value = id
  activeCameraId.value = null
}

function formatShortTime(time: string) {
  // 形如 2026-07-23 09:12:42 → 07-23 09:12:42
  if (!time) return ''
  const m = /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})$/.exec(time)
  if (!m) return time
  return `${m[2]}-${m[3]} ${m[4]}`
}

function onRefreshAlerts() {
  ElMessage.success('已刷新布控人员列表')
}

function selectCamera(id: string) {
  if (activeCameraId.value === id) {
    activeCameraId.value = null
    activeVisitSequence.value = null
  } else {
    activeCameraId.value = id
    activeVisitSequence.value = null
  }
}

function selectVisit(cameraId: string, sequence: number) {
  activeCameraId.value = cameraId
  activeVisitSequence.value = sequence
}

function openPreview(point: TrajectoryPoint) {
  previewingCameraId.value = point.cameraId
  previewingSequence.value = point.sequence
  activeVisitSequence.value = point.sequence
  flashCameraId.value = point.cameraId
  setTimeout(() => { flashCameraId.value = null }, 2000)
  previewVisible.value = true
}

function openVisitPreview(cameraId: string, sequence: number) {
  previewingCameraId.value = cameraId
  previewingSequence.value = sequence
  activeVisitSequence.value = sequence
  flashCameraId.value = cameraId
  setTimeout(() => { flashCameraId.value = null }, 2000)
  previewVisible.value = true
}
</script>

<style lang="scss" scoped>
.trajectory-page { position: relative; width: 100%; height: 100%; min-height: 100%; overflow: hidden; background: #dbe7dc; color: #1e2d45; }
.panel { border: 1px solid #e5eaf1; border-radius: 10px; background: #fff; box-shadow: 0 5px 20px rgba(38, 58, 90, .12); }
.panel-title { display: flex; align-items: center; justify-content: space-between; padding: 17px 18px 13px; }
.panel-title h2 { margin: 0; font-size: 15px; }
.panel-title span { display: block; margin-top: 5px; color: #9aa5b5; font-size: 11px; }
.panel-title .el-icon { color: #94a1b2; font-size: 16px; }

// 左侧 - 告警事件面板
.alert-panel { position: absolute; z-index: 20; top: 16px; bottom: 16px; left: 16px; display: flex; width: 304px; min-height: 0; flex-direction: column; }
.alert-range { padding: 10px 14px 0; }
.alert-range :deep(.el-date-editor) { width: 100%; }
.alert-range :deep(.el-range-input) { font-size: 11px; }
.alert-range :deep(.el-range-separator) { font-size: 11px; padding: 0 4px; }
.alert-range :deep(.el-range__icon) { font-size: 12px; }
.alert-range :deep(.el-input__wrapper) { box-shadow: 0 0 0 1px #e3e8ef inset; }
.alert-filter { display: grid; grid-template-columns: 1fr 1fr; gap: 7px; padding: 11px 14px; }
.alert-filter :deep(.el-input--small .el-input__wrapper),
.alert-filter :deep(.el-select--small .el-select__wrapper) { box-shadow: 0 0 0 1px #e3e8ef inset; }
.alert-filter :deep(.el-input--small.is-focus .el-input__wrapper),
.alert-filter :deep(.el-select--small.is-focused .el-select__wrapper) { box-shadow: 0 0 0 1px #4776e6 inset; }
.alert-filter :deep(.el-input__inner) { font-size: 11px; }
.alert-list { flex: 1; overflow: auto; padding: 4px 12px 14px; }

// 卡片
.alert-item { padding: 10px; margin-bottom: 8px; border: 1px solid #e9eef4; border-radius: 7px; background: #fff; cursor: pointer; transition: all .15s; }
.alert-item:hover { border-color: #b9c8e4; background: #f3f7fd; }
.alert-item.active { border-color: #4776e6; background: #f0f5ff; box-shadow: 0 4px 12px rgba(71, 118, 230, .14); }
.alert-item.alert-item--high { border-left: 3px solid #e5636a; }
.alert-item.alert-item--medium { border-left: 3px solid #e6a23c; }
.alert-item.alert-item--low { border-left: 3px solid #67c23a; }

// 卡片内容行
.alert-item__body { display: flex; gap: 10px; align-items: flex-start; }
.alert-item__info { flex: 1; min-width: 0; }

// 照片
.alert-item__photo { flex: none; width: 44px; height: 52px; border-radius: 4px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,.12); }
.alert-item__photo-img { width: 44px; height: 52px; display: block; object-fit: cover; }

// 姓名行
.alert-item__name { display: flex; align-items: center; gap: 6px; margin-bottom: 2px; color: #1f2c44; font-size: 13px; font-weight: 600; }
.alert-item__name .el-tag { transform: scale(.85); transform-origin: left center; }

// 信息行
.alert-item__meta { color: #8595a8; font-size: 11px; line-height: 1.55; }
.alert-item__meta span { display: block; }

// 中间 - 地图（全屏铺满）
.map-panel { position: absolute; z-index: 1; inset: 0; display: flex; min-width: 0; min-height: 0; flex-direction: column; overflow: hidden; border: 0; border-radius: 0; background: transparent; box-shadow: none; }
.map-canvas { position: absolute; inset: 0; min-height: 0; overflow: hidden; background: #dbe7dc; border-radius: 0; }
.map-canvas > img { width: 100%; height: 100%; object-fit: cover; filter: saturate(.66) contrast(.94); }
.map-overlay { position: absolute; inset: 0; background: rgba(220, 236, 222, .12); }
.map-trajectory { display: none; }
.cam-marker { position: absolute; z-index: 3; transform: translate(-50%, -50%); padding: 0; border: 0; background: transparent; cursor: pointer; }
.cam-marker__ring { position: absolute; inset: -5px; border-radius: 50%; background: #5d9bff; opacity: 0; }
.cam-marker__dot { position: relative; display: grid; place-items: center; width: 22px; height: 22px; border: 2px solid #fff; border-radius: 50%; color: #fff; background: #92a4ba; box-shadow: 0 2px 6px rgba(32, 54, 74, .28); transition: transform .15s ease; }
.cam-marker--has-visits .cam-marker__dot { background: #f5222d; }
.cam-marker--has-visits .cam-marker__ring { opacity: .22; background: #f5222d; animation: cam-pulse 1.8s infinite; }
.cam-marker--start .cam-marker__dot,
.cam-marker--start-end .cam-marker__dot { background: #fa8c16; box-shadow: 0 0 0 4px #ffe7ba, 0 2px 6px rgba(32, 54, 74, .28); }
.cam-marker--end .cam-marker__dot,
.cam-marker--start-end .cam-marker__dot { background: #722ed1; box-shadow: 0 0 0 4px #efdbff, 0 2px 6px rgba(32, 54, 74, .28); }
.cam-marker--multi .cam-marker__dot { background: #fa541c; box-shadow: 0 0 0 4px #ffd6c0, 0 2px 6px rgba(32, 54, 74, .28); }
.cam-marker--multi.cam-marker--end .cam-marker__dot { background: #722ed1; box-shadow: 0 0 0 4px #efdbff, 0 2px 6px rgba(32, 54, 74, .28); }
.cam-marker.active .cam-marker__dot { box-shadow: 0 0 0 4px #fff, 0 0 0 6px #4776e6, 0 4px 12px rgba(71, 118, 230, .5); transform: scale(1.15); }
.cam-marker__badge { position: absolute; top: -6px; right: -10px; display: grid; place-items: center; min-width: 18px; height: 18px; padding: 0 5px; color: #fff; background: #f5222d; border-radius: 9px; font-size: 11px; font-weight: 600; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
.cam-marker__chips { position: absolute; top: 26px; left: 50%; display: flex; gap: 2px; padding: 3px 5px; background: rgba(255,255,255,.96); border: 1px solid #d6dde6; border-radius: 12px; transform: translateX(-50%); pointer-events: none; box-shadow: 0 2px 6px rgba(0,0,0,.08); }
.cam-marker__chip { display: inline-grid; place-items: center; min-width: 16px; height: 16px; padding: 0 4px; border-radius: 8px; color: #fff; font-size: 10px; font-weight: 600; background: #4776e6; }
.cam-marker__chip--active { box-shadow: 0 0 0 2px #fff, 0 0 0 3px #4776e6; }
.cam-marker__chip--more { background: #e9eef4; color: #8693a8; font-weight: 500; letter-spacing: 1px; padding: 0 5px; min-width: 18px; }
.cam-marker__label { position: absolute; top: 50px; left: 50%; padding: 2px 6px; background: rgba(255,255,255,.95); border: 1px solid #d6dde6; border-radius: 3px; color: #45566e; font-size: 10px; white-space: nowrap; transform: translateX(-50%); pointer-events: none; }
.cam-marker:hover .cam-marker__label { color: #4776e6; border-color: #4776e6; }

@keyframes cam-pulse { 0%, 100% { transform: scale(.7); opacity: .22; } 50% { transform: scale(1.15); opacity: .45; } }

// 时间线点击后地图 marker 短暂闪烁（蓝色光晕）
.cam-marker--flash .cam-marker__dot { box-shadow: 0 0 0 6px rgba(71, 118, 230, .45), 0 0 0 10px rgba(71, 118, 230, .18), 0 4px 12px rgba(71, 118, 230, .4); }
.cam-marker--flash .cam-marker__ring { opacity: .4; background: #4776e6; animation: flash-ring .5s ease-out 3; }
@keyframes flash-ring { 0% { opacity: .4; transform: scale(.7); } 100% { opacity: 0; transform: scale(1.6); } }

.cam-tooltip { position: absolute; z-index: 12; width: 268px; padding: 0; background: #fff; border: 1px solid #e1e8f0; border-radius: 8px; box-shadow: 0 10px 28px rgba(29, 49, 78, .22); animation: tooltip-in .15s ease; }
.cam-tooltip::before { position: absolute; top: 28px; left: -6px; width: 10px; height: 10px; background: #fff; border-top: 1px solid #e1e8f0; border-left: 1px solid #e1e8f0; content: ''; transform: rotate(-45deg); }
@keyframes tooltip-in { from { opacity: 0; transform: translateY(-4px); } to { opacity: 1; transform: translateY(0); } }
.cam-tooltip header { display: flex; align-items: center; justify-content: space-between; padding: 9px 12px; border-bottom: 1px solid #eef1f5; }
.cam-tooltip__building { color: #4b77df; font-size: 11px; font-weight: 600; }
.cam-tooltip__title { display: flex; align-items: center; gap: 6px; padding: 10px 12px 4px; color: #253a55; font-size: 13px; }
.cam-tooltip__title strong { flex: 1; }
.cam-tooltip__body { padding: 4px 12px 8px; max-height: 280px; overflow-y: auto; }
.cam-tooltip__row { display: flex; justify-content: space-between; margin-top: 4px; color: #7989a0; font-size: 11px; }
.cam-tooltip__row b { color: #253a55; }
.cam-tooltip__visits { margin-top: 10px; padding-top: 8px; border-top: 1px dashed #e3e8ef; }
.cam-tooltip__visits-title { color: #5b6a82; font-size: 10px; margin-bottom: 6px; }
.cam-tooltip__visit { display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; gap: 2px 8px; align-items: center; padding: 6px 8px; margin-bottom: 4px; background: #fbfdfe; border: 1px solid #ebeff5; border-left-width: 3px; border-radius: 4px; cursor: pointer; transition: all .15s; }
.cam-tooltip__visit:hover { background: #f0f5ff; border-color: #b9c8e4; }
.cam-tooltip__visit--active { background: #f0f5ff; border-color: #4776e6; box-shadow: 0 2px 6px rgba(71, 118, 230, .15); }
.cam-tooltip__visit-seq { grid-column: 1; grid-row: 1; color: #4776e6; font-size: 10px; font-weight: 600; }
.cam-tooltip__visit-time { grid-column: 2; grid-row: 1; color: #5b6a82; font-size: 10px; }
.cam-tooltip__visit-sim { grid-column: 1 / span 2; grid-row: 2; display: flex; align-items: center; gap: 6px; color: #253a55; font-size: 10px; }
.cam-tooltip footer { display: flex; gap: 6px; padding: 8px 12px 11px; border-top: 1px solid #eef1f5; justify-content: flex-end; }
.cam-tooltip footer .el-button { padding: 4px 10px; }

.map-legend { position: absolute; z-index: 5; right: 14px; bottom: 14px; display: flex; flex-direction: column; gap: 5px; padding: 9px 11px; background: rgba(255,255,255,.95); border: 1px solid #e1e7ef; border-radius: 6px; box-shadow: 0 3px 12px rgba(45,62,83,.1); }
.map-legend span { display: inline-flex; align-items: center; gap: 6px; color: #5b6a82; font-size: 11px; }
.map-legend .dot { display: inline-block; width: 9px; height: 9px; border-radius: 50%; }
.map-legend .dot--capture { background: #f5222d; }
.map-legend .dot--multi { background: #fa541c; box-shadow: 0 0 0 3px #ffd6c0; }

.map-empty { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; color: #6c7c93; z-index: 1; }
.map-empty .el-icon { color: #9aa5b5; }
.map-empty strong { font-size: 14px; color: #253a55; }
.map-empty span { font-size: 12px; }
.map-empty__steps { display: flex; gap: 8px; margin-top: 12px; }
.map-empty__step { display: inline-flex; align-items: center; gap: 5px; padding: 4px 10px; background: #fff; border: 1px solid #e1e7ef; border-radius: 14px; color: #5b6a82; font-size: 11px; box-shadow: 0 2px 6px rgba(45,62,83,.06); }
.map-empty__step b { display: grid; place-items: center; width: 16px; height: 16px; background: #4776e6; border-radius: 50%; color: #fff; font-size: 10px; font-weight: 600; }

// 右侧 - 详情面板
.detail-panel { position: absolute; z-index: 10; top: 16px; right: 16px; bottom: 16px; display: flex; width: 372px; min-width: 0; flex-direction: column; padding: 0; }
.target-card { display: flex; gap: 12px; padding: 0 16px 14px; border-bottom: 1px solid #eef1f5; }
.target-card--empty { flex-direction: column; align-items: center; justify-content: center; padding: 30px 16px; color: #9aa5b5; font-size: 12px; gap: 8px; }
.target-card__photo { position: relative; flex: none; }
.target-card__photo-img { width: 78px; height: 96px; object-fit: cover; display: block; border-radius: 6px; box-shadow: 0 1px 3px rgba(0,0,0,.15); }
.target-card__badge { position: absolute; top: -5px; right: -5px; padding: 2px 6px; border-radius: 9px; color: #fff; font-size: 10px; font-weight: 600; box-shadow: 0 2px 6px rgba(0,0,0,.2); }
.target-card__badge--high { background: #e5636a; }
.target-card__badge--medium { background: #e6a23c; }
.target-card__badge--low { background: #67c23a; }
.target-card__info { flex: 1; min-width: 0; }
.target-card__info h3 { display: flex; align-items: center; gap: 6px; margin: 0 0 6px; color: #1f2c44; font-size: 15px; }
.target-card__meta { display: flex; flex-direction: column; gap: 3px; color: #8595a8; font-size: 11px; }
.target-card__meta div { display: flex; gap: 8px; }
.target-card__meta span { width: 56px; flex: none; }
.target-card__meta b { color: #253a55; font-weight: 500; }

.target-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1px; margin: 12px 16px; background: #edf0f4; border: 1px solid #edf0f4; border-radius: 7px; overflow: hidden; }
.target-stats__item { display: flex; flex-direction: column; align-items: center; gap: 2px; padding: 9px 4px; background: #fff; }
.target-stats__item b { color: #4776e6; font-size: 17px; font-weight: 600; }
.target-stats__item span { color: #5b6a82; font-size: 11px; }
.target-stats__item small { color: #a2aebb; font-size: 10px; }

.timeline-header { display: flex; align-items: baseline; justify-content: space-between; padding: 14px 16px 4px; }
.timeline-header h3 { margin: 0; color: #1f2c44; font-size: 14px; }
.timeline-header span { color: #9aa5b5; font-size: 11px; }
.timeline { flex: 1; min-height: 0; overflow: auto; padding: 0 16px 4px; }
.timeline :deep(.el-timeline) { padding-left: 6px; }
.timeline :deep(.el-timeline-item__wrapper) { top: -2px; }
.timeline :deep(.el-timeline-item__timestamp) { color: #5b6a82; font-size: 11px; }
.timeline-point { display: flex; align-items: center; gap: 8px; padding: 8px 10px; margin-bottom: 6px; border: 1px solid #ebeff5; border-radius: 6px; background: #fbfdfe; cursor: pointer; transition: all .15s; }
.timeline-point:hover { border-color: #b9c8e4; background: #f3f7fd; }
.timeline-point--active { border-color: #4776e6; background: #f0f5ff; box-shadow: 0 2px 8px rgba(71, 118, 230, .15); }
.timeline-point__name { flex: 1; min-width: 0; color: #1f2c44; font-size: 12px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.timeline-point__sim { flex: none; font-style: normal; font-size: 11px; font-weight: 600; color: #4776e6; }
.timeline-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 30px 16px; color: #9aa5b5; font-size: 12px; }
.timeline-empty .el-icon { color: #b9c4d2; }

// 抓拍预览抽屉
.preview-drawer__title { font-size: 15px; font-weight: 600; color: #1f2c44; }
.preview-dialog { display: flex; flex-direction: column; gap: 14px; }
.preview-dialog__photo { position: relative; height: 220px; border-radius: 8px; overflow: hidden; background: #1a1a2e; }
.preview-dialog__photo-img { width: 100%; height: 100%; object-fit: cover; opacity: .85; }
.preview-dialog__overlay { position: absolute; top: 12px; left: 12px; right: 12px; display: flex; justify-content: space-between; color: #fff; font-size: 12px; pointer-events: none; }
.preview-dialog__seq { padding: 4px 10px; background: rgba(245, 34, 45, .85); border-radius: 4px; font-weight: 600; }
.preview-dialog__similarity { padding: 4px 10px; background: rgba(0,0,0,.55); border-radius: 4px; }
.preview-dialog__desc :deep(.el-descriptions__label) { width: 80px; color: #7989a0; }
.preview-dialog__desc :deep(.el-descriptions__content) { color: #253a55; }

@media (max-width: 1380px) { .alert-panel { width: 280px; } .detail-panel { width: 340px; } }
@media (max-width: 1180px) { .alert-panel { width: 252px; } .detail-panel { width: 312px; } .target-card { padding: 0 12px 12px; } .target-stats { margin: 10px 12px; } .timeline-header { padding: 12px 12px 4px; } .timeline { padding: 0 12px 4px; } .cam-marker__chips { font-size: 9px; } }
@media (max-width: 980px) { .alert-panel { width: 232px; } .detail-panel { width: 290px; } }
@media (max-width: 760px) { .trajectory-page { min-height: 100%; } .alert-panel { top: 10px; right: 10px; bottom: auto; left: 10px; width: auto; max-height: 38vh; } .detail-panel { top: auto; right: 10px; bottom: 10px; left: 10px; width: auto; max-height: 42vh; } }
</style>

.panel-title--action { padding: 14px 18px 6px; border-bottom: 1px solid #edf0f5; }
.panel-title--action .el-button { font-size: 12px; padding: 4px 8px; }
