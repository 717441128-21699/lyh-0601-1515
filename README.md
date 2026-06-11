# 企业资产合同台账桌面客户端

## 项目简介

面向行政和财务部门的企业资产合同台账管理系统，用于管理设备采购、租赁、维保合同的全生命周期。

## 技术栈

- **前端框架**: Vue 3 + TypeScript
- **UI 组件库**: Element Plus
- **状态管理**: Pinia
- **路由**: Vue Router
- **桌面框架**: Electron 28
- **数据库**: SQL.js (SQLite 纯 JavaScript 实现)
- **构建工具**: Vite 5
- **Excel 导出**: SheetJS (xlsx)

## 核心功能模块

### 1. 合同列表
- 合同信息表格展示（合同编号、名称、类型、供应商、期限、金额、状态、负责人等）
- 多条件筛选：关键词搜索、合同状态多选、到期月份、资产类别多选
- 新增/编辑/删除合同
- 分页功能
- 点击行跳转到合同详情

### 2. 合同详情
- 合同基本信息卡片展示
- 文档管理：上传合同正本、扫描件、验收材料、发票等
- 变更记录：时间线展示合同所有变更历史
- 快捷操作：编辑合同、设置提醒、导出合同

### 3. 资产关联
- 左侧：资产列表（卡片式展示，支持筛选）
- 右侧：合同关联面板
  - 选择合同查看已绑定资产
  - 批量绑定/解绑资产
- 资产详情：查看资产对应的合同义务（维保服务、付款责任等）
- 新增/编辑/删除资产

### 4. 付款计划
- 付款节点管理：登记各期付款节点、金额、占比
- 付款进度跟踪：可视化进度条展示已付/待付金额
- 发票管理：登记发票收到情况、发票号
- 标记付款：记录实际支付日期、发票信息
- 按合同、状态、日期范围筛选

### 5. 提醒中心
- 待办清单：按优先级（高/中/低）分组展示
- 提醒类型：续约提醒、付款提醒、质保提醒、其他
- 自动生成待办：扫描即将到期合同，自动生成续约提醒
- 新增/编辑/删除提醒
- 标记完成
- 统计卡片：待办总数、今日到期、即将到期、已完成

## 数据导出

- **月度合同台账导出**：导出指定月份的所有合同信息（含关联资产数、已付/待付金额）
- **即将到期清单导出**：导出未来90天内到期的合同清单（含剩余天数、续约提醒）

## 数据库表结构

### contracts（合同表）
- 合同编号、名称、类型、供应商、资产类别
- 开始/结束日期、合同金额、币种、状态
- 负责人、所属部门、质保期限、自动续约设置

### assets（资产表）
- 资产编号、名称、类别、品牌、型号、规格
- 购置日期、价值、存放位置、状态
- 关联合同ID

### payment_plans（付款计划表）
- 所属合同、节点名称、到期日期、金额、占比
- 付款状态、实际支付日期、发票号、发票是否收到

### reminders（提醒表）
- 关联合同、提醒类型、标题、描述、到期日期
- 状态（待办/已完成）、优先级

### documents（文档表）
- 所属合同、文档类型、名称、文件路径、大小、上传日期

### change_logs（变更日志表）
- 所属合同、变更类型、字段变更详情、描述、操作人

## Mock 数据

首次运行时会自动生成示例数据：
- 8 份合同（采购、租赁、维保各类型）
- 15 台资产（IT设备、办公设备、家具、特种设备等）
- 13 条付款计划
- 10 条待办提醒

## 安装运行

### 环境要求
- Node.js >= 18
- Windows / macOS / Linux

### 安装依赖
```bash
npm install
```

### 解决 Electron 下载问题（中国大陆用户）
如果 Electron 二进制文件下载失败，请设置国内镜像：

**PowerShell:**
```powershell
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
cd node_modules/electron
node install.js
```

**CMD:**
```cmd
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
cd node_modules/electron
node install.js
```

### 开发模式运行
```bash
npm run dev
```

### 构建生产版本
```bash
npm run build
```

### 仅类型检查
```bash
npm run typecheck
```

## 项目结构

```
├── electron/              # Electron 主进程代码
│   ├── database/          # 数据库层
│   │   └── index.ts       # 数据库初始化、表结构、服务类
│   ├── main.ts            # 主进程入口
│   └── preload.ts         # 预加载脚本（IPC 通信）
├── src/                   # 前端渲染进程代码
│   ├── views/             # 页面组件
│   │   ├── ContractList.vue    # 合同列表
│   │   ├── ContractDetail.vue  # 合同详情
│   │   ├── AssetList.vue       # 资产关联
│   │   ├── PaymentList.vue     # 付款计划
│   │   └── ReminderCenter.vue  # 提醒中心
│   ├── stores/            # Pinia 状态管理
│   │   └── contract.ts
│   ├── types/             # TypeScript 类型定义
│   │   ├── index.ts
│   │   └── shims.d.ts
│   ├── router/            # 路由配置
│   │   └── index.ts
│   ├── styles/            # 全局样式
│   │   └── index.css
│   ├── App.vue            # 根组件（主布局）
│   └── main.ts            # 前端入口
├── public/
│   └── favicon.svg
├── index.html
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## 数据库文件位置

- Windows: `%APPDATA%\contract_ledger\database\contract_ledger.db`
- macOS: `~/Library/Application Support/contract_ledger/database/contract_ledger.db`
- Linux: `~/.config/contract_ledger/database/contract_ledger.db`

## 文档上传位置

上传的文档保存在：
- Windows: `%APPDATA%\contract_ledger\uploads\<合同ID>\`
- macOS: `~/Library/Application Support/contract_ledger/uploads/<合同ID>/`
- Linux: `~/.config/contract_ledger/uploads/<合同ID>/`

## 开发说明

### IPC 通信

前端通过 `window.api` 对象调用主进程方法：

```typescript
// 获取合同列表
const result = await window.api.contract.list({ page: 1, pageSize: 20 })

// 创建合同
const id = await window.api.contract.create(contractData)

// 导出数据
await window.api.export.monthlyLedger(2024, 6)
```

### 新增数据服务

如需新增数据模块，在 `electron/database/index.ts` 中继承 `BaseService<T>`：

```typescript
class MyService extends BaseService<MyType> {
  constructor() {
    super('table_name')
  }
  // 自定义方法...
}
```

## 常见问题

### 1. 运行时提示 "Electron failed to install correctly"
这是因为 Electron 二进制文件未正确下载，请按上述 "解决 Electron 下载问题" 步骤操作。

### 2. 数据库报错 "Database not initialized"
确保 `initDatabase()` 在应用启动时被调用，且调用是异步的。

### 3. 中文显示乱码
确保数据库连接和 HTML 页面都使用 UTF-8 编码。

## 许可证

MIT License
