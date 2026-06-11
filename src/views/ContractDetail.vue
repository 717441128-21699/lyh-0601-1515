<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useContractStore } from '@/stores/contract'
import dayjs from 'dayjs'
import type { Contract, Document, ChangeLog, Reminder } from '@/types'
import {
  CONTRACT_TYPE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  ASSET_CATEGORY_OPTIONS,
  DOCUMENT_TYPE_OPTIONS,
  REMINDER_TYPE_OPTIONS,
  REMINDER_PRIORITY_OPTIONS
} from '@/types'

const route = useRoute()
const router = useRouter()
const contractStore = useContractStore()

const contractId = computed(() => Number(route.params.id))
const contract = ref<Contract | null>(null)
const documents = ref<Document[]>([])
const changeLogs = ref<ChangeLog[]>([])
const loading = ref(false)
const documentLoading = ref(false)
const changeLogLoading = ref(false)
const reminderLoading = ref(false)
const reminders = ref<Reminder[]>([])

const performanceSummary = ref<{
  paymentProgress: { paid: number; total: number; percentage: number }
  assets: { bound: number }
  reminders: { pending: number; done: number; total: number }
  documents: { uploaded: number }
} | null>(null)

const activeTab = ref('info')

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const scrollToSection = (sectionId: string) => {
  activeTab.value = sectionId
  const element = document.getElementById(sectionId)
  if (element) {
    element.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
}

const editDialogVisible = ref(false)
const reminderDialogVisible = ref(false)
const uploadDialogVisible = ref(false)
const uploadType = ref('scan')

const formRef = ref()
const formData = ref<Partial<Contract>>({})

const reminderFormRef = ref()
const reminderFormData = ref({
  reminder_type: 'renewal' as const,
  title: '',
  description: '',
  due_date: '',
  priority: 'medium' as const
})

const contractTypeLabel = computed(() => {
  if (!contract.value) return ''
  const option = CONTRACT_TYPE_OPTIONS.find(o => o.value === contract.value!.contract_type)
  return option?.label || contract.value.contract_type
})

const contractStatusType = computed(() => {
  if (!contract.value) return ''
  const option = CONTRACT_STATUS_OPTIONS.find(o => o.value === contract.value!.status)
  return option?.type || 'info'
})

const contractStatusLabel = computed(() => {
  if (!contract.value) return ''
  const option = CONTRACT_STATUS_OPTIONS.find(o => o.value === contract.value!.status)
  return option?.label || contract.value.status
})

const formattedAmount = computed(() => {
  if (!contract.value) return '¥0.00'
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: contract.value.currency || 'CNY'
  }).format(contract.value.total_amount)
})

const contractPeriod = computed(() => {
  if (!contract.value) return ''
  return `${contract.value.start_date} 至 ${contract.value.end_date}`
})

function getDocumentTypeLabel(type: string) {
  const option = DOCUMENT_TYPE_OPTIONS.find(o => o.value === type)
  return option?.label || type
}

function getChangeTypeLabel(type: string) {
  const labels: Record<string, string> = {
    create: '创建',
    update: '更新',
    delete: '删除',
    status_change: '状态变更'
  }
  return labels[type] || type
}

function formatFileSize(size: number) {
  if (size < 1024) return size + ' B'
  if (size < 1024 * 1024) return (size / 1024).toFixed(2) + ' KB'
  return (size / (1024 * 1024)).toFixed(2) + ' MB'
}

async function loadContractDetail() {
  loading.value = true
  try {
    const data = await window.api.contract.get(contractId.value)
    contract.value = data || null
  } catch (e) {
    ElMessage.error('加载合同详情失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadDocuments() {
  documentLoading.value = true
  try {
    documents.value = await window.api.document.getByContract(contractId.value)
  } catch (e) {
    ElMessage.error('加载文档列表失败')
    console.error(e)
  } finally {
    documentLoading.value = false
  }
}

async function loadChangeLogs() {
  changeLogLoading.value = true
  try {
    changeLogs.value = await window.api.changeLog.getByContract(contractId.value)
  } catch (e) {
    ElMessage.error('加载变更记录失败')
    console.error(e)
  } finally {
    changeLogLoading.value = false
  }
}

async function loadPerformanceSummary() {
  try {
    performanceSummary.value = await window.api.contract.getPerformanceSummary(contractId.value)
  } catch (e) {
    console.error('加载履约进度失败', e)
  }
}

async function loadReminders() {
  reminderLoading.value = true
  try {
    reminders.value = await window.api.reminder.getByContract(contractId.value)
  } catch (e) {
    ElMessage.error('加载提醒列表失败')
    console.error(e)
  } finally {
    reminderLoading.value = false
  }
}

function getReminderTypeLabel(type: string) {
  const option = REMINDER_TYPE_OPTIONS.find(o => o.value === type)
  return option?.label || type
}

function getReminderTypeType(type: string) {
  const option = REMINDER_TYPE_OPTIONS.find(o => o.value === type)
  return option?.type || 'info'
}

function getReminderPriorityLabel(priority: string) {
  const option = REMINDER_PRIORITY_OPTIONS.find(o => o.value === priority)
  return option?.label || priority
}

function getReminderPriorityType(priority: string) {
  const option = REMINDER_PRIORITY_OPTIONS.find(o => o.value === priority)
  return option?.type || 'info'
}

function goBack() {
  router.back()
}

function openEditDialog() {
  if (!contract.value) return
  formData.value = { ...contract.value }
  editDialogVisible.value = true
}

async function handleEditSubmit() {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    const success = await contractStore.updateContract(contractId.value, formData.value)
    if (success) {
      ElMessage.success('更新成功')
      editDialogVisible.value = false
      await loadContractDetail()
      await loadChangeLogs()
      await loadPerformanceSummary()
    } else {
      ElMessage.error('更新失败')
    }
  } catch (e) {
    console.error(e)
  }
}

function openUploadDialog() {
  uploadType.value = 'scan'
  uploadDialogVisible.value = true
}

async function handleUpload() {
  try {
    const docId = await window.api.document.upload(contractId.value, uploadType.value)
    if (docId) {
      ElMessage.success('上传成功')
      uploadDialogVisible.value = false
      await loadDocuments()
      await loadPerformanceSummary()
    } else {
      ElMessage.error('上传失败')
    }
  } catch (e) {
    ElMessage.error('上传失败')
    console.error(e)
  }
}

async function handleDownloadDocument(doc: Document) {
  try {
    ElMessage.info(`正在下载：${doc.document_name}`)
  } catch (e) {
    ElMessage.error('下载失败')
    console.error(e)
  }
}

async function handleDeleteDocument(doc: Document) {
  try {
    await ElMessageBox.confirm('确定要删除该文档吗？', '确认删除', {
      type: 'warning'
    })
    const success = await window.api.document.delete(doc.id)
    if (success) {
      ElMessage.success('删除成功')
      await loadDocuments()
    } else {
      ElMessage.error('删除失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      console.error(e)
    }
  }
}

function openReminderDialog() {
  reminderFormData.value = {
    reminder_type: 'renewal',
    title: '',
    description: '',
    due_date: '',
    priority: 'medium'
  }
  reminderDialogVisible.value = true
}

async function handleReminderSubmit() {
  if (!reminderFormRef.value) return
  try {
    await reminderFormRef.value.validate()
    const id = await window.api.reminder.create({
      ...reminderFormData.value,
      contract_id: contractId.value
    })
    if (id) {
      ElMessage.success('提醒设置成功')
      reminderDialogVisible.value = false
      await loadReminders()
      await loadPerformanceSummary()
    } else {
      ElMessage.error('设置失败')
    }
  } catch (e) {
    console.error(e)
  }
}

async function handleExportContract() {
  try {
    ElMessage.success('导出功能开发中')
  } catch (e) {
    ElMessage.error('导出失败')
    console.error(e)
  }
}

const formRules = {
  contract_no: [{ required: true, message: '请输入合同编号', trigger: 'blur' }],
  contract_name: [{ required: true, message: '请输入合同名称', trigger: 'blur' }],
  contract_type: [{ required: true, message: '请选择合同类型', trigger: 'change' }],
  supplier: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  asset_category: [{ required: true, message: '请选择资产类别', trigger: 'change' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  total_amount: [{ required: true, message: '请输入合同金额', trigger: 'blur' }],
  status: [{ required: true, message: '请选择合同状态', trigger: 'change' }],
  manager: [{ required: true, message: '请输入负责人', trigger: 'blur' }]
}

const reminderFormRules = {
  reminder_type: [{ required: true, message: '请选择提醒类型', trigger: 'change' }],
  title: [{ required: true, message: '请输入提醒标题', trigger: 'blur' }],
  due_date: [{ required: true, message: '请选择提醒日期', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

onMounted(() => {
  if (contractId.value) {
    loadContractDetail()
    loadDocuments()
    loadChangeLogs()
    loadPerformanceSummary()
    loadReminders()
  }
})
</script>

<template>
  <div class="contract-detail">
    <div class="page-header">
      <div class="flex items-center gap-3">
        <el-button text @click="goBack">
          <el-icon><ArrowLeft /></el-icon>
          返回
        </el-button>
        <h2 class="page-title">{{ contract?.contract_name || '合同详情' }}</h2>
        <el-tag v-if="contract" :type="contractStatusType">{{ contractStatusLabel }}</el-tag>
      </div>
      <div class="flex items-center gap-2">
        <el-button type="primary" @click="openEditDialog">
          <el-icon><Edit /></el-icon>
          编辑合同
        </el-button>
        <el-button type="warning" @click="openReminderDialog">
          <el-icon><Bell /></el-icon>
          设置提醒
        </el-button>
        <el-button @click="handleExportContract">
          <el-icon><Download /></el-icon>
          导出合同
        </el-button>
      </div>
    </div>

    <el-skeleton v-if="loading" :rows="10" animated />

    <div v-else-if="!contract" class="empty-state">
      <el-empty description="合同不存在或已删除" />
    </div>

    <div v-else class="detail-content">
      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <el-icon><InfoFilled /></el-icon>
            <span>基本信息</span>
          </div>
        </template>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="合同编号">
            {{ contract.contract_no }}
          </el-descriptions-item>
          <el-descriptions-item label="合同名称">
            {{ contract.contract_name }}
          </el-descriptions-item>
          <el-descriptions-item label="合同类型">
            {{ contractTypeLabel }}
          </el-descriptions-item>
          <el-descriptions-item label="供应商">
            {{ contract.supplier }}
          </el-descriptions-item>
          <el-descriptions-item label="资产类别">
            {{ contract.asset_category }}
          </el-descriptions-item>
          <el-descriptions-item label="合同期限">
            {{ contractPeriod }}
          </el-descriptions-item>
          <el-descriptions-item label="合同金额">
            <span class="amount-text">{{ formattedAmount }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="合同状态">
            <el-tag :type="contractStatusType">{{ contractStatusLabel }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="负责人">
            {{ contract.manager }}
          </el-descriptions-item>
          <el-descriptions-item label="所属部门">
            {{ contract.department }}
          </el-descriptions-item>
          <el-descriptions-item label="质保期限">
            {{ contract.warranty_period }} 个月
          </el-descriptions-item>
          <el-descriptions-item label="自动续约">
            {{ contract.auto_renewal ? '是' : '否' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="contract.auto_renewal" label="续约提醒">
            到期前 {{ contract.renewal_notice_days }} 天
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ dayjs(contract.created_at).format('YYYY-MM-DD HH:mm:ss') }}
          </el-descriptions-item>
          <el-descriptions-item label="更新时间">
            {{ dayjs(contract.updated_at).format('YYYY-MM-DD HH:mm:ss') }}
          </el-descriptions-item>
          <el-descriptions-item label="备注" :span="3">
            {{ contract.description || '暂无' }}
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="section-card" id="performance">
        <template #header>
          <div class="card-header">
            <el-icon><DataLine /></el-icon>
            <span>履约进度总览</span>
          </div>
        </template>
        <div class="performance-grid" v-if="performanceSummary">
          <div
            class="performance-card payment"
            @click="router.push('/payments')"
          >
            <div class="perf-icon">
              <el-icon><Money /></el-icon>
            </div>
            <div class="perf-content">
              <div class="perf-title">付款进度</div>
              <div class="perf-main">
                <span class="perf-value">{{ performanceSummary.paymentProgress.percentage }}%</span>
              </div>
              <div class="perf-sub">
                已付 {{ formatAmount(performanceSummary.paymentProgress.paid) }} /
                总计 {{ formatAmount(performanceSummary.paymentProgress.total) }}
              </div>
              <el-progress
                :percentage="performanceSummary.paymentProgress.percentage"
                :stroke-width="8"
                :show-text="false"
                color="#67c23a"
              />
            </div>
          </div>

          <div
            class="performance-card asset"
            @click="router.push('/assets')"
          >
            <div class="perf-icon">
              <el-icon><Box /></el-icon>
            </div>
            <div class="perf-content">
              <div class="perf-title">关联资产</div>
              <div class="perf-main">
                <span class="perf-value">{{ performanceSummary.assets.bound }}</span>
                <span class="perf-unit">台</span>
              </div>
              <div class="perf-sub">已绑定设备数量</div>
            </div>
          </div>

          <div
            class="performance-card reminder"
            @click="scrollToSection('reminders')"
          >
            <div class="perf-icon">
              <el-icon><Bell /></el-icon>
            </div>
            <div class="perf-content">
              <div class="perf-title">待办提醒</div>
              <div class="perf-main">
                <span class="perf-value warning">{{ performanceSummary.reminders.pending }}</span>
                <span class="perf-unit">项待办</span>
              </div>
              <div class="perf-sub">
                已完成 {{ performanceSummary.reminders.done }} /
                共 {{ performanceSummary.reminders.total }} 项
              </div>
            </div>
          </div>

          <div
            class="performance-card document"
            @click="scrollToSection('documents')"
          >
            <div class="perf-icon">
              <el-icon><Folder /></el-icon>
            </div>
            <div class="perf-content">
              <div class="perf-title">文档资料</div>
              <div class="perf-main">
                <span class="perf-value">{{ performanceSummary.documents.uploaded }}</span>
                <span class="perf-unit">份</span>
              </div>
              <div class="perf-sub">已上传文件数量</div>
            </div>
          </div>
        </div>
        <el-skeleton v-else :rows="3" animated />
      </el-card>

      <el-card class="section-card" id="documents">
        <template #header>
          <div class="card-header">
            <el-icon><Folder /></el-icon>
            <span>文档管理</span>
            <el-button size="small" type="primary" class="ml-auto" @click="openUploadDialog">
              <el-icon><Upload /></el-icon>
              上传文档
            </el-button>
          </div>
        </template>
        <el-table v-loading="documentLoading" :data="documents" border stripe>
          <el-table-column prop="document_name" label="文档名称" min-width="200" />
          <el-table-column prop="document_type" label="文档类型" width="120">
            <template #default="{ row }">
              {{ getDocumentTypeLabel(row.document_type) }}
            </template>
          </el-table-column>
          <el-table-column prop="file_size" label="文件大小" width="120">
            <template #default="{ row }">
              {{ formatFileSize(row.file_size) }}
            </template>
          </el-table-column>
          <el-table-column prop="upload_date" label="上传时间" width="180">
            <template #default="{ row }">
              {{ dayjs(row.upload_date).format('YYYY-MM-DD HH:mm') }}
            </template>
          </el-table-column>
          <el-table-column prop="remark" label="备注" min-width="150" />
          <el-table-column label="操作" width="150" fixed="right">
            <template #default="{ row }">
              <el-button size="small" type="primary" link @click="handleDownloadDocument(row)">
                下载
              </el-button>
              <el-button size="small" type="danger" link @click="handleDeleteDocument(row)">
                删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!documentLoading && documents.length === 0" description="暂无文档" />
      </el-card>

      <el-card class="section-card" id="reminders">
        <template #header>
          <div class="card-header">
            <el-icon><Bell /></el-icon>
            <span>提醒事项</span>
            <el-button size="small" type="warning" class="ml-auto" @click="openReminderDialog">
              <el-icon><Plus /></el-icon>
              添加提醒
            </el-button>
          </div>
        </template>
        <div v-loading="reminderLoading" class="reminder-list">
          <div
            v-for="reminder in reminders"
            :key="reminder.id"
            class="reminder-item"
            :class="{ done: reminder.status === 'done' }"
          >
            <div class="reminder-header">
              <div class="reminder-tags">
                <el-tag :type="getReminderTypeType(reminder.reminder_type)" size="small">
                  {{ getReminderTypeLabel(reminder.reminder_type) }}
                </el-tag>
                <el-tag :type="getReminderPriorityType(reminder.priority)" size="small">
                  {{ getReminderPriorityLabel(reminder.priority) }}
                </el-tag>
                <el-tag
                  v-if="reminder.status === 'done'"
                  type="success"
                  size="small"
                >
                  已完成
                </el-tag>
              </div>
              <div class="reminder-date">
                {{ dayjs(reminder.due_date).format('YYYY-MM-DD') }}
              </div>
            </div>
            <div class="reminder-title">{{ reminder.title }}</div>
            <div v-if="reminder.description" class="reminder-desc">{{ reminder.description }}</div>
            <div v-if="reminder.status === 'done' && reminder.completed_note" class="reminder-note">
              <el-icon><CircleCheck /></el-icon>
              <span>处理说明：{{ reminder.completed_note }}</span>
            </div>
            <div v-if="reminder.status === 'done' && reminder.completed_at" class="reminder-completed">
              完成时间：{{ dayjs(reminder.completed_at).format('YYYY-MM-DD HH:mm') }}
            </div>
          </div>
          <el-empty v-if="!reminderLoading && reminders.length === 0" description="暂无提醒事项" />
        </div>
      </el-card>

      <el-card class="section-card">
        <template #header>
          <div class="card-header">
            <el-icon><Clock /></el-icon>
            <span>变更记录</span>
          </div>
        </template>
        <el-timeline v-loading="changeLogLoading">
          <el-timeline-item
            v-for="log in changeLogs"
            :key="log.id"
            :timestamp="dayjs(log.created_at).format('YYYY-MM-DD HH:mm:ss')"
            placement="top"
          >
            <el-card shadow="never" class="timeline-card">
              <div class="flex items-center gap-2 mb-2">
                <el-tag size="small" :type="log.change_type === 'create' ? 'success' : log.change_type === 'delete' ? 'danger' : 'primary'">
                  {{ getChangeTypeLabel(log.change_type) }}
                </el-tag>
                <span class="operator">操作人：{{ log.operator || '系统' }}</span>
              </div>
              <div class="description">{{ log.description }}</div>
              <div v-if="log.field_name" class="field-change mt-1 text-sm text-gray-500">
                字段：{{ log.field_name }}
                <span v-if="log.old_value">，原值：{{ log.old_value }}</span>
                <span v-if="log.new_value">，新值：{{ log.new_value }}</span>
              </div>
            </el-card>
          </el-timeline-item>
        </el-timeline>
        <el-empty v-if="!changeLogLoading && changeLogs.length === 0" description="暂无变更记录" />
      </el-card>
    </div>

    <el-dialog
      v-model="editDialogVisible"
      title="编辑合同"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="formRef"
        :model="formData"
        :rules="formRules"
        label-width="100px"
        v-if="editDialogVisible"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同编号" prop="contract_no">
              <el-input v-model="formData.contract_no" placeholder="请输入合同编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同名称" prop="contract_name">
              <el-input v-model="formData.contract_name" placeholder="请输入合同名称" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同类型" prop="contract_type">
              <el-select v-model="formData.contract_type" placeholder="请选择合同类型" class="w-full">
                <el-option
                  v-for="option in CONTRACT_TYPE_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplier">
              <el-input v-model="formData.supplier" placeholder="请输入供应商" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="资产类别" prop="asset_category">
              <el-select v-model="formData.asset_category" placeholder="请选择资产类别" class="w-full">
                <el-option
                  v-for="option in ASSET_CATEGORY_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同状态" prop="status">
              <el-select v-model="formData.status" placeholder="请选择合同状态" class="w-full">
                <el-option
                  v-for="option in CONTRACT_STATUS_OPTIONS"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="开始日期" prop="start_date">
              <el-date-picker
                v-model="formData.start_date"
                type="date"
                placeholder="选择开始日期"
                value-format="YYYY-MM-DD"
                class="w-full"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="end_date">
              <el-date-picker
                v-model="formData.end_date"
                type="date"
                placeholder="选择结束日期"
                value-format="YYYY-MM-DD"
                class="w-full"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同金额" prop="total_amount">
              <el-input-number v-model="formData.total_amount" :min="0" :precision="2" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="币种">
              <el-input v-model="formData.currency" placeholder="CNY" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="manager">
              <el-input v-model="formData.manager" placeholder="请输入负责人" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="所属部门">
              <el-input v-model="formData.department" placeholder="请输入所属部门" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="质保期限">
              <el-input-number v-model="formData.warranty_period" :min="0" placeholder="月" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="自动续约">
              <el-switch v-model="formData.auto_renewal" :active-value="1" :inactive-value="0" />
            </el-form-item>
          </el-col>
          <el-col :span="12" v-if="formData.auto_renewal">
            <el-form-item label="提前提醒">
              <el-input-number v-model="formData.renewal_notice_days" :min="1" placeholder="天" class="w-full" />
            </el-form-item>
          </el-col>
          <el-col :span="24">
            <el-form-item label="备注">
              <el-input
                v-model="formData.description"
                type="textarea"
                :rows="3"
                placeholder="请输入备注信息"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
      <template #footer>
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleEditSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="uploadDialogVisible"
      title="上传文档"
      width="400px"
      :close-on-click-modal="false"
    >
      <el-form label-width="80px">
        <el-form-item label="文档类型">
          <el-select v-model="uploadType" class="w-full">
            <el-option
              v-for="option in DOCUMENT_TYPE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="选择文件">
          <el-upload
            action="#"
            :auto-upload="false"
            :limit="1"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">
              将文件拖到此处，或<em>点击上传</em>
            </div>
            <template #tip>
              <div class="el-upload__tip">
                支持上传PDF、Word、Excel、图片等格式文件
              </div>
            </template>
          </el-upload>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleUpload">上传</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="reminderDialogVisible"
      title="设置提醒"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="reminderFormRef"
        :model="reminderFormData"
        :rules="reminderFormRules"
        label-width="100px"
        v-if="reminderDialogVisible"
      >
        <el-form-item label="提醒类型" prop="reminder_type">
          <el-select v-model="reminderFormData.reminder_type" class="w-full">
            <el-option
              v-for="option in REMINDER_TYPE_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="提醒标题" prop="title">
          <el-input v-model="reminderFormData.title" placeholder="请输入提醒标题" />
        </el-form-item>
        <el-form-item label="提醒日期" prop="due_date">
          <el-date-picker
            v-model="reminderFormData.due_date"
            type="date"
            placeholder="选择提醒日期"
            value-format="YYYY-MM-DD"
            class="w-full"
          />
        </el-form-item>
        <el-form-item label="优先级" prop="priority">
          <el-select v-model="reminderFormData.priority" class="w-full">
            <el-option
              v-for="option in REMINDER_PRIORITY_OPTIONS"
              :key="option.value"
              :label="option.label"
              :value="option.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注说明">
          <el-input
            v-model="reminderFormData.description"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reminderDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleReminderSubmit">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.contract-detail {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #fff;
  border-radius: 8px;
  margin-bottom: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.page-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.section-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 16px;
}

.ml-auto {
  margin-left: auto;
}

.amount-text {
  color: #f56c6c;
  font-weight: 600;
  font-size: 16px;
}

.empty-state {
  padding: 60px 0;
}

.timeline-card {
  border: 1px solid #e4e7ed;
  background: #fafafa;
}

.timeline-card .operator {
  color: #909399;
  font-size: 13px;
}

.timeline-card .description {
  color: #303133;
  font-size: 14px;
  line-height: 1.6;
}

.mt-1 {
  margin-top: 4px;
}

.text-sm {
  font-size: 13px;
}

.text-gray-500 {
  color: #909399;
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

.performance-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.performance-card {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid transparent;
}

.performance-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12);
}

.performance-card.payment {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-color: #7dd3fc;
}

.performance-card.asset {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #86efac;
}

.performance-card.reminder {
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  border-color: #fcd34d;
}

.performance-card.document {
  background: linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%);
  border-color: #d8b4fe;
}

.perf-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  flex-shrink: 0;
}

.performance-card.payment .perf-icon {
  background: #0ea5e9;
  color: #fff;
}

.performance-card.asset .perf-icon {
  background: #22c55e;
  color: #fff;
}

.performance-card.reminder .perf-icon {
  background: #f59e0b;
  color: #fff;
}

.performance-card.document .perf-icon {
  background: #a855f7;
  color: #fff;
}

.perf-content {
  flex: 1;
  min-width: 0;
}

.perf-title {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
}

.perf-main {
  display: flex;
  align-items: baseline;
  gap: 4px;
  margin-bottom: 4px;
}

.perf-value {
  font-size: 28px;
  font-weight: 700;
  color: #1e293b;
}

.perf-value.warning {
  color: #f59e0b;
}

.perf-unit {
  font-size: 14px;
  color: #64748b;
}

.perf-sub {
  font-size: 12px;
  color: #94a3b8;
  margin-bottom: 8px;
}

.perf-content .el-progress {
  margin-top: 4px;
}

.reminder-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-item {
  padding: 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  transition: all 0.2s ease;
}

.reminder-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.reminder-item.done {
  background: #f8fafc;
  opacity: 0.75;
}

.reminder-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.reminder-tags {
  display: flex;
  gap: 8px;
}

.reminder-date {
  font-size: 13px;
  color: #64748b;
}

.reminder-title {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 6px;
}

.reminder-desc {
  font-size: 13px;
  color: #64748b;
  line-height: 1.6;
  margin-bottom: 8px;
}

.reminder-note {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f0fdf4;
  border-left: 3px solid #22c55e;
  border-radius: 4px;
  font-size: 13px;
  color: #166534;
  margin-bottom: 6px;
}

.reminder-completed {
  font-size: 12px;
  color: #94a3b8;
}


.mb-2 {
  margin-bottom: 8px;
}

.ml-2 {
  margin-left: 8px;
}
</style>
