import { supabase } from '../supabase'
import { compressImage } from './compressImage'

// 専用バケットの新設はダッシュボード操作が必要なため、既存の review-photos を流用する
export async function uploadAvatar(userId: string, file: File): Promise<string | null> {
  const compressed = await compressImage(file)
  const ext = file.name.split('.').pop() ?? 'jpg'
  const path = `${userId}/avatar-${Date.now()}.${ext}`
  const { error } = await supabase.storage.from('review-photos').upload(path, compressed)
  if (error) return null
  return supabase.storage.from('review-photos').getPublicUrl(path).data.publicUrl
}
