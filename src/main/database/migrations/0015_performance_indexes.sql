CREATE INDEX IF NOT EXISTS idx_auth_sessions_token_active
  ON auth_sessions(token_hash, revoked_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_password_recovery_codes_lookup
  ON password_recovery_codes(employee_id, used_at, code_hash);

CREATE INDEX IF NOT EXISTS idx_category_sale_formats_category_id
  ON category_sale_formats(category_id);

CREATE INDEX IF NOT EXISTS idx_cash_sessions_status_business_date
  ON cash_sessions(status, business_date);

CREATE INDEX IF NOT EXISTS idx_sales_cash_session_id
  ON sales(cash_session_id);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id
  ON sale_items(sale_id);
