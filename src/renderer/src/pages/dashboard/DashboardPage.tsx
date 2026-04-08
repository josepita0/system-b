import { useMemo, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Card } from '@renderer/components/ui/Card'
import { Button } from '@renderer/components/ui/Button'
import { cn } from '@renderer/lib/cn'
import type { DashboardOverview } from '@shared/types/dashboard'

type IsoDate = `${number}-${number}-${number}`

function toIsoDate(d: Date): IsoDate {
  const year = d.getFullYear()
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}` as IsoDate
}

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, days: number) {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

function clampIsoRange(from: string, to: string) {
  if (from && to && from > to) {
    return { from: to, to: from }
  }
  return { from, to }
}

function formatMoney(n: number) {
  return n.toLocaleString('es-VE', { style: 'currency', currency: 'EUR' })
}

function csvEscape(v: unknown) {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) {
    return `"${s.replaceAll('"', '""')}"`
  }
  return s
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

function DayPill({
  label,
  date,
  amount,
  tx,
  best,
}: {
  label: string
  date: string
  amount: number
  tx: number
  best: boolean
}) {
  return (
    <div
      className={cn(
        'flex min-w-0 flex-1 flex-col rounded-2xl border border-border bg-surface-card p-3 shadow-sm transition-colors',
        best ? 'ring-2 ring-brand/30' : 'hover:bg-slate-50',
      )}
      title={`${label} ${date}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{date}</p>
        </div>
        {best ? (
          <span className="inline-flex shrink-0 items-center rounded-full bg-brand-muted px-2 py-0.5 text-[11px] font-semibold text-brand">
            Mejor día
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xl font-semibold tabular-nums text-slate-900">{formatMoney(amount)}</p>
      <p className="mt-1 text-xs text-slate-500">{tx} transacciones</p>
      <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
        <div className={cn('h-2 rounded-full bg-brand transition-[width] duration-200')} style={{ width: '45%' }} />
      </div>
    </div>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  valueClassName,
}: {
  title: string
  value: string
  subtitle: string
  valueClassName?: string
}) {
  return (
    <Card className="shadow-sm" padding="md">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{title}</p>
      <p className={cn('mt-1 text-3xl font-semibold tabular-nums text-slate-900', valueClassName)}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
    </Card>
  )
}

export function DashboardPage() {
  const queryClient = useQueryClient()

  const defaultRange = useMemo(() => {
    const today = startOfDay(new Date())
    const from = addDays(today, -6)
    return { from: toIsoDate(from), to: toIsoDate(today) }
  }, [])

  const [from, setFrom] = useState<string>(defaultRange.from)
  const [to, setTo] = useState<string>(defaultRange.to)
  const [employeeId, setEmployeeId] = useState<number | 'all'>('all')

  const range = useMemo(() => clampIsoRange(from, to), [from, to])

  const overviewQuery = useQuery<DashboardOverview>({
    queryKey: ['dashboard', 'overview', range.from, range.to, employeeId],
    queryFn: () =>
      window.api.dashboard.getOverview({
        from: range.from as any,
        to: range.to as any,
        ...(employeeId === 'all' ? {} : { employeeId }),
      }),
  })

  const kpis = overviewQuery.data?.kpis
  const employees = overviewQuery.data?.employees ?? []

  const weekDays = useMemo(() => {
    const start = new Date(range.from)
    return Array.from({ length: 7 }).map((_, idx) => {
      const d = addDays(start, idx)
      const dayIndex = d.getDay() // 0 Sun .. 6 Sat
      const labels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
      return { label: labels[dayIndex] ?? '-', date: toIsoDate(d) }
    })
  }, [range.from])

  const daily = overviewQuery.data?.dailySales ?? []
  const dailyMap = useMemo(() => new Map(daily.map((r) => [r.businessDate, r])), [daily])
  const salesDays = useMemo(() => {
    return weekDays.map((d) => {
      const row = dailyMap.get(d.date)
      return {
        ...d,
        amount: row?.paidTotal ?? 0,
        tx: row?.paidTransactions ?? 0,
      }
    })
  }, [dailyMap, weekDays])

  const bestDay = useMemo(() => {
    let best = salesDays[0]?.date
    let bestValue = -1
    for (const d of salesDays) {
      if (d.amount > bestValue) {
        bestValue = d.amount
        best = d.date
      }
    }
    return best
  }, [salesDays])

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const handleExport = () => {
    const data = overviewQuery.data
    if (!data) {
      window.alert('No hay datos para exportar.')
      return
    }

    const lines: string[] = []
    lines.push(`Dashboard (desde ${data.input.from} hasta ${data.input.to})`)
    lines.push('')

    lines.push('KPIs')
    lines.push(['paidTotal', 'paidTransactions', 'tabChargeTotal', 'tabChargeTransactions'].map(csvEscape).join(','))
    lines.push(
      [
        data.kpis.sales.paidTotal,
        data.kpis.sales.paidTransactions,
        data.kpis.sales.tabChargeTotal,
        data.kpis.sales.tabChargeTransactions,
      ]
        .map(csvEscape)
        .join(','),
    )
    lines.push('')

    lines.push('VentasPorDia')
    lines.push(['businessDate', 'paidTotal', 'paidTransactions', 'tabChargeTotal', 'tabChargeTransactions'].map(csvEscape).join(','))
    for (const r of data.dailySales) {
      lines.push([r.businessDate, r.paidTotal, r.paidTransactions, r.tabChargeTotal, r.tabChargeTransactions].map(csvEscape).join(','))
    }
    lines.push('')

    lines.push('TopEmpleados')
    lines.push(['employeeId', 'displayName', 'paidTotal', 'paidTransactions', 'paidPctOfTotal'].map(csvEscape).join(','))
    for (const r of data.topEmployees) {
      lines.push([r.employeeId, r.displayName, r.paidTotal, r.paidTransactions, r.paidPctOfTotal].map(csvEscape).join(','))
    }
    lines.push('')

    lines.push('TopProductos')
    lines.push(['productId', 'productName', 'quantitySold', 'revenuePaid', 'revenueTabCharge', 'barPct'].map(csvEscape).join(','))
    for (const r of data.topProducts) {
      lines.push([r.productId, r.productName, r.quantitySold, r.revenuePaid, r.revenueTabCharge, r.barPct].map(csvEscape).join(','))
    }

    downloadTextFile(`dashboard_${data.input.from}_a_${data.input.to}.csv`, lines.join('\n'))
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold text-slate-900">Dashboard de Ventas - Bar</h1>
          <p className="mt-1 text-sm text-slate-600">Monitoreo operativo: ventas, inventario, cuentas por cobrar y desempeño.</p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-end">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Desde</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                onChange={(e) => setFrom(e.target.value)}
                type="date"
                value={range.from}
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-slate-600">Hasta</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
                onChange={(e) => setTo(e.target.value)}
                type="date"
                value={range.to}
              />
            </label>
          </div>

          <label className="block">
            <span className="text-xs font-medium text-slate-600">Empleado</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
              onChange={(e) => setEmployeeId(e.target.value === 'all' ? 'all' : Number(e.target.value))}
              value={String(employeeId)}
            >
              <option value="all">Todos</option>
              {employees.map((e) => (
                <option key={e.id} value={String(e.id)}>
                  {e.displayName}
                </option>
              ))}
            </select>
          </label>

          <div className="flex gap-2">
            <Button onClick={handleRefresh} variant="secondary">
              Actualizar
            </Button>
            {/* <Button onClick={handleExport} variant="primary">
              Exportar
            </Button> */}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          subtitle="Productos simples con control de inventario."
          title="Stock actual"
          value={overviewQuery.isLoading ? '…' : String(kpis?.inventory.totalProducts ?? 0)}
        />
        <KpiCard
          subtitle="Saldo igual o por debajo del mínimo configurado."
          title="Productos para reponer"
          value={overviewQuery.isLoading ? '…' : String(kpis?.inventory.lowStockCount ?? 0)}
          valueClassName="text-amber-800"
        />
        <KpiCard
          subtitle="Saldo total en cuentas abiertas."
          title="Cuentas pendientes"
          value={overviewQuery.isLoading ? '…' : formatMoney(kpis?.receivables.pendingTotal ?? 0)}
        />
        <KpiCard
          subtitle="Total de cargos a cuenta dentro del rango."
          title="Cargos a cuenta (rango)"
          value={overviewQuery.isLoading ? '…' : formatMoney(kpis?.sales.tabChargeTotal ?? 0)}
        />
      </div>

      <Card className="shadow-sm" padding="md">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Ventas por día</h2>
            <p className="mt-1 text-xs text-slate-500">Semana completa (L–D). Se resaltará el mejor día por ventas cobradas.</p>
          </div>
          <p className="text-xs text-slate-500">
            Rango: <span className="font-medium tabular-nums text-slate-700">{range.from}</span> –{' '}
            <span className="font-medium tabular-nums text-slate-700">{range.to}</span>
          </p>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-7">
          {salesDays.map((d) => (
            <DayPill amount={d.amount} best={d.date === bestDay} date={d.date} key={d.date} label={d.label} tx={d.tx} />
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="flex min-h-0 flex-col shadow-sm" padding="md">
          <h2 className="text-lg font-semibold text-slate-900">Top empleados de la semana</h2>
          <p className="mt-1 text-xs text-slate-500">Máximo 5–7, ordenado por ventas cobradas. Badge para el #1.</p>
          {overviewQuery.isLoading ? (
            <div className="mt-4 text-sm text-slate-500">Cargando...</div>
          ) : overviewQuery.error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {overviewQuery.error instanceof Error ? overviewQuery.error.message : 'No fue posible cargar el dashboard.'}
            </div>
          ) : (
            <div className="mt-3 h-[260px] min-h-0 flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-white">
              <table className="min-w-full text-left text-sm text-slate-800">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th className="px-4 py-3">Empleado</th>
                    <th className="px-4 py-3 text-right">Ventas</th>
                    <th className="px-4 py-3 text-right">Tx</th>
                    <th className="px-4 py-3 text-right">%</th>
                  </tr>
                </thead>
                <tbody>
                  {(overviewQuery.data?.topEmployees ?? []).map((r, idx) => (
                    <tr className="border-t border-slate-200 hover:bg-slate-50" key={r.employeeId}>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-muted text-sm font-semibold text-brand">
                            {r.displayName
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0]?.toUpperCase())
                              .join('')}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="truncate">{r.displayName}</span>
                              {idx === 0 ? (
                                <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
                                  #1
                                </span>
                              ) : null}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatMoney(r.paidTotal)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{r.paidTransactions}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{(r.paidPctOfTotal * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                  {(overviewQuery.data?.topEmployees ?? []).length === 0 ? (
                    <tr>
                      <td className="px-4 py-8 text-center text-slate-500" colSpan={4}>
                        Sin datos en el rango.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="flex min-h-0 flex-col shadow-sm" padding="md">
          <h2 className="text-lg font-semibold text-slate-900">Productos más vendidos</h2>
          <p className="mt-1 text-xs text-slate-500">Máximo 8–10, con barras horizontales comparativas.</p>
          {overviewQuery.isLoading ? (
            <div className="mt-4 text-sm text-slate-500">Cargando...</div>
          ) : overviewQuery.error ? (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
              {overviewQuery.error instanceof Error ? overviewQuery.error.message : 'No fue posible cargar el dashboard.'}
            </div>
          ) : (
            <div className="mt-3 h-[260px] min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-3">
              {(overviewQuery.data?.topProducts ?? []).map((p) => (
                <div className="rounded-2xl border border-slate-200 bg-white p-4" key={p.productId}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">{p.productName}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {p.quantitySold} uds · {formatMoney(p.revenuePaid)} cobradas
                      </p>
                    </div>
                    <p className="shrink-0 text-xs font-medium tabular-nums text-slate-600">{(p.barPct * 100).toFixed(0)}%</p>
                  </div>
                  <div className="mt-3 h-2 w-full rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-brand transition-[width] duration-200" style={{ width: `${Math.max(0, Math.min(1, p.barPct)) * 100}%` }} />
                  </div>
                </div>
              ))}
              {(overviewQuery.data?.topProducts ?? []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-sm text-slate-500">
                  Sin datos en el rango.
                </div>
              ) : null}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

