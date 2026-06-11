export interface Contract {
  id: number
  contract_no: string
  contract_name: string
  contract_type: 'purchase' | 'lease' | 'maintenance'
  supplier: string
  asset_category: string
  start_date: string
  end_date: string
  total_amount: number
  currency: string
  status: 'active' | 'pending' | 'completed' | 'terminated'
  manager: string
  department: string
  description: string
  warranty_period: number
  auto_renewal: number
  renewal_notice_days: number
  created_at: string
  updated_at: string
}

export interface Asset {
  id: number
  asset_no: string
  asset_name: string
  asset_category: string
  brand: string
  model: string
  specification: string
  purchase_date: string
  purchase_price: number
  location: string
  status: string
  contract_id: number | null
  description: string
  created_at: string
  updated_at: string
}

export interface PaymentPlan {
  id: number
  contract_id: number
  node_name: string
  due_date: string
  amount: number
  percentage: number
  status: 'pending' | 'paid' | 'overdue'
  paid_date: string | null
  invoice_no: string | null
  invoice_received: number
  invoice_received_date: string | null
  remark: string
  created_at: string
  updated_at: string
}

export interface Reminder {
  id: number
  contract_id: number | null
  reminder_type: 'renewal' | 'payment' | 'warranty' | 'other'
  title: string
  description: string
  due_date: string
  status: 'pending' | 'done' | 'cancelled'
  priority: 'high' | 'medium' | 'low'
  completed_at: string | null
  created_at: string
  contract_no?: string
  contract_name?: string
}

export interface Document {
  id: number
  contract_id: number
  document_type: 'contract' | 'scan' | 'acceptance' | 'invoice' | 'other'
  document_name: string
  file_path: string
  file_size: number
  upload_date: string
  remark: string
}

export interface ChangeLog {
  id: number
  contract_id: number
  change_type: 'create' | 'update' | 'delete' | 'status_change'
  field_name: string | null
  old_value: string | null
  new_value: string | null
  description: string
  operator: string | null
  created_at: string
}

export interface PageResult<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

export interface ContractStats {
  total: number
  active: number
  pending: number
  completed: number
  expiring_30d: number
  total_amount: number
}

export const CONTRACT_TYPE_OPTIONS = [
  { value: 'purchase', label: '采购' },
  { value: 'lease', label: '租赁' },
  { value: 'maintenance', label: '维保' }
]

export const CONTRACT_STATUS_OPTIONS = [
  { value: 'active', label: '执行中', type: 'success' },
  { value: 'pending', label: '待执行', type: 'warning' },
  { value: 'completed', label: '已完成', type: 'info' },
  { value: 'terminated', label: '已终止', type: 'danger' }
]

export const ASSET_CATEGORY_OPTIONS = [
  { value: 'IT设备', label: 'IT设备' },
  { value: '办公设备', label: '办公设备' },
  { value: '办公家具', label: '办公家具' },
  { value: '暖通设备', label: '暖通设备' },
  { value: '特种设备', label: '特种设备' },
  { value: '绿化服务', label: '绿化服务' },
  { value: '其他', label: '其他' }
]

export const REMINDER_TYPE_OPTIONS = [
  { value: 'renewal', label: '续约提醒', type: 'warning' },
  { value: 'payment', label: '付款提醒', type: 'danger' },
  { value: 'warranty', label: '质保提醒', type: 'info' },
  { value: 'other', label: '其他', type: 'primary' }
]

export const REMINDER_PRIORITY_OPTIONS = [
  { value: 'high', label: '高', type: 'danger' },
  { value: 'medium', label: '中', type: 'warning' },
  { value: 'low', label: '低', type: 'info' }
]

export const PAYMENT_STATUS_OPTIONS = [
  { value: 'pending', label: '待支付', type: 'warning' },
  { value: 'paid', label: '已支付', type: 'success' },
  { value: 'overdue', label: '已逾期', type: 'danger' }
]

export const DOCUMENT_TYPE_OPTIONS = [
  { value: 'contract', label: '合同正本' },
  { value: 'scan', label: '扫描件' },
  { value: 'acceptance', label: '验收材料' },
  { value: 'invoice', label: '发票' },
  { value: 'other', label: '其他' }
]

declare global {
  interface Window {
    api: {
      contract: {
        list: (params: any) => Promise<PageResult<Contract>>
        get: (id: number) => Promise<Contract | undefined>
        create: (data: Partial<Contract>) => Promise<number>
        update: (id: number, data: Partial<Contract>) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        getStats: () => Promise<ContractStats>
      }
      asset: {
        list: (params: any) => Promise<PageResult<Asset>>
        get: (id: number) => Promise<Asset | undefined>
        create: (data: Partial<Asset>) => Promise<number>
        update: (id: number, data: Partial<Asset>) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        getByContract: (contractId: number) => Promise<Asset[]>
        bindToContract: (contractId: number, assetIds: number[]) => Promise<boolean>
        getUnbound: () => Promise<Asset[]>
      }
      payment: {
        list: (params: any) => Promise<PageResult<PaymentPlan>>
        get: (id: number) => Promise<PaymentPlan | undefined>
        create: (data: Partial<PaymentPlan>) => Promise<number>
        update: (id: number, data: Partial<PaymentPlan>) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        getByContract: (contractId: number) => Promise<PaymentPlan[]>
        markPaid: (id: number, paidDate: string, invoiceNo: string) => Promise<boolean>
      }
      reminder: {
        list: (params: any) => Promise<PageResult<Reminder>>
        get: (id: number) => Promise<Reminder | undefined>
        create: (data: Partial<Reminder>) => Promise<number>
        update: (id: number, data: Partial<Reminder>) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        getPending: () => Promise<Reminder[]>
        markDone: (id: number) => Promise<boolean>
        generateTodos: () => Promise<Reminder[]>
        getByContract: (contractId: number) => Promise<Reminder[]>
      }
      document: {
        list: (params: any) => Promise<PageResult<Document>>
        get: (id: number) => Promise<Document | undefined>
        create: (data: Partial<Document>) => Promise<number>
        update: (id: number, data: Partial<Document>) => Promise<boolean>
        delete: (id: number) => Promise<boolean>
        getByContract: (contractId: number) => Promise<Document[]>
        upload: (contractId: number, type: string) => Promise<number | null>
      }
      changeLog: {
        list: (params: any) => Promise<PageResult<ChangeLog>>
        getByContract: (contractId: number) => Promise<ChangeLog[]>
        create: (data: Partial<ChangeLog>) => Promise<number>
      }
      export: {
        monthlyLedger: (year: number, month: number) => Promise<any>
        expiringList: () => Promise<any>
      }
    }
  }
}
