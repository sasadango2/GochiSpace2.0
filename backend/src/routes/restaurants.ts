import { Hono } from 'hono'
import { sql } from '../db.js'
import { authMiddleware } from '../middleware/auth.js'

const restaurants = new Hono()

restaurants.use('*', authMiddleware)

restaurants.get('/search', async (c) => {
  const q = c.req.query('q')
  if (!q) return c.json({ error: { code: 'BAD_REQUEST', message: 'クエリが必要です' } }, 400)

  const apiKey = process.env.HOTPEPPER_API_KEY
  const url = `https://webservice.recruit.co.jp/hotpepper/gourmet/v1/?key=${apiKey}&keyword=${encodeURIComponent(q)}&format=json&count=20`
  const res = await fetch(url)
  const data = await res.json() as { results: { shop?: HotpepperShop[] } }
  const shops = data.results.shop ?? []

  if (shops.length === 0) return c.json([])

  const values = shops.map((s) => ({
    hotpepper_id: s.id,
    name: s.name,
    address: s.address,
    lat: parseFloat(s.lat),
    lng: parseFloat(s.lng),
    genre: s.genre.name,
    hotpepper_url: s.urls.pc,
    photo_url: s.photo.pc.m,
  }))

  await sql`
    INSERT INTO restaurants ${sql(values, 'hotpepper_id', 'name', 'address', 'lat', 'lng', 'genre', 'hotpepper_url', 'photo_url')}
    ON CONFLICT (hotpepper_id) DO UPDATE SET
      name = EXCLUDED.name,
      address = EXCLUDED.address,
      lat = EXCLUDED.lat,
      lng = EXCLUDED.lng,
      genre = EXCLUDED.genre,
      hotpepper_url = EXCLUDED.hotpepper_url,
      photo_url = EXCLUDED.photo_url,
      cached_at = NOW()
  `

  const hotpepperIds = shops.map((s) => s.id)
  const rows = await sql`SELECT * FROM restaurants WHERE hotpepper_id = ANY(${hotpepperIds})`
  return c.json(rows)
})

restaurants.get('/:id', async (c) => {
  const { id } = c.req.param()
  const [row] = await sql`SELECT * FROM restaurants WHERE id = ${id}`
  if (!row) return c.json({ error: { code: 'NOT_FOUND', message: '店舗が見つかりません' } }, 404)
  return c.json(row)
})

type HotpepperShop = {
  id: string
  name: string
  address: string
  lat: string
  lng: string
  genre: { name: string }
  urls: { pc: string }
  photo: { pc: { m: string } }
}

export { restaurants }
