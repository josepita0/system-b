import { AppError } from '../errors'

export async function executeIpc<T>(handler: () => Promise<T> | T) {
  try {
    return await handler()
  } catch (error) {
    if (error instanceof AppError) {
      throw error
    }

    throw new AppError('INTERNAL_ERROR', error instanceof Error ? error.message : 'Error interno', 500)
  }
}
