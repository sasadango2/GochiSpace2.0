import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      if (!data.session) {
        navigate('/login')
        return
      }
      const token = data.session.access_token
      const res = await fetch(`${API_BASE}/api/v1/users/me`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 404) {
        navigate('/onboarding')
        return
      }
      setChecking(false)
    })
  }, [navigate])

  if (checking) return null
  return <>{children}</>
}
