<script setup lang="ts">
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  PAYMENT_STATUS_OPTIONS,
  type PaymentPlan,
  type Contract
} from '@/types'
import dayjs from 'dayjs'

const loading = ref(false)
const contractList = ref<Contract[]>([])
const paymentList = ref<PaymentPlan[]>([])
const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

const searchForm = reactive({
  contractId: [] as number[],
  status: [] as string[],
  dueDateStart: '',
  dueDateEnd: ''
})

const selectedContract = ref<Contract | null>(null)
const contractPayments = ref<PaymentPlan[]>([])

const addDialogVisible = ref(false)
const addDialogTitle = ref('新增付款节点')
const isEdit = ref(false)
const paidDialogVisible = ref(false)
const deleteDialogVisible = ref(false)
const deleteId = ref<number | null>(null)

const formRef = ref<FormInstance>()
const paidFormRef = ref<FormInstance>()

const form = reactive<Partial<PaymentPlan>>({
  contract_id: undefined,
  node_name: '',
  due_date: '',
  amount: 0,
  percentage: 0,
  remark: ''
})

const paidForm = reactive({
  paid_date: '',
  invoice_no: '',
  invoice_received: 1
})

const formRules: FormRules = {
  contract_id: [{ required: true, message: '请选择所属合同', trigger: 'change' }],
  node_name: [{ required: true, message: '请输入节点名称', trigger: 'blur' }],
  due_date: [{ required: true, message: '请选择到期日期', trigger: 'change' }],
  amount: [{ required: true, message: '请输入应付金额', trigger: 'blur' }],
  percentage: [{ required: true, message: '请输入占比', trigger: 'blur' }]
}

const paidFormRules: FormRules = {
  paid_date: [{ required: true, message: '请选择实际支付日期', trigger: 'change' }],
  invoice_no: [{ required: true, message: '请输入发票号', trigger: 'blur' }]
}

const paidAmount = computed(() => {
  return contractPayments.value
    .filter(p => p.status === 'paid')
    .reduce((sum, p) => sum + p.amount, 0)
})

const pendingAmount = computed(() => {
  return contractPayments.value
    .filter(p => p.status === 'pending' || p.status === 'overdue')
    .reduce((sum, p) => sum + p.amount, 0)
})

const totalAmount = computed(() => {
  return paidAmount.value + pendingAmount.value
})

const paidPercentage = computed(() => {
  if (totalAmount.value === 0) return 0
  return Math.round((paidAmount.value / totalAmount.value) * 100)
})

const getStatusTagType = (status: string) => {
  const option = PAYMENT_STATUS_OPTIONS.find(opt => opt.value === status)
  return option?.type || 'info'
}

const getStatusLabel = (status: string) => {
  const option = PAYMENT_STATUS_OPTIONS.find(opt => opt.value === status)
  return option?.label || status
}

const formatAmount = (amount: number) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount)
}

const getInvoiceStatusLabel = (received: number) => {
  return received === 1 ? '已收到' : '未收到'
}

const getInvoiceStatusType = (received: number) => {
  return received === 1 ? 'success' : 'info'
}

watch(() => form.contract_id, (newVal) => {
  if (newVal && form.amount && selectedContract.value) {
    const contract = contractList.value.find(c => c.id === newVal)
    if (contract && contract.total_amount > 0) {
      form.percentage = Math.round((form.amount / contract.total_amount) * 10000) / 100
    }
  }
})

watch(() => form.amount, (newVal) => {
  if (form.contract_id && newVal && selectedContract.value) {
    const contract = contractList.value.find(c => c.id === form.contract_id)
    if (contract && contract.total_amount > 0) {
      form.percentage = Math.round((newVal / contract.total_amount) * 10000) / 100
    }
  }
})

watch(() => form.percentage, (newVal) => {
  if (form.contract_id && newVal && selectedContract.value) {
    const contract = contractList.value.find(c => c.id === form.contract_id)
    if (contract && contract.total_amount > 0) {
      form.amount = Math.round((contract.total_amount * newVal / 100) * 100) / 100
    }
  }
})

function handleSearch() {
  pagination.page = 1
  loadList()
}

function handleReset() {
  searchForm.contractId = []
  searchForm.status = []
  searchForm.dueDateStart = ''
  searchForm.dueDateEnd = ''
  handleSearch()
}

function handleRefresh() {
  loadList()
  loadContracts()
}

function handleFilterContractChange(val: number[]) {
  if (val.length === 1) {
    handleContractChange(val[0])
  } else {
    selectedContract.value = null
    contractPayments.value = []
  }
}

function handleDialogContractChange(val: number) {
  const c = contractList.value.find(item => item.id === val)
  selectedContract.value = c || null
}

function handleContractChange(contractId: number) {
  if (contractId) {
    const contract = contractList.value.find(c => c.id === contractId)
    selectedContract.value = contract || null
    loadContractPayments(contractId)
  } else {
    selectedContract.value = null
    contractPayments.value = []
  }
}

function handleAdd() {
  isEdit.value = false
  addDialogTitle.value = '新增付款节点'
  resetForm()
  addDialogVisible.value = true
}

function handleEdit(row: PaymentPlan) {
  isEdit.value = true
  addDialogTitle.value = '编辑付款节点'
  Object.assign(form, row)
  const contract = contractList.value.find(c => c.id === row.contract_id)
  selectedContract.value = contract || null
  addDialogVisible.value = true
}

function handleDelete(id: number) {
  deleteId.value = id
  deleteDialogVisible.value = true
}

function handleMarkPaid(row: PaymentPlan) {
  paidForm.paid_date = dayjs().format('YYYY-MM-DD')
  paidForm.invoice_no = row.invoice_no || ''
  paidForm.invoice_received = row.invoice_received || 0
  deleteId.value = row.id
  paidDialogVisible.value = true
}

async function confirmDelete() {
  if (deleteId.value) {
    try {
      const success = await window.api.payment.delete(deleteId.value)
      if (success) {
        ElMessage.success('删除成功')
        deleteDialogVisible.value = false
        deleteId.value = null
        loadList()
        if (searchForm.contractId.length === 1) {
          loadContractPayments(searchForm.contractId[0])
        }
      } else {
        ElMessage.error('删除失败')
      }
    } catch (e) {
      ElMessage.error('删除失败')
    }
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value && form.id) {
          const success = await window.api.payment.update(form.id, form)
          if (success) {
            ElMessage.success('更新成功')
            addDialogVisible.value = false
            loadList()
            if (form.contract_id) {
              loadContractPayments(form.contract_id)
            }
          } else {
            ElMessage.error('更新失败')
          }
        } else {
          const id = await window.api.payment.create(form)
          if (id) {
            ElMessage.success('创建成功')
            addDialogVisible.value = false
            loadList()
            if (form.contract_id) {
              loadContractPayments(form.contract_id)
            }
          } else {
            ElMessage.error('创建失败')
          }
        }
      } catch (e) {
        ElMessage.error('操作失败')
      }
    }
  })
}

async function handleMarkPaidSubmit() {
  if (!paidFormRef.value) return
  
  await paidFormRef.value.validate(async (valid) => {
    if (valid && deleteId.value) {
      try {
        const success = await window.api.payment.markPaid(
          deleteId.value,
          paidForm.paid_date,
          paidForm.invoice_no
        )
        if (success) {
          ElMessage.success('标记付款成功')
          paidDialogVisible.value = false
          deleteId.value = null
          loadList()
          if (searchForm.contractId.length === 1) {
            loadContractPayments(searchForm.contractId[0])
          }
        } else {
          ElMessage.error('操作失败')
        }
      } catch (e) {
        ElMessage.error('操作失败')
      }
    }
  })
}

function resetForm() {
  form.id = undefined
  form.contract_id = undefined
  form.node_name = ''
  form.due_date = ''
  form.amount = 0
  form.percentage = 0
  form.remark = ''
  selectedContract.value = null
  formRef.value?.resetFields()
}

function handlePageChange(page: number) {
  pagination.page = page
  loadList()
}

function handlePageSizeChange(size: number) {
  pagination.pageSize = size
  pagination.page = 1
  loadList()
}

async function loadContracts() {
  try {
    const result = await window.api.contract.list({ page: 1, pageSize: 1000 })
    contractList.value = result.list
  } catch (e) {
    ElMessage.error('加载合同列表失败')
  }
}

async function loadList() {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (searchForm.contractId.length > 0) {
      params.contractId = searchForm.contractId
    }
    if (searchForm.status.length > 0) {
      params.status = searchForm.status
    }
    if (searchForm.dueDateStart) {
      params.dueDateStart = searchForm.dueDateStart
    }
    if (searchForm.dueDateEnd) {
      params.dueDateEnd = searchForm.dueDateEnd
    }
    const result = await window.api.payment.list(params)
    paymentList.value = result.list
    pagination.total = result.total
  } catch (e) {
    ElMessage.error('加载付款计划列表失败')
  } finally {
    loading.value = false
  }
}

async function loadContractPayments(contractId: number) {
  try {
    contractPayments.value = await window.api.payment.getByContract(contractId)
  } catch (e) {
    ElMessage.error('加载合同付款计划失败')
  }
}

onMounted(() => {
  loadContracts()
  loadList()
})
</script>

<template>
  <div class="payment-list">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="filter-form">
        <el-form-item label="所属合同">
          <el-select
            v-model="searchForm.contractId"
            multiple
            placeholder="选择合同"
            collapse-tags
            clearable
            style="width: 240px"
            @change="handleFilterContractChange"
          >
            <el-option
              v-for="c in contractList"
              :key="c.id"
              :label="`${c.contract_no} - ${c.contract_name}`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="付款状态">
          <el-select
            v-model="searchForm.status"
            multiple
            placeholder="选择状态"
            collapse-tags
            clearable
            style="width: 180px"
          >
            <el-option
              v-for="opt in PAYMENT_STATUS_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="到期日期">
          <el-date-picker
            v-model="searchForm.dueDateStart"
            type="date"
            placeholder="开始日期"
            value-format="YYYY-MM-DD"
            style="width: 140px"
          />
          <span class="date-separator">至</span>
          <el-date-picker
            v-model="searchForm.dueDateEnd"
            type="date"
            placeholder="结束日期"
            value-format="YYYY-MM-DD"
            style="width: 140px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card v-if="selectedContract" class="overview-card" shadow="never">
      <div class="overview-header">
        <el-icon class="overview-icon"><Money /></el-icon>
        <span class="overview-title">合同付款概览</span>
      </div>
      <div class="overview-content">
        <div class="contract-info">
          <div class="info-item">
            <span class="label">合同编号：</span>
            <span class="value">{{ selectedContract.contract_no }}</span>
          </div>
          <div class="info-item">
            <span class="label">合同名称：</span>
            <span class="value">{{ selectedContract.contract_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">供应商：</span>
            <span class="value">{{ selectedContract.supplier }}</span>
          </div>
          <div class="info-item">
            <span class="label">合同金额：</span>
            <span class="value amount">{{ formatAmount(selectedContract.total_amount) }}</span>
          </div>
        </div>
        <div class="payment-progress">
          <div class="progress-labels">
            <span class="progress-label">
              <span class="dot paid"></span>
              已付：{{ formatAmount(paidAmount) }}
            </span>
            <span class="progress-label">
              <span class="dot pending"></span>
              待付：{{ formatAmount(pendingAmount) }}
            </span>
            <span class="progress-label">
              <span class="dot total"></span>
              总计：{{ formatAmount(totalAmount) }}
            </span>
            <span class="progress-percentage">{{ paidPercentage }}%</span>
          </div>
          <el-progress
            :percentage="paidPercentage"
            :stroke-width="16"
            :show-text="false"
            color="#67c23a"
          />
        </div>
      </div>
    </el-card>

    <el-card class="table-card" shadow="never">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增付款节点
          </el-button>
          <el-button @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <div class="toolbar-right">
          <span class="text-sm text-gray-500">
            共 {{ pagination.total }} 条记录
          </span>
        </div>
      </div>

      <el-table
        v-loading="loading"
        :data="paymentList"
        style="width: 100%"
        stripe
        border
      >
        <el-table-column prop="node_name" label="节点名称" min-width="140" show-overflow-tooltip />
        <el-table-column prop="due_date" label="到期日期" width="120" />
        <el-table-column prop="amount" label="应付金额" width="130" align="right">
          <template #default="{ row }">
            <span class="font-medium">{{ formatAmount(row.amount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="percentage" label="占比" width="90" align="right">
          <template #default="{ row }">
            {{ row.percentage }}%
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="paid_date" label="实际支付日期" width="130">
          <template #default="{ row }">
            {{ row.paid_date || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="invoice_no" label="发票号" width="140">
          <template #default="{ row }">
            {{ row.invoice_no || '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="invoice_received" label="发票状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getInvoiceStatusType(row.invoice_received)" size="small">
              {{ getInvoiceStatusLabel(row.invoice_received) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip>
          <template #default="{ row }">
            {{ row.remark || '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status !== 'paid'"
              type="success"
              link
              size="small"
              @click="handleMarkPaid(row)"
            >
              标记付款
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click="handleDelete(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="addDialogVisible"
      :title="addDialogTitle"
      width="560px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="所属合同" prop="contract_id">
          <el-select
            v-model="form.contract_id"
            placeholder="请选择所属合同"
            style="width: 100%"
            @change="handleDialogContractChange"
          >
            <el-option
              v-for="c in contractList"
              :key="c.id"
              :label="`${c.contract_no} - ${c.contract_name}`"
              :value="c.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="节点名称" prop="node_name">
          <el-input v-model="form.node_name" placeholder="请输入节点名称" />
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="到期日期" prop="due_date">
              <el-date-picker
                v-model="form.due_date"
                type="date"
                placeholder="选择到期日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="应付金额" prop="amount">
              <el-input-number
                v-model="form.amount"
                :min="0"
                :precision="2"
                :step="1000"
                placeholder="请输入应付金额"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="占比" prop="percentage">
          <el-input-number
            v-model="form.percentage"
            :min="0"
            :max="100"
            :precision="2"
            :step="1"
            placeholder="自动计算或手动输入"
            style="width: 100%"
          >
            <template #append>%</template>
          </el-input-number>
          <div v-if="selectedContract" class="contract-amount-hint">
            合同总金额：{{ formatAmount(selectedContract.total_amount) }}
          </div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="paidDialogVisible"
      title="标记付款"
      width="480px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="paidFormRef"
        :model="paidForm"
        :rules="paidFormRules"
        label-width="120px"
      >
        <el-form-item label="实际支付日期" prop="paid_date">
          <el-date-picker
            v-model="paidForm.paid_date"
            type="date"
            placeholder="选择实际支付日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="发票号" prop="invoice_no">
          <el-input v-model="paidForm.invoice_no" placeholder="请输入发票号" />
        </el-form-item>
        <el-form-item label="是否收到发票">
          <el-switch
            v-model="paidForm.invoice_received"
            :active-value="1"
            :inactive-value="0"
            active-text="已收到"
            inactive-text="未收到"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="paidDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleMarkPaidSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="420px"
    >
      <div class="delete-confirm">
        <el-icon class="warning-icon" color="#f56c6c"><Warning /></el-icon>
        <span>确定要删除该付款节点吗？此操作不可恢复。</span>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确定删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.payment-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  border-radius: 8px;
}

.filter-form {
  margin: 0;
}

.date-separator {
  margin: 0 8px;
  color: #909399;
}

.overview-card {
  border-radius: 8px;
}

.overview-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.overview-icon {
  font-size: 20px;
  color: #409eff;
}

.overview-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.overview-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.contract-info {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px 24px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  color: #909399;
  flex-shrink: 0;
}

.info-item .value {
  color: #303133;
}

.info-item .amount {
  color: #f56c6c;
  font-weight: 600;
}

.payment-progress {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px 20px;
}

.progress-labels {
  display: flex;
  align-items: center;
  gap: 24px;
  margin-bottom: 12px;
}

.progress-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #606266;
}

.progress-label .dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.progress-label .dot.paid {
  background: #67c23a;
}

.progress-label .dot.pending {
  background: #e6a23c;
}

.progress-label .dot.total {
  background: #409eff;
}

.progress-percentage {
  margin-left: auto;
  font-size: 18px;
  font-weight: 600;
  color: #67c23a;
}

.table-card {
  border-radius: 8px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.toolbar-left {
  display: flex;
  gap: 12px;
}

.toolbar-right {
  display: flex;
  align-items: center;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.font-medium {
  font-weight: 500;
}

.text-sm {
  font-size: 14px;
}

.text-gray-500 {
  color: #909399;
}

.contract-amount-hint {
  margin-top: 6px;
  font-size: 12px;
  color: #909399;
}

.delete-confirm {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 0;
}

.warning-icon {
  font-size: 24px;
}
</style>
