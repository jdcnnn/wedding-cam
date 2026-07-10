export interface Shot {
  id: string
  session_id: string
  file_path: string
  created_at: string
}

export type AppScreen = 'splash' | 'instructions' | 'camera' | 'finished' | 'strip'

export const MAX_SHOTS = 10
export const SESSION_KEY = 'weddingcam_session_id'
