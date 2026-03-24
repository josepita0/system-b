CREATE TABLE IF NOT EXISTS app_setup_status (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  wizard_required INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT,
  completed_by_employee_id INTEGER,
  version TEXT,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (completed_by_employee_id) REFERENCES employees(id)
);

INSERT OR IGNORE INTO app_setup_status (id, wizard_required) VALUES (1, 0);
