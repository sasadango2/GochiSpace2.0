import { Hono } from 'hono'
import { sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const reviews = new Hono<AppEnv>()

reviews.use('*', authMiddleware)

const mutualFollowCondition = (userId: string) => sql`
  (
    SELECT COUNT(*) FROM follow_requests
    WHERE status = 'accepted'
      AND (
        (from_user_id = ${userId} AND to_user_id = r.user_id) OR
        (to_user_id = ${userId} AND from_user_id = r.user_id)
      )
  ) > 0
`

reviews.get('/', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT r.*, p.username, p.display_name, p.avatar_url,
           rs.name AS restaurant_name, rs.genre
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE r.user_id = ${userId} OR ${mutualFollowCondition(userId)}
    ORDER BY r.created_at DESC
  `
  return c.json(rows)
})

reviews.get('/map', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT r.id, r.rating,
           p.id AS user_id, p.display_name,
           rs.id AS restaurant_id, rs.name AS restaurant_name, rs.lat, rs.lng
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE rs.lat IS NOT NULL AND rs.lng IS NOT NULL
      AND (r.user_id = ${userId} OR ${mutualFollowCondition(userId)})
  `
  return c.json(rows)
})

reviews.post('/', async (c) => {
  const userId = c.get('userId')
  const { restaurantId, rating, comment, visitedAt } = await c.req.json() as {
    restaurantId: string
    rating: string
    comment?: string
    visitedAt?: string
  }

  const [created] = await sql`
    INSERT INTO reviews (user_id, restaurant_id, rating, comment, visited_at)
    VALUES (${userId}, ${restaurantId}, ${rating}, ${comment ?? null}, ${visitedAt ?? null})
    RETURNING *
  `
  return c.json(created, 201)
})

reviews.get('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const [row] = await sql`
    SELECT r.*, p.username, p.display_name, rs.name AS restaurant_name
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE r.id = ${id}
      AND (r.user_id = ${userId} OR ${mutualFollowCondition(userId)})
  `
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'レビューが見つかりません' } }, 404)
  return c.json(row)
})

reviews.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { rating, comment, visitedAt } = await c.req.json() as {
    rating?: string
    comment?: string
    visitedAt?: string
  }

  const [updated] = await sql`
    UPDATE reviews SET
      rating = COALESCE(${rating ?? null}, rating),
      comment = COALESCE(${comment ?? null}, comment),
      visited_at = COALESCE(${visitedAt ?? null}, visited_at),
      updated_at = NOW()
    WHERE id = ${id} AND user_id = ${userId}
    RETURNING *
  `
  if (!updated) return c.json({ error: { code: 'NOT_FOUND', message: 'レビューが見つかりません' } }, 404)
  return c.json(updated)
})

reviews.delete('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  await sql`DELETE FROM reviews WHERE id = ${id} AND user_id = ${userId}`
  return c.body(null, 204)
})

reviews.get('/user/:userId', async (c) => {
  const currentUserId = c.get('userId')
  const { userId } = c.req.param()

  const [isMutual] = await sql`
    SELECT 1 FROM follow_requests
    WHERE status = 'accepted'
      AND (
        (from_user_id = ${currentUserId} AND to_user_id = ${userId}) OR
        (to_user_id = ${currentUserId} AND from_user_id = ${userId})
      )
  `
  if (!isMutual && currentUserId !== userId) {
    return c.json({ error: { code: 'FORBIDDEN', message: '閲覧権限がありません' } }, 403)
  }

  const rows = await sql`
    SELECT r.*, rs.name AS restaurant_name, rs.genre
    FROM reviews r
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE r.user_id = ${userId}
    ORDER BY r.created_at DESC
  `
  return c.json(rows)
})

export { reviews }
