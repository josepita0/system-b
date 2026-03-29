-- Cuentas cliente (pagarés): consumo en tab_charge no suma a caja del turno; tab_payment liquida en el turno donde se cobra.

CREATE TABLE IF NOT EXISTS customer_tabs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled')),
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  opened_cash_session_id INTEGER NOT NULL,
  opened_by_employee_id INTEGER,
  settled_at TEXT,
  settled_cash_session_id INTEGER,
  FOREIGN KEY (opened_cash_session_id) REFERENCES cash_sessions(id),
  FOREIGN KEY (opened_by_employee_id) REFERENCES employees(id),
  FOREIGN KEY (settled_cash_session_id) REFERENCES cash_sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_customer_tabs_status ON customer_tabs(status);

ALTER TABLE sales ADD COLUMN tab_id INTEGER REFERENCES customer_tabs(id);

CREATE INDEX IF NOT EXISTS idx_sales_tab_id ON sales(tab_id);

-- Monto "por conciliar" snapshot al cerrar el turno (cargos a cuenta de este turno aún abiertos).
ALTER TABLE cash_sessions ADD COLUMN pending_reconcile_total REAL;
