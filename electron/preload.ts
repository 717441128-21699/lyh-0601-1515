import { contextBridge, ipcRenderer } from 'electron'

const api = {
  contract: {
    list: (params: any) => ipcRenderer.invoke('contract:list', params),
    get: (id: number) => ipcRenderer.invoke('contract:get', id),
    create: (data: any) => ipcRenderer.invoke('contract:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('contract:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('contract:delete', id),
    getStats: () => ipcRenderer.invoke('contract:getStats')
  },
  asset: {
    list: (params: any) => ipcRenderer.invoke('asset:list', params),
    get: (id: number) => ipcRenderer.invoke('asset:get', id),
    create: (data: any) => ipcRenderer.invoke('asset:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('asset:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('asset:delete', id),
    getByContract: (contractId: number) => ipcRenderer.invoke('asset:getByContract', contractId),
    bindToContract: (contractId: number, assetIds: number[]) => ipcRenderer.invoke('asset:bindToContract', contractId, assetIds),
    getUnbound: () => ipcRenderer.invoke('asset:getUnbound')
  },
  payment: {
    list: (params: any) => ipcRenderer.invoke('payment:list', params),
    get: (id: number) => ipcRenderer.invoke('payment:get', id),
    create: (data: any) => ipcRenderer.invoke('payment:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('payment:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('payment:delete', id),
    getByContract: (contractId: number) => ipcRenderer.invoke('payment:getByContract', contractId),
    markPaid: (id: number, paidDate: string, invoiceNo: string) => ipcRenderer.invoke('payment:markPaid', id, paidDate, invoiceNo)
  },
  reminder: {
    list: (params: any) => ipcRenderer.invoke('reminder:list', params),
    get: (id: number) => ipcRenderer.invoke('reminder:get', id),
    create: (data: any) => ipcRenderer.invoke('reminder:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('reminder:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('reminder:delete', id),
    getPending: () => ipcRenderer.invoke('reminder:getPending'),
    markDone: (id: number) => ipcRenderer.invoke('reminder:markDone', id),
    generateTodos: () => ipcRenderer.invoke('reminder:generateTodos'),
    getByContract: (contractId: number) => ipcRenderer.invoke('reminder:getByContract', contractId)
  },
  document: {
    list: (params: any) => ipcRenderer.invoke('document:list', params),
    get: (id: number) => ipcRenderer.invoke('document:get', id),
    create: (data: any) => ipcRenderer.invoke('document:create', data),
    update: (id: number, data: any) => ipcRenderer.invoke('document:update', id, data),
    delete: (id: number) => ipcRenderer.invoke('document:delete', id),
    getByContract: (contractId: number) => ipcRenderer.invoke('document:getByContract', contractId),
    upload: (contractId: number, type: string) => ipcRenderer.invoke('document:upload', contractId, type)
  },
  changeLog: {
    list: (params: any) => ipcRenderer.invoke('changeLog:list', params),
    getByContract: (contractId: number) => ipcRenderer.invoke('changeLog:getByContract', contractId),
    create: (data: any) => ipcRenderer.invoke('changeLog:create', data)
  },
  export: {
    monthlyLedger: (year: number, month: number) => ipcRenderer.invoke('export:monthlyLedger', year, month),
    expiringList: () => ipcRenderer.invoke('export:expiringList')
  }
}

contextBridge.exposeInMainWorld('api', api)

export type ApiType = typeof api
