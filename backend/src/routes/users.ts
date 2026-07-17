import { Hono } from 'hono'
import { sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const users = new Hono<AppEnv>()

users.use('*', authMiddleware)

users.get('/me', async (c) => {
  const userId = c.get('userId')
  const [profile] = await sql`SELECT * FROM profiles WHERE id = ${userId}`
  if (!profile) return c.json({ error: { code: 'NOT_FOUND', message: 'プロフィールが見つかりません' } }, 404)
  return c.json(profile)
})

users.post('/me', async (c) => {
  const userId = c.get('userId')
  const { username, display_name } = await c.req.json() as { username: string; display_name: string }
  if (!username || !display_name) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'username と display_name は必須です' } }, 400)
  }
  const [existing] = await sql`SELECT id FROM profiles WHERE id = ${userId}`
  if (existing) {
    return c.json({ error: { code: 'CONFLICT', message: 'プロフィールは既に存在します' } }, 409)
  }
  const [created] = await sql`
    INSERT INTO profiles (id, username, display_name)
    VALUES (${userId}, ${username}, ${display_name})
    RETURNING *
  `
  return c.json(created, 201)
})

users.put('/me', async (c) => {
  const userId = c.get('userId')
  const { username, display_name, avatar_url } = await c.req.json()
  const [updated] = await sql`
    UPDATE profiles SET
      username = COALESCE(${username}, username),
      display_name = COALESCE(${display_name}, display_name),
      avatar_url = COALESCE(${avatar_url}, avatar_url),
      updated_at = NOW()
    WHERE id = ${userId}
    RETURNING *
  `
  return c.json(updated)
})

users.get('/search', async (c) => {
  const q = c.req.query('q')
  if (!q) return c.json({ error: { code: 'BAD_REQUEST', message: 'クエリが必要です' } }, 400)
  const rows = await sql`
    SELECT id, username, display_name, avatar_url
    FROM profiles
    WHERE username ILIKE ${'%' + q + '%'}
    LIMIT 20
  `
  return c.json(rows)
})

users.get('/me/genres', async (c) => {
  const userId = c.get('userId')
  const rows = await sql`
    SELECT g.id, g.name FROM user_genre_preferences ugp
    JOIN genres g ON g.id = ugp.genre_id
    WHERE ugp.user_id = ${userId}
  `
  return c.json(rows)
})

users.put('/me/genres', async (c) => {
  const userId = c.get('userId')
  const { genreIds } = await c.req.json() as { genreIds: number[] }

  if (!Array.isArray(genreIds) || genreIds.length > 3) {
    return c.json({ error: { code: 'BAD_REQUEST', message: 'ジャンルは最大3件です' } }, 400)
  }

  await sql`DELETE FROM user_genre_preferences WHERE user_id = ${userId}`
  if (genreIds.length > 0) {
    const values = genreIds.map((id) => ({ user_id: userId, genre_id: id }))
    await sql`INSERT INTO user_genre_preferences ${sql(values)}`
  }

  const rows = await sql`
    SELECT g.id, g.name FROM user_genre_preferences ugp
    JOIN genres g ON g.id = ugp.genre_id
    WHERE ugp.user_id = ${userId}
  `
  return c.json(rows)
})

type RatingDistribution = { want_to_revisit: number; average: number; not_good: number }

async function fetchReviewStats(userId: string) {
  const [ratingRows, genreRows, situationRows, [activity]] = await Promise.all([
    sql`SELECT rating, COUNT(*)::int AS count FROM reviews WHERE user_id = ${userId} GROUP BY rating`,
    sql`
      SELECT rs.genre, COUNT(*)::int AS count
      FROM reviews r
      JOIN restaurants rs ON rs.id = r.restaurant_id
      WHERE r.user_id = ${userId} AND rs.genre IS NOT NULL
      GROUP BY rs.genre
      ORDER BY count DESC
    `,
    sql`
      SELECT situation, COUNT(*)::int AS count FROM reviews
      WHERE user_id = ${userId} AND situation IS NOT NULL
      GROUP BY situation
      ORDER BY count DESC
    `,
    sql`SELECT MAX(created_at) AS last_reviewed_at FROM reviews WHERE user_id = ${userId}`,
  ])

  const ratingDistribution: RatingDistribution = { want_to_revisit: 0, average: 0, not_good: 0 }
  for (const row of ratingRows) {
    ratingDistribution[row.rating as keyof RatingDistribution] = row.count as number
  }
  const reviewCount = ratingRows.reduce((sum, row) => sum + (row.count as number), 0)

  return {
    review_count: reviewCount,
    rating_distribution: ratingDistribution,
    genre_distribution: genreRows,
    situation_distribution: situationRows,
    last_reviewed_at: activity?.last_reviewed_at ?? null,
  }
}

// 動的ルートは静的ルート（/me, /search 等）より後に定義する
users.get('/:userId', async (c) => {
  const currentUserId = c.get('userId')
  const { userId } = c.req.param()

  if (currentUserId !== userId) {
    const [isMutual] = await sql`
      SELECT 1 FROM follow_requests
      WHERE status = 'accepted'
        AND (
          (from_user_id = ${currentUserId} AND to_user_id = ${userId}) OR
          (to_user_id = ${currentUserId} AND from_user_id = ${userId})
        )
    `
    if (!isMutual) {
      return c.json({ error: { code: 'FORBIDDEN', message: '閲覧権限がありません' } }, 403)
    }
  }

  const [profile] = await sql`
    SELECT id, username, display_name, avatar_url FROM profiles WHERE id = ${userId}
  `
  if (!profile) return c.json({ error: { code: 'NOT_FOUND', message: 'プロフィールが見つかりません' } }, 404)

  const genres = await sql`
    SELECT g.id, g.name FROM user_genre_preferences ugp
    JOIN genres g ON g.id = ugp.genre_id
    WHERE ugp.user_id = ${userId}
  `
  const stats = await fetchReviewStats(userId)

  return c.json({ ...profile, genres, ...stats })
})

export { users }
