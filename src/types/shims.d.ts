declare module 'sql.js' {
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | Buffer | null) => Database
  }

  export interface Database {
    run(sql: string, params?: any[]): Database
    exec(sql: string, params?: any[]): QueryResult[]
    prepare(sql: string): Statement
    export(): Uint8Array
    getRowsModified(): number
    close(): void
  }

  export interface Statement {
    get(params?: any[]): any[]
    all(params?: any[]): any[][]
    run(params?: any[]): void
    reset(): void
    free(): boolean
  }

  export interface QueryResult {
    columns: string[]
    values: any[][]
  }

  export default function initSqlJs(config?: any): Promise<SqlJsStatic>
}

declare module 'element-plus/dist/locale/zh-cn.mjs' {
  const locale: any
  export default locale
}
