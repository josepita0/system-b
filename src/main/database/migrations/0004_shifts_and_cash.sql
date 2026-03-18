CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT NOT NULL UNIQUE CHECK (code IN ('day', 'night')),
  name TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  crosses_midnight INTEGER NOT NULL DEFAULT 0
);

INSERT OR IGNORE INTO shifts (id, code, name, start_time, end_time, crosses_midnight) VALUES
  (1, 'day', 'Turno Dia', '10:00', '19:00', 0),
  (2, 'night', 'Turno Noche', '19:00', '03:00', 1);

CREATE TABLE IF NOT EXISTS cash_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  shift_id INTEGER NOT NULL,
  business_date TEXT NOT NULL,
  opened_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  closed_at TEXT,
  opening_cash REAL NOT NULL DEFAULT 0,
  expected_cash REAL,
  counted_cash REAL,
  difference_cash REAL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  FOREIGN KEY (shift_id) REFERENCES shifts(id)
);
