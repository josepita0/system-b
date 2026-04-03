import { parentPort, workerData } from 'node:worker_threads'
import { createDatabase } from '../database/connection'
import { generateShiftCloseReport } from '../services/reportBuilder'

type WorkerPayload = { sessionId: number; databasePath: string }

async function run() {
  const { sessionId, databasePath } = workerData as WorkerPayload
  const db = createDatabase(databasePath)

  try {
    const result = await generateShiftCloseReport(db, Number(sessionId))
    parentPort?.postMessage({ ok: true, data: result })
  } catch (error) {
    parentPort?.postMessage({
      ok: false,
      error: error instanceof Error ? error.message : 'No fue posible generar el reporte.',
    })
  } finally {
    db.close()
  }
}

void run()
