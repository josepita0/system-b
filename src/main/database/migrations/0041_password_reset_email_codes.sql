CREATE TABLE IF NOT EXISTS password_reset_email_codes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER NOT NULL,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  requested_by_employee_id INTEGER,
  FOREIGN KEY (employee_id) REFERENCES employees(id),
  FOREIGN KEY (requested_by_employee_id) REFERENCES employees(id)
);

CREATE INDEX IF NOT EXISTS idx_password_reset_email_codes_employee
ON password_reset_email_codes(employee_id);

CREATE INDEX IF NOT EXISTS idx_password_reset_email_codes_expires
ON password_reset_email_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_password_reset_email_codes_used
ON password_reset_email_codes(used_at);

