import type { IpcResult } from '../../shared/ipc/result'
import { toSerializedIpcError } from '../errors'

export async function executeIpc<T>(handler: () => Promise<T> | T): Promise<IpcResult<T>> {
  try {
    return {
      ok: true,
      data: await handler(),
    }
  } catch (error) {
    console.error('[IPC]', error)
    return {
      ok: false,
      error: toSerializedIpcError(error),
    }
  }
}
