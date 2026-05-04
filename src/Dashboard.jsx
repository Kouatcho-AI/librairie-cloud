import { useState, useEffect, useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid } from 'recharts'
import { Plus, Search, Edit2, Trash2, Download, Upload, AlertTriangle, Package, BookOpen, Euro, X, Save, Filter, ArrowUpDown, LogOut, User } from 'lucide-react'
import { supabase } from './supabase'

const COLORS = {
  bg: '#F7F3EC', paper: '#FFFEFA', ink: '#2A2421', inkSoft: '#5C5249',
  wine: '#6B2737', wineLight: '#8B3A3A', gold: '#B8924A', goldSoft: '#D4B575',
  border: '#E5DDD0', borderSoft: '#EDE6D9', forest: '#4A7C59', ember: '#C26B3A', cream: '#FAF6EE',
}

const CATEGORIES = [
  'Bibles & Nouveaux Testaments',
  'Théologie & Études bibliques',
  'Spiritualité & Dévotion',
  'Vie chrétienne',
  'Famille & Mariage',
  'Jeunesse & Enfants',
  'Musique & CD',
  'Évangélisation',
  'Biographies & Témoignages',
  'Cartes & Articles cadeaux',
]

const CATEGORY_COLORS = ['#6B2737', '#B8924A', '#4A7C59', '#C26B3A', '#8B3A3A', '#7B6B43', '#2A5A4D', '#A65A2E', '#5C5249', '#D4B575']

export default function Dashboard({ session }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('Toutes')
  const [sortBy, setSortBy] = useState('titre')
  const [view, setView] = useState('inventaire')
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState(null)
  const [form, setForm] = useState({ titre: '', auteur: '', categorie: CATEGORIES[0], prix: '', stock: '', seuil: '', isbn: '' })
  const [showMenu, setShowMenu] = useState(false)

  // Charger depuis Supabase au montage
  useEffect(() => {
    loadItems()
  }, [])

  const loadItems = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('livres')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      alert('Erreur de chargement : ' + error.message)
    } else {
      setItems(data || [])
    }
    setLoading(false)
  }

  const filtered = useMemo(() => {
    let list = items.filter(it => {
      const q = search.toLowerCase()
      const matchSearch = !q || it.titre.toLowerCase().includes(q) || (it.auteur || '').toLowerCase().includes(q) || (it.isbn || '').toLowerCase().includes(q)
      const matchCat = filterCat === 'Toutes' || it.categorie === filterCat
      return matchSearch && matchCat
    })
    list.sort((a, b) => {
      if (sortBy === 'stock') return a.stock - b.stock
      if (sortBy === 'prix') return b.prix - a.prix
      if (sortBy === 'valeur') return (b.prix * b.stock) - (a.prix * a.stock)
      return a.titre.localeCompare(b.titre)
    })
    return list
  }, [items, search, filterCat, sortBy])

  const stats = useMemo(() => ({
    totalArticles: items.reduce((s, it) => s + it.stock, 0),
    valeurTotale: items.reduce((s, it) => s + it.prix * it.stock, 0),
    enRupture: items.filter(it => it.stock <= it.seuil).length,
    references: items.length,
  }), [items])

  const chartData = useMemo(() => {
    const map = {}
    items.forEach(it => {
      if (!map[it.categorie]) map[it.categorie] = { categorie: it.categorie, valeur: 0, stock: 0 }
      map[it.categorie].valeur += it.prix * it.stock
      map[it.categorie].stock += it.stock
    })
    return Object.values(map).map(d => ({ ...d, court: d.categorie.split(' ')[0] }))
  }, [items])

  const openAdd = () => {
    setEditing(null)
    setForm({ titre: '', auteur: '', categorie: CATEGORIES[0], prix: '', stock: '', seuil: '5', isbn: '' })
    setShowModal(true)
  }

  const openEdit = (it) => {
    setEditing(it.id)
    setForm({ ...it, prix: String(it.prix), stock: String(it.stock), seuil: String(it.seuil) })
    setShowModal(true)
  }

  const saveItem = async () => {
    if (!form.titre.trim()) return
    const payload = {
      titre: form.titre.trim(),
      auteur: form.auteur.trim() || '—',
      categorie: form.categorie,
      prix: parseFloat(form.prix) || 0,
      stock: parseInt(form.stock) || 0,
      seuil: parseInt(form.seuil) || 5,
      isbn: form.isbn.trim() || '—',
      user_id: session.user.id,
    }

    if (editing) {
      const { error } = await supabase.from('livres').update(payload).eq('id', editing)
      if (error) return alert('Erreur : ' + error.message)
    } else {
      const { error } = await supabase.from('livres').insert(payload)
      if (error) return alert('Erreur : ' + error.message)
    }
    setShowModal(false)
    await loadItems()
  }

  const removeItem = async (id) => {
    if (!confirm('Supprimer cette référence définitivement ?')) return
    const { error } = await supabase.from('livres').delete().eq('id', id)
    if (error) return alert('Erreur : ' + error.message)
    await loadItems()
  }

  const adjustStock = async (id, delta) => {
    const item = items.find(i => i.id === id)
    if (!item) return
    const newStock = Math.max(0, item.stock + delta)
    // Mise à jour optimiste de l'UI
    setItems(items.map(i => i.id === id ? { ...i, stock: newStock } : i))
    const { error } = await supabase.from('livres').update({ stock: newStock }).eq('id', id)
    if (error) {
      alert('Erreur : ' + error.message)
      await loadItems()
    }
  }

  const exportCSV = () => {
    const headers = ['Titre', 'Auteur', 'Catégorie', 'Prix', 'Stock', 'Seuil', 'ISBN', 'Valeur']
    const rows = items.map(i => [i.titre, i.auteur, i.categorie, i.prix.toFixed(2), i.stock, i.seuil, i.isbn, (i.prix * i.stock).toFixed(2)])
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `inventaire-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sauvegarde-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJSON = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        if (!Array.isArray(data)) throw new Error('Format invalide')
        if (!confirm(`Importer ${data.length} références dans ton compte ?\n(Les données existantes ne seront PAS supprimées.)`)) return

        const payload = data.map(it => ({
          titre: String(it.titre || 'Sans titre'),
          auteur: String(it.auteur || '—'),
          categorie: CATEGORIES.includes(it.categorie) ? it.categorie : CATEGORIES[0],
          prix: parseFloat(it.prix) || 0,
          stock: parseInt(it.stock) || 0,
          seuil: parseInt(it.seuil) || 5,
          isbn: String(it.isbn || '—'),
          user_id: session.user.id,
        }))
        const { error } = await supabase.from('livres').insert(payload)
        if (error) throw error
        await loadItems()
        alert(`✓ ${payload.length} références importées.`)
      } catch (err) {
        alert('Fichier invalide : ' + err.message)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleLogout = async () => {
    if (!confirm('Se déconnecter ?')) return
    await supabase.auth.signOut()
  }

  if (loading) {
    return (
      <div style={{ background: COLORS.bg, color: COLORS.ink }} className="min-h-screen flex items-center justify-center">
        <div className="display-font text-2xl italic">Chargement de ton inventaire…</div>
      </div>
    )
  }

  return (
    <div style={{ background: COLORS.bg, color: COLORS.ink }} className="min-h-screen">
      <header style={{ background: COLORS.wine, color: COLORS.cream }} className="px-6 py-8 md:px-10">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <div style={{ color: COLORS.goldSoft, letterSpacing: '0.3em' }} className="text-xs uppercase mb-1">Tableau de bord</div>
              <h1 className="display-font text-4xl md:text-5xl font-semibold">La Librairie</h1>
              <div style={{ color: COLORS.goldSoft }} className="display-font italic text-lg mt-1 ornament">Gestion d'inventaire</div>
            </div>
            <div className="flex gap-2 flex-wrap items-center">
              <label style={{ borderColor: COLORS.goldSoft, color: COLORS.cream }} className="border px-4 py-2 text-sm flex items-center gap-2 hover:opacity-80 transition cursor-pointer">
                <Upload size={16} /> Importer
                <input type="file" accept=".json" onChange={importJSON} className="hidden" />
              </label>
              <button onClick={exportJSON} style={{ background: 'transparent', borderColor: COLORS.goldSoft, color: COLORS.cream }} className="border px-4 py-2 text-sm flex items-center gap-2 hover:opacity-80 transition">
                <Download size={16} /> Sauvegarde
              </button>
              <button onClick={exportCSV} style={{ background: 'transparent', borderColor: COLORS.goldSoft, color: COLORS.cream }} className="border px-4 py-2 text-sm flex items-center gap-2 hover:opacity-80 transition">
                <Download size={16} /> CSV
              </button>
              <button onClick={openAdd} style={{ background: COLORS.gold, color: COLORS.wine }} className="px-4 py-2 text-sm font-semibold flex items-center gap-2 hover:opacity-90 transition">
                <Plus size={16} /> Nouvelle référence
              </button>

              {/* Menu utilisateur */}
              <div className="relative">
                <button onClick={() => setShowMenu(!showMenu)} style={{ background: 'transparent', borderColor: COLORS.goldSoft, color: COLORS.cream }} className="border w-10 h-10 flex items-center justify-center hover:opacity-80 transition">
                  <User size={18} />
                </button>
                {showMenu && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)}></div>
                    <div style={{ background: COLORS.paper, borderColor: COLORS.border, color: COLORS.ink }} className="absolute right-0 mt-2 w-64 border shadow-lg z-20">
                      <div className="px-4 py-3 border-b" style={{ borderColor: COLORS.border }}>
                        <div className="text-xs uppercase" style={{ color: COLORS.inkSoft, letterSpacing: '0.1em' }}>Connecté en tant que</div>
                        <div className="text-sm font-medium truncate mt-1">{session.user.email}</div>
                      </div>
                      <button onClick={handleLogout} style={{ color: COLORS.ember }} className="w-full px-4 py-3 text-left text-sm hover:bg-stone-50 flex items-center gap-2">
                        <LogOut size={16} /> Se déconnecter
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-10 py-8">
        <section className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<BookOpen size={20} />} label="Références" value={stats.references} accent={COLORS.wine} />
          <StatCard icon={<Package size={20} />} label="Articles en stock" value={stats.totalArticles.toLocaleString('fr-FR')} accent={COLORS.forest} />
          <StatCard icon={<Euro size={20} />} label="Valeur du stock" value={stats.valeurTotale.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €'} accent={COLORS.gold} />
          <StatCard icon={<AlertTriangle size={20} />} label="Stock faible" value={stats.enRupture} accent={COLORS.ember} alert={stats.enRupture > 0} />
        </section>

        <div className="flex gap-1 mb-6 border-b" style={{ borderColor: COLORS.border }}>
          {['inventaire', 'analyses'].map(v => (
            <button key={v} onClick={() => setView(v)}
              style={{
                color: view === v ? COLORS.wine : COLORS.inkSoft,
                borderBottom: view === v ? `2px solid ${COLORS.wine}` : '2px solid transparent',
                marginBottom: '-1px'
              }}
              className="display-font text-xl px-5 py-3 capitalize font-medium transition">
              {v === 'inventaire' ? 'Inventaire' : 'Analyses & Graphiques'}
            </button>
          ))}
        </div>

        {view === 'inventaire' && (
          <>
            <div style={{ background: COLORS.paper, borderColor: COLORS.border }} className="border p-4 mb-4 flex flex-wrap gap-3 items-center">
              <div className="flex-1 min-w-[200px] relative">
                <Search size={16} style={{ color: COLORS.inkSoft }} className="absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par titre, auteur ou ISBN…"
                  style={{ background: COLORS.cream, borderColor: COLORS.border }} className="w-full border pl-10 pr-3 py-2 text-sm" />
              </div>
              <div className="flex gap-2 items-center">
                <Filter size={16} style={{ color: COLORS.inkSoft }} />
                <select value={filterCat} onChange={e => setFilterCat(e.target.value)} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="border px-3 py-2 text-sm">
                  <option>Toutes</option>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-2 items-center">
                <ArrowUpDown size={16} style={{ color: COLORS.inkSoft }} />
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="border px-3 py-2 text-sm">
                  <option value="titre">Titre A-Z</option>
                  <option value="stock">Stock croissant</option>
                  <option value="prix">Prix décroissant</option>
                  <option value="valeur">Valeur en stock</option>
                </select>
              </div>
            </div>

            <div style={{ background: COLORS.paper, borderColor: COLORS.border }} className="border overflow-x-auto scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: COLORS.cream, borderBottom: `1px solid ${COLORS.border}` }}>
                    <th className="text-left px-4 py-3 display-font font-semibold" style={{ color: COLORS.wine }}>Titre & Auteur</th>
                    <th className="text-left px-4 py-3 display-font font-semibold hidden md:table-cell" style={{ color: COLORS.wine }}>Catégorie</th>
                    <th className="text-right px-4 py-3 display-font font-semibold" style={{ color: COLORS.wine }}>Prix</th>
                    <th className="text-center px-4 py-3 display-font font-semibold" style={{ color: COLORS.wine }}>Stock</th>
                    <th className="text-right px-4 py-3 display-font font-semibold hidden lg:table-cell" style={{ color: COLORS.wine }}>Valeur</th>
                    <th className="text-center px-4 py-3 display-font font-semibold" style={{ color: COLORS.wine }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr><td colSpan={6} className="text-center py-12 italic" style={{ color: COLORS.inkSoft }}>
                      {items.length === 0 ? "Ton inventaire est vide. Clique sur « Nouvelle référence » pour commencer." : 'Aucune référence trouvée.'}
                    </td></tr>
                  ) : filtered.map(it => {
                    const low = it.stock <= it.seuil
                    return (
                      <tr key={it.id} className="row-hover transition" style={{ borderBottom: `1px solid ${COLORS.borderSoft}` }}>
                        <td className="px-4 py-3">
                          <div className="font-medium">{it.titre}</div>
                          <div className="text-xs italic" style={{ color: COLORS.inkSoft }}>{it.auteur} · {it.isbn}</div>
                        </td>
                        <td className="px-4 py-3 hidden md:table-cell text-xs" style={{ color: COLORS.inkSoft }}>{it.categorie}</td>
                        <td className="px-4 py-3 text-right tabular-nums">{it.prix.toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            <button onClick={() => adjustStock(it.id, -1)} style={{ borderColor: COLORS.border }} className="border w-6 h-6 text-xs hover:bg-stone-100">−</button>
                            <span style={{ background: low ? COLORS.ember : 'transparent', color: low ? '#fff' : COLORS.ink, minWidth: '2.5rem' }} className="px-2 py-1 text-center font-semibold tabular-nums text-sm inline-block">
                              {it.stock}
                            </span>
                            <button onClick={() => adjustStock(it.id, 1)} style={{ borderColor: COLORS.border }} className="border w-6 h-6 text-xs hover:bg-stone-100">+</button>
                          </div>
                          {low && <div className="text-xs text-center mt-1" style={{ color: COLORS.ember }}>Seuil : {it.seuil}</div>}
                        </td>
                        <td className="px-4 py-3 text-right hidden lg:table-cell tabular-nums" style={{ color: COLORS.inkSoft }}>{(it.prix * it.stock).toFixed(2)} €</td>
                        <td className="px-4 py-3">
                          <div className="flex justify-center gap-2">
                            <button onClick={() => openEdit(it)} style={{ color: COLORS.wine }} className="p-1 hover:opacity-70" title="Modifier"><Edit2 size={16} /></button>
                            <button onClick={() => removeItem(it.id)} style={{ color: COLORS.ember }} className="p-1 hover:opacity-70" title="Supprimer"><Trash2 size={16} /></button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            <div className="mt-3 text-xs italic" style={{ color: COLORS.inkSoft }}>
              {filtered.length} référence{filtered.length > 1 ? 's' : ''} affichée{filtered.length > 1 ? 's' : ''} sur {items.length}.
            </div>
          </>
        )}

        {view === 'analyses' && (
          <div className="grid lg:grid-cols-2 gap-6">
            <div style={{ background: COLORS.paper, borderColor: COLORS.border }} className="border p-6">
              <h3 className="display-font text-2xl mb-1 font-semibold" style={{ color: COLORS.wine }}>Valeur du stock par catégorie</h3>
              <p className="text-xs italic mb-4" style={{ color: COLORS.inkSoft }}>En euros, prix × quantité</p>
              {chartData.length === 0 ? <p className="italic py-12 text-center" style={{ color: COLORS.inkSoft }}>Aucune donnée à afficher.</p> : (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 60 }}>
                    <CartesianGrid stroke={COLORS.borderSoft} vertical={false} />
                    <XAxis dataKey="court" angle={-35} textAnchor="end" tick={{ fontSize: 11, fill: COLORS.inkSoft }} stroke={COLORS.border} />
                    <YAxis tick={{ fontSize: 11, fill: COLORS.inkSoft }} stroke={COLORS.border} />
                    <Tooltip contentStyle={{ background: COLORS.paper, border: `1px solid ${COLORS.border}`, fontSize: 12 }}
                      formatter={(v) => [`${v.toFixed(2)} €`, 'Valeur']}
                      labelFormatter={(l) => chartData.find(d => d.court === l)?.categorie || l} />
                    <Bar dataKey="valeur" radius={[2, 2, 0, 0]}>
                      {chartData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div style={{ background: COLORS.paper, borderColor: COLORS.border }} className="border p-6">
              <h3 className="display-font text-2xl mb-1 font-semibold" style={{ color: COLORS.wine }}>Répartition du stock</h3>
              <p className="text-xs italic mb-4" style={{ color: COLORS.inkSoft }}>Nombre d'articles par catégorie</p>
              {chartData.length === 0 ? <p className="italic py-12 text-center" style={{ color: COLORS.inkSoft }}>Aucune donnée à afficher.</p> : (
                <>
                  <ResponsiveContainer width="100%" height={320}>
                    <PieChart>
                      <Pie data={chartData} dataKey="stock" nameKey="categorie" innerRadius={60} outerRadius={110} paddingAngle={2}>
                        {chartData.map((_, i) => <Cell key={i} fill={CATEGORY_COLORS[i % CATEGORY_COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ background: COLORS.paper, border: `1px solid ${COLORS.border}`, fontSize: 12 }} formatter={(v) => [`${v} articles`, '']} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="grid grid-cols-2 gap-2 mt-2 text-xs">
                    {chartData.map((d, i) => (
                      <div key={d.categorie} className="flex items-center gap-2">
                        <div className="w-3 h-3" style={{ background: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }}></div>
                        <span className="truncate" style={{ color: COLORS.inkSoft }}>{d.categorie}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div style={{ background: COLORS.paper, borderColor: COLORS.border }} className="border p-6 lg:col-span-2">
              <h3 className="display-font text-2xl mb-1 font-semibold" style={{ color: COLORS.ember }}>Alertes — Stock faible</h3>
              <p className="text-xs italic mb-4" style={{ color: COLORS.inkSoft }}>Références ayant atteint ou dépassé leur seuil de réapprovisionnement</p>
              {items.filter(i => i.stock <= i.seuil).length === 0 ? (
                <p className="italic py-6 text-center" style={{ color: COLORS.forest }}>✓ Aucune alerte. Tous les stocks sont au-dessus du seuil.</p>
              ) : (
                <div className="space-y-2">
                  {items.filter(i => i.stock <= i.seuil).map(it => (
                    <div key={it.id} style={{ background: COLORS.cream, borderLeft: `3px solid ${COLORS.ember}` }} className="p-3 flex justify-between items-center flex-wrap gap-2">
                      <div>
                        <div className="font-medium">{it.titre}</div>
                        <div className="text-xs italic" style={{ color: COLORS.inkSoft }}>{it.categorie}</div>
                      </div>
                      <div className="text-sm">
                        <span style={{ color: COLORS.ember }} className="font-semibold">{it.stock}</span>
                        <span style={{ color: COLORS.inkSoft }}> en stock · seuil {it.seuil}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      <footer style={{ borderColor: COLORS.border, color: COLORS.inkSoft }} className="border-t mt-12 py-6 text-center text-xs italic">
        Données synchronisées dans le cloud · {items.length} références · {session.user.email}
      </footer>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(42,36,33,0.6)' }} onClick={() => setShowModal(false)}>
          <div style={{ background: COLORS.paper, borderColor: COLORS.gold }} className="border-2 max-w-lg w-full max-h-[90vh] overflow-y-auto scroll" onClick={e => e.stopPropagation()}>
            <div style={{ background: COLORS.wine, color: COLORS.cream }} className="px-6 py-4 flex justify-between items-center">
              <h2 className="display-font text-2xl font-semibold">{editing ? 'Modifier la référence' : 'Nouvelle référence'}</h2>
              <button onClick={() => setShowModal(false)} className="hover:opacity-70"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <Field label="Titre">
                <input type="text" value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="w-full border px-3 py-2" autoFocus />
              </Field>
              <Field label="Auteur">
                <input type="text" value={form.auteur} onChange={e => setForm({ ...form, auteur: e.target.value })} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="w-full border px-3 py-2" />
              </Field>
              <Field label="Catégorie">
                <select value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="w-full border px-3 py-2">
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Prix (€)">
                  <input type="number" step="0.01" value={form.prix} onChange={e => setForm({ ...form, prix: e.target.value })} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="w-full border px-3 py-2" />
                </Field>
                <Field label="Stock">
                  <input type="number" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="w-full border px-3 py-2" />
                </Field>
                <Field label="Seuil alerte">
                  <input type="number" value={form.seuil} onChange={e => setForm({ ...form, seuil: e.target.value })} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="w-full border px-3 py-2" />
                </Field>
              </div>
              <Field label="ISBN / Référence">
                <input type="text" value={form.isbn} onChange={e => setForm({ ...form, isbn: e.target.value })} style={{ background: COLORS.cream, borderColor: COLORS.border }} className="w-full border px-3 py-2" />
              </Field>
            </div>
            <div style={{ background: COLORS.cream, borderTop: `1px solid ${COLORS.border}` }} className="px-6 py-4 flex justify-end gap-2">
              <button onClick={() => setShowModal(false)} style={{ color: COLORS.inkSoft }} className="px-4 py-2 text-sm hover:opacity-70">Annuler</button>
              <button onClick={saveItem} style={{ background: COLORS.wine, color: COLORS.cream }} className="px-5 py-2 text-sm font-semibold flex items-center gap-2 hover:opacity-90">
                <Save size={16} /> {editing ? 'Enregistrer' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, label, value, accent, alert }) {
  return (
    <div style={{ background: COLORS.paper, borderColor: COLORS.border, borderLeftColor: accent, borderLeftWidth: '3px' }} className="border p-5">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wider mb-2" style={{ color: accent, letterSpacing: '0.15em' }}>
        {icon} {label}
      </div>
      <div className="display-font text-3xl font-semibold tabular-nums" style={{ color: alert ? COLORS.ember : COLORS.ink }}>
        {value}
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-wider block mb-1" style={{ color: COLORS.wine, letterSpacing: '0.15em' }}>{label}</span>
      {children}
    </label>
  )
}
