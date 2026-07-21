ALTER TABLE sales ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'CASH'
  CHECK(payment_method IN ('CASH', 'CARD'));
