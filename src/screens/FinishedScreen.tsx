import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'

interface Props {
  sessionId: string
  onCreateStrip: () => void
}

export function FinishedScreen({ sessionId, onCreateStrip }: Props) {
  const [thumbUrls, setThumbUrls] = useState<string[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [visible, setVisible] = useState(false)
  const [loading, setLoading] = useState(true)
  const [hasCreatedStrip, setHasCreatedStrip] = useState(false)

  useEffect(() => {
    async function loadThumbs() {
      const [{ data }, { data: stripData }] = await Promise.all([
        supabase
          .from('shots')
          .select('file_path')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false }),
        supabase
          .from('photo_strips')
          .select('session_id')
          .eq('session_id', sessionId)
          .maybeSingle(),
      ])

      setHasCreatedStrip(!!stripData)

      if (!data) {
        setLoading(false)
        return
      }
      setTotalCount(data.length)

      const urls = data.slice(0, 5).map(row => {
        const { data: pub } = supabase.storage
          .from('wedding-shots')
          .getPublicUrl(row.file_path)
        return pub.publicUrl
      })
      setThumbUrls(urls)
      setLoading(false)
    }

    loadThumbs()
    const t = setTimeout(() => setVisible(true), 100)
    return () => clearTimeout(t)
  }, [sessionId])

  const preview = thumbUrls.slice(0, 4)
  const extra = totalCount > 4 ? totalCount - 4 : 0

  return (
    <div
      className="h-full w-full flex flex-col items-center justify-center px-8 text-center relative overflow-hidden"
      style={{ background: '#FBF8F4' }}
    >
      <div
        style={{
          position: 'absolute',
          top: -80,
          right: -80,
          width: 280,
          height: 280,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201,155,160,0.4) 0%, transparent 70%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1.5s ease',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: -60,
          left: -60,
          width: 240,
          height: 240,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(143,163,217,0.3) 0%, transparent 70%)',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1.5s ease',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          height: 3,
          width: visible ? 64 : 0,
          background: 'linear-gradient(90deg, #8FA3D9, #C99BA0)',
          transition: 'width 0.9s cubic-bezier(0.22,0.61,0.36,1) 0.1s',
        }}
      />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: '50%',
          width: 72,
          height: 72,
          background: 'linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)',
          marginBottom: 28,
          boxShadow: '0 6px 24px rgba(143,163,217,0.5)',
          opacity: visible ? 1 : 0,
          transform: visible ? 'scale(1)' : 'scale(0.75)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,0.61,0.36,1)',
        }}
      >
        <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
          <polyline
            points="5,15 11,21 23,8"
            stroke="#FBF8F4"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      <h1
        style={{
          fontFamily: 'Cormorant Garamond, Georgia, serif',
          fontWeight: 500,
          fontStyle: 'italic',
          fontSize: 'clamp(2.4rem, 10vw, 3.2rem)',
          color: '#34304F',
          lineHeight: 1.05,
          marginBottom: 14,
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(12px)',
          transition: 'opacity 0.8s ease 0.15s, transform 0.8s ease 0.15s',
        }}
      >
        That's a wrap
      </h1>

      <p
        style={{
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontWeight: 400,
          fontSize: '0.9rem',
          color: 'rgba(52,48,79,0.7)',
          lineHeight: 1.75,
          maxWidth: 270,
          marginBottom: 32,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.8s ease 0.3s',
        }}
      >
        Your shots have been added to the couple's album.
        <br />
        Thank you for being part of their day.
      </p>

      {loading ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 32,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.45s',
          }}
        >
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              style={{
                borderRadius: 8,
                width: 52,
                height: 68,
                background: 'linear-gradient(135deg, rgba(143,163,217,0.25), rgba(201,155,160,0.25))',
                border: '1px solid rgba(143,163,217,0.3)',
              }}
            />
          ))}
        </div>
      ) : preview.length > 0 ? (
        <div
          style={{
            display: 'flex',
            gap: 8,
            marginBottom: 32,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease 0.45s, transform 0.8s ease 0.45s',
          }}
        >
          {preview.map((url, i) => (
            <div
              key={i}
              style={{
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 8,
                width: 52,
                height: 68,
                border: '1.5px solid rgba(143,163,217,0.45)',
                boxShadow: '0 4px 16px rgba(52,48,79,0.14)',
              }}
            >
              <img
                src={url}
                alt=""
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
          ))}
          {extra > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: 8,
                width: 52,
                height: 68,
                background: 'linear-gradient(135deg, rgba(143,163,217,0.25), rgba(201,155,160,0.25))',
                border: '1.5px solid rgba(143,163,217,0.45)',
                color: '#34304F',
                fontFamily: 'DM Sans, system-ui, sans-serif',
                fontWeight: 500,
                fontSize: '0.78rem',
              }}
            >
              +{extra}
            </div>
          )}
        </div>
      ) : (
        <p
          style={{
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontWeight: 300,
            fontSize: '0.78rem',
            color: 'rgba(52,48,79,0.4)',
            marginBottom: 32,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.45s',
          }}
        >
          No shots taken this round — that's okay!
        </p>
      )}

      {!loading && totalCount > 0 && (
        <p
          style={{
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontWeight: 500,
            fontSize: '0.68rem',
            color: 'rgba(52,48,79,0.45)',
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            marginTop: -20,
            marginBottom: 28,
            opacity: visible ? 1 : 0,
            transition: 'opacity 0.8s ease 0.55s',
          }}
        >
          {totalCount} {totalCount === 1 ? 'shot' : 'shots'} captured
        </p>
      )}

      {!loading && totalCount > 0 && (
        <button
          onClick={hasCreatedStrip ? undefined : onCreateStrip}
          disabled={hasCreatedStrip}
          style={{
            fontFamily: 'DM Sans, system-ui, sans-serif',
            fontWeight: 500,
            fontSize: '0.82rem',
            color: hasCreatedStrip ? 'rgba(52,48,79,0.4)' : '#FBF8F4',
            letterSpacing: '0.04em',
            padding: '12px 28px',
            borderRadius: 999,
            border: hasCreatedStrip ? '1px solid rgba(143,163,217,0.4)' : 'none',
            background: hasCreatedStrip
              ? 'transparent'
              : 'linear-gradient(135deg, #8FA3D9 0%, #C99BA0 100%)',
            boxShadow: hasCreatedStrip ? 'none' : '0 6px 20px rgba(143,163,217,0.4)',
            cursor: hasCreatedStrip ? 'default' : 'pointer',
            marginBottom: 28,
            opacity: visible ? 1 : 0,
            transform: visible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.8s ease 0.6s, transform 0.8s ease 0.6s',
          }}
        >
          {hasCreatedStrip ? 'Photo strip created' : 'Create your photo strip'}
        </button>
      )}

      <div
        style={{
          width: visible ? 52 : 0,
          height: 1,
          background: 'rgba(143,163,217,0.5)',
          marginBottom: 24,
          transition: 'width 0.7s ease 0.65s',
        }}
      />

      <p
        className="uppercase"
        style={{
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontWeight: 500,
          fontSize: '0.72rem',
          color: '#34304F',
          letterSpacing: '0.2em',
          marginBottom: 28,
          opacity: visible ? 1 : 0,
          transition: 'opacity 1s ease 0.75s',
        }}
      >
        #JUDEfoundhisDEStiny
      </p>

      <p
        style={{
          fontFamily: 'DM Sans, system-ui, sans-serif',
          fontWeight: 300,
          fontSize: '0.72rem',
          color: 'rgba(52,48,79,0.4)',
          letterSpacing: '0.03em',
          opacity: visible ? 1 : 0,
          transition: 'opacity 1s ease 0.9s',
        }}
      >
        You're all set — feel free to close this tab.
      </p>
    </div>
  )
}