import { Hono } from 'hono'
import { sql } from '../db.js'

const genres = new Hono()

genres.get('/', async (c) => {
  const rows = await sql`SELECT id, name FROM genres ORDER BY id`
  return c.json(rows)
})

export { genres }
