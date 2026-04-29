ALTER TYPE queue_status ADD VALUE IF NOT EXISTS 'called';
ALTER TYPE queue_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE queue_status ADD VALUE IF NOT EXISTS 'done';
ALTER TYPE queue_status ADD VALUE IF NOT EXISTS 'no_show';

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id) ON DELETE RESTRICT;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS position INTEGER;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS estimated_time TIMESTAMPTZ;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS joined_at TIMESTAMPTZ NOT NULL DEFAULT now();

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS called_at TIMESTAMPTZ;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS no_show_at TIMESTAMPTZ;

ALTER TABLE queue_entries
  ADD COLUMN IF NOT EXISTS last_recalculated_at TIMESTAMPTZ;

UPDATE queue_entries
SET
  service_id = COALESCE(service_id, requested_service_id),
  barber_id = COALESCE(barber_id, assigned_barber_id),
  estimated_time = COALESCE(estimated_time, estimated_start),
  joined_at = COALESCE(joined_at, created_at),
  status = CASE
    WHEN status = 'assigned' THEN 'called'::queue_status
    WHEN status = 'completed' THEN 'done'::queue_status
    ELSE status
  END
WHERE
  service_id IS NULL
  OR barber_id IS NULL
  OR estimated_time IS NULL
  OR joined_at IS NULL
  OR status IN ('assigned', 'completed');

ALTER TABLE queue_entries
  ALTER COLUMN service_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_queue_tenant_waiting_joined ON queue_entries(tenant_id, status, joined_at);
CREATE INDEX IF NOT EXISTS idx_queue_tenant_position ON queue_entries(tenant_id, position);
