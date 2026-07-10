import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

interface ShotRow {
  id: string
  session_id: string
  file_path: string
  created_at: string
  url: string
}

type Toast = { id: number; message: string; tone: 'success' | 'error' }

const INK = '#34304F'
const CREAM = '#FBF8F4'
const LAVENDER = '#C9C7EC'
const MAUVE = '#DEC6DE'
const BLUSH = '#F4CBD6'

export function AdminScreen() {
  const [session, setSession] = useState<any>(null)
  const [checkingSession, setCheckingSession] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loginError, setLoginError] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const [cleaningUp, setCleaningUp] = useState(false)
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set())

  const [shots, setShots] = useState<ShotRow[]>([])
  const [loadingShots, setLoadingShots] = useState(true)
  const [selectMode, setSelectMode] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState<{ done: number; total: number } | null>(null)
  const [viewingIndex, setViewingIndex] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const pushToast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, message, tone }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3200)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setCheckingSession(false)
    })
    const { data: listener } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => listener.subscription.unsubscribe()
  }, [])

  const loadShots = useCallback(async () => {
    setLoadingShots(true)
    const { data, error } = await supabase
      .from('shots')
      .select('id, session_id, file_path, created_at')
      .order('created_at', { ascending: false })

    if (data) {
      const rows: ShotRow[] = data.map(row => {
        const { data: pub } = supabase.storage.from('wedding-shots').getPublicUrl(row.file_path)
        return { ...row, url: pub.publicUrl }
      })
      setShots(rows)
    } else if (error) {
      pushToast('Could not load the album. Try refreshing.', 'error')
    }
    setLoadingShots(false)
  }, [pushToast])

  useEffect(() => {
    if (session) loadShots()
  }, [session, loadShots])

  async function login() {
    setLoginError('')
    setLoggingIn(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setLoginError(error.message)
    setLoggingIn(false)
  }

  async function logout() {
    await supabase.auth.signOut()
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exitSelectMode() {
    setSelectMode(false)
    setSelected(new Set())
  }

  function selectAllVisible() {
    setSelected(new Set(shots.map(s => s.id)))
  }

  async function downloadSingle(shot: ShotRow) {
    try {
      const res = await fetch(shot.url)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = shot.file_path.split('/').pop() ?? 'photo.jpg'
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      pushToast('Download failed. Try again.', 'error')
    }
  }

  async function checkImageExists(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: 'HEAD' })
      return res.ok
    } catch {
      return false
    }
  }

  async function scanForBroken() {
    setCleaningUp(true)
    const broken = new Set<string>()

    await Promise.all(
      shots.map(async (shot) => {
        const exists = await checkImageExists(shot.url)
        if (!exists) broken.add(shot.id)
      })
    )

    setBrokenIds(broken)
    setCleaningUp(false)
    pushToast(broken.size === 0 ? 'No broken entries found.' : `Found ${broken.size} broken ${broken.size === 1 ? 'entry' : 'entries'}.`)
  }

  async function deleteBrokenEntries() {
    if (brokenIds.size === 0) return
    setCleaningUp(true)

    const idsArray = Array.from(brokenIds)
    const { error } = await supabase
      .from('shots')
      .delete()
      .in('id', idsArray)

    if (!error) {
      setShots(prev => prev.filter(s => !brokenIds.has(s.id)))
      setBrokenIds(new Set())
      pushToast('Broken entries removed.')
    } else {
      pushToast('Cleanup failed. Try again.', 'error')
    }

    setCleaningUp(false)
  }

  async function zipAndDownload(list: ShotRow[], filename: string) {
    if (list.length === 0) return
    setDownloading(true)
    setDownloadProgress({ done: 0, total: list.length })

    try {
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      let done = 0
      await Promise.all(
        list.map(async (shot, i) => {
          const res = await fetch(shot.url)
          const blob = await res.blob()
          const ext = shot.file_path.split('.').pop() ?? 'jpg'
          zip.file(`shot_${String(i + 1).padStart(3, '0')}.${ext}`, blob)
          done += 1
          setDownloadProgress({ done, total: list.length })
        })
      )

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const url = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
      pushToast(`Downloaded ${list.length} ${list.length === 1 ? 'photo' : 'photos'}.`)
    } catch {
      pushToast('Zip download failed. Try again.', 'error')
    } finally {
      setDownloading(false)
      setDownloadProgress(null)
    }
  }

  async function downloadSelected() {
    const toDownload = shots.filter(s => selected.has(s.id))
    await zipAndDownload(toDownload, `wedding-shots-${toDownload.length}.zip`)
    exitSelectMode()
  }

  async function downloadAll() {
    await zipAndDownload(shots, `wedding-shots-all-${shots.length}.zip`)
  }

  function openViewer(index: number) {
    setViewingIndex(index)
  }

  function closeViewer() {
    setViewingIndex(null)
  }

  function showPrev() {
    setViewingIndex(prev => {
      if (prev === null) return null
      return prev > 0 ? prev - 1 : shots.length - 1
    })
  }

  function showNext() {
    setViewingIndex(prev => {
      if (prev === null) return null
      return prev < shots.length - 1 ? prev + 1 : 0
    })
  }

  useEffect(() => {
    if (viewingIndex === null) return
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') showPrev()
      else if (e.key === 'ArrowRight') showNext()
      else if (e.key === 'Escape') closeViewer()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
   
  }, [viewingIndex, shots.length])

  const totalShots = shots.length
  const uniqueGuests = new Set(shots.map(s => s.session_id)).size
  const viewingShot = viewingIndex !== null ? shots[viewingIndex] : null

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: CREAM }}>
        <span style={{
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontWeight: 300, fontSize: '0.85rem',
          color: 'rgba(52,48,79,0.4)', letterSpacing: '0.1em',
        }}>
          Loading…
        </span>
      </div>
    )
  }

  if (!session) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden"
        style={{ background: CREAM }}
      >
        <div
          style={{
            position: 'absolute', top: -100, right: -100, width: 320, height: 320,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(244,203,214,0.4) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />
        <div
          style={{
            position: 'absolute', bottom: -80, left: -80, width: 280, height: 280,
            borderRadius: '50%',
            background: `radial-gradient(circle, rgba(201,199,236,0.32) 0%, transparent 70%)`,
            pointerEvents: 'none',
          }}
        />

        <div className="w-full max-w-sm relative">
          <div className="text-center mb-12">
            <p style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 400, fontSize: '0.62rem',
              color: 'rgba(52,48,79,0.4)', letterSpacing: '0.32em',
              textTransform: 'uppercase', marginBottom: 10,
            }}>
              The Wedding Cam
            </p>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 400, fontStyle: 'italic',
              fontSize: '2.6rem', color: INK,
            }}>
              Album access
            </h1>
            <div
              style={{
                width: 40, height: 1, background: 'rgba(201,199,236,0.6)',
                margin: '18px auto 0',
              }}
            />
          </div>

          <div className="flex flex-col gap-3.5">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 14,
                border: '1.5px solid rgba(52,48,79,0.12)',
                fontFamily: 'DM Sans', fontSize: '0.92rem',
                background: '#fff', color: INK, outline: 'none',
                boxShadow: '0 1px 3px rgba(52,48,79,0.04)',
              }}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && login()}
              style={{
                width: '100%', padding: '14px 18px', borderRadius: 14,
                border: '1.5px solid rgba(52,48,79,0.12)',
                fontFamily: 'DM Sans', fontSize: '0.92rem',
                background: '#fff', color: INK, outline: 'none',
                boxShadow: '0 1px 3px rgba(52,48,79,0.04)',
              }}
            />
            {loginError && (
              <p style={{ color: '#c0392b', fontFamily: 'DM Sans', fontSize: '0.8rem' }}>
                {loginError}
              </p>
            )}
            <button
              onClick={login}
              disabled={loggingIn}
              className="active:scale-95 transition-transform"
              style={{
                width: '100%', padding: '14px 0', borderRadius: 30, marginTop: 8,
                background: `linear-gradient(135deg, ${LAVENDER} 0%, ${MAUVE} 50%, ${BLUSH} 100%)`,
                color: INK,
                fontFamily: 'DM Sans', fontWeight: 500, fontSize: '0.9rem',
                border: 'none', cursor: loggingIn ? 'wait' : 'pointer',
                opacity: loggingIn ? 0.7 : 1,
                letterSpacing: '0.06em',
                boxShadow: '0 4px 20px rgba(201,199,236,0.5)',
              }}
            >
              {loggingIn ? 'Signing in…' : 'Sign in'}
            </button>
          </div>

          <p
            className="text-center mt-10 uppercase"
            style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 500, fontSize: '0.68rem',
              color: 'rgba(52,48,79,0.3)', letterSpacing: '0.2em',
            }}
          >
            #JUDEfoundhisDEStiny
          </p>
        </div>
      </div>
    )
  }

  // ---------- Dashboard ----------
  return (
    <div style={{ background: CREAM, height: '100vh', overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}>

      {/* Toasts */}
      <div style={{
        position: 'fixed', top: 16, left: 0, right: 0, zIndex: 100,
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => (
          <div
            key={t.id}
            style={{
              padding: '10px 18px', borderRadius: 30,
              background: t.tone === 'error' ? '#c0392b' : INK,
              color: CREAM,
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 500, fontSize: '0.78rem',
              boxShadow: '0 6px 20px rgba(52,48,79,0.25)',
              animation: 'toastIn 0.25s ease',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>

      {/* Header */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 20,
        background: `linear-gradient(160deg, #454072 0%, #34304F 100%)`,
        padding: '22px 22px 20px',
        boxShadow: '0 4px 20px rgba(52,48,79,0.18)',
      }}>
        <div className="flex items-start justify-between mb-5">
          <div>
            <p style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 400, fontSize: '0.6rem',
              color: 'rgba(251,248,244,0.5)', letterSpacing: '0.28em',
              textTransform: 'uppercase', marginBottom: 4,
            }}>
              The Wedding Cam
            </p>
            <h1 style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 400, fontStyle: 'italic',
              fontSize: '1.8rem', color: CREAM,
            }}>
              The Album
            </h1>
          </div>
          <button
            onClick={logout}
            style={{
              color: 'rgba(251,248,244,0.6)', fontFamily: 'DM Sans',
              fontSize: '0.76rem', background: 'rgba(251,248,244,0.07)',
              border: '1px solid rgba(251,248,244,0.14)', cursor: 'pointer',
              padding: '6px 14px', borderRadius: 20, marginTop: 2,
            }}
          >
            Sign out
          </button>
        </div>

        {/* Stats row */}
        <div className="flex gap-8 mb-5">
          <div>
            <p style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 400, fontStyle: 'italic',
              fontSize: '1.95rem', color: CREAM, lineHeight: 1,
              background: `linear-gradient(135deg, ${LAVENDER}, ${BLUSH})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {totalShots}
            </p>
            <p style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 400, fontSize: '0.62rem',
              color: 'rgba(251,248,244,0.45)', letterSpacing: '0.12em', marginTop: 4,
            }}>
              TOTAL SHOTS
            </p>
          </div>
          <div style={{ width: 1, background: 'rgba(251,248,244,0.14)' }} />
          <div>
            <p style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 400, fontStyle: 'italic',
              fontSize: '1.95rem', color: CREAM, lineHeight: 1,
              background: `linear-gradient(135deg, ${LAVENDER}, ${BLUSH})`,
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              {uniqueGuests}
            </p>
            <p style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 400, fontSize: '0.62rem',
              color: 'rgba(251,248,244,0.45)', letterSpacing: '0.12em', marginTop: 4,
            }}>
              GUEST SESSIONS
            </p>
          </div>
        </div>

        {/* Actions row */}
        <div className="flex gap-2.5">
          {!selectMode ? (
            <>
              <button
                onClick={downloadAll}
                disabled={downloading || shots.length === 0}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 30,
                  background: `linear-gradient(135deg, ${LAVENDER}, ${BLUSH})`,
                  color: INK,
                  fontFamily: 'DM Sans', fontWeight: 500, fontSize: '0.8rem',
                  border: 'none', cursor: 'pointer',
                  opacity: shots.length === 0 ? 0.4 : 1,
                  boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
                }}
              >
                Download all ({shots.length})
              </button>
              <button
                onClick={() => setSelectMode(true)}
                disabled={shots.length === 0}
                style={{
                  padding: '11px 18px', borderRadius: 30,
                  background: 'rgba(251,248,244,0.08)', color: CREAM,
                  fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.8rem',
                  border: '1px solid rgba(251,248,244,0.18)', cursor: 'pointer',
                  opacity: shots.length === 0 ? 0.4 : 1,
                }}
              >
                Select
              </button>
            </>
          ) : (
            <>
              <button
                onClick={downloadSelected}
                disabled={downloading || selected.size === 0}
                style={{
                  flex: 1, padding: '11px 0', borderRadius: 30,
                  background: selected.size > 0 ? `linear-gradient(135deg, ${LAVENDER}, ${BLUSH})` : 'rgba(251,248,244,0.12)',
                  color: selected.size > 0 ? INK : 'rgba(251,248,244,0.5)',
                  fontFamily: 'DM Sans', fontWeight: 500, fontSize: '0.8rem',
                  border: 'none', cursor: selected.size > 0 ? 'pointer' : 'not-allowed',
                }}
              >
                Download selected ({selected.size})
              </button>
              <button
                onClick={selectAllVisible}
                style={{
                  padding: '11px 16px', borderRadius: 30,
                  background: 'rgba(251,248,244,0.08)', color: CREAM,
                  fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.8rem',
                  border: '1px solid rgba(251,248,244,0.18)', cursor: 'pointer',
                }}
              >
                Select all
              </button>
              <button
                onClick={exitSelectMode}
                style={{
                  padding: '11px 18px', borderRadius: 30,
                  background: 'rgba(251,248,244,0.08)', color: CREAM,
                  fontFamily: 'DM Sans', fontWeight: 400, fontSize: '0.8rem',
                  border: '1px solid rgba(251,248,244,0.18)', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
            </>
          )}
        </div>

        {/* Cleanup tool */}
        <div style={{ marginTop: 12 }}>
          {brokenIds.size === 0 ? (
            <button
              onClick={scanForBroken}
              disabled={cleaningUp || shots.length === 0}
              style={{
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: 400, fontSize: '0.68rem',
                color: 'rgba(251,248,244,0.4)',
                background: 'none', border: 'none', cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3,
              }}
            >
              {cleaningUp ? 'Scanning…' : 'Scan for broken entries'}
            </button>
          ) : (
            <div style={{
              background: 'rgba(192,57,43,0.16)',
              border: '1px solid rgba(192,57,43,0.3)',
              borderRadius: 10,
              padding: '11px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
            }}>
              <span style={{
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: 400, fontSize: '0.72rem',
                color: 'rgba(251,248,244,0.9)',
              }}>
                {brokenIds.size} broken {brokenIds.size === 1 ? 'entry' : 'entries'} found
              </span>
              <button
                onClick={deleteBrokenEntries}
                disabled={cleaningUp}
                style={{
                  padding: '6px 16px', borderRadius: 20,
                  background: '#c0392b', color: '#fff',
                  fontFamily: 'DM Sans', fontWeight: 500, fontSize: '0.68rem',
                  border: 'none', cursor: 'pointer',
                }}
              >
                {cleaningUp ? 'Cleaning…' : 'Remove all'}
              </button>
            </div>
          )}
        </div>

        {/* Download progress */}
        {downloadProgress && (
          <div style={{ marginTop: 12 }}>
            <div style={{ height: 3, background: 'rgba(251,248,244,0.16)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${(downloadProgress.done / downloadProgress.total) * 100}%`,
                background: `linear-gradient(90deg, ${LAVENDER}, ${BLUSH})`,
                transition: 'width 0.2s ease',
              }} />
            </div>
            <p style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 400, fontSize: '0.65rem',
              color: 'rgba(251,248,244,0.5)', marginTop: 7,
            }}>
              Preparing {downloadProgress.done}/{downloadProgress.total}…
            </p>
          </div>
        )}
      </div>

      {/* Gallery */}
      <div style={{ padding: '24px 18px 40px' }}>
        {loadingShots ? (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12,
          }}>
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} style={{
                aspectRatio: '3/4', borderRadius: 12,
                background: `linear-gradient(135deg, rgba(201,199,236,0.2), rgba(244,203,214,0.2))`,
              }} />
            ))}
          </div>
        ) : shots.length === 0 ? (
          <div className="flex flex-col items-center text-center py-20">
            <p style={{
              fontFamily: 'Cormorant Garamond, Georgia, serif',
              fontWeight: 400, fontStyle: 'italic',
              fontSize: '1.6rem', color: INK, marginBottom: 8,
            }}>
              Nothing here yet
            </p>
            <p style={{ color: 'rgba(52,48,79,0.5)', fontFamily: 'DM Sans', fontSize: '0.82rem', maxWidth: 240 }}>
              Once your guests start snapping, their photos will show up here automatically.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
          }}>
            {shots.map((shot, index) => {
              const isSelected = selected.has(shot.id)
              return (
                <div
                  key={shot.id}
                  data-shot-card
                  onClick={() => selectMode ? toggleSelect(shot.id) : openViewer(index)}
                  style={{
                    position: 'relative',
                    aspectRatio: '3/4',
                    borderRadius: 12,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    boxShadow: isSelected
                      ? `0 4px 16px rgba(52,48,79,0.28)`
                      : '0 2px 10px rgba(52,48,79,0.08)',
                    outline: isSelected ? `3px solid ${INK}` : '1px solid rgba(52,48,79,0.06)',
                    outlineOffset: isSelected ? -3 : -1,
                    transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    transform: isSelected ? 'scale(0.97)' : 'scale(1)',
                  }}
                >
                  <img
                    src={shot.url}
                    alt=""
                    loading="lazy"
                    style={{
                      width: '100%', height: '100%', objectFit: 'cover',
                      filter: selectMode && !isSelected ? 'brightness(0.82) saturate(0.9)' : 'none',
                      transition: 'filter 0.2s ease',
                    }}
                    onError={(e) => {
                      (e.currentTarget.closest('[data-shot-card]') as HTMLElement)?.style.setProperty('display', 'none')
                    }}
                  />
                  {selectMode && (
                    <div style={{
                      position: 'absolute', top: 7, right: 7,
                      width: 21, height: 21, borderRadius: '50%',
                      background: isSelected ? INK : 'rgba(255,255,255,0.9)',
                      border: isSelected ? 'none' : '1.5px solid rgba(52,48,79,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    }}>
                      {isSelected && (
                        <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
                          <polyline points="3,8 6,11 13,4" stroke={CREAM} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Single shot viewer with prev/next navigation */}
      {viewingShot && (
        <div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: 'rgba(24,20,38,0.97)' }}
          onClick={closeViewer}
        >
          <button
            onClick={closeViewer}
            style={{
              position: 'absolute', top: 18, right: 18, zIndex: 10,
              width: 34, height: 34, borderRadius: '50%',
              background: 'rgba(251,248,244,0.08)',
              color: 'rgba(251,248,244,0.65)', fontSize: '1.2rem',
              border: 'none', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>

          <div
            className="flex-1 flex items-center justify-center gap-3 px-3"
            style={{ minHeight: 0 }}
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={showPrev}
              style={{
                flexShrink: 0,
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(251,248,244,0.08)',
                border: '1px solid rgba(251,248,244,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: CREAM,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <img
              src={viewingShot.url}
              alt=""
              style={{
                maxWidth: 'calc(100% - 100px)',
                maxHeight: '100%',
                objectFit: 'contain',
                borderRadius: 8,
                boxShadow: '0 12px 44px rgba(0,0,0,0.5)',
              }}
            />

            <button
              onClick={showNext}
              style={{
                flexShrink: 0,
                width: 38, height: 38, borderRadius: '50%',
                background: 'rgba(251,248,244,0.08)',
                border: '1px solid rgba(251,248,244,0.16)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', color: CREAM,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>

          <div
            onClick={e => e.stopPropagation()}
            style={{
              flexShrink: 0,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', gap: 12,
              padding: '0 20px 28px',
            }}
          >
            <p style={{
              fontFamily: 'DM Sans, system-ui, sans-serif',
              fontWeight: 400, fontSize: '0.72rem',
              color: 'rgba(251,248,244,0.45)',
              textAlign: 'center',
            }}>
              {viewingIndex !== null ? viewingIndex + 1 : 0} of {shots.length} ·{' '}
              {new Date(viewingShot.created_at).toLocaleString()} · {viewingShot.session_id.slice(0, 8)}…
            </p>
            <button
              onClick={() => downloadSingle(viewingShot)}
              style={{
                padding: '10px 24px', borderRadius: 30,
                background: `linear-gradient(135deg, ${LAVENDER}, ${BLUSH})`,
                color: INK,
                fontFamily: 'DM Sans', fontWeight: 500, fontSize: '0.8rem',
                border: 'none', cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0,0,0,0.25)',
              }}
            >
              Download photo
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(-8px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}