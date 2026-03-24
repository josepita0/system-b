import { parentPort, workerData } from 'node:worker_threads'
import { createDatabase, getDatabasePath } from '../database/connection'
import { generateShiftCloseReport } from '../services/reportBuilder'

async function run() {
  const db = createDatabase(getDatabasePath())

  try {
    const result = await generateShiftCloseReport(db, Number(workerData.sessionId))
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
