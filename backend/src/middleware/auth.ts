import { createMiddleware } from 'hono/factory'
import { jwtVerify, createRemoteJWKSet } from 'jose'
import type { AppEnv } from '../types.js'

const SUPABASE_URL = process.env.SUPABASE_URL as string
const JWKS = createRemoteJWKSet(new URL(`${SUPABASE_URL}/auth/v1/.well-known/jwks.json`))

export const authMiddleware = createMiddleware<AppEnv>(async (c, next) => {
  const authorization = c.req.header('Authorization')
  if (!authorization?.startsWith('Bearer ')) {
    return c.json({ error: { code: 'UNAUTHORIZED', message: '認証が必要です' } }, 401)
  }

  const token = authorization.slice(7)
  const { payload } = await jwtVerify(token, JWKS).catch(() => {
    throw { status: 401 }
  })

  c.set('userId', payload.sub as string)
  await next()
})
