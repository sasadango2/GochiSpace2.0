import { useState } from 'react'
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, List, ListItemButton, ListItemText,
  Typography, Box, CircularProgress,
  useTheme, useMediaQuery,
} from '@mui/material'
import { supabase } from '../supabase'

const API_BASE = import.meta.env.VITE_API_BASE_URL as string

type Restaurant = {
  id: string
  name: string
  address: string
  genre: string | null
}

type Props = {
  open: boolean
  onClose: () => void
  onAdded: () => void
}

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? ''
}

export default function WannaGoAddDialog({ open, onClose, onAdded }: Props) {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [keyword, setKeyword] = useState('')
  const [results, setResults] = useState<Restaurant[]>([])
  const [searching, setSearching] = useState(false)
  const [adding, setAdding] = useState<string | null>(null)

  const handleSearch = async () => {
    if (!keyword.trim()) return
    setSearching(true)
    const token = await getToken()
    const res = await fetch(
      `${API_BASE}/api/v1/restaurants/search?q=${encodeURIComponent(keyword)}`,
      { headers: { Authorization: `Bearer ${token}` } },
    )
    setResults((await res.json()) as Restaurant[])
    setSearching(false)
  }

  const handleAdd = async (r: Restaurant) => {
    setAdding(r.id)
    const token = await getToken()
    await fetch(`${API_BASE}/api/v1/wanna-go`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId: r.id }),
    })
    setAdding(null)
    resetAndClose()
    onAdded()
  }

  const resetAndClose = () => {
    setKeyword('')
    setResults([])
    onClose()
  }

  return (
    <Dialog open={open} onClose={resetAndClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle>行きたい店を追加</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              label="店舗名・キーワード"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              fullWidth
              size="small"
            />
            <Button variant="contained" onClick={handleSearch} disabled={searching} sx={{ minWidth: 80 }}>
              {searching ? <CircularProgress size={20} color="inherit" /> : '検索'}
            </Button>
          </Box>
          <List dense disablePadding>
            {results.map((r) => (
              <ListItemButton
                key={r.id}
                onClick={() => handleAdd(r)}
                disabled={adding === r.id}
                divider
              >
                <ListItemText
                  primary={r.name}
                  secondary={`${r.genre ?? ''}　${r.address}`}
                />
                {adding === r.id && <CircularProgress size={18} />}
              </ListItemButton>
            ))}
            {results.length === 0 && keyword && !searching && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                検索結果がありません
              </Typography>
            )}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={resetAndClose}>キャンセル</Button>
      </DialogActions>
    </Dialog>
  )
}
