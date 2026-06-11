import initSqlJs, { Database } from 'sql.js'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync, readFileSync, writeFileSync, copyFileSync, statSync } from 'fs'
import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

let db: Database | null = null
let dbPath: string = ''

function getDbPath() {
  const userData = app.getPath('userData')
  const dbDir = join(userData, 'database')
  if (!existsSync(dbDir)) {
    mkdirSync(dbDir, { recursive: true })
  }
  return join(dbDir, 'contract_ledger.db')
}

async function initDatabase() {
  dbPath = getDbPath()
  const SQL = await initSqlJs()

  let dbData: Uint8Array | null = null
  if (existsSync(dbPath)) {
    try {
      dbData = new Uint8Array(readFileSync(dbPath))
    } catch (e) {
      console.warn('Failed to read existing database, creating new one:', e)
    }
  }

  db = dbData ? new SQL.Database(dbData) : new SQL.Database()

  createTables(db)
  seedMockData(db)
  saveDatabase()
}

function saveDatabase() {
  if (!db || !dbPath) return
  try {
    const data = db.export()
    const buffer = Buffer.from(data)
    writeFileSync(dbPath, buffer)
  } catch (e) {
    console.error('Failed to save database:', e)
  }
}

function createTables(db: Database) {
  db.run(`
    CREATE TABLE IF NOT EXISTS contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_no TEXT NOT NULL UNIQUE,
      contract_name TEXT NOT NULL,
      contract_type TEXT NOT NULL,
      supplier TEXT NOT NULL,
      asset_category TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      currency TEXT DEFAULT 'CNY',
      status TEXT NOT NULL DEFAULT 'active',
      manager TEXT NOT NULL,
      department TEXT,
      description TEXT,
      warranty_period INTEGER DEFAULT 0,
      auto_renewal INTEGER DEFAULT 0,
      renewal_notice_days INTEGER DEFAULT 30,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_no TEXT NOT NULL UNIQUE,
      asset_name TEXT NOT NULL,
      asset_category TEXT NOT NULL,
      brand TEXT,
      model TEXT,
      specification TEXT,
      purchase_date TEXT,
      purchase_price REAL DEFAULT 0,
      location TEXT,
      status TEXT DEFAULT 'normal',
      contract_id INTEGER,
      description TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS payment_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      node_name TEXT NOT NULL,
      due_date TEXT NOT NULL,
      amount REAL NOT NULL DEFAULT 0,
      percentage REAL DEFAULT 0,
      status TEXT DEFAULT 'pending',
      paid_date TEXT,
      invoice_no TEXT,
      invoice_received INTEGER DEFAULT 0,
      invoice_received_date TEXT,
      remark TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER,
      reminder_type TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      due_date TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      priority TEXT DEFAULT 'medium',
      completed_at TEXT,
      completed_note TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      document_type TEXT NOT NULL,
      document_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER DEFAULT 0,
      upload_date TEXT DEFAULT CURRENT_TIMESTAMP,
      remark TEXT
    );

    CREATE TABLE IF NOT EXISTS change_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      contract_id INTEGER NOT NULL,
      change_type TEXT NOT NULL,
      field_name TEXT,
      old_value TEXT,
      new_value TEXT,
      description TEXT,
      operator TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `)

  try {
    db.exec(`ALTER TABLE reminders ADD COLUMN completed_note TEXT`)
  } catch (e) {}
}

function seedMockData(db: Database) {
  const count = db.exec('SELECT COUNT(*) as count FROM contracts')[0]?.values[0]?.[0] as number
  if (count > 0) return

  db.run(`
    INSERT INTO contracts (
      contract_no, contract_name, contract_type, supplier, asset_category,
      start_date, end_date, total_amount, status, manager, department,
      description, warranty_period, auto_renewal, renewal_notice_days
    ) VALUES 
    ('HT-2024-001', '办公电脑采购合同', 'purchase', '联想(北京)有限公司', 'IT设备', '2024-01-15', '2024-02-15', 240000, 'completed', '张三', '行政部', '采购50台联想ThinkPad笔记本电脑', 36, 0, 30),
    ('HT-2024-002', '打印机租赁服务合同', 'lease', '柯尼卡美能达办公系统(中国)有限公司', '办公设备', '2024-03-01', '2027-02-28', 86400, 'active', '李四', '行政部', '10台彩色多功能打印机租赁，含耗材和维修服务', 0, 1, 60),
    ('HT-2024-003', '中央空调维保服务合同', 'maintenance', '大金空调技术(中国)有限公司', '暖通设备', '2024-04-01', '2025-03-31', 48000, 'active', '王五', '行政部', '办公区8台中央空调年度维保服务', 0, 1, 30),
    ('HT-2024-004', '服务器采购合同', 'purchase', '戴尔(中国)有限公司', 'IT设备', '2024-05-10', '2024-06-10', 350000, 'active', '赵六', 'IT部', '采购5台戴尔PowerEdge服务器，用于数据中心升级', 36, 0, 30),
    ('HT-2024-005', '办公家具采购合同', 'purchase', '震旦家具实业有限公司', '办公家具', '2024-06-01', '2024-07-01', 180000, 'active', '张三', '行政部', '新办公区员工工位、会议桌椅采购', 24, 0, 30),
    ('HT-2024-006', '绿植租赁服务合同', 'lease', '北京绿源花卉有限公司', '绿化服务', '2024-02-15', '2025-02-14', 28800, 'active', '李四', '行政部', '办公区绿植租赁及养护服务，共120盆', 0, 1, 30),
    ('HT-2024-007', '电梯维保服务合同', 'maintenance', '迅达(中国)电梯有限公司', '特种设备', '2024-01-01', '2024-12-31', 36000, 'active', '王五', '行政部', '4部客梯和2部货梯的年度维保服务', 0, 1, 45),
    ('HT-2024-008', '视频会议系统采购合同', 'purchase', '宝利通(中国)有限公司', 'IT设备', '2024-07-01', '2024-08-01', 125000, 'pending', '赵六', 'IT部', '6套会议室视频会议系统采购及安装', 24, 0, 30)
  `)

  db.run(`
    INSERT INTO assets (
      asset_no, asset_name, asset_category, brand, model, specification,
      purchase_date, purchase_price, location, status, contract_id, description
    ) VALUES 
    ('IT-001', 'ThinkPad笔记本', 'IT设备', '联想', 'ThinkPad X1 Carbon', 'i7/16G/512G', '2024-02-01', 4800, 'A区-1F', 'normal', 1, ''),
    ('IT-002', 'ThinkPad笔记本', 'IT设备', '联想', 'ThinkPad X1 Carbon', 'i7/16G/512G', '2024-02-01', 4800, 'A区-2F', 'normal', 1, ''),
    ('IT-003', 'ThinkPad笔记本', 'IT设备', '联想', 'ThinkPad X1 Carbon', 'i5/16G/512G', '2024-02-01', 4200, 'B区-1F', 'normal', 1, ''),
    ('IT-004', 'PowerEdge服务器', 'IT设备', '戴尔', 'PowerEdge R750', '2*Gold 6338/128G/4*2TB', '2024-06-01', 70000, '数据中心', 'normal', 4, ''),
    ('IT-005', 'PowerEdge服务器', 'IT设备', '戴尔', 'PowerEdge R750', '2*Gold 6338/128G/4*2TB', '2024-06-01', 70000, '数据中心', 'normal', 4, ''),
    ('OD-001', '彩色打印机', '办公设备', '柯尼卡美能达', 'bizhub C450i', 'A3彩色/45页/分钟', '2024-03-01', 0, 'A区-1F', 'normal', 2, '租赁设备'),
    ('OD-002', '彩色打印机', '办公设备', '柯尼卡美能达', 'bizhub C450i', 'A3彩色/45页/分钟', '2024-03-01', 0, 'A区-2F', 'normal', 2, '租赁设备'),
    ('HV-001', '中央空调主机', '暖通设备', '大金', 'VRV X7', '16匹变频', '2020-05-01', 150000, '屋顶机房', 'normal', 3, ''),
    ('HV-002', '中央空调主机', '暖通设备', '大金', 'VRV X7', '16匹变频', '2020-05-01', 150000, '屋顶机房', 'normal', 3, ''),
    ('FN-001', '员工办公桌', '办公家具', '震旦', 'E系列', '1400*700*750', '2024-06-15', 1200, 'B区-3F', 'normal', 5, ''),
    ('FN-002', '会议桌', '办公家具', '震旦', 'P系列', '4000*1500*750', '2024-06-15', 8500, 'B区-会议室', 'normal', 5, ''),
    ('SE-001', '乘客电梯', '特种设备', '迅达', '5500 AP', '1000kg/1.75m/s', '2019-08-01', 450000, 'A区-1号梯', 'normal', 7, ''),
    ('SE-002', '乘客电梯', '特种设备', '迅达', '5500 AP', '1000kg/1.75m/s', '2019-08-01', 450000, 'A区-2号梯', 'normal', 7, ''),
    ('UN-001', '绿萝盆栽', '绿化服务', '绿源', '大绿萝', '高度1.5米', '2024-02-15', 0, 'A区-走廊', 'normal', 6, '租赁'),
    ('UN-002', '发财树', '绿化服务', '绿源', '发财树', '高度1.8米', '2024-02-15', 0, '前台', 'normal', 6, '租赁')
  `)

  db.run(`
    INSERT INTO payment_plans (
      contract_id, node_name, due_date, amount, percentage, status,
      paid_date, invoice_no, invoice_received, invoice_received_date, remark
    ) VALUES 
    (2, '首期款', '2024-03-01', 7200, 10, 'paid', '2024-03-02', 'INV-2024-0301', 1, '2024-03-01', '首付10%'),
    (2, '季度款', '2024-06-01', 7200, 10, 'paid', '2024-06-03', 'INV-2024-0601', 1, '2024-05-28', ''),
    (2, '季度款', '2024-09-01', 7200, 10, 'paid', '2024-08-30', 'INV-2024-0901', 1, '2024-08-25', ''),
    (2, '季度款', '2024-12-01', 7200, 10, 'pending', NULL, NULL, 0, NULL, ''),
    (3, '季度款', '2024-04-01', 12000, 25, 'paid', '2024-04-02', 'INV-2024-0401', 1, '2024-03-28', ''),
    (3, '季度款', '2024-07-01', 12000, 25, 'paid', '2024-07-01', 'INV-2024-0701', 1, '2024-06-25', ''),
    (3, '季度款', '2024-10-01', 12000, 25, 'pending', NULL, NULL, 0, NULL, ''),
    (4, '首付款', '2024-05-15', 105000, 30, 'paid', '2024-05-16', 'INV-2024-0515', 1, '2024-05-10', '预付30%'),
    (4, '到货款', '2024-06-10', 175000, 50, 'pending', NULL, NULL, 0, NULL, '设备到货验收后支付'),
    (4, '质保金', '2025-06-10', 70000, 20, 'pending', NULL, NULL, 0, NULL, '验收后12个月支付'),
    (5, '首付款', '2024-06-15', 54000, 30, 'paid', '2024-06-16', 'INV-2024-0615', 1, '2024-06-10', ''),
    (5, '验收款', '2024-07-15', 117000, 65, 'pending', NULL, NULL, 0, NULL, '安装验收合格后支付'),
    (5, '质保金', '2025-07-15', 9000, 5, 'pending', NULL, NULL, 0, NULL, '')
  `)

  db.run(`
    INSERT INTO reminders (
      contract_id, reminder_type, title, description, due_date, status, priority
    ) VALUES 
    (3, 'renewal', '打印机租赁续约提醒', '打印机租赁合同将于2027-02-28到期，请提前处理续约事宜', '2026-12-30', 'pending', 'high'),
    (4, 'renewal', '中央空调维保续约提醒', '中央空调维保合同将于2025-03-31到期，请提前处理续约事宜', '2025-03-01', 'pending', 'high'),
    (7, 'renewal', '电梯维保续约提醒', '电梯维保合同将于2024-12-31到期，请提前处理续约事宜', '2024-11-15', 'pending', 'high'),
    (6, 'renewal', '绿植租赁续约提醒', '绿植租赁服务合同将于2025-02-14到期，请提前处理续约事宜', '2025-01-14', 'pending', 'medium'),
    (2, 'payment', '打印机租赁季度付款', '2024年第四季度打印机租赁款即将到期', '2024-11-25', 'pending', 'high'),
    (3, 'payment', '中央空调维保季度付款', '2024年第四季度中央空调维保费即将到期', '2024-09-20', 'pending', 'high'),
    (4, 'payment', '服务器到货款支付', '服务器到货验收后需支付50%货款', '2024-06-05', 'pending', 'high'),
    (5, 'payment', '办公家具验收款支付', '办公家具安装验收后需支付65%货款', '2024-07-10', 'pending', 'medium'),
    (1, 'warranty', '电脑质保到期提醒', '50台ThinkPad电脑质保将于2027-02-15到期', '2027-01-15', 'pending', 'low'),
    (4, 'warranty', '服务器质保到期提醒', '5台戴尔服务器质保将于2027-06-10到期', '2027-05-10', 'pending', 'medium')
  `)
}

function getDb(): Database {
  if (!db) throw new Error('Database not initialized')
  return db
}

interface QueryResult {
  columns: string[]
  values: any[][]
}

function rowsToObjects(result: QueryResult): any[] {
  return result.values.map(row => {
    const obj: any = {}
    result.columns.forEach((col, idx) => {
      obj[col] = row[idx]
    })
    return obj
  })
}

class BaseService<T> {
  protected tableName: string

  constructor(tableName: string) {
    this.tableName = tableName
  }

  list(params: any = {}) {
    const { page = 1, pageSize = 20, ...filters } = params
    const whereClauses: string[] = []
    const values: any[] = []

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        if (key === 'keyword') {
          whereClauses.push(`(contract_no LIKE ? OR contract_name LIKE ? OR supplier LIKE ?)`)
          values.push(`%${value}%`, `%${value}%`, `%${value}%`)
        } else if (key === 'status' && Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(',')
          whereClauses.push(`status IN (${placeholders})`)
          values.push(...value)
        } else if (key === 'expireMonth') {
          whereClauses.push(`strftime('%Y-%m', end_date) = ?`)
          values.push(String(value))
        } else if (key === 'assetCategory' && Array.isArray(value)) {
          const placeholders = value.map(() => '?').join(',')
          whereClauses.push(`asset_category IN (${placeholders})`)
          values.push(...value)
        } else {
          whereClauses.push(`${key} = ?`)
          values.push(value)
        }
      }
    })

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereSql}`
    const dataSql = `SELECT * FROM ${this.tableName} ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`

    const countResult = getDb().exec(countSql, values)
    const total = countResult[0]?.values[0]?.[0] as number || 0

    const dataResult = getDb().exec(dataSql, [...values, pageSize, (page - 1) * pageSize])
    const list = dataResult.length > 0 ? rowsToObjects(dataResult[0]) : []

    return { list, total, page, pageSize }
  }

  get(id: number): T | undefined {
    const result = getDb().exec(`SELECT * FROM ${this.tableName} WHERE id = ?`, [id])
    if (result.length === 0 || result[0].values.length === 0) return undefined
    return rowsToObjects(result[0])[0] as T
  }

  create(data: Partial<T>): number {
    const keys = Object.keys(data)
    const placeholders = keys.map(() => '?').join(',')
    const values = Object.values(data)
    const sql = `INSERT INTO ${this.tableName} (${keys.join(',')}) VALUES (${placeholders})`
    getDb().run(sql, values)
    saveDatabase()
    const result = getDb().exec('SELECT last_insert_rowid() as id')
    return Number(result[0]?.values[0]?.[0] || 0)
  }

  update(id: number, data: Partial<T>): boolean {
    const entries = Object.entries(data).filter(([k]) => k !== 'id')
    const setClauses = entries.map(([k]) => `${k} = ?`).join(',')
    const values = [...entries.map(([, v]) => v), id]
    const sql = `UPDATE ${this.tableName} SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    getDb().run(sql, values)
    saveDatabase()
    return getDb().getRowsModified() > 0
  }

  delete(id: number): boolean {
    getDb().run(`DELETE FROM ${this.tableName} WHERE id = ?`, [id])
    saveDatabase()
    return getDb().getRowsModified() > 0
  }
}

interface Contract {
  id: number
  contract_no: string
  contract_name: string
  contract_type: string
  supplier: string
  asset_category: string
  start_date: string
  end_date: string
  total_amount: number
  currency: string
  status: string
  manager: string
  department: string
  description: string
  warranty_period: number
  auto_renewal: number
  renewal_notice_days: number
  created_at: string
  updated_at: string
}

class ContractService extends BaseService<Contract> {
  constructor() {
    super('contracts')
  }

  getStats() {
    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN end_date <= date('now', '+30 days') AND status = 'active' THEN 1 ELSE 0 END) as expiring_30d,
        SUM(total_amount) as total_amount
      FROM contracts
    `
    const result = getDb().exec(sql)
    if (result.length === 0 || result[0].values.length === 0) {
      return { total: 0, active: 0, pending: 0, completed: 0, expiring_30d: 0, total_amount: 0 }
    }
    const row = result[0].values[0]
    return {
      total: row[0] as number,
      active: row[1] as number,
      pending: row[2] as number,
      completed: row[3] as number,
      expiring_30d: row[4] as number,
      total_amount: row[5] as number
    }
  }

  update(id: number, data: Partial<Contract>): boolean {
    const oldData = this.get(id)
    if (!oldData) return false

    const entries = Object.entries(data).filter(([k]) => k !== 'id')
    if (entries.length === 0) return false

    const setClauses = entries.map(([k]) => `${k} = ?`).join(',')
    const values = [...entries.map(([, v]) => v), id]
    const sql = `UPDATE ${this.tableName} SET ${setClauses}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    getDb().run(sql, values)
    const modified = getDb().getRowsModified() > 0

    if (modified) {
      const fieldLabels: Record<string, string> = {
        contract_no: '合同编号',
        contract_name: '合同名称',
        contract_type: '合同类型',
        supplier: '供应商',
        asset_category: '资产类别',
        start_date: '开始日期',
        end_date: '结束日期',
        total_amount: '合同金额',
        currency: '币种',
        status: '合同状态',
        manager: '负责人',
        department: '所属部门',
        warranty_period: '质保期限',
        auto_renewal: '自动续约',
        renewal_notice_days: '续约提醒天数',
        description: '备注'
      }

      const trackedFields = ['contract_no', 'supplier', 'manager', 'start_date', 'end_date', 'total_amount', 'status', 'contract_name', 'contract_type', 'asset_category']
      const changeDetails: string[] = []

      trackedFields.forEach(field => {
        if (data[field as keyof Contract] !== undefined && data[field as keyof Contract] !== oldData[field as keyof Contract]) {
          const oldVal = String(oldData[field as keyof Contract] ?? '')
          const newVal = String(data[field as keyof Contract] ?? '')
          const label = fieldLabels[field] || field

          let displayOld = oldVal
          let displayNew = newVal

          if (field === 'status') {
            const statusMap: Record<string, string> = { active: '执行中', pending: '待执行', completed: '已完成', terminated: '已终止' }
            displayOld = statusMap[oldVal] || oldVal
            displayNew = statusMap[newVal] || newVal
          } else if (field === 'contract_type') {
            const typeMap: Record<string, string> = { purchase: '采购', lease: '租赁', maintenance: '维保' }
            displayOld = typeMap[oldVal] || oldVal
            displayNew = typeMap[newVal] || newVal
          } else if (field === 'total_amount') {
            displayOld = `¥${Number(oldVal).toLocaleString()}`
            displayNew = `¥${Number(newVal).toLocaleString()}`
          } else if (field === 'auto_renewal') {
            displayOld = oldVal === '1' ? '是' : '否'
            displayNew = newVal === '1' ? '是' : '否'
          }

          changeDetails.push(`${label}：${displayOld} → ${displayNew}`)

          getDb().run(
            `INSERT INTO change_logs (contract_id, change_type, field_name, old_value, new_value, description, operator)
             VALUES (?, 'update', ?, ?, ?, ?, ?)`,
            [id, field, oldVal, newVal, `${label}变更：${displayOld} → ${displayNew}`, '系统']
          )
        }
      })

      if (changeDetails.length > 0) {
        getDb().run(
          `INSERT INTO change_logs (contract_id, change_type, field_name, old_value, new_value, description, operator)
           VALUES (?, 'update', NULL, NULL, NULL, ?, ?)`,
          [id, `合同信息变更：${changeDetails.join('；')}`, '系统']
        )
      }

      saveDatabase()
    }

    return modified
  }

  getPerformanceSummary(contractId: number) {
    const paymentSql = `
      SELECT 
        COALESCE(SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END), 0) as paid,
        COALESCE(SUM(amount), 0) as total
      FROM payment_plans WHERE contract_id = ?
    `
    const paymentResult = getDb().exec(paymentSql, [contractId])
    const paymentRow = paymentResult[0]?.values[0] || [0, 0]
    const paid = Number(paymentRow[0])
    const total = Number(paymentRow[1])
    const percentage = total > 0 ? Math.round((paid / total) * 100) : 0

    const assetSql = `SELECT COUNT(*) as bound FROM assets WHERE contract_id = ?`
    const assetResult = getDb().exec(assetSql, [contractId])
    const bound = Number(assetResult[0]?.values[0]?.[0] || 0)

    const reminderSql = `
      SELECT 
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        COUNT(*) as total
      FROM reminders WHERE contract_id = ?
    `
    const reminderResult = getDb().exec(reminderSql, [contractId])
    const reminderRow = reminderResult[0]?.values[0] || [0, 0, 0]
    const pending = Number(reminderRow[0])
    const done = Number(reminderRow[1])
    const reminderTotal = Number(reminderRow[2])

    const docSql = `SELECT COUNT(*) as uploaded FROM documents WHERE contract_id = ?`
    const docResult = getDb().exec(docSql, [contractId])
    const uploaded = Number(docResult[0]?.values[0]?.[0] || 0)

    return {
      paymentProgress: { paid, total, percentage },
      assets: { bound },
      reminders: { pending, done, total: reminderTotal },
      documents: { uploaded }
    }
  }
}

interface Asset {
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

class AssetService extends BaseService<Asset> {
  constructor() {
    super('assets')
  }

  getByContract(contractId: number) {
    const result = getDb().exec(`SELECT * FROM assets WHERE contract_id = ?`, [contractId])
    return result.length > 0 ? rowsToObjects(result[0]) : []
  }

  bindToContract(contractId: number, assetIds: number[]) {
    if (contractId === 0 || contractId === null) {
      assetIds.forEach(id => {
        getDb().run(`UPDATE assets SET contract_id = NULL WHERE id = ?`, [id])
      })
    } else {
      assetIds.forEach(id => {
        getDb().run(`UPDATE assets SET contract_id = ? WHERE id = ?`, [contractId, id])
      })
    }
    saveDatabase()
    return true
  }

  getUnbound() {
    const result = getDb().exec(`SELECT * FROM assets WHERE contract_id IS NULL OR contract_id = 0`)
    return result.length > 0 ? rowsToObjects(result[0]) : []
  }
}

interface PaymentPlan {
  id: number
  contract_id: number
  node_name: string
  due_date: string
  amount: number
  percentage: number
  status: string
  paid_date: string | null
  invoice_no: string | null
  invoice_received: number
  invoice_received_date: string | null
  remark: string
  created_at: string
  updated_at: string
}

class PaymentService extends BaseService<PaymentPlan> {
  constructor() {
    super('payment_plans')
  }

  list(params: any = {}) {
    const { page = 1, pageSize = 20, ...filters } = params
    const whereClauses: string[] = []
    const values: any[] = []

    if (filters.contractId && Array.isArray(filters.contractId) && filters.contractId.length > 0) {
      const placeholders = filters.contractId.map(() => '?').join(',')
      whereClauses.push(`contract_id IN (${placeholders})`)
      values.push(...filters.contractId)
    } else if (filters.contract_id !== undefined && filters.contract_id !== null && filters.contract_id !== '') {
      whereClauses.push(`contract_id = ?`)
      values.push(filters.contract_id)
    }

    if (filters.status && Array.isArray(filters.status) && filters.status.length > 0) {
      const placeholders = filters.status.map(() => '?').join(',')
      whereClauses.push(`status IN (${placeholders})`)
      values.push(...filters.status)
    }

    if (filters.dueDateStart) {
      whereClauses.push(`due_date >= ?`)
      values.push(filters.dueDateStart)
    }
    if (filters.dueDateEnd) {
      whereClauses.push(`due_date <= ?`)
      values.push(filters.dueDateEnd)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
    const countSql = `SELECT COUNT(*) as total FROM ${this.tableName} ${whereSql}`
    const dataSql = `SELECT * FROM ${this.tableName} ${whereSql} ORDER BY due_date ASC LIMIT ? OFFSET ?`

    const countResult = getDb().exec(countSql, values)
    const total = countResult[0]?.values[0]?.[0] as number || 0

    const dataResult = getDb().exec(dataSql, [...values, pageSize, (page - 1) * pageSize])
    const list = dataResult.length > 0 ? rowsToObjects(dataResult[0]) : []

    return { list, total, page, pageSize }
  }

  getByContract(contractId: number) {
    const result = getDb().exec(`SELECT * FROM payment_plans WHERE contract_id = ? ORDER BY due_date ASC`, [contractId])
    return result.length > 0 ? rowsToObjects(result[0]) : []
  }

  markPaid(id: number, paidDate: string, invoiceNo: string, invoiceReceived: number) {
    const sql = `UPDATE payment_plans SET status = 'paid', paid_date = ?, invoice_no = ?, invoice_received = ?, invoice_received_date = CASE WHEN ? = 1 THEN CURRENT_TIMESTAMP ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    getDb().run(sql, [paidDate, invoiceNo || null, invoiceReceived, invoiceReceived, id])
    saveDatabase()
    return getDb().getRowsModified() > 0
  }

  recordInvoice(id: number, invoiceNo: string, receivedDate: string) {
    const sql = `UPDATE payment_plans SET invoice_no = ?, invoice_received = 1, invoice_received_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
    getDb().run(sql, [invoiceNo, receivedDate, id])
    saveDatabase()
    return getDb().getRowsModified() > 0
  }
}

interface Reminder {
  id: number
  contract_id: number | null
  reminder_type: string
  title: string
  description: string
  due_date: string
  status: string
  priority: string
  completed_at: string | null
  completed_note: string | null
  created_at: string
  contract_no?: string
  contract_name?: string
}

class ReminderService extends BaseService<Reminder> {
  constructor() {
    super('reminders')
  }

  list(params: any = {}) {
    const { page = 1, pageSize = 20, ...filters } = params
    const whereClauses: string[] = []
    const values: any[] = []

    if (filters.status) {
      if (Array.isArray(filters.status)) {
        const placeholders = filters.status.map(() => '?').join(',')
        whereClauses.push(`r.status IN (${placeholders})`)
        values.push(...filters.status)
      } else {
        whereClauses.push(`r.status = ?`)
        values.push(filters.status)
      }
    }
    if (filters.reminder_type) {
      whereClauses.push(`r.reminder_type = ?`)
      values.push(filters.reminder_type)
    }
    if (filters.priority) {
      whereClauses.push(`r.priority = ?`)
      values.push(filters.priority)
    }
    if (filters.contract_id) {
      whereClauses.push(`r.contract_id = ?`)
      values.push(filters.contract_id)
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''
    const countSql = `SELECT COUNT(*) as total FROM reminders r ${whereSql}`
    const dataSql = `
      SELECT r.*, c.contract_no, c.contract_name
      FROM reminders r
      LEFT JOIN contracts c ON r.contract_id = c.id
      ${whereSql}
      ORDER BY
        CASE r.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        r.due_date ASC
      LIMIT ? OFFSET ?
    `

    const countResult = getDb().exec(countSql, values)
    const total = countResult[0]?.values[0]?.[0] as number || 0
    const dataResult = getDb().exec(dataSql, [...values, pageSize, (page - 1) * pageSize])
    const list = dataResult.length > 0 ? rowsToObjects(dataResult[0]) : []

    return { list, total, page, pageSize }
  }

  getPending() {
    const sql = `
      SELECT r.*, c.contract_no, c.contract_name 
      FROM reminders r 
      LEFT JOIN contracts c ON r.contract_id = c.id 
      WHERE r.status = 'pending' 
      ORDER BY 
        CASE r.priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        r.due_date ASC
    `
    const result = getDb().exec(sql)
    return result.length > 0 ? rowsToObjects(result[0]) : []
  }

  markDone(id: number, note?: string) {
    const sql = `UPDATE reminders SET status = 'done', completed_at = CURRENT_TIMESTAMP, completed_note = ? WHERE id = ?`
    getDb().run(sql, [note || null, id])
    saveDatabase()
    return getDb().getRowsModified() > 0
  }

  getByContract(contractId: number) {
    const result = getDb().exec(`SELECT * FROM reminders WHERE contract_id = ?`, [contractId])
    return result.length > 0 ? rowsToObjects(result[0]) : []
  }

  generateTodos() {
    const expiringSql = `
      SELECT * FROM contracts 
      WHERE status = 'active' 
      AND julianday(end_date) - julianday('now') <= renewal_notice_days
      AND NOT EXISTS (
        SELECT 1 FROM reminders 
        WHERE reminders.contract_id = contracts.id 
        AND reminders.reminder_type = 'renewal' 
        AND reminders.status = 'pending'
      )
    `
    const expiringResult = getDb().exec(expiringSql)
    const expiringContracts = expiringResult.length > 0 ? rowsToObjects(expiringResult[0]) : [] as Contract[]

    const insertStmt = `
      INSERT INTO reminders (contract_id, reminder_type, title, description, due_date, status, priority)
      VALUES (?, 'renewal', ?, ?, ?, 'pending', 'high')
    `

    expiringContracts.forEach((contract: Contract) => {
      const dueDate = dayjs(contract.end_date).subtract(contract.renewal_notice_days, 'day')
      const title = `${contract.contract_name} - 续约提醒`
      const desc = `合同号：${contract.contract_no}，供应商：${contract.supplier}，合同将于 ${contract.end_date} 到期`
      getDb().run(insertStmt, [contract.id, title, desc, dueDate.format('YYYY-MM-DD')])
    })

    saveDatabase()
    return this.getPending()
  }
}

interface Document {
  id: number
  contract_id: number
  document_type: string
  document_name: string
  file_path: string
  file_size: number
  upload_date: string
  remark: string
}

class DocumentService extends BaseService<Document> {
  constructor() {
    super('documents')
  }

  getByContract(contractId: number) {
    const result = getDb().exec(`SELECT * FROM documents WHERE contract_id = ? ORDER BY upload_date DESC`, [contractId])
    return result.length > 0 ? rowsToObjects(result[0]) : []
  }

  upload(contractId: number, type: string, filePath: string) {
    const fs = require('fs')
    const path = require('path')
    const userData = app.getPath('userData')
    const uploadDir = path.join(userData, 'uploads', String(contractId))
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const fileName = path.basename(filePath)
    const destPath = path.join(uploadDir, `${Date.now()}_${fileName}`)
    copyFileSync(filePath, destPath)
    const stats = statSync(destPath)

    return this.create({
      contract_id: contractId,
      document_type: type,
      document_name: fileName,
      file_path: destPath,
      file_size: stats.size,
      remark: ''
    })
  }
}

interface ChangeLog {
  id: number
  contract_id: number
  change_type: string
  field_name: string | null
  old_value: string | null
  new_value: string | null
  description: string
  operator: string | null
  created_at: string
}

class ChangeLogService extends BaseService<ChangeLog> {
  constructor() {
    super('change_logs')
  }

  getByContract(contractId: number) {
    const result = getDb().exec(`SELECT * FROM change_logs WHERE contract_id = ? ORDER BY created_at DESC`, [contractId])
    return result.length > 0 ? rowsToObjects(result[0]) : []
  }
}

class ExportService {
  private buildLedgerQuery(year: number, month: number, filters?: { status?: string[]; manager?: string; assetCategory?: string }) {
    const startDate = `${year}-${String(month).padStart(2, '0')}-01`
    const endDate = dayjs(startDate).endOf('month').format('YYYY-MM-DD')
    const whereClauses: string[] = [`c.created_at BETWEEN ? AND ?`]
    const values: any[] = [startDate, endDate]

    if (filters?.status && filters.status.length > 0) {
      const placeholders = filters.status.map(() => '?').join(',')
      whereClauses.push(`c.status IN (${placeholders})`)
      values.push(...filters.status)
    }
    if (filters?.manager) {
      whereClauses.push(`c.manager LIKE ?`)
      values.push(`%${filters.manager}%`)
    }
    if (filters?.assetCategory) {
      whereClauses.push(`c.asset_category = ?`)
      values.push(filters.assetCategory)
    }

    const whereSql = `WHERE ${whereClauses.join(' AND ')}`
    const sql = `
      SELECT 
        c.contract_no, c.contract_name, c.contract_type, c.supplier, c.asset_category,
        c.start_date, c.end_date, c.total_amount, c.status, c.manager, c.department,
        COUNT(DISTINCT a.id) as asset_count,
        SUM(CASE WHEN p.status = 'paid' THEN p.amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) as pending_amount
      FROM contracts c
      LEFT JOIN assets a ON c.id = a.contract_id
      LEFT JOIN payment_plans p ON c.id = p.contract_id
      ${whereSql}
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `
    return { sql, values, startDate, endDate }
  }

  previewMonthlyLedger(year: number, month: number, filters?: { status?: string[]; manager?: string; assetCategory?: string }) {
    const { sql, values } = this.buildLedgerQuery(year, month, filters)
    const result = getDb().exec(sql, values)
    const data = result.length > 0 ? rowsToObjects(result[0]) : []

    const typeMap: Record<string, string> = { purchase: '采购', lease: '租赁', maintenance: '维保' }
    const statusMap: Record<string, string> = { active: '执行中', pending: '待执行', completed: '已完成', terminated: '已终止', expired: '已过期' }

    const previewData = data.map((row: any) => ({
      contract_no: row.contract_no,
      contract_name: row.contract_name,
      contract_type: typeMap[row.contract_type] || row.contract_type,
      supplier: row.supplier,
      asset_category: row.asset_category,
      start_date: row.start_date,
      end_date: row.end_date,
      amount: row.total_amount,
      status: row.status,
      status_label: statusMap[row.status] || row.status,
      manager: row.manager,
      department: row.department,
      asset_count: row.asset_count || 0,
      paid_amount: row.paid_amount || 0,
      pending_amount: row.pending_amount || 0
    }))

    const totalAmount = previewData.reduce((sum: number, row: any) => sum + row.amount, 0)
    const totalPaid = previewData.reduce((sum: number, row: any) => sum + row.paid_amount, 0)
    const totalPending = previewData.reduce((sum: number, row: any) => sum + row.pending_amount, 0)

    return {
      success: true,
      data: previewData,
      count: previewData.length,
      totalAmount,
      totalPaid,
      totalPending
    }
  }

  exportMonthlyLedger(year: number, month: number, filePath: string, filters?: { status?: string[]; manager?: string; assetCategory?: string }) {
    const preview = this.previewMonthlyLedger(year, month, filters)

    const exportData = preview.data.map((row: any) => ({
      '合同编号': row.contract_no,
      '合同名称': row.contract_name,
      '合同类型': row.contract_type,
      '供应商': row.supplier,
      '资产类别': row.asset_category,
      '开始日期': row.start_date,
      '结束日期': row.end_date,
      '合同金额(元)': row.amount,
      '合同状态': row.status_label,
      '负责人': row.manager,
      '所属部门': row.department,
      '关联资产数': row.asset_count,
      '已支付金额(元)': row.paid_amount,
      '待支付金额(元)': row.pending_amount
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 30 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 10 }, { wch: 10 },
      { wch: 12 }, { wch: 12 }, { wch: 15 }, { wch: 15 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, '合同台账')
    XLSX.writeFile(wb, filePath)
    return { success: true, filePath, count: exportData.length }
  }

  exportExpiringList(filePath: string) {
    const ninetyDaysLater = dayjs().add(90, 'day').format('YYYY-MM-DD')

    const sql = `
      SELECT 
        c.*,
        julianday(c.end_date) - julianday('now') as days_left
      FROM contracts c
      WHERE c.status = 'active'
      AND c.end_date <= ?
      ORDER BY c.end_date ASC
    `
    const result = getDb().exec(sql, [ninetyDaysLater])
    const data = result.length > 0 ? rowsToObjects(result[0]) : []

    const typeMap: Record<string, string> = { purchase: '采购', lease: '租赁', maintenance: '维保' }

    const exportData = data.map((row: any) => ({
      '合同编号': row.contract_no,
      '合同名称': row.contract_name,
      '合同类型': typeMap[row.contract_type] || row.contract_type,
      '供应商': row.supplier,
      '资产类别': row.asset_category,
      '开始日期': row.start_date,
      '结束日期': row.end_date,
      '剩余天数': Math.max(0, Math.floor(row.days_left)),
      '合同金额(元)': row.total_amount,
      '负责人': row.manager,
      '是否自动续约': row.auto_renewal ? '是' : '否',
      '备注': `请于${row.renewal_notice_days}天前处理续约`
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(exportData)
    ws['!cols'] = [
      { wch: 15 }, { wch: 25 }, { wch: 10 }, { wch: 30 }, { wch: 12 },
      { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 15 }, { wch: 10 },
      { wch: 12 }, { wch: 25 }
    ]
    XLSX.utils.book_append_sheet(wb, ws, '即将到期清单')
    XLSX.writeFile(wb, filePath)
    return { success: true, filePath, count: exportData.length }
  }
}

let contractService: ContractService | null = null
let assetService: AssetService | null = null
let paymentService: PaymentService | null = null
let reminderService: ReminderService | null = null
let documentService: DocumentService | null = null
let changeLogService: ChangeLogService | null = null
let exportService: ExportService | null = null

export function getContractService() {
  if (!contractService) contractService = new ContractService()
  return contractService
}

export function getAssetService() {
  if (!assetService) assetService = new AssetService()
  return assetService
}

export function getPaymentService() {
  if (!paymentService) paymentService = new PaymentService()
  return paymentService
}

export function getReminderService() {
  if (!reminderService) reminderService = new ReminderService()
  return reminderService
}

export function getDocumentService() {
  if (!documentService) documentService = new DocumentService()
  return documentService
}

export function getChangeLogService() {
  if (!changeLogService) changeLogService = new ChangeLogService()
  return changeLogService
}

export function getExportService() {
  if (!exportService) exportService = new ExportService()
  return exportService
}

export { initDatabase }
