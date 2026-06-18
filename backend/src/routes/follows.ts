import { Hono } from 'hono'
import { sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const follows = new Hono<AppEnv>()

follows.use('*', authMiddleware)

follows.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT p.id, p.username, p.display_name, p.avatar_url
    FROM follow_requests fr
    JOIN profiles p ON p.id = CASE
      WHEN fr.from_user_id = ${userId} THEN fr.to_user_id
      ELSE fr.from_user_id
    END
    WHERE fr.status = 'accepted'
      AND (fr.from_user_id = ${userId} OR fr.to_user_id = ${userId})
  `
  return c.json(rows)
})

follows.get('/requests/received', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT fr.id, fr.from_user_id, fr.status, fr.created_at,
           p.username, p.display_name, p.avatar_url
    FROM follow_requests fr
    JOIN profiles p ON p.id = fr.from_user_id
    WHERE fr.to_user_id = ${userId} AND fr.status = 'pending'
  `
  return c.json(rows)
})

follows.get('/requests/sent', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT fr.id, fr.to_user_id, fr.status, fr.created_at,
           p.username, p.display_name, p.avatar_url
    FROM follow_requests fr
    JOIN profiles p ON p.id = fr.to_user_id
    WHERE fr.from_user_id = ${userId}
  `
  return c.json(rows)
})

follows.post('/requests', async (c) => {
  const userId = c.get('userId')
  const { toUserId } = await c.req.json() as { toUserId: string }

  if (userId === toUserId) {
    return c.json({ error: { code: 'BAD_REQUEST', message: '自分にはフォロー申請できません' } }, 400)
  }

  const [created] = await sql`
    INSERT INTO follow_requests (from_user_id, to_user_id)
    VALUES (${userId}, ${toUserId})
    ON CONFLICT (from_user_id, to_user_id) DO NOTHING
    RETURNING *
  `
  return c.json(created, 201)
})

follows.patch('/requests/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { status } = await c.req.json() as { status: 'accepted' | 'rejected' }

  if (!['accepted', 'rejected'].includes(status)) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'statusはacceptedまたはrejectedです' } }, 400)
  }

  const [updated] = await sql`
    UPDATE follow_requests SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} AND to_user_id = ${userId}
    RETURNING *
  `
  if (!updated) return c.json({ error: { code: 'NOT_FOUND', message: '申請が見つかりません' } }, 404)
  return c.json(updated)
})

follows.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  await sql`
    DELETE FROM follow_requests
    WHERE id = ${id}
      AND (from_user_id = ${userId} OR to_user_id = ${userId})
  `
  return c.body(null, 204)
})

export { follows }
