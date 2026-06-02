import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

const GROCERY_CATEGORIES = [
  'Meat & Seafood',
  'Dairy & Eggs',
  'Produce - Vegetables',
  'Produce - Fruit',
  'Pantry & Dry Goods',
  'Spices & Condiments',
  'Bread & Bakery',
  'Frozen',
  'Other',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

// Update all ingredients rows that share this display term
async function applyMapping(term, hasShoppingName, { canonical_name, grocery_category, lookup_id }) {
  const column = hasShoppingName ? 'shopping_name' : 'name'
  const { error } = await supabase
    .from('ingredients')
    .update({ canonical_name, grocery_category, lookup_id })
    .eq(column, term)
  return error
}

// ── Add to Library inline form ────────────────────────────────────────────────

function AddToLibraryForm({ item, onDone, onCancel }) {
  const [name, setName] = useState(item.displayTerm)
  const [canonicalName, setCanonicalName] = useState(item.displayTerm)
  const [category, setCategory] = useState('')
  const [aliases, setAliases] = useState('')
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  async function handleSave() {
    setErrorMsg('')
    const trimName = name.trim()
    const trimCanonical = canonicalName.trim()
    if (!trimName || !trimCanonical || !category) {
      setErrorMsg('Name, canonical name, and category are all required.')
      return
    }
    setSaving(true)
    try {
      // Check for existing entry
      const { data: existing } = await supabase
        .from('ingredient_lookup')
        .select('id, grocery_category')
        .ilike('name', trimName)
        .limit(1)
        .single()

      if (existing) {
        setErrorMsg(`Already in library as "${existing.grocery_category}". Use Map to Existing instead.`)
        setSaving(false)
        return
      }

      // Insert into lookup table
      const { data: inserted, error: insertErr } = await supabase
        .from('ingredient_lookup')
        .insert({
          name: trimName,
          canonical_name: trimCanonical,
          grocery_category: category,
          aliases: aliases.trim(),
          usage_count: 0,
        })
        .select('id, canonical_name, grocery_category')
        .single()

      if (insertErr) throw insertErr

      // Update all matching ingredients rows
      const err = await applyMapping(item.displayTerm, item.hasShoppingName, {
        canonical_name: inserted.canonical_name,
        grocery_category: inserted.grocery_category,
        lookup_id: inserted.id,
      })
      if (err) throw err

      onDone()
    } catch (e) {
      setErrorMsg(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
      <div>
        <label className="label text-xs text-gray-500">Ingredient Name *</label>
        <input
          className="input w-full text-sm"
          value={name}
          onChange={(e) => { setName(e.target.value); setErrorMsg('') }}
        />
      </div>
      <div>
        <label className="label text-xs text-gray-500">Canonical Name *</label>
        <input
          className="input w-full text-sm"
          value={canonicalName}
          onChange={(e) => { setCanonicalName(e.target.value); setErrorMsg('') }}
        />
        <p className="mt-1 text-xs text-gray-400">
          The base name used when combining duplicates (e.g. "Salt" for "Kosher Salt")
        </p>
      </div>
      <div>
        <label className="label text-xs text-gray-500">Grocery Category *</label>
        <select
          className="input w-full text-sm"
          value={category}
          onChange={(e) => { setCategory(e.target.value); setErrorMsg('') }}
        >
          <option value="">Select category…</option>
          {GROCERY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="label text-xs text-gray-500">Aliases (optional)</label>
        <input
          className="input w-full text-sm"
          placeholder="e.g. cherry tomato, grape tomatoes"
          value={aliases}
          onChange={(e) => setAliases(e.target.value)}
        />
      </div>
      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving || !name.trim() || !canonicalName.trim() || !category}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? 'Saving…' : 'Save to Library'}
        </button>
      </div>
    </div>
  )
}

// ── Map to Existing inline form ───────────────────────────────────────────────

function MapToExistingForm({ item, onDone, onCancel }) {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [saving, setSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (searchTerm.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('ingredient_lookup')
        .select('id, name, canonical_name, grocery_category')
        .ilike('name', `%${searchTerm}%`)
        .order('usage_count', { ascending: false })
        .order('name', { ascending: true })
        .limit(8)
      setResults(data ?? [])
    }, 250)
    return () => clearTimeout(timer)
  }, [searchTerm])

  async function handleConfirm() {
    if (!selected) return
    setErrorMsg('')
    setSaving(true)
    try {
      const err = await applyMapping(item.displayTerm, item.hasShoppingName, {
        canonical_name: selected.canonical_name,
        grocery_category: selected.grocery_category,
        lookup_id: selected.id,
      })
      if (err) throw err
      onDone()
    } catch (e) {
      setErrorMsg(`Error: ${e.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-3 pt-3 border-t border-amber-200 space-y-3">
      <div>
        <label className="label text-xs text-gray-500">Search ingredient library</label>
        <input
          autoFocus
          className="input w-full text-sm"
          placeholder="Type to search…"
          value={searchTerm}
          onChange={(e) => { setSearchTerm(e.target.value); setSelected(null) }}
        />
      </div>

      {results.length > 0 && !selected && (
        <ul className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setSelected(r)}
                className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-indigo-50 transition-colors text-left"
              >
                <span>{r.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{r.grocery_category}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <div className="bg-indigo-50 border border-indigo-100 rounded-lg px-3 py-2 text-sm">
          <p className="text-gray-700">
            Map{' '}
            <span className="font-semibold">"{item.displayTerm}"</span>
            {' → '}
            <span className="font-semibold">"{selected.name}"</span>
            <span className="text-gray-400 ml-1">({selected.grocery_category})</span>
          </p>
          <button
            onClick={() => setSelected(null)}
            className="text-xs text-indigo-500 hover:text-indigo-700 mt-0.5"
          >
            Choose a different entry
          </button>
        </div>
      )}

      {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

      <div className="flex gap-2 justify-end">
        <button
          onClick={onCancel}
          className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleConfirm}
          disabled={!selected || saving}
          className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center gap-1.5"
        >
          {saving && <Loader2 size={13} className="animate-spin" />}
          {saving ? 'Saving…' : 'Confirm'}
        </button>
      </div>
    </div>
  )
}

// ── Ingredient card ───────────────────────────────────────────────────────────

function IngredientCard({ item, onMapped }) {
  const [mode, setMode] = useState(null) // null | 'add' | 'map' | 'ignore'
  const [ignoring, setIgnoring] = useState(false)

  function handleDone() {
    onMapped(item.displayTerm)
  }

  async function handleIgnoreConfirm() {
    setIgnoring(true)
    const column = item.hasShoppingName ? 'shopping_name' : 'name'
    await supabase
      .from('ingredients')
      .update({ canonical_name: 'IGNORE' })
      .eq(column, item.displayTerm)
    setIgnoring(false)
    onMapped(item.displayTerm)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 text-sm">{item.displayTerm}</p>
          {item.rawName && item.rawName !== item.displayTerm && (
            <p className="text-xs text-gray-400 mt-0.5 truncate">{item.rawName}</p>
          )}
        </div>
        {mode === null && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setMode('add')}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Add to Library
            </button>
            <button
              onClick={() => setMode('map')}
              className="px-2.5 py-1 rounded-lg border border-indigo-200 text-xs font-medium text-indigo-600 hover:bg-indigo-50 transition-colors"
            >
              Map to Existing
            </button>
            <button
              onClick={() => setMode('ignore')}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-xs font-medium text-gray-400 hover:bg-gray-50 transition-colors"
            >
              Ignore
            </button>
          </div>
        )}
      </div>

      {/* Ignore confirmation */}
      {mode === 'ignore' && (
        <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
          <p className="text-sm text-gray-600">
            This ingredient will be hidden from your shopping lists. Confirm?
          </p>
          <div className="flex gap-2 justify-end">
            <button
              onClick={() => setMode(null)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleIgnoreConfirm}
              disabled={ignoring}
              className="px-3 py-1.5 rounded-lg bg-gray-500 text-white text-sm font-semibold hover:bg-gray-600 transition-colors disabled:opacity-40 flex items-center gap-1.5"
            >
              {ignoring && <Loader2 size={13} className="animate-spin" />}
              {ignoring ? 'Saving…' : 'Confirm Ignore'}
            </button>
          </div>
        </div>
      )}

      {/* Inline expansions */}
      {mode === 'add' && (
        <AddToLibraryForm
          item={item}
          onDone={handleDone}
          onCancel={() => setMode(null)}
        />
      )}
      {mode === 'map' && (
        <MapToExistingForm
          item={item}
          onDone={handleDone}
          onCancel={() => setMode(null)}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminIngredients() {
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('ingredients')
        .select('name, shopping_name')
        .is('canonical_name', null)

      if (!data) { setLoading(false); return }

      // Deduplicate by displayTerm (shopping_name preferred over name)
      const seen = new Set()
      const unique = []
      for (const row of data) {
        const displayTerm = row.shopping_name?.trim() || row.name?.trim()
        if (!displayTerm || seen.has(displayTerm.toLowerCase())) continue
        seen.add(displayTerm.toLowerCase())
        unique.push({
          displayTerm,
          rawName: row.name?.trim() ?? '',
          hasShoppingName: !!row.shopping_name?.trim(),
        })
      }
      // Sort alphabetically
      unique.sort((a, b) => a.displayTerm.localeCompare(b.displayTerm))
      setItems(unique)
      setLoading(false)
    }
    load()
  }, [])

  function handleMapped(displayTerm) {
    setItems((prev) => prev.filter((i) => i.displayTerm !== displayTerm))
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <div>
          <h2 className="text-xl font-bold text-gray-900">Unmatched Ingredients</h2>
          {items.length > 0 && (
            <p className="text-sm text-gray-500">{items.length} ingredient{items.length !== 1 ? 's' : ''} to map</p>
          )}
        </div>
      </div>

      {/* All done */}
      {items.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
          <p className="text-4xl">✓</p>
          <p className="text-lg font-semibold text-gray-700">All ingredients mapped</p>
          <p className="text-sm text-gray-400">Every ingredient has been matched to the library.</p>
          <button
            onClick={() => navigate('/')}
            className="mt-2 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
          >
            Back to Library
          </button>
        </div>
      )}

      {/* Cards */}
      {items.map((item) => (
        <IngredientCard
          key={item.displayTerm}
          item={item}
          onMapped={handleMapped}
        />
      ))}
    </div>
  )
}
