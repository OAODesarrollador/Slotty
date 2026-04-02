CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS btree_gist;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    CREATE TYPE user_role AS ENUM ('owner', 'staff', 'barber', 'platform_admin');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'appointment_status') THEN
    CREATE TYPE appointment_status AS ENUM (
      'pending_payment',
      'pending_verification',
      'scheduled',
      'confirmed',
      'checked_in',
      'in_progress',
      'completed',
      'cancelled',
      'no_show',
      'expired'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_method') THEN
    CREATE TYPE payment_method AS ENUM ('pay_at_store', 'bank_transfer', 'mercado_pago');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status') THEN
    CREATE TYPE payment_status AS ENUM (
      'pending',
      'pending_verification',
      'approved',
      'rejected',
      'expired',
      'cancelled',
      'refunded'
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'queue_status') THEN
    CREATE TYPE queue_status AS ENUM ('waiting', 'assigned', 'cancelled', 'completed');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  timezone TEXT NOT NULL DEFAULT 'America/Argentina/Buenos_Aires',
  currency_code TEXT NOT NULL DEFAULT 'ARS',
  booking_mode TEXT NOT NULL DEFAULT 'pay_at_store',
  deposit_type TEXT NOT NULL DEFAULT 'none',
  deposit_value NUMERIC(12, 2) NOT NULL DEFAULT 0,
  allow_pay_at_store BOOLEAN NOT NULL DEFAULT true,
  allow_bank_transfer BOOLEAN NOT NULL DEFAULT true,
  allow_mercado_pago BOOLEAN NOT NULL DEFAULT false,
  transfer_alias TEXT,
  transfer_cbu TEXT,
  transfer_holder_name TEXT,
  transfer_bank_name TEXT,
  logo_url TEXT,
  hero_image_url TEXT,
  primary_color TEXT NOT NULL DEFAULT '#111111',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  role user_role NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  display_name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TABLE IF NOT EXISTS customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, phone)
);

CREATE TABLE IF NOT EXISTS services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price NUMERIC(12, 2) NOT NULL CHECK (price >= 0),
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  full_name TEXT NOT NULL,
  rating NUMERIC(3, 2) NOT NULL DEFAULT 4.8,
  bio TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS barber_services (
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (tenant_id, barber_id, service_id)
);

CREATE TABLE IF NOT EXISTS barber_working_hours (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (start_time < end_time),
  UNIQUE (tenant_id, barber_id, day_of_week)
);

CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE RESTRICT,
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  source TEXT NOT NULL DEFAULT 'online',
  datetime_start TIMESTAMPTZ NOT NULL,
  datetime_end TIMESTAMPTZ NOT NULL,
  status appointment_status NOT NULL,
  customer_notes TEXT,
  internal_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (datetime_start < datetime_end)
);

ALTER TABLE appointments
  DROP CONSTRAINT IF EXISTS appointments_no_overlap;

ALTER TABLE appointments
  ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    tenant_id WITH =,
    barber_id WITH =,
    tstzrange(datetime_start, datetime_end, '[)') WITH &&
  )
  WHERE (status IN ('pending_payment', 'pending_verification', 'scheduled', 'confirmed', 'checked_in', 'in_progress'));

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  method payment_method NOT NULL,
  status payment_status NOT NULL,
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  amount_required_now NUMERIC(12, 2) NOT NULL CHECK (amount_required_now >= 0),
  amount_paid NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (amount_paid >= 0),
  external_reference TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS queue_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
  requested_service_id UUID NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  assigned_barber_id UUID REFERENCES barbers(id) ON DELETE SET NULL,
  assigned_appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
  status queue_status NOT NULL DEFAULT 'waiting',
  estimated_start TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_phone ON customers(tenant_id, phone);
CREATE INDEX IF NOT EXISTS idx_services_tenant_active ON services(tenant_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_barbers_tenant_active ON barbers(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_barber_services_tenant_service ON barber_services(tenant_id, service_id, barber_id);
CREATE INDEX IF NOT EXISTS idx_working_hours_tenant_barber_day ON barber_working_hours(tenant_id, barber_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_start ON appointments(tenant_id, datetime_start);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_barber_start ON appointments(tenant_id, barber_id, datetime_start);
CREATE INDEX IF NOT EXISTS idx_appointments_tenant_status_start ON appointments(tenant_id, status, datetime_start);
CREATE INDEX IF NOT EXISTS idx_payments_tenant_appointment ON payments(tenant_id, appointment_id);
CREATE INDEX IF NOT EXISTS idx_queue_tenant_status_created ON queue_entries(tenant_id, status, created_at);
