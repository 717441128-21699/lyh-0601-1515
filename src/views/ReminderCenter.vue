<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import {
  Plus,
  Refresh,
  Check,
  Edit,
  Delete,
  Expand,
  Fold,
  MagicStick,
  Bell,
  Calendar,
  Clock,
  Warning,
  CircleCheck,
  Document,
  Money,
  Coin,
  SetUp
} from '@element-plus/icons-vue'
import type { Reminder, Contract } from '@/types'
import {
  REMINDER_TYPE_OPTIONS,
  REMINDER_PRIORITY_OPTIONS
} from '@/types'
import dayjs from 'dayjs'

const loading = ref(false)
const reminderList = ref<Reminder[]>([])
const contractList = ref<Contract[]>([])
const expandedIds = ref<number[]>([])

const typeFilter = ref('all')
const statusFilter = ref('pending')

const dialogVisible = ref(false)
const dialogTitle = ref('新增提醒')
const isEdit = ref(false)
const deleteDialogVisible = ref(false)
const deleteId = ref<number | null>(null)

const formRef = ref<FormInstance>()
const form = reactive<Partial<Reminder>>({
  contract_id: null,
  reminder_type: 'other',
  title: '',
  description: '',
  due_date: '',
  priority: 'medium',
  status: 'pending'
})

const formRules: FormRules = {
  title: [{ required: true, message: '请输入提醒标题', trigger: 'blur' }],
  reminder_type: [{ required: true, message: '请选择提醒类型', trigger: 'change' }],
  due_date: [{ required: true, message: '请选择到期日期', trigger: 'change' }],
  priority: [{ required: true, message: '请选择优先级', trigger: 'change' }]
}

const TYPE_TABS = [
  { value: 'all', label: '全部' },
  { value: 'renewal', label: '续约提醒' },
  { value: 'payment', label: '付款提醒' },
  { value: 'warranty', label: '质保提醒' },
  { value: 'other', label: '其他' }
]

const STATUS_TABS = [
  { value: 'pending', label: '待办' },
  { value: 'done', label: '已完成' }
]

const filteredReminders = computed(() => {
  let result = [...reminderList.value]
  
  if (typeFilter.value !== 'all') {
    result = result.filter(r => r.reminder_type === typeFilter.value)
  }
  
  result = result.filter(r => r.status === statusFilter.value)
  
  return result
})

const pendingReminders = computed(() => reminderList.value.filter(r => r.status === 'pending'))

const stats = computed(() => {
  const today = dayjs().startOf('day')
  const sevenDaysLater = dayjs().add(7, 'day').endOf('day')
  
  const todayDue = pendingReminders.value.filter(r => {
    const due = dayjs(r.due_date)
    return due.isSame(today, 'day')
  }).length
  
  const upcoming = pendingReminders.value.filter(r => {
    const due = dayjs(r.due_date)
    return due.isAfter(today) && due.isBefore(sevenDaysLater)
  }).length
  
  const completed = reminderList.value.filter(r => r.status === 'done').length
  
  return {
    total: pendingReminders.value.length,
    todayDue,
    upcoming,
    completed
  }
})

const highPriorityReminders = computed(() => 
  filteredReminders.value.filter(r => r.priority === 'high')
)

const mediumPriorityReminders = computed(() => 
  filteredReminders.value.filter(r => r.priority === 'medium')
)

const lowPriorityReminders = computed(() => 
  filteredReminders.value.filter(r => r.priority === 'low')
)

const getTypeIcon = (type: string) => {
  const map: Record<string, any> = {
    renewal: Calendar,
    payment: Money,
    warranty: SetUp,
    other: Bell
  }
  return map[type] || Bell
}

const getPriorityColor = (priority: string, status: string) => {
  if (status === 'done') return '#67c23a'
  const map: Record<string, string> = {
    high: '#f56c6c',
    medium: '#e6a23c',
    low: '#409eff'
  }
  return map[priority] || '#909399'
}

const getPriorityLabel = (priority: string) => {
  const option = REMINDER_PRIORITY_OPTIONS.find(opt => opt.value === priority)
  return option?.label || priority
}

const getTypeLabel = (type: string) => {
  const option = REMINDER_TYPE_OPTIONS.find(opt => opt.value === type)
  return option?.label || type
}

const getTypeTagType = (type: string) => {
  const option = REMINDER_TYPE_OPTIONS.find(opt => opt.value === type)
  return option?.type || 'primary'
}

const getDaysRemaining = (dueDate: string) => {
  const today = dayjs().startOf('day')
  const due = dayjs(dueDate).startOf('day')
  const diff = due.diff(today, 'day')
  
  if (diff > 0) {
    return `还有${diff}天`
  } else if (diff === 0) {
    return '今天到期'
  } else {
    return `已逾期${Math.abs(diff)}天`
  }
}

const getDaysClass = (dueDate: string, status: string) => {
  if (status === 'done') return 'text-gray-400'
  const today = dayjs().startOf('day')
  const due = dayjs(dueDate).startOf('day')
  const diff = due.diff(today, 'day')
  
  if (diff < 0) return 'text-red-600 font-medium'
  if (diff <= 3) return 'text-orange-600 font-medium'
  if (diff <= 7) return 'text-yellow-600'
  return 'text-gray-600'
}

const isExpanded = (id: number) => expandedIds.value.includes(id)

const toggleExpand = (id: number) => {
  const idx = expandedIds.value.indexOf(id)
  if (idx > -1) {
    expandedIds.value.splice(idx, 1)
  } else {
    expandedIds.value.push(id)
  }
}

onMounted(() => {
  loadReminders()
  loadContracts()
})

async function loadReminders() {
  try {
    loading.value = true
    const result = await window.api.reminder.list({ page: 1, pageSize: 1000 })
    reminderList.value = result.list
  } catch (e) {
    ElMessage.error('加载提醒列表失败')
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

async function handleGenerateTodos() {
  try {
    const result = await window.api.reminder.generateTodos()
    if (result && result.length > 0) {
      ElMessage.success(`成功生成 ${result.length} 条待办`)
      loadReminders()
    } else {
      ElMessage.info('没有需要生成的待办')
    }
  } catch (e) {
    ElMessage.error('生成待办清单失败')
    console.error(e)
  }
}

function handleAdd() {
  isEdit.value = false
  dialogTitle.value = '新增提醒'
  resetForm()
  dialogVisible.value = true
}

function handleEdit(reminder: Reminder) {
  isEdit.value = true
  dialogTitle.value = '编辑提醒'
  Object.assign(form, reminder)
  dialogVisible.value = true
}

function handleDelete(id: number) {
  deleteId.value = id
  deleteDialogVisible.value = true
}

async function handleMarkDone(id: number) {
  try {
    await ElMessageBox.confirm('确定将该提醒标记为已完成吗？', '确认操作', {
      type: 'warning'
    })
    const success = await window.api.reminder.markDone(id)
    if (success) {
      ElMessage.success('标记成功')
      loadReminders()
    } else {
      ElMessage.error('标记失败')
    }
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error('操作失败')
      console.error(e)
    }
  }
}

async function confirmDelete() {
  if (deleteId.value) {
    try {
      const success = await window.api.reminder.delete(deleteId.value)
      if (success) {
        ElMessage.success('删除成功')
        deleteDialogVisible.value = false
        deleteId.value = null
        loadReminders()
      } else {
        ElMessage.error('删除失败')
      }
    } catch (e) {
      ElMessage.error('删除失败')
      console.error(e)
    }
  }
}

async function handleSubmit() {
  if (!formRef.value) return
  
  await formRef.value.validate(async (valid) => {
    if (valid) {
      try {
        if (isEdit.value && form.id) {
          const success = await window.api.reminder.update(form.id, form)
          if (success) {
            ElMessage.success('更新成功')
            dialogVisible.value = false
            loadReminders()
          } else {
            ElMessage.error('更新失败')
          }
        } else {
          const id = await window.api.reminder.create(form)
          if (id) {
            ElMessage.success('创建成功')
            dialogVisible.value = false
            loadReminders()
          } else {
            ElMessage.error('创建失败')
          }
        }
      } catch (e) {
        ElMessage.error('操作失败')
        console.error(e)
      }
    }
  })
}

function resetForm() {
  form.id = undefined
  form.contract_id = null
  form.reminder_type = 'other'
  form.title = ''
  form.description = ''
  form.due_date = ''
  form.priority = 'medium'
  form.status = 'pending'
  formRef.value?.resetFields()
}
</script>

<template>
  <div class="reminder-center">
    <el-card class="filter-card" shadow="never">
      <div class="filter-header">
        <div class="filter-tabs">
          <el-tabs v-model="typeFilter" class="type-tabs">
            <el-tab-pane 
              v-for="tab in TYPE_TABS" 
              :key="tab.value" 
              :label="tab.label" 
              :name="tab.value" 
            />
          </el-tabs>
        </div>
        <div class="filter-status">
          <el-radio-group v-model="statusFilter" size="small">
            <el-radio-button 
              v-for="tab in STATUS_TABS" 
              :key="tab.value" 
              :label="tab.value"
            >
              {{ tab.label }}
            </el-radio-button>
          </el-radio-group>
        </div>
        <div class="filter-actions">
          <el-button type="success" @click="handleGenerateTodos">
            <el-icon><MagicStick /></el-icon>
            生成待办清单
          </el-button>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>
            新增提醒
          </el-button>
          <el-button @click="loadReminders">
            <el-icon><Refresh /></el-icon>
            刷新
          </el-button>
        </div>
      </div>
    </el-card>

    <el-row :gutter="16" class="stats-row">
      <el-col :span="6">
        <div class="stat-card stat-total">
          <div class="stat-icon">
            <el-icon><Bell /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.total }}</div>
            <div class="stat-label">待办总数</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-today">
          <div class="stat-icon">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.todayDue }}</div>
            <div class="stat-label">今日到期</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-upcoming">
          <div class="stat-icon">
            <el-icon><Calendar /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.upcoming }}</div>
            <div class="stat-label">即将到期(7天内)</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card stat-completed">
          <div class="stat-icon">
            <el-icon><CircleCheck /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.completed }}</div>
            <div class="stat-label">已完成</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <div v-loading="loading" class="reminder-content">
      <template v-if="statusFilter === 'pending'">
        <div v-if="highPriorityReminders.length > 0" class="priority-group">
          <div class="priority-title high">
            <el-icon><Warning /></el-icon>
            高优先级
            <span class="count">({{ highPriorityReminders.length }})</span>
          </div>
          <div class="reminder-grid">
            <div
              v-for="reminder in highPriorityReminders"
              :key="reminder.id"
              class="reminder-card"
              :class="{ done: reminder.status === 'done' }"
            >
              <div 
                class="priority-bar"
                :style="{ backgroundColor: getPriorityColor(reminder.priority, reminder.status) }"
              />
              <div class="card-content">
                <div class="card-header">
                  <div class="card-title-row">
                    <el-icon class="type-icon" :color="getPriorityColor(reminder.priority, reminder.status)">
                      <component :is="getTypeIcon(reminder.reminder_type)" />
                    </el-icon>
                    <span class="card-title">{{ reminder.title }}</span>
                    <el-tag :type="getTypeTagType(reminder.reminder_type)" size="small">
                      {{ getTypeLabel(reminder.reminder_type) }}
                    </el-tag>
                  </div>
                  <div class="card-actions">
                    <el-button 
                      size="small" 
                      text 
                      type="success"
                      @click.stop="handleMarkDone(reminder.id)"
                    >
                      <el-icon><Check /></el-icon>
                      标记完成
                    </el-button>
                    <el-button 
                      size="small" 
                      text 
                      type="primary"
                      @click.stop="handleEdit(reminder)"
                    >
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-button>
                    <el-button 
                      size="small" 
                      text 
                      type="danger"
                      @click.stop="handleDelete(reminder.id)"
                    >
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                    <el-button 
                      size="small" 
                      text
                      @click.stop="toggleExpand(reminder.id)"
                    >
                      <el-icon>
                        <component :is="isExpanded(reminder.id) ? Fold : Expand" />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
                
                <div class="card-body">
                  <div class="info-row">
                    <div v-if="reminder.contract_no" class="info-item">
                      <span class="label">合同号：</span>
                      <span class="value">{{ reminder.contract_no }}</span>
                    </div>
                    <div v-if="reminder.contract_name" class="info-item">
                      <span class="label">合同名称：</span>
                      <span class="value">{{ reminder.contract_name }}</span>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <span class="label">优先级：</span>
                      <el-tag 
                        :type="reminder.priority === 'high' ? 'danger' : reminder.priority === 'medium' ? 'warning' : 'info'" 
                        size="small"
                      >
                        {{ getPriorityLabel(reminder.priority) }}
                      </el-tag>
                    </div>
                    <div class="info-item">
                      <span class="label">到期日期：</span>
                      <span class="value">{{ dayjs(reminder.due_date).format('YYYY-MM-DD') }}</span>
                      <span class="days-remaining" :class="getDaysClass(reminder.due_date, reminder.status)">
                        ({{ getDaysRemaining(reminder.due_date) }})
                      </span>
                    </div>
                  </div>
                  
                  <div v-if="isExpanded(reminder.id)" class="card-detail">
                    <div class="detail-section">
                      <div class="detail-title">描述信息</div>
                      <div class="detail-content">{{ reminder.description || '暂无描述' }}</div>
                    </div>
                    <div class="detail-section">
                      <div class="detail-title">创建时间</div>
                      <div class="detail-content">{{ dayjs(reminder.created_at).format('YYYY-MM-DD HH:mm') }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="mediumPriorityReminders.length > 0" class="priority-group">
          <div class="priority-title medium">
            <el-icon><Bell /></el-icon>
            中优先级
            <span class="count">({{ mediumPriorityReminders.length }})</span>
          </div>
          <div class="reminder-grid">
            <div
              v-for="reminder in mediumPriorityReminders"
              :key="reminder.id"
              class="reminder-card"
              :class="{ done: reminder.status === 'done' }"
            >
              <div 
                class="priority-bar"
                :style="{ backgroundColor: getPriorityColor(reminder.priority, reminder.status) }"
              />
              <div class="card-content">
                <div class="card-header">
                  <div class="card-title-row">
                    <el-icon class="type-icon" :color="getPriorityColor(reminder.priority, reminder.status)">
                      <component :is="getTypeIcon(reminder.reminder_type)" />
                    </el-icon>
                    <span class="card-title">{{ reminder.title }}</span>
                    <el-tag :type="getTypeTagType(reminder.reminder_type)" size="small">
                      {{ getTypeLabel(reminder.reminder_type) }}
                    </el-tag>
                  </div>
                  <div class="card-actions">
                    <el-button 
                      size="small" 
                      text 
                      type="success"
                      @click.stop="handleMarkDone(reminder.id)"
                    >
                      <el-icon><Check /></el-icon>
                      标记完成
                    </el-button>
                    <el-button 
                      size="small" 
                      text 
                      type="primary"
                      @click.stop="handleEdit(reminder)"
                    >
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-button>
                    <el-button 
                      size="small" 
                      text 
                      type="danger"
                      @click.stop="handleDelete(reminder.id)"
                    >
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                    <el-button 
                      size="small" 
                      text
                      @click.stop="toggleExpand(reminder.id)"
                    >
                      <el-icon>
                        <component :is="isExpanded(reminder.id) ? Fold : Expand" />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
                
                <div class="card-body">
                  <div class="info-row">
                    <div v-if="reminder.contract_no" class="info-item">
                      <span class="label">合同号：</span>
                      <span class="value">{{ reminder.contract_no }}</span>
                    </div>
                    <div v-if="reminder.contract_name" class="info-item">
                      <span class="label">合同名称：</span>
                      <span class="value">{{ reminder.contract_name }}</span>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <span class="label">优先级：</span>
                      <el-tag 
                        :type="reminder.priority === 'high' ? 'danger' : reminder.priority === 'medium' ? 'warning' : 'info'" 
                        size="small"
                      >
                        {{ getPriorityLabel(reminder.priority) }}
                      </el-tag>
                    </div>
                    <div class="info-item">
                      <span class="label">到期日期：</span>
                      <span class="value">{{ dayjs(reminder.due_date).format('YYYY-MM-DD') }}</span>
                      <span class="days-remaining" :class="getDaysClass(reminder.due_date, reminder.status)">
                        ({{ getDaysRemaining(reminder.due_date) }})
                      </span>
                    </div>
                  </div>
                  
                  <div v-if="isExpanded(reminder.id)" class="card-detail">
                    <div class="detail-section">
                      <div class="detail-title">描述信息</div>
                      <div class="detail-content">{{ reminder.description || '暂无描述' }}</div>
                    </div>
                    <div class="detail-section">
                      <div class="detail-title">创建时间</div>
                      <div class="detail-content">{{ dayjs(reminder.created_at).format('YYYY-MM-DD HH:mm') }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="lowPriorityReminders.length > 0" class="priority-group">
          <div class="priority-title low">
            <el-icon><Coin /></el-icon>
            低优先级
            <span class="count">({{ lowPriorityReminders.length }})</span>
          </div>
          <div class="reminder-grid">
            <div
              v-for="reminder in lowPriorityReminders"
              :key="reminder.id"
              class="reminder-card"
              :class="{ done: reminder.status === 'done' }"
            >
              <div 
                class="priority-bar"
                :style="{ backgroundColor: getPriorityColor(reminder.priority, reminder.status) }"
              />
              <div class="card-content">
                <div class="card-header">
                  <div class="card-title-row">
                    <el-icon class="type-icon" :color="getPriorityColor(reminder.priority, reminder.status)">
                      <component :is="getTypeIcon(reminder.reminder_type)" />
                    </el-icon>
                    <span class="card-title">{{ reminder.title }}</span>
                    <el-tag :type="getTypeTagType(reminder.reminder_type)" size="small">
                      {{ getTypeLabel(reminder.reminder_type) }}
                    </el-tag>
                  </div>
                  <div class="card-actions">
                    <el-button 
                      size="small" 
                      text 
                      type="success"
                      @click.stop="handleMarkDone(reminder.id)"
                    >
                      <el-icon><Check /></el-icon>
                      标记完成
                    </el-button>
                    <el-button 
                      size="small" 
                      text 
                      type="primary"
                      @click.stop="handleEdit(reminder)"
                    >
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-button>
                    <el-button 
                      size="small" 
                      text 
                      type="danger"
                      @click.stop="handleDelete(reminder.id)"
                    >
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                    <el-button 
                      size="small" 
                      text
                      @click.stop="toggleExpand(reminder.id)"
                    >
                      <el-icon>
                        <component :is="isExpanded(reminder.id) ? Fold : Expand" />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
                
                <div class="card-body">
                  <div class="info-row">
                    <div v-if="reminder.contract_no" class="info-item">
                      <span class="label">合同号：</span>
                      <span class="value">{{ reminder.contract_no }}</span>
                    </div>
                    <div v-if="reminder.contract_name" class="info-item">
                      <span class="label">合同名称：</span>
                      <span class="value">{{ reminder.contract_name }}</span>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <span class="label">优先级：</span>
                      <el-tag 
                        :type="reminder.priority === 'high' ? 'danger' : reminder.priority === 'medium' ? 'warning' : 'info'" 
                        size="small"
                      >
                        {{ getPriorityLabel(reminder.priority) }}
                      </el-tag>
                    </div>
                    <div class="info-item">
                      <span class="label">到期日期：</span>
                      <span class="value">{{ dayjs(reminder.due_date).format('YYYY-MM-DD') }}</span>
                      <span class="days-remaining" :class="getDaysClass(reminder.due_date, reminder.status)">
                        ({{ getDaysRemaining(reminder.due_date) }})
                      </span>
                    </div>
                  </div>
                  
                  <div v-if="isExpanded(reminder.id)" class="card-detail">
                    <div class="detail-section">
                      <div class="detail-title">描述信息</div>
                      <div class="detail-content">{{ reminder.description || '暂无描述' }}</div>
                    </div>
                    <div class="detail-section">
                      <div class="detail-title">创建时间</div>
                      <div class="detail-content">{{ dayjs(reminder.created_at).format('YYYY-MM-DD HH:mm') }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <div v-if="filteredReminders.length > 0" class="priority-group">
          <div class="priority-title completed">
            <el-icon><CircleCheck /></el-icon>
            已完成
            <span class="count">({{ filteredReminders.length }})</span>
          </div>
          <div class="reminder-grid">
            <div
              v-for="reminder in filteredReminders"
              :key="reminder.id"
              class="reminder-card done"
            >
              <div 
                class="priority-bar"
                style="background-color: #67c23a;"
              />
              <div class="card-content">
                <div class="card-header">
                  <div class="card-title-row">
                    <el-icon class="type-icon" color="#67c23a">
                      <component :is="getTypeIcon(reminder.reminder_type)" />
                    </el-icon>
                    <span class="card-title">{{ reminder.title }}</span>
                    <el-tag type="success" size="small">
                      {{ getTypeLabel(reminder.reminder_type) }}
                    </el-tag>
                    <el-tag type="info" size="small">已完成</el-tag>
                  </div>
                  <div class="card-actions">
                    <el-button 
                      size="small" 
                      text 
                      type="danger"
                      @click.stop="handleDelete(reminder.id)"
                    >
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-button>
                    <el-button 
                      size="small" 
                      text
                      @click.stop="toggleExpand(reminder.id)"
                    >
                      <el-icon>
                        <component :is="isExpanded(reminder.id) ? Fold : Expand" />
                      </el-icon>
                    </el-button>
                  </div>
                </div>
                
                <div class="card-body">
                  <div class="info-row">
                    <div v-if="reminder.contract_no" class="info-item">
                      <span class="label">合同号：</span>
                      <span class="value">{{ reminder.contract_no }}</span>
                    </div>
                    <div v-if="reminder.contract_name" class="info-item">
                      <span class="label">合同名称：</span>
                      <span class="value">{{ reminder.contract_name }}</span>
                    </div>
                  </div>
                  <div class="info-row">
                    <div class="info-item">
                      <span class="label">原到期日期：</span>
                      <span class="value">{{ dayjs(reminder.due_date).format('YYYY-MM-DD') }}</span>
                    </div>
                    <div class="info-item">
                      <span class="label">完成时间：</span>
                      <span class="value">{{ reminder.completed_at ? dayjs(reminder.completed_at).format('YYYY-MM-DD HH:mm') : '-' }}</span>
                    </div>
                  </div>
                  
                  <div v-if="isExpanded(reminder.id)" class="card-detail">
                    <div class="detail-section">
                      <div class="detail-title">描述信息</div>
                      <div class="detail-content">{{ reminder.description || '暂无描述' }}</div>
                    </div>
                    <div class="detail-section">
                      <div class="detail-title">创建时间</div>
                      <div class="detail-content">{{ dayjs(reminder.created_at).format('YYYY-MM-DD HH:mm') }}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <div v-if="filteredReminders.length === 0" class="empty-state">
        <el-icon><Document /></el-icon>
        <div>暂无{{ statusFilter === 'done' ? '已完成' : '' }}提醒数据</div>
        <div class="text-sm text-gray-400 mt-2">
          {{ statusFilter === 'pending' ? '点击"新增提醒"或"生成待办清单"添加提醒' : '完成的提醒将显示在这里' }}
        </div>
      </div>
    </div>

    <el-dialog
      v-model="dialogVisible"
      :title="dialogTitle"
      width="600px"
      :close-on-click-modal="false"
      destroy-on-close
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="formRules"
        label-width="100px"
      >
        <el-form-item label="关联合同">
          <el-select 
            v-model="form.contract_id" 
            placeholder="请选择关联合同（可选）" 
            style="width: 100%"
            clearable
          >
            <el-option
              v-for="contract in contractList"
              :key="contract.id"
              :label="`${contract.contract_no} - ${contract.contract_name}`"
              :value="contract.id"
            />
          </el-select>
        </el-form-item>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="提醒类型" prop="reminder_type">
              <el-select v-model="form.reminder_type" placeholder="请选择提醒类型" style="width: 100%">
                <el-option
                  v-for="opt in REMINDER_TYPE_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="优先级" prop="priority">
              <el-select v-model="form.priority" placeholder="请选择优先级" style="width: 100%">
                <el-option
                  v-for="opt in REMINDER_PRIORITY_OPTIONS"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="提醒标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入提醒标题" />
        </el-form-item>
        <el-form-item label="到期日期" prop="due_date">
          <el-date-picker
            v-model="form.due_date"
            type="date"
            placeholder="选择到期日期"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            placeholder="请输入描述信息"
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
        <span>确定要删除该提醒吗？此操作不可恢复。</span>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmDelete">确定删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.reminder-center {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.filter-card {
  border-radius: 8px;
}

.filter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.filter-tabs {
  flex: 1;
}

.type-tabs :deep(.el-tabs__header) {
  margin: 0;
}

.filter-status {
  flex-shrink: 0;
}

.filter-actions {
  display: flex;
  gap: 12px;
  flex-shrink: 0;
}

.stats-row {
  margin: 0;
}

.stat-card {
  display: flex;
  align-items: center;
  padding: 20px;
  border-radius: 8px;
  background: #fff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
}

.stat-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 28px;
  color: #fff;
}

.stat-total .stat-icon {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-today .stat-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-upcoming .stat-icon {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-completed .stat-icon {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-value {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.reminder-content {
  min-height: 400px;
}

.priority-group {
  margin-bottom: 24px;
}

.priority-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid;
}

.priority-title.high {
  color: #f56c6c;
  border-color: #f56c6c;
}

.priority-title.medium {
  color: #e6a23c;
  border-color: #e6a23c;
}

.priority-title.low {
  color: #409eff;
  border-color: #409eff;
}

.priority-title.completed {
  color: #67c23a;
  border-color: #67c23a;
}

.priority-title .count {
  font-size: 14px;
  font-weight: normal;
  color: #909399;
}

.reminder-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.reminder-card {
  display: flex;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  transition: all 0.2s ease;
}

.reminder-card:hover {
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
}

.reminder-card.done {
  opacity: 0.7;
}

.priority-bar {
  width: 4px;
  flex-shrink: 0;
}

.card-content {
  flex: 1;
  padding: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.card-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.type-icon {
  font-size: 20px;
}

.card-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.reminder-card.done .card-title {
  text-decoration: line-through;
  color: #909399;
}

.card-actions {
  display: flex;
  gap: 4px;
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
}

.info-item .label {
  color: #909399;
}

.info-item .value {
  color: #606266;
}

.days-remaining {
  margin-left: 4px;
  font-size: 13px;
}

.card-detail {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px dashed #ebeef5;
  display: flex;
  gap: 24px;
}

.detail-section {
  flex: 1;
}

.detail-title {
  font-size: 13px;
  color: #909399;
  margin-bottom: 4px;
}

.detail-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-state .el-icon {
  font-size: 48px;
  margin-bottom: 12px;
  color: #c0c4cc;
}

.empty-state > div:first-of-type {
  font-size: 16px;
}

.text-sm {
  font-size: 13px;
}

.text-gray-400 {
  color: #c0c4cc;
}

.mt-2 {
  margin-top: 8px;
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
