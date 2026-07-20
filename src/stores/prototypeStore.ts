import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import initialPageMetadata from '@/data/prototype-page-metadata.json'
import type {
  PrototypeDesignStatus,
  PrototypePage,
  PrototypePageMetadata,
  PrototypePageMetadataFile,
  PrototypeVersionRecord,
} from '@/types/prototype'

const defaultPages: PrototypePage[] = [
  {
    pageId: 'Welcome',
    pageName: 'Welcome',
    pagePath: '/welcome',
    modules: [
      {
        moduleId: 'module-status',
        moduleName: '当前工作区状态',
        moduleType: 'card',
        pageId: 'Welcome',
        requirementId: 'req-status',
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        props: {},
      },
      {
        moduleId: 'module-next-step',
        moduleName: '下一步操作',
        moduleType: 'card',
        pageId: 'Welcome',
        requirementId: 'req-next-step',
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        props: {},
      },
      {
        moduleId: 'module-recent',
        moduleName: '最近页面',
        moduleType: 'card',
        pageId: 'Welcome',
        requirementId: 'req-recent',
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        props: {},
      },
      {
        moduleId: 'module-ai',
        moduleName: 'AI 功能',
        moduleType: 'card',
        pageId: 'Welcome',
        requirementId: 'req-ai',
        bounds: { x: 0, y: 0, width: 0, height: 0 },
        props: {},
      },
    ],
  },
  {
    pageId: '便捷通行',
    pageName: '便捷通行',
    isFolder: true,
    children: [
      {
        pageId: 'MaintenanceVehicle',
        pageName: '维修车辆登记',
        pagePath: '/park/maintenance-vehicle',
        modules: [
          {
            moduleId: 'mv-search',
            moduleName: '搜索栏',
            moduleType: 'form',
            pageId: 'MaintenanceVehicle',
            requirementId: 'mv-search',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
          {
            moduleId: 'mv-actions',
            moduleName: '操作栏',
            moduleType: 'toolbar',
            pageId: 'MaintenanceVehicle',
            requirementId: 'mv-actions',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
          {
            moduleId: 'mv-table',
            moduleName: '记录列表',
            moduleType: 'table',
            pageId: 'MaintenanceVehicle',
            requirementId: 'mv-table',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
          {
            moduleId: 'mv-dialog',
            moduleName: '新增/编辑弹窗',
            moduleType: 'form',
            pageId: 'MaintenanceVehicle',
            requirementId: 'mv-dialog',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
        ],
      },
    ],
  },
  {
    pageId: '综合安防',
    pageName: '综合安防',
    isFolder: true,
    children: [
      {
        pageId: 'PeopleFlowReport',
        pageName: '人流报表',
        pagePath: '/security/people-flow',
        modules: [
          {
            moduleId: 'pfr-tree',
            moduleName: '空间结构树',
            moduleType: 'unknown',
            pageId: 'PeopleFlowReport',
            requirementId: 'pfr-tree',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
          {
            moduleId: 'pfr-stats',
            moduleName: '统计卡片',
            moduleType: 'card',
            pageId: 'PeopleFlowReport',
            requirementId: 'pfr-stats',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
          {
            moduleId: 'pfr-table',
            moduleName: '统计明细表',
            moduleType: 'table',
            pageId: 'PeopleFlowReport',
            requirementId: 'pfr-table',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
          {
            moduleId: 'pfr-chart',
            moduleName: '人流趋势图',
            moduleType: 'chart',
            pageId: 'PeopleFlowReport',
            requirementId: 'pfr-chart',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
        ],
      },
      {
        pageId: 'EmergencyRoute',
        pageName: '应急逃生路线',
        pagePath: '/security/emergency-route',
        modules: [
          {
            moduleId: 'er-search',
            moduleName: '查询栏',
            moduleType: 'form',
            pageId: 'EmergencyRoute',
            requirementId: 'er-search',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
          {
            moduleId: 'er-list',
            moduleName: '路线列表',
            moduleType: 'table',
            pageId: 'EmergencyRoute',
            requirementId: 'er-list',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
          {
            moduleId: 'er-dialog',
            moduleName: '路线配置弹窗',
            moduleType: 'form',
            pageId: 'EmergencyRoute',
            requirementId: 'er-dialog',
            bounds: { x: 0, y: 0, width: 0, height: 0 },
            props: {},
          },
        ],
      },
      {
        pageId: '应急联动',
        pageName: '应急联动',
        isFolder: true,
        children: [
          {
            pageId: 'AccessLinkage',
            pageName: '门禁联动',
            pagePath: '/security/access-linkage',
            modules: [
              { moduleId: 'al-overview', moduleName: '联动概览', moduleType: 'card', pageId: 'AccessLinkage', requirementId: 'al-overview', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'al-map', moduleName: '园区门禁地图', moduleType: 'unknown', pageId: 'AccessLinkage', requirementId: 'al-map', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'al-events', moduleName: '联动事件列表', moduleType: 'table', pageId: 'AccessLinkage', requirementId: 'al-events', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'al-detail', moduleName: '联动处置详情', moduleType: 'form', pageId: 'AccessLinkage', requirementId: 'al-detail', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'BarrierLinkage',
            pageName: '道闸联动',
            pagePath: '/security/barrier-linkage',
            modules: [
              { moduleId: 'bl-overview', moduleName: '联动概览', moduleType: 'card', pageId: 'BarrierLinkage', requirementId: 'bl-overview', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'bl-map', moduleName: '园区道闸地图', moduleType: 'unknown', pageId: 'BarrierLinkage', requirementId: 'bl-map', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'bl-events', moduleName: '联动事件列表', moduleType: 'table', pageId: 'BarrierLinkage', requirementId: 'bl-events', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'bl-detail', moduleName: '联动处置详情', moduleType: 'form', pageId: 'BarrierLinkage', requirementId: 'bl-detail', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'LightingLinkage',
            pageName: '照明联动',
            pagePath: '/security/lighting-linkage',
            modules: [
              { moduleId: 'll-distribution', moduleName: '照明分布与批量控制', moduleType: 'unknown', pageId: 'LightingLinkage', requirementId: 'll-distribution', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'll-map', moduleName: '地图照明快捷控制', moduleType: 'unknown', pageId: 'LightingLinkage', requirementId: 'll-map', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'll-log', moduleName: '操作日志审计', moduleType: 'table', pageId: 'LightingLinkage', requirementId: 'll-log', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'RadioIntercomLinkage',
            pageName: '无线对讲联动',
            pagePath: '/security/radio-intercom-linkage',
            modules: [
              { moduleId: 'ril-terminals', moduleName: '终端库存与单点交互', moduleType: 'unknown', pageId: 'RadioIntercomLinkage', requirementId: 'ril-terminals', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ril-map', moduleName: '无线终端空间监控', moduleType: 'unknown', pageId: 'RadioIntercomLinkage', requirementId: 'ril-map', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ril-groups', moduleName: '对讲群组管理', moduleType: 'unknown', pageId: 'RadioIntercomLinkage', requirementId: 'ril-groups', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ril-dialogs', moduleName: '呼叫、视频与消息弹窗', moduleType: 'form', pageId: 'RadioIntercomLinkage', requirementId: 'ril-dialogs', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'InformationPublishingLinkage',
            pageName: '信息发布联动',
            pagePath: '/security/information-publishing-linkage',
            modules: [
              { moduleId: 'ipl-terminals', moduleName: '信息终端选择', moduleType: 'unknown', pageId: 'InformationPublishingLinkage', requirementId: 'ipl-terminals', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ipl-map', moduleName: '信息终端地图', moduleType: 'unknown', pageId: 'InformationPublishingLinkage', requirementId: 'ipl-map', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ipl-monitor', moduleName: '发布状态监控', moduleType: 'card', pageId: 'InformationPublishingLinkage', requirementId: 'ipl-monitor', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ipl-composer', moduleName: '信息发布配置', moduleType: 'form', pageId: 'InformationPublishingLinkage', requirementId: 'ipl-composer', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'DigitalBroadcastLinkage',
            pageName: '数字广播联动',
            pagePath: '/security/digital-broadcast-linkage',
            modules: [
              { moduleId: 'dbl-zones', moduleName: '广播分区选择', moduleType: 'unknown', pageId: 'DigitalBroadcastLinkage', requirementId: 'dbl-zones', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'dbl-map', moduleName: '广播终端地图', moduleType: 'unknown', pageId: 'DigitalBroadcastLinkage', requirementId: 'dbl-map', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'dbl-intercom', moduleName: '喊话台控制', moduleType: 'card', pageId: 'DigitalBroadcastLinkage', requirementId: 'dbl-intercom', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'dbl-queue', moduleName: '终端队列', moduleType: 'unknown', pageId: 'DigitalBroadcastLinkage', requirementId: 'dbl-queue', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
        ],
      },
      {
        pageId: '应急知识库',
        pageName: '应急知识库',
        isFolder: true,
        children: [
          {
            pageId: 'OperationStandardization',
            pageName: '作业标准化',
            pagePath: '/emergency/operation-standardization',
            modules: [
              { moduleId: 'os-category', moduleName: '事件分类', moduleType: 'unknown', pageId: 'OperationStandardization', requirementId: 'os-category', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'os-list', moduleName: '规范列表', moduleType: 'table', pageId: 'OperationStandardization', requirementId: 'os-list', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'os-editor', moduleName: '规范维护', moduleType: 'form', pageId: 'OperationStandardization', requirementId: 'os-editor', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'os-detail', moduleName: '规范详情', moduleType: 'unknown', pageId: 'OperationStandardization', requirementId: 'os-detail', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'EmergencyManual',
            pageName: '应急处理手册',
            pagePath: '/emergency/manuals',
            modules: [
              { moduleId: 'em-filter', moduleName: '手册检索', moduleType: 'form', pageId: 'EmergencyManual', requirementId: 'em-filter', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'em-library', moduleName: '手册库', moduleType: 'table', pageId: 'EmergencyManual', requirementId: 'em-library', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'em-editor', moduleName: '手册与材料维护', moduleType: 'form', pageId: 'EmergencyManual', requirementId: 'em-editor', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'em-preview', moduleName: '手册预览', moduleType: 'unknown', pageId: 'EmergencyManual', requirementId: 'em-preview', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
        ],
      },
    ],
  },
  {
    pageId: '设备设施',
    pageName: '设备设施',
    isFolder: true,
    children: [
      {
        pageId: 'RepairManagement',
        pageName: '报修管理',
        pagePath: '/facility/repair-management',
        modules: [
          { moduleId: 'rm-search', moduleName: '搜索栏', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-search', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-table', moduleName: '报修工单列表', moduleType: 'table', pageId: 'RepairManagement', requirementId: 'rm-table', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-create', moduleName: '新建报修', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-create', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-edit', moduleName: '编辑报修单', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-edit', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-check', moduleName: '下发核查单', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-check', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-plan', moduleName: '提交维修方案', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-plan', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-plan-audit', moduleName: '审核维修方案', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-plan-audit', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-dispatch', moduleName: '下发维修工单', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-dispatch', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-detail', moduleName: '报修单详情', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-detail', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
          { moduleId: 'rm-abnormal', moduleName: '巡检异常设备', moduleType: 'form', pageId: 'RepairManagement', requirementId: 'rm-abnormal', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
        ],
      },
      {
        pageId: '设备巡检',
        pageName: '设备巡检',
        isFolder: true,
        children: [
          {
            pageId: 'InspectionItems',
            pageName: '巡检项管理',
            pagePath: '/facility/inspection/items',
            modules: [
              { moduleId: 'ii-type-list', moduleName: '设备类型列表', moduleType: 'unknown', pageId: 'InspectionItems', requirementId: 'ii-type-list', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ii-table', moduleName: '巡检项列表', moduleType: 'table', pageId: 'InspectionItems', requirementId: 'ii-table', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ii-dialog', moduleName: '新增/编辑弹窗', moduleType: 'form', pageId: 'InspectionItems', requirementId: 'ii-dialog', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'InspectionPlans',
            pageName: '巡检计划管理',
            pagePath: '/facility/inspection/plans',
            modules: [
              { moduleId: 'ip-search', moduleName: '搜索栏', moduleType: 'form', pageId: 'InspectionPlans', requirementId: 'ip-search', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ip-table', moduleName: '计划列表', moduleType: 'table', pageId: 'InspectionPlans', requirementId: 'ip-table', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'ip-drawer', moduleName: '新增/编辑抽屉', moduleType: 'form', pageId: 'InspectionPlans', requirementId: 'ip-drawer', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'InspectionOrders',
            pageName: '巡检工单管理',
            pagePath: '/facility/inspection/orders',
            modules: [
              { moduleId: 'io-search', moduleName: '搜索栏', moduleType: 'form', pageId: 'InspectionOrders', requirementId: 'io-search', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'io-table', moduleName: '工单列表', moduleType: 'table', pageId: 'InspectionOrders', requirementId: 'io-table', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'io-handle', moduleName: '处置抽屉', moduleType: 'form', pageId: 'InspectionOrders', requirementId: 'io-handle', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
          {
            pageId: 'InspectionTeams',
            pageName: '设备班组管理',
            pagePath: '/facility/inspection/teams',
            modules: [
              { moduleId: 'it-search', moduleName: '搜索栏', moduleType: 'form', pageId: 'InspectionTeams', requirementId: 'it-search', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'it-table', moduleName: '班组列表', moduleType: 'table', pageId: 'InspectionTeams', requirementId: 'it-table', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
              { moduleId: 'it-drawer', moduleName: '新增/编辑抽屉', moduleType: 'form', pageId: 'InspectionTeams', requirementId: 'it-drawer', bounds: { x: 0, y: 0, width: 0, height: 0 }, props: {} },
            ],
          },
        ],
      },
    ],
  },
]

export const usePrototypeStore = defineStore('prototype', () => {
  const pages = ref<PrototypePage[]>(filterPagesForEnvironment(defaultPages))
  const pageMetadata = ref<PrototypePageMetadataFile>(normalizeMetadata(initialPageMetadata))
  const currentPageId = ref<string>('')
  const currentModuleId = ref<string>('')

  const currentPage = computed(() =>
    findPageById(pages.value, currentPageId.value)
  )

  const currentPageName = computed(() => {
    if (!currentPageId.value || currentPageId.value === 'Welcome') return 'Prototype Workspace'
    const page = findPageById(pages.value, currentPageId.value)
    return page ? `${page.pageName}（${page.pageId}）` : 'Prototype Workspace'
  })

  const currentModule = computed(() =>
    currentPage.value?.modules?.find((m) => m.moduleId === currentModuleId.value) ?? null
  )

  function findPageById(list: PrototypePage[], id: string): PrototypePage | null {
    for (const page of list) {
      if (page.pageId === id) return page
      if (page.children) {
        const found = findPageById(page.children, id)
        if (found) return found
      }
    }
    return null
  }

  function setPages(newPages: PrototypePage[]) {
    pages.value = newPages
  }

  function addPage(page: PrototypePage) {
    pages.value.push(page)
    if (page.isFolder || pageMetadata.value.pages[page.pageId]) return

    pageMetadata.value.pages[page.pageId] = {
      status: 'designing',
      versions: [
        {
          version: 1,
          createdAt: new Date().toISOString(),
          description: '初始创建页面',
        },
      ],
    }
    void savePageMetadata()
  }

  function setCurrentPage(pageId: string) {
    currentPageId.value = pageId
  }

  function setCurrentModule(moduleId: string) {
    currentModuleId.value = moduleId
  }

  function getPageMetadata(pageId: string): PrototypePageMetadata {
    const metadata = pageMetadata.value.pages[pageId]
    return {
      status: metadata?.status === 'completed' ? 'completed' : 'designing',
      versions: Array.isArray(metadata?.versions) ? metadata.versions : [],
    }
  }

  async function loadPageMetadata() {
    if (!import.meta.env.DEV) return

    try {
      const response = await fetch('/api/prototype-page-metadata')
      if (response.ok) {
        pageMetadata.value = normalizeMetadata(await response.json())
      }
    } catch {
      // The bundled metadata remains available if the development API is unavailable.
    }
  }

  async function setPageStatus(pageId: string, status: PrototypeDesignStatus) {
    const metadata = getPageMetadata(pageId)
    pageMetadata.value.pages[pageId] = { ...metadata, status }
    await savePageMetadata()
  }

  async function addVersionRecord(pageId: string, description: string) {
    const metadata = getPageMetadata(pageId)
    const nextVersion = Math.max(0, ...metadata.versions.map((record) => record.version)) + 1
    const record: PrototypeVersionRecord = {
      version: nextVersion,
      createdAt: new Date().toISOString(),
      description,
    }
    pageMetadata.value.pages[pageId] = {
      ...metadata,
      versions: [record, ...metadata.versions],
    }
    await savePageMetadata()
  }

  async function savePageMetadata() {
    if (!import.meta.env.DEV) return

    const response = await fetch('/api/prototype-page-metadata', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pageMetadata.value),
    })
    if (!response.ok) {
      throw new Error('保存页面元数据失败')
    }
  }

  return {
    pages,
    currentPageId,
    currentModuleId,
    currentPage,
    currentPageName,
    currentModule,
    pageMetadata,
    setPages,
    addPage,
    setCurrentPage,
    setCurrentModule,
    getPageMetadata,
    loadPageMetadata,
    setPageStatus,
    addVersionRecord,
  }
})

function normalizeMetadata(data: unknown): PrototypePageMetadataFile {
  const candidate = data as Partial<PrototypePageMetadataFile> | null
  return {
    pages: candidate?.pages && typeof candidate.pages === 'object' ? candidate.pages : {},
  }
}

function filterPagesForEnvironment(sourcePages: PrototypePage[]): PrototypePage[] {
  if (import.meta.env.DEV) return sourcePages

  return sourcePages.flatMap((page) => {
    if (page.isFolder) {
      const children = filterPagesForEnvironment(page.children || [])
      return children.length > 0 ? [{ ...page, children }] : []
    }

    const metadata = initialPageMetadata.pages[page.pageId as keyof typeof initialPageMetadata.pages]
    return metadata?.status === 'completed' ? [page] : []
  })
}
