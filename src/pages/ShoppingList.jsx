/**
 * Shopping List — Phase 8
 *
 * Requires a `shopping_list_items` table in Supabase. Run once in the SQL editor:
 *
 *   CREATE TABLE shopping_list_items (
 *     id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
 *     name        text        NOT NULL,
 *     quantity    text        NOT NULL DEFAULT '',
 *     unit        text        NOT NULL DEFAULT '',
 *     brand       text,
 *     category    text        NOT NULL DEFAULT 'Other',
 *     is_checked  boolean     NOT NULL DEFAULT false,
 *     is_manual   boolean     NOT NULL DEFAULT false,
 *     created_at  timestamptz NOT NULL DEFAULT now()
 *   );
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, RefreshCw, Eye, EyeOff, ChevronDown, ChevronRight,
  Trash2, Check, ShoppingCart, X,
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { loadActiveMenu } from '../lib/activeMenu'
import { buildShoppingList } from '../lib/buildShoppingList'
import { categorizeOne, CATEGORY_EMOJI, CATEGORIES } from '../lib/categorize'

// ── localStorage key for menu snapshot ────────────────────────────────────────

const SNAPSHOT_KEY = 'recipe_app_shopping_list_snapshot'

function getMenuSnapshot() {
  const items = loadActiveMenu()
  return JSON.stringify(
    items
      .filter((i) => i.recipeId)
      .map((i) => ({ r: i.recipeId, s: i.plannedServings }))
      .sort((a, b) => a.r.localeCompare(b.r))
  )
}

// ── Ingredient suggestions hook ───────────────────────────────────────────────

function useIngredientSuggestions(term) {
  const [suggestions, setSuggestions] = useState([])

  useEffect(() => {
    if (!term || term.length < 2) {
      setSuggestions([])
      return
    }
    const timer = setTimeout(async () => {
      const { data, error: suggErr } = await supabase
        .from('ingredients')
        .select('shopping_name, name')
        .or(`shopping_name.ilike.%${term}%,name.ilike.%${term}%`)
        .limit(10)

      if (suggErr || !data) return
      const seen = new Set()
      const unique = []
      for (const row of data) {
        const display = row.shopping_name || row.name
        if (!display || seen.has(display.toLowerCase())) continue
        seen.add(display.toLowerCase())
        unique.push({ display, category: null })
      }
      setSuggestions(unique)
    }, 300)

    return () => clearTimeout(timer)
  }, [term])

  return suggestions
}

// ── Inline edit / add panel ───────────────────────────────────────────────────

function EditPanel({ initial, onSave, onCancel, onDelete, saving }) {
  const [draft, setDraft] = useState({
    name: initial?.name ?? '',
    quantity: initial?.quantity ?? '',
    unit: initial?.unit ?? '',
    brand: initial?.brand ?? '',
    category: null,
  })
  const [showSuggestions, setShowSuggestions] = useState(false)
  const isNew = !initial?.id
  const containerRef = useRef(null)

  const suggestions = useIngredientSuggestions(isNew ? draft.name : '')

  // Show dropdown whenever suggestions arrive
  useEffect(() => {
    setShowSuggestions(suggestions.length > 0)
  }, [suggestions])

  // Dismiss on outside click
  useEffect(() => {
    if (!showSuggestions) return
    function onMouseDown(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showSuggestions])

  function set(field, val) {
    setDraft((prev) => ({ ...prev, [field]: val }))
  }

  function pickSuggestion(s) {
    setDraft((prev) => ({
      ...prev,
      name: s.display,
      ...(s.category ? { category: s.category } : {}),
    }))
    setShowSuggestions(false)
  }

  return (
    <div className="bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-3 space-y-3">
      <div className="relative" ref={containerRef}>
        <input
          autoFocus
          className="input w-full text-sm"
          placeholder="Item name *"
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && draft.name.trim()) { setShowSuggestions(false); onSave(draft) }
            if (e.key === 'Escape') { if (showSuggestions) setShowSuggestions(false); else onCancel() }
          }}
        />
        {showSuggestions && (
          <ul className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
            {suggestions.map((s) => (
              <li key={s.display}>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s) }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-indigo-50 transition-colors"
                >
                  <span>{s.display}</span>
                  {s.category && <span className="text-xs text-gray-400 shrink-0">{s.category}</span>}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex gap-2">
        <input
          className="input flex-1 text-sm"
          placeholder="Qty"
          value={draft.quantity}
          onChange={(e) => set('quantity', e.target.value)}
        />
        <input
          className="input flex-1 text-sm"
          placeholder="Unit"
          value={draft.unit}
          onChange={(e) => set('unit', e.target.value)}
        />
        <input
          className="input flex-1 text-sm"
          placeholder="Brand"
          value={draft.brand}
          onChange={(e) => set('brand', e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        {!isNew && onDelete && (
          <button
            onClick={onDelete}
            disabled={saving}
            className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 transition-colors"
            title="Delete item"
          >
            <Trash2 size={15} />
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(draft)}
            disabled={!draft.name.trim() || saving}
            className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Single item row ───────────────────────────────────────────────────────────

function ItemRow({ item, editingId, onToggleCheck, onEdit, onSave, onCancel, onDelete, saving }) {
  if (editingId === item.id) {
    return (
      <EditPanel
        initial={item}
        onSave={onSave}
        onCancel={onCancel}
        onDelete={() => onDelete(item.id)}
        saving={saving}
      />
    )
  }

  return (
    <div
      className={`flex items-center gap-3 px-1 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${item.is_checked ? 'opacity-50' : ''}`}
      onClick={() => onEdit(item.id)}
    >
      {/* Checkbox */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleCheck(item) }}
        className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
          item.is_checked
            ? 'bg-indigo-600 border-indigo-600'
            : 'border-gray-300 hover:border-indigo-400'
        }`}
        aria-label={item.is_checked ? 'Uncheck' : 'Check'}
      >
        {item.is_checked && <Check size={11} className="text-white" strokeWidth={3} />}
      </button>

      {/* Name + brand */}
      <div className="flex-1 min-w-0">
        <span className={`text-sm text-gray-900 ${item.is_checked ? 'line-through text-gray-400' : ''}`}>
          {item.name}
        </span>
        {item.brand && (
          <span className="text-xs text-gray-400 ml-1.5">{item.brand}</span>
        )}
      </div>

      {/* Quantity + unit */}
      {(item.quantity || item.unit) && (
        <span className="text-sm text-gray-500 shrink-0 tabular-nums">
          {[item.quantity, item.unit].filter(Boolean).join(' ')}
        </span>
      )}
    </div>
  )
}

// ── Category section ──────────────────────────────────────────────────────────

function CategorySection({
  category, items, hideChecked, editingId,
  onToggleCheck, onEdit, onSave, onCancel, onDelete, saving,
}) {
  const [open, setOpen] = useState(true)
  const emoji = CATEGORY_EMOJI[category] ?? '🧴'

  const visible = hideChecked ? items.filter((i) => !i.is_checked) : items
  if (visible.length === 0) return null

  const checkedCount = items.filter((i) => i.is_checked).length
  const totalCount = items.length

  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-white hover:bg-gray-50 transition-colors"
      >
        <span className="text-base leading-none">{emoji}</span>
        <span className="flex-1 text-left text-sm font-semibold text-gray-800">{category}</span>
        {checkedCount > 0 && (
          <span className="text-xs text-gray-400 tabular-nums">{checkedCount}/{totalCount}</span>
        )}
        {open
          ? <ChevronDown size={15} className="text-gray-400 shrink-0" />
          : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
      </button>

      {/* Items */}
      {open && (
        <div className="border-t border-gray-100 bg-white px-3 pb-2 pt-1 space-y-0.5">
          {visible.map((item) => (
            <ItemRow
              key={item.id}
              item={item}
              editingId={editingId}
              onToggleCheck={onToggleCheck}
              onEdit={onEdit}
              onSave={onSave}
              onCancel={onCancel}
              onDelete={onDelete}
              saving={saving}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ShoppingList() {
  const navigate = useNavigate()

  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [hideChecked, setHideChecked] = useState(false)
  const [editingId, setEditingId] = useState(null) // item uuid, or 'new', or null
  const [savingEdit, setSavingEdit] = useState(false)
  const [generateError, setGenerateError] = useState(null)
  const [clearToast, setClearToast] = useState(false)

  // ── Derived values ──
  const menuItems = loadActiveMenu()
  const hasMenu = menuItems.length > 0
  const hasItems = items.length > 0
  const currentSnapshot = getMenuSnapshot()
  const savedSnapshot = localStorage.getItem(SNAPSHOT_KEY)
  // Banner: menu has changed since the list was last generated (and list has recipe items)
  const menuChanged =
    savedSnapshot !== null &&
    savedSnapshot !== currentSnapshot &&
    items.some((i) => !i.is_manual) &&
    !generating

  // ── Load items from Supabase on mount ──
  useEffect(() => {
    supabase
      .from('shopping_list_items')
      .select('*')
      .order('category')
      .order('created_at')
      .then(({ data, error }) => {
        if (error) {
          console.error('[ShoppingList] Failed to load shopping_list_items:', error)
          // Table may not exist yet — still clear the loading gate so the Generate
          // button renders. The generate() function will surface the real error.
        }
        setItems(data ?? [])
        setLoading(false)
      })
      .catch((err) => {
        console.error('[ShoppingList] Unexpected error loading items:', err)
        setLoading(false)
      })
  }, [])

  // ── Group items by category in canonical order ──
  const grouped = useMemo(() => {
    const map = Object.fromEntries(CATEGORIES.map((c) => [c, []]))
    for (const item of items) {
      const cat = item.category && map[item.category] !== undefined ? item.category : 'Other'
      map[cat].push(item)
    }
    return CATEGORIES
      .map((cat) => ({
        category: cat,
        items: map[cat].slice().sort((a, b) =>
          (a.name || '').toLowerCase().localeCompare((b.name || '').toLowerCase())
        ),
      }))
      .filter((g) => g.items.length > 0)
  }, [items])

  // ── Generate / regenerate list ────────────────────────────────────────────
  // Always keeps manual items. Deletes and replaces all recipe-derived items.
  async function generate() {
    setGenerating(true)
    setGenerateError(null)
    const snapshot = getMenuSnapshot()
    console.log('[ShoppingList] generate() called — menu snapshot:', snapshot)
    console.log('[ShoppingList] loadActiveMenu():', loadActiveMenu())

    try {
      // Build recipe-derived items (may call Anthropic for categorization)
      console.log('[ShoppingList] calling buildShoppingList()…')
      const built = await buildShoppingList()
      console.log('[ShoppingList] buildShoppingList() returned', built.length, 'items:', built)

      if (built.length === 0) {
        // Surface a clear message instead of silently doing nothing.
        const menuItems = loadActiveMenu()
        const msg = menuItems.length === 0
          ? 'Your menu is empty. Add some recipes to the menu first.'
          : 'No ingredients were found for the recipes in your menu. Make sure each recipe has ingredients saved.'
        console.warn('[ShoppingList] built list is empty —', msg)
        setGenerateError(msg)
        return
      }

      // Delete all non-manual items
      console.log('[ShoppingList] deleting existing recipe-derived items…')
      const { error: delErr } = await supabase
        .from('shopping_list_items')
        .delete()
        .eq('is_manual', false)
      if (delErr) {
        console.error('[ShoppingList] delete error:', delErr)
        throw delErr
      }

      // Insert the freshly built items
      console.log('[ShoppingList] inserting', built.length, 'new items…')
      const { error: insErr } = await supabase
        .from('shopping_list_items')
        .insert(
          built.map((i) => ({
            name: i.name,
            quantity: i.quantity ?? '',
            unit: i.unit ?? '',
            brand: null,
            category: i.category ?? 'Other',
            is_checked: false,
            is_manual: false,
          }))
        )
      if (insErr) {
        console.error('[ShoppingList] insert error:', insErr)
        throw insErr
      }

      // Reload everything (includes surviving manual items)
      const { data, error: loadErr } = await supabase
        .from('shopping_list_items')
        .select('*')
        .order('category')
        .order('created_at')
      if (loadErr) console.error('[ShoppingList] reload error:', loadErr)
      console.log('[ShoppingList] reloaded', data?.length ?? 0, 'total items')
      setItems(data ?? [])
      localStorage.setItem(SNAPSHOT_KEY, snapshot)
    } catch (err) {
      console.error('[ShoppingList] generate() caught error:', err)
      setGenerateError(`Error generating list: ${err.message}`)
    } finally {
      setGenerating(false)
    }
  }

  // ── Toggle checked ────────────────────────────────────────────────────────
  async function handleToggleCheck(item) {
    const newVal = !item.is_checked
    // Optimistic update
    setItems((prev) => prev.map((i) => i.id === item.id ? { ...i, is_checked: newVal } : i))
    await supabase
      .from('shopping_list_items')
      .update({ is_checked: newVal })
      .eq('id', item.id)
  }

  // ── Save edit (existing item or new) ──────────────────────────────────────
  async function handleSaveEdit(draft) {
    if (!draft.name.trim()) return
    setSavingEdit(true)
    try {
      if (editingId === 'new') {
        const trimmedName = draft.name.trim()

        // Check for an existing row with the same name (case-insensitive)
        const { data: existing } = await supabase
          .from('shopping_list_items')
          .select('id, quantity, unit')
          .ilike('name', trimmedName)
          .maybeSingle()

        if (existing) {
          // Merge: update quantity on the existing row instead of inserting a duplicate
          const { data, error } = await supabase
            .from('shopping_list_items')
            .update({
              quantity: draft.quantity?.trim() ?? existing.quantity,
              unit: draft.unit?.trim() || existing.unit,
              brand: draft.brand?.trim() || null,
            })
            .eq('id', existing.id)
            .select()
            .single()
          if (error) throw error
          setItems((prev) => prev.map((i) => i.id === existing.id ? data : i))
        } else {
          // New item — categorize then insert
          const category = draft.category ?? await categorizeOne(trimmedName)
          const { data, error } = await supabase
            .from('shopping_list_items')
            .insert({
              name: trimmedName,
              quantity: draft.quantity?.trim() ?? '',
              unit: draft.unit?.trim() ?? '',
              brand: draft.brand?.trim() || null,
              category,
              is_checked: false,
              is_manual: true,
            })
            .select()
            .single()
          if (error) throw error
          setItems((prev) => [...prev, data])
        }
      } else {
        // Editing an existing item
        const { data, error } = await supabase
          .from('shopping_list_items')
          .update({
            name: draft.name.trim(),
            quantity: draft.quantity?.trim() ?? '',
            unit: draft.unit?.trim() ?? '',
            brand: draft.brand?.trim() || null,
          })
          .eq('id', editingId)
          .select()
          .single()
        if (error) throw error
        setItems((prev) => prev.map((i) => i.id === editingId ? data : i))
      }
      setEditingId(null)
    } catch (err) {
      alert(`Error saving item: ${err.message}`)
    } finally {
      setSavingEdit(false)
    }
  }

  // ── Clear entire list ─────────────────────────────────────────────────────
  async function handleClearList() {
    if (!window.confirm('Clear the entire shopping list? This cannot be undone.')) return
    await supabase.from('shopping_list_items').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    setItems([])
    setEditingId(null)
    localStorage.removeItem(SNAPSHOT_KEY)
    setClearToast(true)
    setTimeout(() => setClearToast(false), 2500)
  }

  // ── Delete item ───────────────────────────────────────────────────────────
  async function handleDelete(id) {
    await supabase.from('shopping_list_items').delete().eq('id', id)
    setItems((prev) => prev.filter((i) => i.id !== id))
    setEditingId(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Shopping List</h2>
        {hasItems && (
          <button
            onClick={() => setHideChecked((v) => !v)}
            className={`p-2 rounded-xl border transition-colors ${
              hideChecked
                ? 'border-indigo-300 bg-indigo-50 text-indigo-600'
                : 'border-gray-200 text-gray-400 hover:bg-gray-50'
            }`}
            title={hideChecked ? 'Show checked items' : 'Hide checked items'}
          >
            {hideChecked ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {/* ── Action bar ── */}
      {!loading && hasMenu && (
        <div className="space-y-2">
          {/* Primary: Generate / Regenerate */}
          <button
            onClick={generate}
            disabled={generating}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40"
          >
            {generating
              ? <RefreshCw size={15} className="animate-spin" />
              : <ShoppingCart size={15} />}
            {generating
              ? (hasItems ? 'Regenerating…' : 'Generating…')
              : (hasItems ? 'Regenerate List' : 'Generate List')}
          </button>

          {/* Secondary: Add Item + Clear List */}
          <div className="flex gap-2">
            <button
              onClick={() => setEditingId('new')}
              disabled={editingId === 'new'}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-40"
            >
              <Plus size={14} />
              Add Item
            </button>
            {hasItems && (
              <button
                onClick={handleClearList}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border border-red-200 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={14} />
                Clear List
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── New item panel — anchored near the top ── */}
      {!loading && editingId === 'new' && (
        <EditPanel
          initial={null}
          onSave={handleSaveEdit}
          onCancel={() => setEditingId(null)}
          onDelete={null}
          saving={savingEdit}
        />
      )}

      {/* ── "List cleared" toast ── */}
      {clearToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded-xl shadow-lg pointer-events-none">
          List cleared
        </div>
      )}

      {/* ── Menu-changed banner ── */}
      {menuChanged && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-sm text-amber-800 leading-snug">
            Your menu has changed since this list was generated.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors disabled:opacity-40"
          >
            Regenerate
          </button>
        </div>
      )}

      {/* ── Generate error ── */}
      {generateError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
          <p className="text-sm text-red-700 leading-snug">{generateError}</p>
          <button
            onClick={() => setGenerateError(null)}
            className="shrink-0 text-red-400 hover:text-red-600 transition-colors mt-0.5"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Loading spinner ── */}
      {loading && (
        <div className="flex justify-center py-16">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !hasItems && editingId !== 'new' && (
        <div className="text-center py-16 space-y-4">
          <ShoppingCart size={44} className="mx-auto text-gray-200" />
          {hasMenu ? (
            <p className="text-sm text-gray-400">
              Tap "Generate List" above to build your shopping list from the active menu.
            </p>
          ) : (
            <>
              <p className="text-sm text-gray-400">
                Add recipes to your menu first, then come back to generate a list.
              </p>
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => navigate('/menu')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                  Go to Menu
                </button>
                <button
                  onClick={() => setEditingId('new')}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-indigo-600 transition-colors"
                >
                  <Plus size={14} />
                  Or add items manually
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Category sections ── */}
      {!loading && grouped.map(({ category, items: catItems }) => (
        <CategorySection
          key={category}
          category={category}
          items={catItems}
          hideChecked={hideChecked}
          editingId={editingId}
          onToggleCheck={handleToggleCheck}
          onEdit={(id) => setEditingId((prev) => prev === id ? null : id)}
          onSave={handleSaveEdit}
          onCancel={() => setEditingId(null)}
          onDelete={handleDelete}
          saving={savingEdit}
        />
      ))}

      {/* ── Add Item button (no-menu fallback only) ── */}
      {!loading && !hasMenu && editingId !== 'new' && (
        <button
          onClick={() => setEditingId('new')}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
        >
          <Plus size={16} />
          Add Item
        </button>
      )}

    </div>
  )
}
