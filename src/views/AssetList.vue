<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import type { Asset, Contract } from '@/types'
import { ASSET_CATEGORY_OPTIONS } from '@/types'
import dayjs from 'dayjs'
import {
  Plus,
  Refresh,
  Box,
  View,
  Edit,
  Delete,
  Link,
  Close,
  Goods,
  Warning
} from '@element-plus/icons-vue'

const assetList = ref<Asset[]>([])
const contractList = ref<Contract[]>([])
const contractAssets = ref<Asset[]>([])
const selectedContractId = ref<number | null>(null)
const selectedAssetIds = ref<number[]>([])
const loading = ref(false)
const detailDialogVisible = ref(false)
const assetDialogVisible = ref(false)
const isEdit = ref(false)
const currentAsset = ref<Asset | null>(null)
const assetContractInfo = ref<Contract | null>(null)

const filterForm = reactive({
  asset_category: '',
  bound_status: ''
})

const assetForm = reactive<Partial<Asset>>({
  asset_no: '',
  asset_name: '',
  asset_category: '',
  brand: '',
  model: '',
  specification: '',
  purchase_date: '',
  purchase_price: 0,
  location: '',
  status: '',
  description: ''
})

const assetFormRef = ref<FormInstance>()

const assetFormRules: FormRules = {
  asset_no: [{ required: true, message: '请输入资产编号', trigger: 'blur' }],
  asset_name: [{ required: true, message: '请输入资产名称', trigger: 'blur' }],
  asset_category: [{ required: true, message: '请选择资产类别', trigger: 'change' }],
  status: [{ required: true, message: '请选择资产状态', trigger: 'change' }]
}

const ASSET_STATUS_OPTIONS = [
  { value: '正常', label: '正常' },
  { value: '使用中', label: '使用中' },
  { value: '维修中', label: '维修中' },
  { value: '闲置', label: '闲置' },
  { value: '报废', label: '报废' }
]

const BOUND_STATUS_OPTIONS = [
  { value: 'bound', label: '已绑定' },
  { value: 'unbound', label: '未绑定' }
]

const filteredAssetList = computed(() => {
  let result = [...assetList.value]
  if (filterForm.asset_category) {
    result = result.filter(item => item.asset_category === filterForm.asset_category)
  }
  if (filterForm.bound_status === 'bound') {
    result = result.filter(item => item.contract_id !== null)
  } else if (filterForm.bound_status === 'unbound') {
    result = result.filter(item => item.contract_id === null)
  }
  return result
})

const selectedContract = computed(() => {
  return contractList.value.find(c => c.id === selectedContractId.value)
})

const contractAssetIds = computed(() => {
  return contractAssets.value.map(a => a.id)
})

const availableAssets = computed(() => {
  return assetList.value.filter(a => a.contract_id === null || a.contract_id === selectedContractId.value)
})

onMounted(() => {
  loadAssets()
  loadContracts()
})

async function loadAssets() {
  try {
    loading.value = true
    const result = await window.api.asset.list({ page: 1, pageSize: 1000 })
    assetList.value = result.list
  } catch (e) {
    ElMessage.error('加载资产列表失败')
    console.error(e)
  } finally {
    loading.value = false
  }
}

async function loadContracts() {
  try {
    const result = await window.api.contract.list({ page: 1, pageSize: 1000 })
    contractList.value = result.list
  } catch (e) {
    ElMessage.error('加载合同列表失败')
    console.error(e)
  }
}

async function loadContractAssets(contractId: number) {
  try {
    contractAssets.value = await window.api.asset.getByContract(contractId)
  } catch (e) {
    ElMessage.error('加载合同资产失败')
    console.error(e)
  }
}

function handleContractChange(contractId: number) {
  selectedContractId.value = contractId
  selectedAssetIds.value = []
  if (contractId) {
    loadContractAssets(contractId)
  } else {
    contractAssets.value = []
  }
}

async function handleBindAssets() {
  if (selectedContractId.value === null) {
    ElMessage.warning('请先选择合同')
    return
  }
  if (selectedAssetIds.value.length === 0) {
    ElMessage.warning('请先选择要绑定的资产')
    return
  }
  try {
    const success = await window.api.asset.bindToContract(selectedContractId.value!, selectedAssetIds.value)
    if (success) {
      ElMessage.success('绑定成功')
      loadAssets()
      loadContractAssets(selectedContractId.value!)
      selectedAssetIds.value = []
    } else {
      ElMessage.error('绑定失败')
    }
  } catch (e) {
    ElMessage.error('绑定失败')
    console.error(e)
  }
}

async function handleUnbindAssets() {
  if (!selectedContractId.value) {
    ElMessage.warning('请先选择合同')
    return
  }
  if (selectedAssetIds.value.length === 0) {
    ElMessage.warning('请先选择要解绑的资产')
    return
  }
  try {
    const success = await window.api.asset.bindToContract(0, selectedAssetIds.value)
    if (success) {
      ElMessage.success('解绑成功')
      loadAssets()
      loadContractAssets(selectedContractId.value!)
      selectedAssetIds.value = []
    } else {
      ElMessage.error('解绑失败')
    }
  } catch (e) {
    ElMessage.error('解绑失败')
    console.error(e)
  }
}

async function handleViewDetail(asset: Asset) {
  currentAsset.value = asset
  if (asset.contract_id) {
    try {
      assetContractInfo.value = await window.api.contract.get(asset.contract_id)
    } catch (e) {
      console.error(e)
    }
  } else {
    assetContractInfo.value = null
  }
  detailDialogVisible.value = true
}

function handleAddAsset() {
  isEdit.value = false
  resetAssetForm()
  assetDialogVisible.value = true
}

async function handleEditAsset(asset: Asset) {
  isEdit.value = true
  currentAsset.value = asset
  Object.assign(assetForm, asset)
  assetDialogVisible.value = true
}

async function handleDeleteAsset(asset: Asset) {
  try {
    await ElMessageBox.confirm(`确定要删除资产「${asset.asset_name}」吗？`, '删除确认', {
      type: 'warning'
    })
    const success = await window.api.asset.delete(asset.id)
    if (success) {
      ElMessage.success('删除成功')
      loadAssets()
      if (selectedContractId.value) {
        loadContractAssets(selectedContractId.value)
      }
    } else {
      ElMessage.error('删除失败')
    }
  } catch (e) {
      if (e !== 'cancel') {
        ElMessage.error('删除失败')
        console.error(e)
      }
    }
  }

function resetAssetForm() {
  assetForm.asset_no = ''
  assetForm.asset_name = ''
  assetForm.asset_category = ''
  assetForm.brand = ''
  assetForm.model = ''
  assetForm.specification = ''
  assetForm.purchase_date = ''
  assetForm.purchase_price = 0
  assetForm.location = ''
  assetForm.status = ''
  assetForm.description = ''
  assetFormRef.value?.resetFields()
}

async function handleSubmitAssetForm() {
  if (!assetFormRef.value) return
  await assetFormRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value && currentAsset.value) {
          const success = await window.api.asset.update(currentAsset.value.id, assetForm)
          if (success) {
            ElMessage.success('更新成功')
            assetDialogVisible.value = false
            loadAssets()
            if (selectedContractId.value) {
              loadContractAssets(selectedContractId.value)
            }
          } else {
            ElMessage.error('更新失败')
          }
        } else {
          const id = await window.api.asset.create(assetForm)
          if (id) {
            ElMessage.success('创建成功')
            assetDialogVisible.value = false
            loadAssets()
          } else {
            ElMessage.error('创建失败')
          }
        }
      } catch (e) {
        ElMessage.error('保存失败')
        console.error(e)
      }
    }
  })
}

function formatPrice(price: number) {
  return `¥${price.toLocaleString()}`
}

function formatDate(date: string) {
  return date ? dayjs(date).format('YYYY-MM-DD') : '-'
}

function getStatusType(status: string) {
  const map: Record<string, string> = {
    '正常': 'success',
    '使用中': 'primary',
    '维修中': 'warning',
    '闲置': 'info',
    '报废': 'danger'
  }
  return map[status] || 'info'
}
</script>

<template>
  <el-row :gutter="20" class="asset-page">
    <el-col :span="14">
      <div class="page-container">
        <div class="page-header">
          <div class="page-title">资产列表</div>
          <div class="toolbar">
            <el-button type="primary" @click="handleAddAsset">
              <el-icon><Plus /></el-icon>
              新增资产
            </el-button>
          </div>
        </div>

        <div class="filter-bar">
          <el-form :inline="true" :model="filterForm">
            <el-form-item label="资产类别">
              <el-select v-model="filterForm.asset_category" placeholder="全部类别" clearable style="width: 140px">
                <el-option
                  v-for="item in ASSET_CATEGORY_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item label="绑定状态">
              <el-select v-model="filterForm.bound_status" placeholder="全部" clearable style="width: 140px">
                <el-option
                  v-for="item in BOUND_STATUS_OPTIONS"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button @click="loadAssets">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <div v-loading="loading" class="asset-list">
          <div v-if="filteredAssetList.length === 0" class="empty-state">
            <el-icon><Box /></el-icon>
            <div>暂无资产数据</div>
          </div>
          <div v-for="asset in filteredAssetList" :key="asset.id" class="asset-card" :class="{ selected: selectedAssetIds.includes(asset.id) }">
            <div class="asset-header">
              <div class="flex items-center gap-2">
                <el-checkbox
                  :model-value="selectedAssetIds.includes(asset.id)"
                  @change="(val: boolean) => {
                    if (val) {
                      selectedAssetIds.push(asset.id)
                    } else {
                      const idx = selectedAssetIds.indexOf(asset.id)
                      if (idx > -1) selectedAssetIds.splice(idx, 1)
                    }
                  }"
                />
                <span class="asset-no">{{ asset.asset_no }}</span>
                <el-tag v-if="asset.contract_id" type="success" size="small">已绑定</el-tag>
                <el-tag v-else type="info" size="small">未绑定</el-tag>
              </div>
              <div class="flex gap-2">
                <el-button size="small" text @click.stop="handleViewDetail(asset)">
                  <el-icon><View /></el-icon>
                  详情
                </el-button>
                <el-button size="small" text @click.stop="handleEditAsset(asset)">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
                <el-button size="small" text type="danger" @click.stop="handleDeleteAsset(asset)">
                  <el-icon><Delete /></el-icon>
                  删除
                </el-button>
              </div>
            </div>
            <div class="asset-name" @click="handleViewDetail(asset)">{{ asset.asset_name }}</div>
            <div class="asset-meta">
              <div><span class="text-gray-500">品牌型号：</span>{{ asset.brand }} {{ asset.model }}</div>
              <div><span class="text-gray-500">规格：</span>{{ asset.specification || '-' }}</div>
              <div><span class="text-gray-500">购置日期：</span>{{ formatDate(asset.purchase_date) }}</div>
              <div><span class="text-gray-500">价值：</span>{{ formatPrice(asset.purchase_price) }}</div>
              <div><span class="text-gray-500">存放位置：</span>{{ asset.location }}</div>
              <div>
                <span class="text-gray-500">状态：</span>
                <el-tag :type="getStatusType(asset.status)" size="small">{{ asset.status }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-col>

    <el-col :span="10">
      <div class="page-container h-full">
        <div class="page-header">
          <div class="page-title">关联面板</div>
        </div>

        <div class="mb-4">
          <el-select
            v-model="selectedContractId"
            placeholder="请选择合同"
            style="width: 100%"
            @change="handleContractChange"
            clearable
          >
            <el-option
              v-for="contract in contractList"
              :key="contract.id"
              :label="`${contract.contract_no} - ${contract.contract_name}`"
              :value="contract.id"
            />
          </el-select>
        </div>

        <div v-if="selectedContract" class="contract-info mb-4">
          <div class="detail-section-title">合同基本信息</div>
          <div class="info-grid" style="grid-template-columns: repeat(2, 1fr);">
            <div class="info-item">
              <span class="label">合同编号</span>
              <span class="value">{{ selectedContract.contract_no }}</span>
            </div>
            <div class="info-item">
              <span class="label">合同名称</span>
              <span class="value">{{ selectedContract.contract_name }}</span>
            </div>
            <div class="info-item">
              <span class="label">供应商</span>
              <span class="value">{{ selectedContract.supplier }}</span>
            </div>
            <div class="info-item">
              <span class="label">合同期限</span>
              <span class="value">{{ formatDate(selectedContract.start_date) }} 至 {{ formatDate(selectedContract.end_date) }}</span>
            </div>
            <div class="info-item">
              <span class="label">合同金额</span>
              <span class="value amount-value">{{ formatPrice(selectedContract.total_amount) }}</span>
            </div>
            <div class="info-item">
              <span class="label">状态</span>
              <span class="value">
                <el-tag :type="selectedContract.status === 'active' ? 'success' : selectedContract.status === 'pending' ? 'warning' : selectedContract.status === 'completed' ? 'info' : 'danger'" size="small">
                  {{ selectedContract.status === 'active' ? '执行中' : selectedContract.status === 'pending' ? '待执行' : selectedContract.status === 'completed' ? '已完成' : '已终止' }}
                </el-tag>
              </span>
            </div>
          </div>
          <div class="contract-obligation mt-3">
            <div class="obligation-title">维保服务内容</div>
            <div class="obligation-item">{{ selectedContract.description || '暂无' }}</div>
          </div>
        </div>

        <div class="mb-4 flex gap-2">
          <el-button type="primary" :disabled="!selectedContractId" @click="handleBindAssets">
            <el-icon><Link /></el-icon>
            批量绑定
          </el-button>
          <el-button type="danger" :disabled="!selectedContractId" @click="handleUnbindAssets">
            <el-icon><Close /></el-icon>
            批量解绑
          </el-button>
        </div>

        <div class="detail-section-title">已绑定资产 ({{ contractAssets.length }})</div>
        <div v-if="contractAssets.length === 0" class="empty-state">
          <el-icon><Goods /></el-icon>
          <div>暂无绑定资产</div>
          <div class="text-sm text-gray-400 mt-2">请先选择合同，然后从左侧勾选资产进行绑定</div>
        </div>
        <div v-else class="bound-assets">
          <div
            v-for="asset in contractAssets"
            :key="asset.id"
            class="asset-card"
            :class="{ selected: selectedAssetIds.includes(asset.id) }"
          >
            <div class="asset-header">
              <div class="flex items-center gap-2">
                <el-checkbox
                  :model-value="selectedAssetIds.includes(asset.id)"
                  @change="(val: boolean) => {
                    if (val) {
                      selectedAssetIds.push(asset.id)
                    } else {
                      const idx = selectedAssetIds.indexOf(asset.id)
                      if (idx > -1) selectedAssetIds.splice(idx, 1)
                    }
                  }"
                />
                <span class="asset-no">{{ asset.asset_no }}</span>
              </div>
              <el-button size="small" text @click.stop="handleViewDetail(asset)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
            </div>
            <div class="asset-name">{{ asset.asset_name }}</div>
            <div class="asset-meta" style="grid-template-columns: repeat(2, 1fr);">
              <div><span class="text-gray-500">品牌型号：</span>{{ asset.brand }} {{ asset.model }}</div>
              <div><span class="text-gray-500">价值：</span>{{ formatPrice(asset.purchase_price) }}</div>
              <div><span class="text-gray-500">规格：</span>{{ asset.specification || '-' }}</div>
              <div>
                <span class="text-gray-500">状态：</span>
                <el-tag :type="getStatusType(asset.status)" size="small">{{ asset.status }}</el-tag>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-col>
  </el-row>

  <el-dialog
    v-model="detailDialogVisible"
    title="资产详情"
    width="600px"
    :close-on-click-modal="false"
  >
    <div v-if="currentAsset">
      <div class="detail-section">
        <div class="detail-section-title">资产基本信息</div>
        <div class="info-grid" style="grid-template-columns: repeat(2, 1fr);">
          <div class="info-item">
            <span class="label">资产编号</span>
            <span class="value">{{ currentAsset.asset_no }}</span>
          </div>
          <div class="info-item">
            <span class="label">资产名称</span>
            <span class="value">{{ currentAsset.asset_name }}</span>
          </div>
          <div class="info-item">
            <span class="label">资产类别</span>
            <span class="value">{{ currentAsset.asset_category }}</span>
          </div>
          <div class="info-item">
            <span class="label">品牌</span>
            <span class="value">{{ currentAsset.brand }}</span>
          </div>
          <div class="info-item">
            <span class="label">型号</span>
            <span class="value">{{ currentAsset.model }}</span>
          </div>
          <div class="info-item">
            <span class="label">规格</span>
            <span class="value">{{ currentAsset.specification || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">购置日期</span>
            <span class="value">{{ formatDate(currentAsset.purchase_date) }}</span>
          </div>
          <div class="info-item">
            <span class="label">价值</span>
            <span class="value amount-value">{{ formatPrice(currentAsset.purchase_price) }}</span>
          </div>
          <div class="info-item">
            <span class="label">存放位置</span>
            <span class="value">{{ currentAsset.location }}</span>
          </div>
          <div class="info-item">
            <span class="label">状态</span>
            <span class="value">
              <el-tag :type="getStatusType(currentAsset.status)" size="small">{{ currentAsset.status }}</el-tag>
            </span>
          </div>
          <div class="info-item" style="grid-column: span 2;">
            <span class="label">备注</span>
            <span class="value">{{ currentAsset.description || '-' }}</span>
          </div>
        </div>
      </div>

      <div v-if="assetContractInfo" class="detail-section">
        <div class="detail-section-title">关联合同义务</div>
        <div class="contract-obligation">
          <div class="obligation-item"><span class="font-medium">合同名称：</span>{{ assetContractInfo.contract_name }}</div>
          <div class="obligation-item"><span class="font-medium">供应商：</span>{{ assetContractInfo.supplier }}</div>
          <div class="obligation-item">
            <span class="font-medium">合同期限：</span>{{ formatDate(assetContractInfo.start_date) }} 至 {{ formatDate(assetContractInfo.end_date) }}
          </div>
          <div class="obligation-item"><span class="font-medium">维保服务内容：</span>{{ assetContractInfo.description || '暂无' }}</div>
          <div class="obligation-item"><span class="font-medium">付款责任：</span>{{ formatPrice(assetContractInfo.total_amount) }}（{{ assetContractInfo.contract_type === 'purchase' ? '采购' : assetContractInfo.contract_type === 'lease' ? '租赁' : '维保' }}合同）</div>
        </div>
      </div>
      <div v-else class="detail-section">
        <div class="detail-section-title">关联合同义务</div>
        <div class="empty-state" style="padding: 30px 20px;">
          <el-icon><Warning /></el-icon>
          <div>该资产暂未绑定合同</div>
        </div>
      </div>
    </div>
    <template #footer>
      <el-button @click="detailDialogVisible = false">关闭</el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="assetDialogVisible"
    :title="isEdit ? '编辑资产' : '新增资产'"
    width="600px"
    :close-on-click-modal="false"
  >
    <el-form
      ref="assetFormRef"
      :model="assetForm"
      :rules="assetFormRules"
      label-width="100px"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="资产编号" prop="asset_no">
            <el-input v-model="assetForm.asset_no" placeholder="请输入资产编号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="资产名称" prop="asset_name">
            <el-input v-model="assetForm.asset_name" placeholder="请输入资产名称" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="资产类别" prop="asset_category">
            <el-select v-model="assetForm.asset_category" placeholder="请选择资产类别" style="width: 100%">
              <el-option
                v-for="item in ASSET_CATEGORY_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="品牌">
            <el-input v-model="assetForm.brand" placeholder="请输入品牌" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="型号">
            <el-input v-model="assetForm.model" placeholder="请输入型号" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="规格">
            <el-input v-model="assetForm.specification" placeholder="请输入规格" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="购置日期">
            <el-date-picker
            v-model="assetForm.purchase_date"
            type="date"
            placeholder="选择日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="价值">
            <el-input-number v-model="assetForm.purchase_price" :min="0" :precision="2" style="width: 100%" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="存放位置">
            <el-input v-model="assetForm.location" placeholder="请输入存放位置" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="状态" prop="status">
            <el-select v-model="assetForm.status" placeholder="请选择状态" style="width: 100%">
              <el-option
                v-for="item in ASSET_STATUS_OPTIONS"
                :key="item.value"
                :label="item.label"
                :value="item.value"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="24">
          <el-form-item label="备注">
            <el-input v-model="assetForm.description" type="textarea" :rows="3" placeholder="请输入备注" />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
    <template #footer>
      <el-button @click="assetDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleSubmitAssetForm">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.asset-page {
  height: 100%;
}

.h-full {
  height: 100%;
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

.gap-4 {
  gap: 16px;
}

.mb-4 {
  margin-bottom: 16px;
}

.mt-3 {
  margin-top: 12px;
}

.text-gray-500 {
  color: #8c8c8c;
}

.text-gray-400 {
  color: #bfbfbf;
}

.text-sm {
  font-size: 12px;
}

.font-medium {
  font-weight: 500;
}

.w-full {
  width: 100%;
}

.asset-list {
  max-height: calc(100vh - 320px);
  overflow-y: auto;
  padding-right: 8px;
}

.bound-assets {
  max-height: calc(100vh - 520px);
  overflow-y: auto;
  padding-right: 8px;
}

.contract-info {
  background: #fafafa;
  padding: 16px;
  border-radius: 8px;
}
</style>
