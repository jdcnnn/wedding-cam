import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { SESSION_KEY, MAX_SHOTS, type AppScreen } from '../types'

export function useSession() {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [shotCount, setShotCount] = useState(0)
  const [screen, setScreen] = useState<AppScreen | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function init() {
      const existing = localStorage.getItem(SESSION_KEY)

      if (existing) {
        setSessionId(existing)
        const { count, error } = await supabase
          .from('shots')
          .select('*', { count: 'exact', head: true })
          .eq('session_id', existing)

        if (error) {
          console.error('Failed to load shot count:', error)
          setShotCount(0)
          setScreen('camera')
          setIsLoading(false)
          return
        }

        const shots = count ?? 0
        setShotCount(shots)

        if (shots >= MAX_SHOTS) {
          setScreen('finished')
        } else if (shots === 0) {
          setScreen('splash')
        } else {
          setScreen('camera')
        }
      } else {
        const newId = crypto.randomUUID()
        localStorage.setItem(SESSION_KEY, newId)
        setSessionId(newId)
        setShotCount(0)
        setScreen('splash')
      }

      setIsLoading(false)
    }

    init()
  }, [])

  function incrementShot() {
    setShotCount(prev => prev + 1)
  }

  function decrementShot() {
    setShotCount(prev => Math.max(0, prev - 1))
  }

  return {
    sessionId,
    shotCount,
    screen,
    setScreen,
    isLoading,
    incrementShot,
    decrementShot,
  }
}