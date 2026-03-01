import { randomBytes } from 'crypto';
import { ensureSchema, getPool } from '@/lib/db';

const SESSION_COOKIE = 'sayajual_session';
const SESSION_TTL_DAYS = 30;

function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;
}

export function getSessionCookieName() {
  return SESSION_COOKIE;
}

export function isValidEmail(email) {
  const normalized = String(email || '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export async function findOrCreateUser({ email, name }) {
  await ensureSchema();
  const db = getPool();

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const displayName = String(name || '').trim() || null;

  const result = await db.query(
    `
    INSERT INTO users (id, email, display_name, created_at)
    VALUES ($1, $2, $3, NOW())
    ON CONFLICT (email)
    DO UPDATE SET
      display_name = COALESCE(EXCLUDED.display_name, users.display_name)
    RETURNING id, email, display_name, created_at
    `,
    [makeId('usr'), normalizedEmail, displayName]
  );

  return result.rows[0];
}

export async function createSession(userId) {
  await ensureSchema();
  const db = getPool();

  const token = randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);

  await db.query(
    `
    INSERT INTO sessions (id, user_id, session_token, expires_at, created_at)
    VALUES ($1, $2, $3, $4, NOW())
    `,
    [makeId('ses'), userId, token, expiresAt.toISOString()]
  );

  return { token, expiresAt };
}

export async function getUserBySessionToken(token) {
  if (!token) return null;

  await ensureSchema();
  const db = getPool();

  const result = await db.query(
    `
    SELECT u.id, u.email, u.display_name
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.session_token = $1
      AND s.expires_at > NOW()
    LIMIT 1
    `,
    [token]
  );

  return result.rows[0] || null;
}

export async function deleteSession(token) {
  if (!token) return;

  await ensureSchema();
  const db = getPool();
  await db.query('DELETE FROM sessions WHERE session_token = $1', [token]);
}
