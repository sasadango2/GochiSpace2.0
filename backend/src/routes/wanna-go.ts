import { Hono } from 'hono'
import { sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const wannaGo = new Hono<AppEnv>()
wannaGo.use('*', authMiddleware)

wannaGo.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT wg.restaurant_id, wg.created_at,
           rs.name AS restaurant_name, rs.genre, rs.lat, rs.lng, rs.address
    FROM wanna_go wg
    JOIN restaurants rs ON rs.id = wg.restaurant_id
    WHERE wg.user_id = ${userId}
    ORDER BY wg.created_at DESC
  `
  return c.json(rows)
})

wannaGo.get('/map', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT rs.id AS restaurant_id, rs.name AS restaurant_name, rs.genre, rs.lat, rs.lng
    FROM wanna_go wg
    JOIN restaurants rs ON rs.id = wg.restaurant_id
    WHERE wg.user_id = ${userId}
      AND rs.lat IS NOT NULL AND rs.lng IS NOT NULL
  `
  return c.json(rows)
})

wannaGo.get('/requests', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT wr.id, wr.from_user_id, wr.restaurant_id, wr.message, wr.status, wr.created_at,
           p.display_name AS from_display_name,
           rs.name AS restaurant_name, rs.genre
    FROM wanna_go_requests wr
    JOIN profiles p ON p.id = wr.from_user_id
    JOIN restaurants rs ON rs.id = wr.restaurant_id
    WHERE wr.to_user_id = ${userId}
    ORDER BY wr.created_at DESC
  `
  return c.json(rows)
})

wannaGo.post('/', async (c) => {
  const userId = c.get('userId')
  const { restaurantId } = await c.req.json() as { restaurantId: string }
  await sql`
    INSERT INTO wanna_go (user_id, restaurant_id)
    VALUES (${userId}, ${restaurantId})
    ON CONFLICT DO NOTHING
  `
  return c.json({ ok: true }, 201)
})

wannaGo.post('/requests', async (c) => {
  const userId = c.get('userId')
  const { toUserId, restaurantId, message } = await c.req.json() as {
    toUserId: string
    restaurantId: string
    message?: string
  }

  const [isMutual] = await sql`
    SELECT 1 FROM follow_requests
    WHERE status = 'accepted'
      AND (
        (from_user_id = ${userId} AND to_user_id = ${toUserId}) OR
        (to_user_id = ${userId} AND from_user_id = ${toUserId})
      )
  `
  if (!isMutual) {
    return c.json({ error: { code: 'NOT_MUTUAL_FOLLOW', message: '相互フォローのユーザーにのみ送れます' } }, 403)
  }

  const [created] = await sql`
    INSERT INTO wanna_go_requests (from_user_id, to_user_id, restaurant_id, message)
    VALUES (${userId}, ${toUserId}, ${restaurantId}, ${message ?? null})
    RETURNING *
  `
  return c.json(created, 201)
})

wannaGo.put('/requests/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { status } = await c.req.json() as { status: 'accepted' | 'declined' }

  const [updated] = await sql`
    UPDATE wanna_go_requests
    SET status = ${status}, updated_at = NOW()
    WHERE id = ${id} AND to_user_id = ${userId}
    RETURNING *
  `
  if (!updated) return c.json({ error: { code: 'NOT_FOUND', message: 'リクエストが見つかりません' } }, 404)
  return c.json(updated)
})

wannaGo.delete('/:restaurantId', async (c) => {
  const userId = c.get('userId')
  const { restaurantId } = c.req.param()
  await sql`DELETE FROM wanna_go WHERE user_id = ${userId} AND restaurant_id = ${restaurantId}`
  return c.body(null, 204)
})

export { wannaGo }
