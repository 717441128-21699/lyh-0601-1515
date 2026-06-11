import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import { initDatabase, getContractService, getAssetService, getPaymentService, getReminderService, getDocumentService, getChangeLogService, getExportService } from './database'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

let mainWindow: BrowserWindow | null = null

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: '企业资产合同台账',
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL)
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(async () => {
  await initDatabase()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

const contractService = getContractService()
const assetService = getAssetService()
const paymentService = getPaymentService()
const reminderService = getReminderService()
const documentService = getDocumentService()
const changeLogService = getChangeLogService()
const exportService = getExportService()

ipcMain.handle('contract:list', (_, params) => contractService.list(params))
ipcMain.handle('contract:get', (_, id) => contractService.get(id))
ipcMain.handle('contract:create', (_, data) => contractService.create(data))
ipcMain.handle('contract:update', (_, id, data) => contractService.update(id, data))
ipcMain.handle('contract:delete', (_, id) => contractService.delete(id))
ipcMain.handle('contract:getStats', () => contractService.getStats())

ipcMain.handle('asset:list', (_, params) => assetService.list(params))
ipcMain.handle('asset:get', (_, id) => assetService.get(id))
ipcMain.handle('asset:create', (_, data) => assetService.create(data))
ipcMain.handle('asset:update', (_, id, data) => assetService.update(id, data))
ipcMain.handle('asset:delete', (_, id) => assetService.delete(id))
ipcMain.handle('asset:getByContract', (_, contractId) => assetService.getByContract(contractId))
ipcMain.handle('asset:bindToContract', (_, contractId, assetIds) => assetService.bindToContract(contractId, assetIds))
ipcMain.handle('asset:getUnbound', () => assetService.getUnbound())

ipcMain.handle('payment:list', (_, params) => paymentService.list(params))
ipcMain.handle('payment:get', (_, id) => paymentService.get(id))
ipcMain.handle('payment:create', (_, data) => paymentService.create(data))
ipcMain.handle('payment:update', (_, id, data) => paymentService.update(id, data))
ipcMain.handle('payment:delete', (_, id) => paymentService.delete(id))
ipcMain.handle('payment:getByContract', (_, contractId) => paymentService.getByContract(contractId))
ipcMain.handle('payment:markPaid', (_, id, paidDate, invoiceNo) => paymentService.markPaid(id, paidDate, invoiceNo))

ipcMain.handle('reminder:list', (_, params) => reminderService.list(params))
ipcMain.handle('reminder:get', (_, id) => reminderService.get(id))
ipcMain.handle('reminder:create', (_, data) => reminderService.create(data))
ipcMain.handle('reminder:update', (_, id, data) => reminderService.update(id, data))
ipcMain.handle('reminder:delete', (_, id) => reminderService.delete(id))
ipcMain.handle('reminder:getPending', () => reminderService.getPending())
ipcMain.handle('reminder:markDone', (_, id) => reminderService.markDone(id))
ipcMain.handle('reminder:generateTodos', () => reminderService.generateTodos())
ipcMain.handle('reminder:getByContract', (_, contractId) => reminderService.getByContract(contractId))

ipcMain.handle('document:list', (_, params) => documentService.list(params))
ipcMain.handle('document:get', (_, id) => documentService.get(id))
ipcMain.handle('document:create', (_, data) => documentService.create(data))
ipcMain.handle('document:update', (_, id, data) => documentService.update(id, data))
ipcMain.handle('document:delete', (_, id) => documentService.delete(id))
ipcMain.handle('document:getByContract', (_, contractId) => documentService.getByContract(contractId))
ipcMain.handle('document:upload', async (_, contractId, type) => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    title: '选择文件',
    filters: [
      { name: '所有文件', extensions: ['*'] },
      { name: 'PDF文件', extensions: ['pdf'] },
      { name: '图片文件', extensions: ['jpg', 'jpeg', 'png', 'gif'] }
    ],
    properties: ['openFile']
  })
  if (!result.canceled && result.filePaths.length > 0) {
    return documentService.upload(contractId, type, result.filePaths[0])
  }
  return null
})

ipcMain.handle('changeLog:list', (_, params) => changeLogService.list(params))
ipcMain.handle('changeLog:getByContract', (_, contractId) => changeLogService.getByContract(contractId))
ipcMain.handle('changeLog:create', (_, data) => changeLogService.create(data))

ipcMain.handle('export:monthlyLedger', (_, year, month) => {
  const result = dialog.showSaveDialogSync(mainWindow!, {
    title: '导出月度合同台账',
    defaultPath: `合同台账_${year}年${month}月.xlsx`,
    filters: [{ name: 'Excel文件', extensions: ['xlsx'] }]
  })
  if (result) {
    return exportService.exportMonthlyLedger(year, month, result)
  }
  return null
})

ipcMain.handle('export:expiringList', (_) => {
  const result = dialog.showSaveDialogSync(mainWindow!, {
    title: '导出即将到期清单',
    defaultPath: `即将到期合同清单.xlsx`,
    filters: [{ name: 'Excel文件', extensions: ['xlsx'] }]
  })
  if (result) {
    return exportService.exportExpiringList(result)
  }
  return null
})
