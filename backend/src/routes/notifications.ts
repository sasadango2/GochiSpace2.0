import { Hono } from 'hono'
import { sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'
import type { AppEnv } from '../types.js'

const notifications = new Hono<AppEnv>()
notifications.use('*', authMiddleware)

notifications.get('/', async (c) => {
  const userId = c.get('userId')

  const followReqs = await sql`
    SELECT 'follow_request' AS type, fr.id::text, fr.status, fr.created_at,
           p.display_name AS from_display_name, NULL::text AS restaurant_name, NULL::text AS message
    FROM follow_requests fr
    JOIN profiles p ON p.id = fr.from_user_id
    WHERE fr.to_user_id = ${userId}
  `

  const wannaGoReqs = await sql`
    SELECT 'wanna_go_request' AS type, wr.id::text, wr.status, wr.created_at,
           p.display_name AS from_display_name, rs.name AS restaurant_name, wr.message
    FROM wanna_go_requests wr
    JOIN profiles p ON p.id = wr.from_user_id
    JOIN restaurants rs ON rs.id = wr.restaurant_id
    WHERE wr.to_user_id = ${userId}
  `

  const all = ([...followReqs, ...wannaGoReqs] as { created_at: string }[]).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return c.json(all)
})

// 未読＝既読日時より後に届いた pending。対応待ち自体は一覧に残るが、バッジは開けば消える
notifications.get('/unread-count', async (c) => {
  const userId = c.get('userId')
  const [profile] = await sql`SELECT notifications_read_at FROM profiles WHERE id = ${userId}`
  const readAt = profile?.notifications_read_at ?? new Date(0)
  const [{ count: fc }] = await sql`
    SELECT COUNT(*) FROM follow_requests
    WHERE to_user_id = ${userId} AND status = 'pending' AND created_at > ${readAt}
  `
  const [{ count: wc }] = await sql`
    SELECT COUNT(*) FROM wanna_go_requests
    WHERE to_user_id = ${userId} AND status = 'pending' AND created_at > ${readAt}
  `
  return c.json({ count: Number(fc) + Number(wc) })
})

notifications.post('/read', async (c) => {
  const userId = c.get('userId')
  await sql`UPDATE profiles SET notifications_read_at = NOW() WHERE id = ${userId}`
  return c.json({ ok: true })
})

export { notifications }
