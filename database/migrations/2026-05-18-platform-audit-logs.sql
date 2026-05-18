CREATE TABLE IF NOT EXISTS platform_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_platform_user_id UUID REFERENCES platform_users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id UUID,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_target ON platform_audit_logs(target_type, target_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_actor ON platform_audit_logs(actor_platform_user_id, created_at DESC);
