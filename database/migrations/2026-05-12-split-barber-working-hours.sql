ALTER TABLE barber_working_hours
  DROP CONSTRAINT IF EXISTS barber_working_hours_tenant_id_barber_id_day_of_week_key;

CREATE INDEX IF NOT EXISTS idx_working_hours_tenant_barber_day_start
  ON barber_working_hours(tenant_id, barber_id, day_of_week, start_time);
