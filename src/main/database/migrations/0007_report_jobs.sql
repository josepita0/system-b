CREATE TABLE IF NOT EXISTS report_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL,
  recipient_email TEXT NOT NULL,
  pdf_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  last_error TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  sent_at TEXT,
  FOREIGN KEY (session_id) REFERENCES cash_sessions(id)
);

CREATE TABLE IF NOT EXISTS report_job_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_job_id INTEGER NOT NULL,
  attempted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  success INTEGER NOT NULL,
  error_message TEXT,
  FOREIGN KEY (report_job_id) REFERENCES report_jobs(id)
);
