import fs from "node:fs/promises";
import path from "node:path";

import { hashPassword } from "@/lib/auth";
import { getPool } from "@/lib/db";

const TENANTS_DATA = [
  {
    name: "Slotty Platinum (CABA)",
    slug: "slotty-platinum",
    owner_email: "owner@slotty-platinum.test",
    owner_name: "Admin Platinum",
    services: [
      { name: "Corte VIP", desc: "Experiencia de lujo", duration: 40, price: 15000 },
      { name: "Barba & Spa", desc: "Cuidado completo", duration: 30, price: 9000 },
      { name: "Coloración", desc: "Tintura premium", duration: 60, price: 20000 }
    ],
    barbers: [
      { name: "Enzo", bio: "Maestro del degradado" },
      { name: "Mateo", bio: "Especialista en barbas" }
    ]
  },
  {
    name: "The Gentleman Lab",
    slug: "gentleman-lab",
    owner_email: "owner@gentleman-lab.test",
    owner_name: "Admin Gentleman",
    services: [
      { name: "Corte Clasico", desc: "Estilo tradicional", duration: 30, price: 8000 },
      { name: "Afeitado a Navaja", desc: "Servicio tradicional", duration: 25, price: 6000 }
    ],
    barbers: [
      { name: "Santy", bio: "Estética clásica" },
      { name: "Franco", bio: "Detallista nato" }
    ]
  },
  {
    name: "Barberia X",
    slug: "barberia-x",
    owner_email: "owner@barberia-x.test",
    owner_name: "Owner Barberia X",
    services: [
      { name: "Corte", desc: "Corte clasico o moderno", duration: 30, price: 8000 },
      { name: "Barba", desc: "Perfilado y arreglo de barba", duration: 20, price: 5000 }
    ],
    barbers: [
      { name: "Juan", bio: "Especialista en fades" },
      { name: "Pedro", bio: "Barba y combos" }
    ]
  }
];

function splitSqlStatements(sql: string) {
  const statements: string[] = [];
  let current = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let dollarQuoteTag: string | null = null;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const nextTwo = sql.slice(index, index + 2);

    if (!inSingleQuote && !inDoubleQuote && char === "$") {
      const match = sql.slice(index).match(/^\$[A-Za-z0-9_]*\$/);
      if (match) {
        const tag = match[0];
        current += tag;
        index += tag.length - 1;

        if (dollarQuoteTag === tag) {
          dollarQuoteTag = null;
        } else if (!dollarQuoteTag) {
          dollarQuoteTag = tag;
        }

        continue;
      }
    }

    if (!dollarQuoteTag && !inDoubleQuote && char === "'" && sql[index - 1] !== "\\") {
      inSingleQuote = !inSingleQuote;
      current += char;
      continue;
    }

    if (!dollarQuoteTag && !inSingleQuote && char === "\"" && sql[index - 1] !== "\\") {
      inDoubleQuote = !inDoubleQuote;
      current += char;
      continue;
    }

    if (!dollarQuoteTag && !inSingleQuote && !inDoubleQuote && nextTwo === "--") {
      while (index < sql.length && sql[index] !== "\n") {
        current += sql[index];
        index += 1;
      }

      if (index < sql.length) {
        current += "\n";
      }
      continue;
    }

    if (!dollarQuoteTag && !inSingleQuote && !inDoubleQuote && char === ";") {
      const statement = current.trim();
      if (statement) {
        statements.push(statement);
      }
      current = "";
      continue;
    }

    current += char;
  }

  const trailing = current.trim();
  if (trailing) {
    statements.push(trailing);
  }

  return statements;
}

async function executeSqlFile(pool: ReturnType<typeof getPool>, filePath: string) {
  const sql = await fs.readFile(filePath, "utf8");
  const statements = splitSqlStatements(sql);

  for (const statement of statements) {
    await pool.query(statement);
  }
}

export async function main() {
  const pool = getPool();
  
  // 1. Asegurar schema y constraints adicionales para el seed
  await executeSqlFile(pool, path.join(process.cwd(), "database", "schema.sql"));
  
  // Agregar constraints de unicidad si no existen (para evitar duplicados en re-seed)
  await pool.query(`
    ALTER TABLE services DROP CONSTRAINT IF EXISTS services_tenant_id_name_key;
    ALTER TABLE services ADD CONSTRAINT services_tenant_id_name_key UNIQUE (tenant_id, name);
    
    ALTER TABLE barbers DROP CONSTRAINT IF EXISTS barbers_tenant_id_full_name_key;
    ALTER TABLE barbers ADD CONSTRAINT barbers_tenant_id_full_name_key UNIQUE (tenant_id, full_name);
  `).catch(e => console.log("Note: Constraints might already exist or tables have duplicates."));

  for (const data of TENANTS_DATA) {
    console.log(`Seeding tenant: ${data.name}...`);
    
    // 2. Insertar Tenant
    const tenantResult = await pool.query<{ id: string }>(
      `
        INSERT INTO tenants (name, slug, booking_mode, deposit_type, deposit_value, allow_mercado_pago)
        VALUES ($1, $2, 'pay_at_store', 'none', 0, false)
        ON CONFLICT (slug) DO UPDATE SET updated_at = now()
        RETURNING id
      `,
      [data.name, data.slug]
    );
    const tenantId = tenantResult.rows[0].id;

    // 3. Insertar Usuario Owner
    await pool.query(
      `
        INSERT INTO users (tenant_id, role, email, password_hash, display_name)
        VALUES ($1, 'owner', $2, $3, $4)
        ON CONFLICT (tenant_id, email) DO UPDATE SET updated_at = now()
      `,
      [tenantId, data.owner_email, hashPassword("admin1234"), data.owner_name]
    );

    // 4. Insertar Servicios
    const serviceIds: string[] = [];
    for (let i = 0; i < data.services.length; i++) {
      const s = data.services[i];
      const res = await pool.query<{ id: string }>(
        `
          INSERT INTO services (tenant_id, name, description, duration_minutes, price, sort_order)
          VALUES ($1, $2, $3, $4, $5, $6)
          ON CONFLICT (tenant_id, name) DO UPDATE SET price = EXCLUDED.price, updated_at = now()
          RETURNING id
        `,
        [tenantId, s.name, s.desc, s.duration, s.price, i + 1]
      );
      serviceIds.push(res.rows[0].id);
    }

    // 5. Insertar Barberos y Horarios
    for (const b of data.barbers) {
      const res = await pool.query<{ id: string }>(
        `
          INSERT INTO barbers (tenant_id, full_name, bio)
          VALUES ($1, $2, $3)
          ON CONFLICT (tenant_id, full_name) DO UPDATE SET updated_at = now()
          RETURNING id
        `,
        [tenantId, b.name, b.bio]
      );
      const barberId = res.rows[0].id;

      // Asignar todos los servicios al barbero
      for (const sId of serviceIds) {
        await pool.query(
          `INSERT INTO barber_services (tenant_id, barber_id, service_id) 
           VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
          [tenantId, barberId, sId]
        );
      }

      // Horarios (Lunes a Sabado)
      for (const day of [1, 2, 3, 4, 5, 6]) {
        await pool.query(
          `INSERT INTO barber_working_hours (tenant_id, barber_id, day_of_week, start_time, end_time)
           VALUES ($1, $2, $3, '10:00', '20:00')
           ON CONFLICT (tenant_id, barber_id, day_of_week) DO UPDATE SET updated_at = now()`,
          [tenantId, barberId, day]
        );
      }
    }
  }

  console.log("Seed completado para todos los tenants.");
}
