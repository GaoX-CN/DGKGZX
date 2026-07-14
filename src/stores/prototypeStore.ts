import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { PrototypePage, PrototypeModule } from '@/types/prototype'

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
  const pages = ref<PrototypePage[]>([...defaultPages])
  const currentPageId = ref<string>('')
  const currentModuleId = ref<string>('')

  const currentPage = computed(() =>
    findPageById(pages.value, currentPageId.value)
  )

  const currentPageName = computed(() => {
    if (!currentPageId.value || currentPageId.value === 'Welcome') return 'Prototype Workspace'
    const page = findPageById(pages.value, currentPageId.value)
    return page?.pageName || 'Prototype Workspace'
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
  }

  function setCurrentPage(pageId: string) {
    currentPageId.value = pageId
  }

  function setCurrentModule(moduleId: string) {
    currentModuleId.value = moduleId
  }

  return {
    pages,
    currentPageId,
    currentModuleId,
    currentPage,
    currentPageName,
    currentModule,
    setPages,
    addPage,
    setCurrentPage,
    setCurrentModule,
  }
})
