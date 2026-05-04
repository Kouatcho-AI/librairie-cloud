import { useState } from 'react'
import { BookOpen, Mail, Lock, AlertCircle } from 'lucide-react'
import { supabase } from './supabase'

const COLORS = {
  bg: '#F7F3EC', paper: '#FFFEFA', ink: '#2A2421', inkSoft: '#5C5249',
  wine: '#6B2737', gold: '#B8924A', goldSoft: '#D4B575',
  border: '#E5DDD0', cream: '#FAF6EE', ember: '#C26B3A', forest: '#4A7C59',
}

export default function Auth() {
  const [mode, setMode] = useState('signin') // 'signin' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(''); setInfo(''); setLoading(true)

    try {
      if (mode === 'signup') {
        if (password.length < 6) {
          setError('Le mot de passe doit contenir au moins 6 caractères.')
          setLoading(false); return
        }
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setInfo('Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse, puis reviens te connecter.')
        setMode('signin')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err) {
      const msg = err.message || ''
      if (msg.includes('Invalid login')) setError('Email ou mot de passe incorrect.')
      else if (msg.includes('already registered')) setError('Cet email est déjà inscrit. Connecte-toi.')
      else if (msg.includes('Email not confirmed')) setError('Confirme ton email avant de te connecter (vérifie ta boîte mail).')
      else setError(msg || 'Une erreur est survenue.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.ink }} className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo / Titre */}
        <div className="text-center mb-8">
          <div style={{ background: COLORS.wine, color: COLORS.goldSoft }} className="w-16 h-16 mx-auto rounded-full flex items-center justify-center mb-4">
            <BookOpen size={28} />
          </div>
          <h1 className="display-font text-4xl font-semibold" style={{ color: COLORS.wine }}>La Librairie</h1>
          <p className="display-font italic text-base mt-1 ornament" style={{ color: COLORS.gold }}>Gestion d'inventaire</p>
        </div>

        {/* Carte */}
        <div style={{ background: COLORS.paper, borderColor: COLORS.border }} className="border shadow-sm">
          <div style={{ background: COLORS.wine, color: COLORS.cream }} className="px-6 py-4">
            <h2 className="display-font text-2xl font-semibold">
              {mode === 'signin' ? 'Connexion' : 'Créer un compte'}
            </h2>
            <p className="text-xs mt-1" style={{ color: COLORS.goldSoft }}>
              {mode === 'signin' ? 'Accède à ton inventaire personnel' : 'Crée ton espace privé en quelques secondes'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Email */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider block mb-1.5 font-semibold" style={{ color: COLORS.wine, letterSpacing: '0.15em' }}>Email</span>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.inkSoft }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="ton@email.com"
                  style={{ background: COLORS.cream, borderColor: COLORS.border }}
                  className="w-full border pl-10 pr-3 py-2.5"
                />
              </div>
            </label>

            {/* Mot de passe */}
            <label className="block">
              <span className="text-xs uppercase tracking-wider block mb-1.5 font-semibold" style={{ color: COLORS.wine, letterSpacing: '0.15em' }}>Mot de passe</span>
              <div className="relative">
                <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.inkSoft }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
                  placeholder={mode === 'signup' ? '6 caractères minimum' : '••••••••'}
                  style={{ background: COLORS.cream, borderColor: COLORS.border }}
                  className="w-full border pl-10 pr-3 py-2.5"
                />
              </div>
            </label>

            {/* Messages */}
            {error && (
              <div style={{ background: '#FBEAE5', borderLeft: `3px solid ${COLORS.ember}`, color: COLORS.ember }} className="px-3 py-2 text-sm flex items-start gap-2">
                <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}
            {info && (
              <div style={{ background: '#E8F1EA', borderLeft: `3px solid ${COLORS.forest}`, color: COLORS.forest }} className="px-3 py-2 text-sm">
                {info}
              </div>
            )}

            {/* Bouton */}
            <button
              type="submit"
              disabled={loading}
              style={{ background: COLORS.wine, color: COLORS.cream }}
              className="w-full py-2.5 text-sm font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading ? 'Chargement…' : (mode === 'signin' ? 'Se connecter' : 'Créer mon compte')}
            </button>

            {/* Bascule */}
            <div className="text-center text-sm pt-2 border-t" style={{ borderColor: COLORS.border, color: COLORS.inkSoft }}>
              {mode === 'signin' ? (
                <>Pas encore de compte ?{' '}
                  <button type="button" onClick={() => { setMode('signup'); setError(''); setInfo('') }} style={{ color: COLORS.wine }} className="font-semibold hover:underline">
                    Crée-en un
                  </button>
                </>
              ) : (
                <>Déjà inscrit ?{' '}
                  <button type="button" onClick={() => { setMode('signin'); setError(''); setInfo('') }} style={{ color: COLORS.wine }} className="font-semibold hover:underline">
                    Connecte-toi
                  </button>
                </>
              )}
            </div>
          </form>
        </div>

        <p className="text-center text-xs italic mt-6" style={{ color: COLORS.inkSoft }}>
          Tes données sont privées et ne sont visibles que par toi.
        </p>
      </div>
    </div>
  )
}
