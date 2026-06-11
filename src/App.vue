<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { useContractStore } from '@/stores/contract'
import dayjs from 'dayjs'

const route = useRoute()
const router = useRouter()
const contractStore = useContractStore()

const activeMenu = ref('/contracts')
const currentTime = ref(dayjs().format('YYYY年MM月DD日 HH:mm:ss'))
const pendingReminders = ref<any[]>([])

onMounted(() => {
  activeMenu.value = route.path
  loadStats()
  loadPendingReminders()
  setInterval(() => {
    currentTime.value = dayjs().format('YYYY年MM月DD日 HH:mm:ss')
  }, 1000)
})

async function loadStats() {
  await contractStore.fetchStats()
}

async function loadPendingReminders() {
  try {
    pendingReminders.value = await window.api.reminder.getPending()
  } catch (e) {
    console.error('Failed to load reminders:', e)
  }
}

function handleMenuSelect(index: string) {
  activeMenu.value = index
  router.push(index)
}

function goBack() {
  router.back()
}

const showBack = computed(() => route.path.startsWith('/contracts/') && route.params.id)

const pendingCount = computed(() => pendingReminders.value.length)

async function exportMonthlyLedger() {
  const now = dayjs()
  try {
    const result = await window.api.export.monthlyLedger(now.year(), now.month() + 1)
    if (result?.success) {
      ElMessage.success(`导出成功，共 ${result.count} 条记录`)
    }
  } catch (e) {
    ElMessage.error('导出失败')
  }
}

async function exportExpiringList() {
  try {
    const result = await window.api.export.expiringList()
    if (result?.success) {
      ElMessage.success(`导出成功，共 ${result.count} 条记录`)
    }
  } catch (e) {
    ElMessage.error('导出失败')
  }
}
</script>

<template>
  <el-container class="el-container">
    <el-aside width="220px">
      <div class="logo">
        <el-icon><Document /></el-icon>
        <span>合同台账</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        background-color="#001529"
        text-color="rgba(255,255,255,0.65)"
        active-text-color="#fff"
        @select="handleMenuSelect"
      >
        <el-menu-item index="/contracts">
          <el-icon><List /></el-icon>
          <span>合同列表</span>
        </el-menu-item>
        <el-menu-item index="/assets">
          <el-icon><Goods /></el-icon>
          <span>资产关联</span>
        </el-menu-item>
        <el-menu-item index="/payments">
          <el-icon><Wallet /></el-icon>
          <span>付款计划</span>
        </el-menu-item>
        <el-menu-item index="/reminders">
          <el-icon><BellFilled /></el-icon>
          <span>提醒中心</span>
          <el-badge v-if="pendingCount > 0" :value="pendingCount" class="ml-2" :max="99" />
        </el-menu-item>
      </el-menu>

      <div class="mt-4 px-4">
        <el-divider style="border-color: rgba(255,255,255,0.1)" />
        <div class="text-xs text-gray-400 mb-2">数据导出</div>
        <el-button size="small" type="primary" @click="exportMonthlyLedger" class="w-full mb-2">
          <el-icon><Download /></el-icon>
          月度台账
        </el-button>
        <el-button size="small" type="warning" @click="exportExpiringList" class="w-full">
          <el-icon><Clock /></el-icon>
          到期清单
        </el-button>
      </div>
    </el-aside>

    <el-container>
      <el-header>
        <div class="flex items-center gap-3">
          <el-button v-if="showBack" text @click="goBack">
            <el-icon><ArrowLeft /></el-icon>
            返回
          </el-button>
          <span class="text-lg font-medium">
            {{ route.path.startsWith('/contracts/') ? '合同详情' : 
               route.path === '/contracts' ? '合同列表' :
               route.path === '/assets' ? '资产关联' :
               route.path === '/payments' ? '付款计划' :
               route.path === '/reminders' ? '提醒中心' : '' }}
          </span>
        </div>
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <el-icon><Calendar /></el-icon>
            {{ currentTime }}
          </div>
          <el-dropdown>
            <div class="flex items-center gap-2 cursor-pointer">
              <el-avatar :size="32" style="background: #1890ff">
                <el-icon><UserFilled /></el-icon>
              </el-avatar>
              <span class="text-sm">管理员</span>
            </div>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item>个人设置</el-dropdown-item>
                <el-dropdown-item divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main>
        <div v-if="contractStore.stats && route.path === '/contracts'" class="mb-4">
          <el-row :gutter="16">
            <el-col :span="4">
              <div class="stats-card">
                <div class="stats-value">{{ contractStore.stats.total }}</div>
                <div class="stats-label">合同总数</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stats-card success">
                <div class="stats-value">{{ contractStore.stats.active }}</div>
                <div class="stats-label">执行中</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stats-card warning">
                <div class="stats-value">{{ contractStore.stats.pending }}</div>
                <div class="stats-label">待执行</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stats-card info">
                <div class="stats-value">{{ contractStore.stats.completed }}</div>
                <div class="stats-label">已完成</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stats-card danger">
                <div class="stats-value">{{ contractStore.stats.expiring_30d }}</div>
                <div class="stats-label">30天内到期</div>
              </div>
            </el-col>
            <el-col :span="4">
              <div class="stats-card">
                <div class="stats-value amount-format">¥{{ (contractStore.stats.total_amount / 10000).toFixed(0) }}万</div>
                <div class="stats-label">合同总金额</div>
              </div>
            </el-col>
          </el-row>
        </div>

        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.ml-2 {
  margin-left: 8px;
}

.mt-4 {
  margin-top: 16px;
}

.px-4 {
  padding-left: 16px;
  padding-right: 16px;
}

.text-xs {
  font-size: 12px;
}

.text-gray-400 {
  color: rgba(255, 255, 255, 0.4);
}

.w-full {
  width: 100%;
}

.mb-2 {
  margin-bottom: 8px;
}

.flex {
  display: flex;
}

.items-center {
  align-items: center;
}

.gap-2 {
  gap: 8px;
}

.gap-3 {
  gap: 12px;
}

.gap-6 {
  gap: 24px;
}

.text-lg {
  font-size: 18px;
}

.font-medium {
  font-weight: 500;
}

.text-sm {
  font-size: 14px;
}

.text-gray-600 {
  color: #666;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
