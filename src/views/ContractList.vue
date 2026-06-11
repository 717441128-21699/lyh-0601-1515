<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import { useContractStore } from '@/stores/contract'
import {
  CONTRACT_TYPE_OPTIONS,
  CONTRACT_STATUS_OPTIONS,
  ASSET_CATEGORY_OPTIONS,
  type Contract
} from '@/types'
import dayjs from 'dayjs'

const router = useRouter()
const contractStore = useContractStore()

const searchForm = reactive({
  keyword: '',
  status: [] as string[],
  expireMonth: '',
  assetCategory: [] as string[]
})

const dialogVisible = ref(false)
const dialogTitle = ref('新增合同')
const isEdit = ref(false)
const deleteDialogVisible = ref(false)
const deleteId = ref<number | null>(null)

const formRef = ref<FormInstance>()
const form = reactive<Partial<Contract>>({
  contract_no: '',
  contract_name: '',
  contract_type: 'purchase',
  supplier: '',
  asset_category: '',
  manager: '',
  department: '',
  start_date: '',
  end_date: '',
  total_amount: 0,
  currency: 'CNY',
  warranty_period: 12,
  auto_renewal: 0,
  renewal_notice_days: 30,
  status: 'pending',
  description: ''
})

const formRules: FormRules = {
  contract_no: [{ required: true, message: '请输入合同编号', trigger: 'blur' }],
  contract_name: [{ required: true, message: '请输入合同名称', trigger: 'blur' }],
  contract_type: [{ required: true, message: '请选择合同类型', trigger: 'change' }],
  supplier: [{ required: true, message: '请输入供应商', trigger: 'blur' }],
  asset_category: [{ required: true, message: '请选择资产类别', trigger: 'change' }],
  manager: [{ required: true, message: '请输入负责人', trigger: 'blur' }],
  department: [{ required: true, message: '请输入所属部门', trigger: 'blur' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
  total_amount: [{ required: true, message: '请输入合同金额', trigger: 'blur' }],
  status: [{ required: true, message: '请选择合同状态', trigger: 'change' }]
}

const monthOptions = computed(() => {
  const options = []
  const now = dayjs()
  for (let i = 0; i < 24; i++) {
    const date = now.add(i, 'month')
    options.push({
      value: date.format('YYYY-MM'),
      label: date.format('YYYY年MM月')
    })
  }
  return options
})

const currencyOptions = [
  { value: 'CNY', label: '人民币 (¥)' },
  { value: 'USD', label: '美元 ($)' },
  { value: 'EUR', label: '欧元 (€)' },
  { value: 'JPY', label: '日元 (¥)' }
]

const getStatusTagType = (status: string) => {
  const option = CONTRACT_STATUS_OPTIONS.find(opt => opt.value === status)
  return option?.type || 'info'
}

const getStatusLabel = (status: string) => {
  const option = CONTRACT_STATUS_OPTIONS.find(opt => opt.value === status)
  return option?.label || status
}

const getTypeLabel = (type: string) => {
  const option = CONTRACT_TYPE_OPTIONS.find(opt => opt.value === type)
  return option?.label || type
}

const formatAmount = (amount: number, currency: string) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: currency || 'CNY'
  }).format(amount)
}

function handleSearch() {
  contractStore.setPage(1)
  loadList()
}

function handleReset() {
  searchForm.keyword = ''
  searchForm.status = []
  searchForm.expireMonth = ''
  searchForm.assetCategory = []
  handleSearch()
}

function handleRefresh() {
  loadList()
  contractStore.fetchStats()
}

function handleAdd() {
  isEdit.value = false
  dialogTitle.value = '新增合同'
  resetForm()
  dialogVisible.value = true
}

function handleEdit(row: Contract) {
  isEdit.value = true
  dialogTitle.value = '编辑合同'
  Object.assign(form, row)
  dialogVisible.value = true
}

function handleDelete(id: number) {
  deleteId.value = id
  deleteDialogVisible.value = true
}

function handleRowClick(row: Contract) {
  router.push(`/contracts/${row.id}`)
}

function handleViewDetail(row: Contract) {
  router.push(`/contracts/${row.id}`)
}

function handlePageChange(page: number) {
  contractStore.setPage(page)
  loadList()
}

function handlePageSizeChange(size: number) {
  contractStore.setPageSize(size)
  loadList()
}

async function confirmDelete() {
  if (deleteId.value) {
    try {
      const success = await contractStore.deleteContract(deleteId.value)
      if (success) {
        ElMessage.success('删除成功')
        deleteDialogVisible.value = false
        deleteId.value = null
        loadList()
        contractStore.fetchStats()
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
          const success = await contractStore.updateContract(form.id, form)
          if (success) {
            ElMessage.success('更新成功')
            dialogVisible.value = false
            loadList()
            contractStore.fetchStats()
          } else {
            ElMessage.error('更新失败')
          }
        } else {
          const id = await contractStore.createContract(form)
          if (id) {
            ElMessage.success('创建成功')
            dialogVisible.value = false
            loadList()
            contractStore.fetchStats()
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

function resetForm() {
  form.id = undefined
  form.contract_no = ''
  form.contract_name = ''
  form.contract_type = 'purchase'
  form.supplier = ''
  form.asset_category = ''
  form.manager = ''
  form.department = ''
  form.start_date = ''
  form.end_date = ''
  form.total_amount = 0
  form.currency = 'CNY'
  form.warranty_period = 12
  form.auto_renewal = 0
  form.renewal_notice_days = 30
  form.status = 'pending'
  form.description = ''
  formRef.value?.resetFields()
}

async function loadList() {
  const params: any = {}
  if (searchForm.keyword) {
    params.keyword = searchForm.keyword
  }
  if (searchForm.status.length > 0) {
    params.status = searchForm.status
  }
  if (searchForm.expireMonth) {
    params.expireMonth = searchForm.expireMonth
  }
  if (searchForm.assetCategory.length > 0) {
    params.assetCategory = searchForm.assetCategory
  }
  await contractStore.fetchList(params)
}

onMounted(() => {
  loadList()
})
</script>

<template>
  <div class="contract-list">
    <el-card class="filter-card" shadow="never">
      <el-form :inline="true" :model="searchForm" class="filter-form">
        <el-form-item label="关键词">
          <el-input
            v-model="searchForm.keyword"
            placeholder="搜索合同编号/名称/供应商"
            clearable
            style="width: 240px"
            @keyup.enter="handleSearch"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="合同状态">
          <el-select
            v-model="searchForm.status"
            multiple
            placeholder="选择状态"
            collapse-tags
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="opt in CONTRACT_STATUS_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="到期月份">
          <el-select
            v-model="searchForm.expireMonth"
            placeholder="选择月份"
            clearable
            style="width: 160px"
          >
            <el-option
              v-for="opt in monthOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="资产类别">
          <el-select
            v-model="searchForm.assetCategory"
            multiple
            placeholder="选择类别"
            collapse-tags
            clearable
            style="width: 200px"
          >
            <el-option
              v-for="opt in ASSET_CATEGORY_OPTIONS"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </el-select>
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

    <el-card class="table-card" shadow="never">
      <div class="toolbar">
        <div class="toolbar-left">
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增合同
          </el-button>
          <el-button @click="handleRefresh">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
        <div class="toolbar-right">
          <span class="text-sm text-gray-500">
            共 {{ contractStore.pagination.total }} 条记录
          </span>
        </div>
      </div>

      <el-table
        v-loading="contractStore.loading"
        :data="contractStore.contractList"
        style="width: 100%"
        @row-click="handleRowClick"
        :row-class-name="() => 'cursor-pointer'"
        stripe
      >
        <el-table-column prop="contract_no" label="合同编号" min-width="140" />
        <el-table-column prop="contract_name" label="合同名称" min-width="180" show-overflow-tooltip />
        <el-table-column prop="contract_type" label="合同类型" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ getTypeLabel(row.contract_type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="supplier" label="供应商" min-width="140" show-overflow-tooltip />
        <el-table-column prop="asset_category" label="资产类别" width="110" />
        <el-table-column prop="start_date" label="开始日期" width="110" />
        <el-table-column prop="end_date" label="结束日期" width="110" />
        <el-table-column prop="total_amount" label="合同金额" width="130" align="right">
          <template #default="{ row }">
            <span class="font-medium">{{ formatAmount(row.total_amount, row.currency) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="manager" label="负责人" width="100" />
        <el-table-column label="操作" width="160" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="handleViewDetail(row)"
            >
              详情
            </el-button>
            <el-button
              type="primary"
              link
              size="small"
              @click.stop="handleEdit(row)"
            >
              编辑
            </el-button>
            <el-button
              type="danger"
              link
              size="small"
              @click.stop="handleDelete(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-container">
        <el-pagination
          v-model:current-page="contractStore.pagination.page"
          v-model:page-size="contractStore.pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="contractStore.pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handlePageChange"
          @size-change="handlePageSizeChange"
        />
      </div>
    </el-card>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="720px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同编号" prop="contract_no">
              <el-input v-model="form.contract_no" placeholder="请输入合同编号" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="合同名称" prop="contract_name">
              <el-input v-model="form.contract_name" placeholder="请输入合同名称" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同类型" prop="contract_type">
              <el-select v-model="form.contract_type" placeholder="请选择合同类型" style="width: 100%">
                <el-option
                  v-for="opt in CONTRACT_TYPE_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="供应商" prop="supplier">
              <el-input v-model="form.supplier" placeholder="请输入供应商" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="资产类别" prop="asset_category">
              <el-select v-model="form.asset_category" placeholder="请选择资产类别" style="width: 100%">
                <el-option
                  v-for="opt in ASSET_CATEGORY_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="负责人" prop="manager">
              <el-input v-model="form.manager" placeholder="请输入负责人" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="所属部门" prop="department">
              <el-input v-model="form.department" placeholder="请输入所属部门" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="币种" prop="currency">
              <el-select v-model="form.currency" placeholder="请选择币种" style="width: 100%">
                <el-option
                  v-for="opt in currencyOptions"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="开始日期" prop="start_date">
              <el-date-picker
                v-model="form.start_date"
                type="date"
                placeholder="选择开始日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="结束日期" prop="end_date">
              <el-date-picker
                v-model="form.end_date"
                type="date"
                placeholder="选择结束日期"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同金额" prop="total_amount">
              <el-input-number
                v-model="form.total_amount"
                :min="0"
                :precision="2"
                :step="1000"
                placeholder="请输入合同金额"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="质保期限(月)" prop="warranty_period">
              <el-input-number
                v-model="form.warranty_period"
                :min="0"
                placeholder="请输入质保期限"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="自动续约" prop="auto_renewal">
              <el-switch
                v-model="form.auto_renewal"
                :active-value="1"
                :inactive-value="0"
                active-text="是"
                inactive-text="否"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="续约提醒天数" prop="renewal_notice_days">
              <el-input-number
                v-model="form.renewal_notice_days"
                :min="0"
                :max="365"
                placeholder="提前提醒天数"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="合同状态" prop="status">
              <el-select v-model="form.status" placeholder="请选择合同状态" style="width: 100%">
                <el-option
                  v-for="opt in CONTRACT_STATUS_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="合同描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入合同描述"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog
      v-model="deleteDialogVisible"
      title="确认删除"
      width="420px"
    >
      <div class="delete-confirm">
        <el-icon class="warning-icon" color="#f56c6c"><Warning /></el-icon>
        <span>确定要删除该合同吗？此操作不可恢复。</span>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确定删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.contract-list {
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

.cursor-pointer {
  cursor: pointer;
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
