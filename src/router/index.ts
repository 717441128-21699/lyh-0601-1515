import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/contracts'
  },
  {
    path: '/contracts',
    name: 'ContractList',
    component: () => import('@/views/ContractList.vue')
  },
  {
    path: '/contracts/:id',
    name: 'ContractDetail',
    component: () => import('@/views/ContractDetail.vue')
  },
  {
    path: '/assets',
    name: 'AssetList',
    component: () => import('@/views/AssetList.vue')
  },
  {
    path: '/payments',
    name: 'PaymentList',
    component: () => import('@/views/PaymentList.vue')
  },
  {
    path: '/reminders',
    name: 'ReminderCenter',
    component: () => import('@/views/ReminderCenter.vue')
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
