import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import Auth from './Auth'
import Dashboard from './Dashboard'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Récupérer la session existante au chargement
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    // Écouter les changements de session (login / logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div style={{ background: '#F7F3EC', color: '#2A2421' }} className="min-h-screen flex items-center justify-center">
        <div className="display-font text-2xl italic">Chargement…</div>
      </div>
    )
  }

  return session ? <Dashboard session={session} /> : <Auth />
}
