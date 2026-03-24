export interface SerializedIpcError {
  code: string
  message: string
  status: number
}

export type IpcResult<T> =
  | {
      ok: true
      data: T
    }
  | {
      ok: false
      error: SerializedIpcError
    }
