import { query, withTransaction } from "@/lib/db";
import type { PlatformRole, PlatformSessionUser } from "@/lib/platform-auth";

async function insertUserAudit(input: {
  actor: PlatformSessionUser;
  action: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
}) {
  await query(
    `
      INSERT INTO platform_audit_logs (
        actor_platform_user_id,
        actor_email,
        action,
        target_type,
        target_id,
        metadata
      )
      VALUES ($1, $2, $3, 'platform_user', $4, $5::jsonb)
    `,
    [
      input.actor.userId,
      input.actor.email,
      input.action,
      input.targetId ?? null,
      JSON.stringify(input.metadata ?? {})
    ]
  );
}

export async function getPlatformUserByCredentials(email: string) {
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
    role: PlatformRole;
    password_hash: string;
  }>(
    `
      SELECT id, email, display_name, role, password_hash
      FROM platform_users
      WHERE lower(email) = lower($1)
        AND is_active = true
      LIMIT 1
    `,
    [email]
  );

  return result.rows[0] ?? null;
}

export async function listPlatformUsers() {
  const result = await query<{
    id: string;
    email: string;
    display_name: string;
    role: PlatformRole;
    is_active: boolean;
    created_at: string;
  }>(
    `
      SELECT id, email, display_name, role, is_active, created_at
      FROM platform_users
      ORDER BY is_active DESC, role ASC, display_name ASC
    `
  );

  return result.rows;
}

export async function createPlatformUser(input: {
  email: string;
  displayName: string;
  role: PlatformRole;
  passwordHash: string;
  actor: PlatformSessionUser;
}) {
  const result = await query<{ id: string; email: string }>(
    `
      INSERT INTO platform_users (role, email, password_hash, display_name)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email
    `,
    [input.role, input.email, input.passwordHash, input.displayName]
  );

  const user = result.rows[0];
  await insertUserAudit({
    actor: input.actor,
    action: "platform_user.created",
    targetId: user.id,
    metadata: {
      email: user.email,
      role: input.role
    }
  });

  return user;
}

export async function updatePlatformUser(input: {
  userId: string;
  email: string;
  displayName: string;
  role: PlatformRole;
  isActive: boolean;
  passwordHash?: string | null;
  actor: PlatformSessionUser;
}) {
  return withTransaction(async (client) => {
    const current = await client.query<{
      id: string;
      email: string;
      display_name: string;
      role: PlatformRole;
      is_active: boolean;
    }>(
      `
        SELECT id, email, display_name, role, is_active
        FROM platform_users
        WHERE id = $1
        FOR UPDATE
      `,
      [input.userId]
    );
    const user = current.rows[0];
    if (!user) {
      return null;
    }

    const updated = await client.query<{
      id: string;
      email: string;
      display_name: string;
      role: PlatformRole;
      is_active: boolean;
    }>(
      `
        UPDATE platform_users
        SET email = $2,
            display_name = $3,
            role = $4,
            is_active = $5,
            password_hash = COALESCE($6, password_hash),
            updated_at = now()
        WHERE id = $1
        RETURNING id, email, display_name, role, is_active
      `,
      [
        input.userId,
        input.email,
        input.displayName,
        input.role,
        input.isActive,
        input.passwordHash ?? null
      ]
    );

    await client.query(
      `
        INSERT INTO platform_audit_logs (
          actor_platform_user_id,
          actor_email,
          action,
          target_type,
          target_id,
          metadata
        )
        VALUES ($1, $2, 'platform_user.updated', 'platform_user', $3, $4::jsonb)
      `,
      [
        input.actor.userId,
        input.actor.email,
        input.userId,
        JSON.stringify({
          previous: {
            email: user.email,
            displayName: user.display_name,
            role: user.role,
            isActive: user.is_active
          },
          next: {
            email: input.email,
            displayName: input.displayName,
            role: input.role,
            isActive: input.isActive,
            passwordChanged: Boolean(input.passwordHash)
          }
        })
      ]
    );

    return updated.rows[0];
  });
}
