import { Hono } from 'hono'
import { sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const reviews = new Hono<AppEnv>()

reviews.use('*', authMiddleware)

const buildUserCondition = (userId: string, onlyMine: boolean, targetUserId: string | null, roleFilter: string | null) => {
  if (onlyMine) return sql`r.user_id = ${userId}`
  if (targetUserId) {
    return sql`r.user_id = ${targetUserId} AND EXISTS (
      SELECT 1 FROM follow_requests
      WHERE status = 'accepted'
        AND (
          (from_user_id = ${userId} AND to_user_id = ${targetUserId}) OR
          (to_user_id = ${userId} AND from_user_id = ${targetUserId})
        )
    )`
  }
  return sql`(r.user_id = ${userId} OR ${buildFollowCondition(userId, roleFilter)})`
}

const buildFollowCondition = (userId: string, roleFilter: string | null) => {
  const roleCond = roleFilter ? sql`AND role = ${roleFilter}` : sql``
  return sql`EXISTS (
    SELECT 1 FROM follow_requests
    WHERE status = 'accepted'
      ${roleCond}
      AND (
        (from_user_id = ${userId} AND to_user_id = r.user_id) OR
        (to_user_id = ${userId} AND from_user_id = r.user_id)
      )
  )`
}

reviews.get('/', async (c) => {
  const userId = c.get('userId')
  const roleFilter = c.req.query('role') ?? null
  const situationFilter = c.req.query('situation') ?? null
  const followCond = buildFollowCondition(userId, roleFilter)
  const situationWhere = situationFilter ? sql`AND r.situation = ${situationFilter}` : sql``

  const rows = await sql`
    SELECT r.*, p.username, p.display_name, p.avatar_url,
           rs.name AS restaurant_name, rs.genre, rs.lat, rs.lng
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE (r.user_id = ${userId} OR ${followCond})
    ${situationWhere}
    ORDER BY r.created_at DESC
  `
  return c.json(rows)
})

reviews.get('/map', async (c) => {
  const userId = c.get('userId')
  const roleFilter = c.req.query('role') ?? null
  const situationFilter = c.req.query('situation') ?? null
  const onlyMine = c.req.query('onlyMine') === 'true'
  const targetUserId = c.req.query('targetUserId') ?? null

  const userCond = buildUserCondition(userId, onlyMine, targetUserId, roleFilter)
  const situationWhere = situationFilter ? sql`AND r.situation = ${situationFilter}` : sql``

  const rows = await sql`
    SELECT
      rs.id AS restaurant_id,
      rs.name AS restaurant_name,
      rs.lat,
      rs.lng,
      rs.genre,
      json_agg(json_build_object(
        'id', r.id,
        'user_id', r.user_id,
        'rating', r.rating,
        'situation', r.situation,
        'comment', r.comment,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url,
        'visited_at', r.visited_at,
        'photo_urls', r.photo_urls
      ) ORDER BY r.created_at DESC) AS reviews
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE rs.lat IS NOT NULL AND rs.lng IS NOT NULL
      AND ${userCond}
    ${situationWhere}
    GROUP BY rs.id, rs.name, rs.lat, rs.lng, rs.genre
  `
  return c.json(rows)
})

const fetchVisibleGenres = async (userId: string): Promise<string[]> => {
  const rows = await sql`
    SELECT DISTINCT rs.genre
    FROM reviews r
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE rs.genre IS NOT NULL
      AND (r.user_id = ${userId} OR ${buildFollowCondition(userId, null)})
  `
  return rows.map((row) => row.genre as string)
}

// フィード用：店舗単位でグルーピングし、最新レビュー日時のkeysetカーソルでページングする
reviews.get('/feed', async (c) => {
  const userId = c.get('userId')
  const roleFilter = c.req.query('role') ?? null
  const situationFilter = c.req.query('situation') ?? null
  const genresParam = c.req.query('genres') ?? null
  const cursor = c.req.query('cursor') ?? null
  const limit = Math.min(Number(c.req.query('limit') ?? 20) || 20, 50)

  const followCond = buildFollowCondition(userId, roleFilter)
  const situationWhere = situationFilter ? sql`AND r.situation = ${situationFilter}` : sql``
  const genreWhere = genresParam ? sql`AND rs.genre = ANY(${genresParam.split(',')})` : sql``
  const cursorHaving = cursor ? sql`HAVING MAX(r.created_at) < ${cursor}` : sql``

  const rows = await sql`
    SELECT
      rs.id AS restaurant_id,
      rs.name AS restaurant_name,
      rs.genre,
      rs.lat,
      rs.lng,
      rs.photo_url,
      MAX(r.created_at) AS latest_review_at,
      json_agg(json_build_object(
        'id', r.id,
        'user_id', r.user_id,
        'restaurant_id', r.restaurant_id,
        'rating', r.rating,
        'situation', r.situation,
        'comment', r.comment,
        'visited_at', r.visited_at,
        'photo_urls', r.photo_urls,
        'display_name', p.display_name,
        'avatar_url', p.avatar_url
      ) ORDER BY r.created_at DESC) AS reviews
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE (r.user_id = ${userId} OR ${followCond})
    ${situationWhere}
    ${genreWhere}
    GROUP BY rs.id, rs.name, rs.genre, rs.lat, rs.lng, rs.photo_url
    ${cursorHaving}
    ORDER BY latest_review_at DESC
    LIMIT ${limit + 1}
  `

  const hasMore = rows.length > limit
  const restaurants = hasMore ? rows.slice(0, limit) : rows
  // ジャンル一覧は全ページ共通なので初回（カーソルなし）のみ返す
  const genres = cursor ? null : await fetchVisibleGenres(userId)

  return c.json({ restaurants, hasMore, genres })
})

reviews.post('/', async (c) => {
  const userId = c.get('userId')
  const { restaurantId, rating, comment, visitedAt, situation, genre, photoUrls } = await c.req.json() as {
    restaurantId: string
    rating: string
    comment?: string
    visitedAt?: string
    situation?: string
    genre?: string
    photoUrls?: string[]
  }

  if (genre) {
    await sql`UPDATE restaurants SET genre = ${genre} WHERE id = ${restaurantId}`
  }

  const urls = photoUrls && photoUrls.length > 0 ? photoUrls : null

  const [created] = await sql`
    INSERT INTO reviews (user_id, restaurant_id, rating, comment, visited_at, situation, photo_urls)
    VALUES (${userId}, ${restaurantId}, ${rating}, ${comment ?? null}, ${visitedAt ?? null}, ${situation ?? null}, ${urls})
    RETURNING *
  `

  // 削除すると「行きたい→実行」の転換率が測れなくなるため、訪問済みマークで残す
  await sql`
    UPDATE wanna_go SET visited_at = NOW()
    WHERE user_id = ${userId} AND restaurant_id = ${restaurantId} AND visited_at IS NULL
  `

  return c.json(created, 201)
})

reviews.get('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const followCond = buildFollowCondition(userId, null)
  const [row] = await sql`
    SELECT r.*, p.username, p.display_name, rs.name AS restaurant_name
    FROM reviews r
    JOIN profiles p ON p.id = r.user_id
    JOIN restaurants rs ON rs.id = r.restaurant_id
    WHERE r.id = ${id}
      AND (r.user_id = ${userId} OR ${followCond})
  `
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: 'レビューが見つかりません' } }, 404)
  return c.json(row)
})

reviews.put('/:id', async (c) => {
  const userId = c.get('userId')
  const { id } = c.req.param()
  const { rating, comment, visitedAt, situation, photoUrls } = await c.req.json() as {
    rating?: string
    comment?: string
    visitedAt?: string
    situation?: string
    photoUrls?: string[]
  }

  // photoUrls は「指定なし＝維持」「空配列＝全削除」を区別するため COALESCE を使わない
  if (photoUrls !== undefined) {
    await sql`
      UPDATE reviews SET photo_urls = ${photoUrls.length > 0 ? photoUrls : null}
      WHERE id = ${id} AND user_id = ${userId}
    `
  }

  const [updated] = await sql`
    UPDATE reviews SET
      rating = COALESCE(${rating ?? null}, rating),
      comment = COALESCE(${comment ?? null}, comment),
      visited_at = COALESCE(${visitedAt ?? null}, visited_at),
      situation = COALESCE(${situation ?? null}, situation),
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
