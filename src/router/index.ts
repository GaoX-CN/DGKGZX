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
          path: '/security/emergency-route',
          name: 'EmergencyRoute',
          component: () => import('@/pages/security/EmergencyRoute.vue'),
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
