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

const previewDialogVisible = ref(false)
const previewLoading = ref(false)
const previewData = ref<any[]>([])
const previewForm = reactive({
  year: dayjs().year(),
  month: dayjs().month() + 1,
  status: [] as string[],
  manager: '',
  assetCategory: ''
})

const allManagers = ref<string[]>([])
const allCategories = ref<string[]>([])
const allStatuses = [
  { value: 'active', label: '执行中' },
  { value: 'pending', label: '待执行' },
  { value: 'completed', label: '已完成' },
  { value: 'expired', label: '已过期' },
  { value: 'terminated', label: '已终止' }
]

const previewCount = computed(() => previewData.value.length)
const previewTotalAmount = computed(() => {
  return previewData.value.reduce((sum, item) => sum + (item.amount || 0), 0)
})

onMounted(() => {
  activeMenu.value = route.path
  loadStats()
  loadPendingReminders()
  loadFilterOptions()
  setInterval(() => {
    currentTime.value = dayjs().format('YYYY年MM月DD日 HH:mm:ss')
  }, 1000)
})

async function loadFilterOptions() {
  try {
    const contracts = await window.api.contract.list(1, 9999)
    const managers = new Set<string>()
    contracts.list.forEach((c: any) => {
      if (c.manager) managers.add(c.manager)
    })
    allManagers.value = Array.from(managers).sort()
    
    const assets = await window.api.asset.list(1, 9999)
    const categories = new Set<string>()
    assets.list.forEach((a: any) => {
      if (a.category) categories.add(a.category)
    })
    allCategories.value = Array.from(categories).sort()
  } catch (e) {
    console.error('Failed to load filter options:', e)
  }
}

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

function exportMonthlyLedger() {
  previewForm.year = dayjs().year()
  previewForm.month = dayjs().month() + 1
  previewForm.status = []
  previewForm.manager = ''
  previewForm.assetCategory = ''
  previewData.value = []
  previewDialogVisible.value = true
}

async function handlePreview() {
  previewLoading.value = true
  try {
    const filters = {
      status: previewForm.status.length > 0 ? previewForm.status : undefined,
      manager: previewForm.manager || undefined,
      assetCategory: previewForm.assetCategory || undefined
    }
    
    const result = await window.api.export.previewMonthlyLedger(
      previewForm.year, 
      previewForm.month, 
      filters
    )
    
    if (result?.success) {
      previewData.value = result.data || []
      if (previewData.value.length === 0) {
        ElMessage.info('当前筛选条件下无数据')
      }
    }
  } catch (e) {
    ElMessage.error('预览失败')
    console.error(e)
  } finally {
    previewLoading.value = false
  }
}

async function confirmExport() {
  if (previewData.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }
  
  try {
    const filters = {
      status: previewForm.status.length > 0 ? previewForm.status : undefined,
      manager: previewForm.manager || undefined,
      assetCategory: previewForm.assetCategory || undefined
    }
    
    const result = await window.api.export.monthlyLedger(
      previewForm.year, 
      previewForm.month, 
      filters
    )
    
    if (result?.success) {
      ElMessage.success(`导出成功，共 ${result.count} 条记录')
      previewDialogVisible.value = false
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

function getStatusLabel(status: string) {
  const map: Record<string, string> = {
    active: '执行中',
    pending: '待执行',
    completed: '已完成',
    expired: '已过期',
    terminated: '已终止'
  }
  return map[status] || status
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

  <el-dialog
    v-model="previewDialogVisible"
    title="月度台账导出预览"
    width="900px"
    :close-on-click-modal="false"
    destroy-on-close
  >
    <div class="preview-filter">
      <el-form :inline="true" :model="previewForm" label-width="80px">
        <el-form-item label="月份">
          <el-date-picker
            v-model="previewForm"
            type="month"
            value-format="YYYY-MM"
            :model-value="`${previewForm.year}-${String(previewForm.month).padStart(2, '0')}`"
            @update:model-value="(val: string) => {
              const [y, m] = val.split('-');
              previewForm.year = parseInt(y);
              previewForm.month = parseInt(m);
            }"
            placeholder="选择月份"
            style="width: 180px"
          />
        </el-form-item>
        <el-form-item label="状态">
          <el-select
            v-model="previewForm.status"
            multiple
            placeholder="选择状态（多选）"
            style="width: 220px"
          >
            <el-option
              v-for="s in allStatuses"
              :key="s.value"
              :label="s.label"
              :value="s.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="负责人">
          <el-select
            v-model="previewForm.manager"
            clearable
            placeholder="选择负责人"
            style="width: 150px"
          >
            <el-option
              v-for="m in allManagers"
              :key="m"
              :label="m"
              :value="m"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="资产类别">
          <el-select
            v-model="previewForm.assetCategory"
            clearable
            placeholder="选择资产类别"
            style="width: 150px"
          >
            <el-option
              v-for="c in allCategories"
              :key="c"
              :label="c"
              :value="c"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handlePreview" :loading="previewLoading">
            <el-icon><Search /></el-icon>
            查询预览
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <div v-if="previewData.length > 0" class="preview-summary">
      <el-row :gutter="16">
        <el-col :span="12">
          <div class="summary-card">
            <div class="summary-label">记录条数</div>
            <div class="summary-value">{{ previewCount }} 条</div>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="summary-card">
            <div class="summary-label">合同金额合计</div>
            <div class="summary-value amount-format">¥{{ (previewTotalAmount / 10000).toFixed(2) }}万</div>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="preview-table" v-loading="previewLoading">
      <el-table
        :data="previewData"
        border
        max-height="400"
        size="small"
      >
        <el-table-column prop="contract_no" label="合同编号" min-width="140" />
        <el-table-column prop="contract_name" label="合同名称" min-width="200" show-overflow-tooltip />
        <el-table-column prop="counterparty" label="供应商" min-width="160" show-overflow-tooltip />
        <el-table-column prop="manager" label="负责人" width="100" />
        <el-table-column prop="amount" label="合同金额" width="120">
          <template #default="{ row }">
            ¥{{ Number(row.amount).toLocaleString() }}
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : row.status === 'pending' ? 'warning' : 'info'" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="asset_count" label="关联资产" width="100" align="center" />
      </el-table>

      <div v-if="previewData.length === 0 && !previewLoading" class="preview-empty">
        <el-icon><Document /></el-icon>
        <div>暂无数据，请调整筛选条件后点击"查询预览"</div>
      </div>
    </div>

    <template #footer>
      <el-button @click="previewDialogVisible = false">取消</el-button>
      <el-button 
        type="primary" 
        :disabled="previewData.length === 0" 
        @click="confirmExport"
      >
        <el-icon><Download /></el-icon>
        确认导出 Excel
      </el-button>
    </template>
  </el-dialog>
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

.preview-filter {
  margin-bottom: 16px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

.preview-filter :deep(.el-form-item) {
  margin-bottom: 12px;
}

.preview-summary {
  margin-bottom: 16px;
}

.summary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
  border-radius: 8px;
  color: #fff;
}

.summary-card:last-child {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.summary-label {
  font-size: 14px;
  opacity: 0.9;
  margin-bottom: 8px;
}

.summary-value {
  font-size: 28px;
  font-weight: 600;
}

.preview-table {
  min-height: 200px;
  position: relative;
}

.preview-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
}

.preview-empty .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  color: #c0c4cc;
}

.amount-format {
  font-variant-numeric: tabular-nums;
}
</style>
