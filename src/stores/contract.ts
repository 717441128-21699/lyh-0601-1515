import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Contract, ContractStats, PageResult } from '@/types'

export const useContractStore = defineStore('contract', () => {
  const currentContract = ref<Contract | null>(null)
  const contractList = ref<Contract[]>([])
  const stats = ref<ContractStats | null>(null)
  const loading = ref(false)
  const pagination = ref({
    page: 1,
    pageSize: 20,
    total: 0
  })

  const formattedAmount = computed(() => {
    if (!currentContract.value) return '¥0.00'
    return new Intl.NumberFormat('zh-CN', {
      style: 'currency',
      currency: currentContract.value.currency || 'CNY'
    }).format(currentContract.value.total_amount)
  })

  async function fetchList(params: any = {}) {
    loading.value = true
    try {
      const result: PageResult<Contract> = await window.api.contract.list({
        page: pagination.value.page,
        pageSize: pagination.value.pageSize,
        ...params
      })
      contractList.value = result.list
      pagination.value.total = result.total
      return result
    } finally {
      loading.value = false
    }
  }

  async function fetchDetail(id: number) {
    loading.value = true
    try {
      const contract = await window.api.contract.get(id)
      currentContract.value = contract || null
      return contract
    } finally {
      loading.value = false
    }
  }

  async function fetchStats() {
    try {
      stats.value = await window.api.contract.getStats()
      return stats.value
    } catch (e) {
      console.error('Failed to fetch stats:', e)
    }
  }

  async function createContract(data: Partial<Contract>) {
    const id = await window.api.contract.create(data)
    await window.api.changeLog.create({
      contract_id: id,
      change_type: 'create',
      description: `创建合同：${data.contract_no} - ${data.contract_name}`,
      operator: '系统管理员'
    })
    return id
  }

  async function updateContract(id: number, data: Partial<Contract>) {
    const oldContract = currentContract.value || await window.api.contract.get(id)
    const success = await window.api.contract.update(id, data)
    if (success && oldContract) {
      const changes: string[] = []
      if (data.status && data.status !== oldContract.status) {
        changes.push(`状态从 ${oldContract.status} 变更为 ${data.status}`)
      }
      if (data.end_date && data.end_date !== oldContract.end_date) {
        changes.push(`到期日期从 ${oldContract.end_date} 变更为 ${data.end_date}`)
      }
      if (data.total_amount !== undefined && data.total_amount !== oldContract.total_amount) {
        changes.push(`合同金额从 ${oldContract.total_amount} 变更为 ${data.total_amount}`)
      }
      if (changes.length > 0) {
        await window.api.changeLog.create({
          contract_id: id,
          change_type: 'update',
          description: changes.join('；'),
          operator: '系统管理员'
        })
      }
    }
    return success
  }

  async function deleteContract(id: number) {
    return await window.api.contract.delete(id)
  }

  function setCurrentContract(contract: Contract | null) {
    currentContract.value = contract
  }

  function setPage(page: number) {
    pagination.value.page = page
  }

  function setPageSize(size: number) {
    pagination.value.pageSize = size
    pagination.value.page = 1
  }

  return {
    currentContract,
    contractList,
    stats,
    loading,
    pagination,
    formattedAmount,
    fetchList,
    fetchDetail,
    fetchStats,
    createContract,
    updateContract,
    deleteContract,
    setCurrentContract,
    setPage,
    setPageSize
  }
})
