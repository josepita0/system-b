-- Quien aperturó la sesión de caja (empleado / usuario de aplicación).

ALTER TABLE cash_sessions ADD COLUMN opened_by_user_id INTEGER REFERENCES employees(id);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_opened_by_user_id ON cash_sessions(opened_by_user_id);
