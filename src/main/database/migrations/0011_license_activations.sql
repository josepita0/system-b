CREATE TABLE IF NOT EXISTS license_activations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  license_key_hash TEXT,
  activation_mode TEXT NOT NULL CHECK (activation_mode IN ('key', 'manual')),
  plan_type TEXT NOT NULL CHECK (plan_type IN ('monthly', 'semiannual', 'annual')),
  activated_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'suspended')),
  issued_to TEXT,
  notes TEXT,
  created_by_employee_id INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by_employee_id) REFERENCES employees(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS license_activations_created_at_idx
ON license_activations(created_at DESC);
