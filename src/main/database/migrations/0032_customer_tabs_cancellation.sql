PRAGMA foreign_keys=off;

CREATE TABLE IF NOT EXISTS customer_tabs_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'settled', 'cancelled')),
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  opened_cash_session_id INTEGER NOT NULL,
  opened_by_employee_id INTEGER,
  settled_at TEXT,
  settled_cash_session_id INTEGER,
  cancelled_at TEXT,
  cancelled_cash_session_id INTEGER,
  cancelled_by_employee_id INTEGER,
  cancel_reason TEXT,
  FOREIGN KEY (opened_cash_session_id) REFERENCES cash_sessions(id),
  FOREIGN KEY (opened_by_employee_id) REFERENCES employees(id),
  FOREIGN KEY (settled_cash_session_id) REFERENCES cash_sessions(id),
  FOREIGN KEY (cancelled_cash_session_id) REFERENCES cash_sessions(id),
  FOREIGN KEY (cancelled_by_employee_id) REFERENCES employees(id)
);

INSERT INTO customer_tabs_new (
  id, customer_name, status, opened_at, opened_cash_session_id, opened_by_employee_id, settled_at, settled_cash_session_id
)
SELECT
  id, customer_name, status, opened_at, opened_cash_session_id, opened_by_employee_id, settled_at, settled_cash_session_id
FROM customer_tabs;

DROP TABLE customer_tabs;
ALTER TABLE customer_tabs_new RENAME TO customer_tabs;

CREATE INDEX IF NOT EXISTS idx_customer_tabs_status ON customer_tabs(status);

PRAGMA foreign_keys=on;

