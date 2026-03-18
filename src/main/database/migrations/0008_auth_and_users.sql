ALTER TABLE employees ADD COLUMN email TEXT;
ALTER TABLE employees ADD COLUMN username TEXT;
ALTER TABLE employees ADD COLUMN password_hash TEXT;
ALTER TABLE employees ADD COLUMN password_changed_at TEXT;
ALTER TABLE employees ADD COLUMN must_change_password INTEGER NOT NULL DEFAULT 1;
ALTER TABLE employees ADD COLUMN last_login_at TEXT;
ALTER TABLE employees ADD COLUMN failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE employees ADD COLUMN locked_until TEXT;

UPDATE employees
SET role = CASE
  WHEN role = 'admin' THEN 'admin'
  WHEN role = 'manager' THEN 'manager'
  WHEN role = 'employee' THEN 'employee'
  ELSE 'employee'
END;

CREATE UNIQUE INDEX IF NOT EXISTS employees_username_unique_idx
ON employees(username)
WHERE username IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS employees_email_unique_idx
ON employees(email)
WHERE email IS NOT NULL;
