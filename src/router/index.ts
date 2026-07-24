import { createRouter, createWebHistory } from 'vue-router'
import DefaultLayout from '@/layouts/DefaultLayout.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: DefaultLayout,
      redirect: '/welcome',
      children: [
        {
          path: '/welcome',
          name: 'Welcome',
          component: () => import('@/pages/Welcome/WelcomePage.vue'),
        },
        {
          path: '/park/maintenance-vehicle',
          name: 'MaintenanceVehicle',
          component: () => import('@/pages/park/MaintenanceVehicle.vue'),
        },
        {
          path: '/security/people-flow',
          name: 'PeopleFlowReport',
          component: () => import('@/pages/security/PeopleFlowReport.vue'),
        },
        {
          path: '/security/personnel-trajectory',
          name: 'PersonnelTrajectory',
          component: () => import('@/pages/security/PersonnelTrajectory.vue'),
        },
        {
          path: '/security/emergency-route',
          name: 'EmergencyRoute',
          component: () => import('@/pages/security/EmergencyRoute.vue'),
        },
        {
          path: '/emergency/operation-standardization',
          name: 'OperationStandardization',
          component: () => import('@/pages/emergency/OperationStandardization.vue'),
        },
        {
          path: '/emergency/manuals',
          name: 'EmergencyManual',
          component: () => import('@/pages/emergency/EmergencyManual.vue'),
        },
        {
          path: '/security/access-linkage',
          name: 'AccessLinkage',
          component: () => import('@/pages/security/AccessLinkage.vue'),
        },
        {
          path: '/security/barrier-linkage',
          name: 'BarrierLinkage',
          component: () => import('@/pages/security/BarrierLinkage.vue'),
        },
        {
          path: '/security/lighting-linkage',
          name: 'LightingLinkage',
          component: () => import('@/pages/security/LightingLinkage.vue'),
        },
        {
          path: '/security/radio-intercom-linkage',
          name: 'RadioIntercomLinkage',
          component: () => import('@/pages/security/RadioIntercomLinkage.vue'),
        },
        {
          path: '/security/information-publishing-linkage',
          name: 'InformationPublishingLinkage',
          component: () => import('@/pages/security/InformationPublishingLinkage.vue'),
        },
        {
          path: '/security/digital-broadcast-linkage',
          name: 'DigitalBroadcastLinkage',
          component: () => import('@/pages/security/DigitalBroadcastLinkage.vue'),
        },
        {
          path: '/facility/repair-management',
          name: 'RepairManagement',
          component: () => import('@/pages/facility/RepairManagement.vue'),
        },
        {
          path: '/facility/inspection/items',
          name: 'InspectionItems',
          component: () => import('@/pages/facility/inspection/InspectionItems.vue'),
        },
        {
          path: '/facility/inspection/plans',
          name: 'InspectionPlans',
          component: () => import('@/pages/facility/inspection/InspectionPlans.vue'),
        },
        {
          path: '/facility/inspection/teams',
          name: 'InspectionTeams',
          component: () => import('@/pages/facility/inspection/InspectionTeams.vue'),
        },
        {
          path: '/facility/inspection/orders',
          name: 'InspectionOrders',
          component: () => import('@/pages/facility/inspection/InspectionOrders.vue'),
        },
      ],
    },
  ],
})

export default router
