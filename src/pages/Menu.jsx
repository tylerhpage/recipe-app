import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, X, Minus, Search, Trash2, ChevronRight, RotateCcw, CalendarDays, Check } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { loadActiveMenu, saveActiveMenu, clearActiveMenu } from '../lib/activeMenu'

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

function scaleBadge(planned, base) {
  if (!base || planned === base) return null
  const ratio = planned / base
  return `${parseFloat(ratio.toFixed(2))}×`
}

// ── Serving control ───────────────────────────────────────────────────────────

function ServingControl({ value, onChange }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(String(value))
  const inputRef = useRef(null)

  useEffect(() => {
    if (editing) inputRef.current?.select()
  }, [editing])

  function commit() {
    const n = parseInt(draft, 10)
    if (!isNaN(n) && n >= 1) onChange(n)
    else setDraft(String(value))
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-1">
      <button
        onClick={() => onChange(Math.max(1, value - 1))}
        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Minus size={12} />
      </button>

      {editing ? (
        <input
          ref={inputRef}
          className="w-10 text-center text-sm font-semibold border border-indigo-400 rounded-lg py-0.5 focus:outline-none"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') commit() }}
        />
      ) : (
        <button
          onClick={() => { setDraft(String(value)); setEditing(true) }}
          className="w-10 text-center text-sm font-semibold text-gray-900 hover:text-indigo-600 transition-colors"
        >
          {value}
        </button>
      )}

      <button
        onClick={() => onChange(value + 1)}
        className="w-7 h-7 rounded-full border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Plus size={12} />
      </button>
    </div>
  )
}

// ── Recipe picker modal ───────────────────────────────────────────────────────

function RecipePicker({ onAdd, onClose }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    supabase
      .from('recipes')
      .select('id, title, source, cuisine_type, main_ingredient, base_servings')
      .order('title')
      .then(({ data }) => { setRecipes(data ?? []); setLoading(false) })
  }, [])

  const visible = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return recipes
    return recipes.filter((r) =>
      [r.title, r.source, r.cuisine_type, r.main_ingredient]
        .filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [recipes, search])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Add Recipe to Menu</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              autoFocus
              className="input w-full pl-9"
              placeholder="Search recipes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {loading ? (
            <div className="p-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : visible.length === 0 ? (
            <p className="p-6 text-sm text-center text-gray-400">No recipes found</p>
          ) : (
            visible.map((r) => (
              <button
                key={r.id}
                onClick={() => onAdd(r)}
                className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{r.title}</p>
                  {(r.source || r.cuisine_type) && (
                    <p className="text-xs text-gray-400 truncate">
                      {[r.source, r.cuisine_type].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Save menu modal ───────────────────────────────────────────────────────────

function SaveMenuModal({ onSave, onClose, saving }) {
  const [title, setTitle] = useState(today())

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Save Menu</h3>
        <div>
          <label className="label">Menu title</label>
          <input
            autoFocus
            className="input w-full"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && title.trim()) onSave(title.trim()) }}
          />
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(title.trim())}
            disabled={!title.trim() || saving}
            className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Clear confirm modal ───────────────────────────────────────────────────────

function ClearConfirmModal({ onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Clear active menu?</h3>
        <p className="text-sm text-gray-500">All current menu entries will be removed. Saved menus are not affected.</p>
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors">
            Clear
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Saved menu detail modal ───────────────────────────────────────────────────

function SavedMenuModal({ menu, onReload, onDelete, onClose }) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('menu_items')
      .select('id, recipe_id, recipe_title, planned_servings, source')
      .eq('menu_id', menu.id)
      .then(({ data }) => {
        setItems(data ?? [])
        setLoading(false)
      })
  }, [menu.id])

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div>
            <h3 className="font-semibold text-gray-900">{menu.title}</h3>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(menu.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
          {loading ? (
            <div className="p-6 flex justify-center">
              <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : items.length === 0 ? (
            <p className="p-6 text-sm text-center text-gray-400">No recipes in this menu.</p>
          ) : (
            items.map((item) => (
              <div key={item.id} className="px-4 py-3">
                <p className="text-sm font-medium text-gray-900">{item.recipe_title}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-xs text-gray-400">
                  {item.planned_servings && <span>{item.planned_servings} serving{item.planned_servings !== 1 ? 's' : ''}</span>}
                  {item.planned_servings && item.source && <span>·</span>}
                  {item.source && <span>{item.source}</span>}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-4 border-t border-gray-100 flex gap-3">
          {confirmDelete ? (
            <>
              <p className="text-sm text-gray-600 flex-1 self-center">Delete this menu?</p>
              <button onClick={() => setConfirmDelete(false)} className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
              <button onClick={onDelete} className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm font-semibold hover:bg-red-600">Delete</button>
            </>
          ) : (
            <>
              <button
                onClick={() => setConfirmDelete(true)}
                className="p-2 rounded-xl border border-red-100 text-red-400 hover:bg-red-50 transition-colors"
              >
                <Trash2 size={16} />
              </button>
              <button
                onClick={() => onReload(items)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <RotateCcw size={15} />
                Reload to Active Menu
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 md:bottom-6 z-50">
      <div className="bg-gray-900 text-white text-sm font-medium px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2 whitespace-nowrap">
        <Check size={15} className="text-green-400" />
        {message}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Menu() {
  const navigate = useNavigate()
  const [menuItems, setMenuItems] = useState(() => loadActiveMenu())
  const [showPicker, setShowPicker] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)

  const [savedMenus, setSavedMenus] = useState([])
  const [savedMenusLoading, setSavedMenusLoading] = useState(true)
  const [selectedSavedMenu, setSelectedSavedMenu] = useState(null)

  // Persist active menu to localStorage on every change
  useEffect(() => {
    saveActiveMenu(menuItems)
  }, [menuItems])

  // Load saved menus from Supabase
  useEffect(() => {
    supabase
      .from('menus')
      .select('id, title, created_at, menu_items ( recipe_id, recipe_title, planned_servings, source )')
      .order('created_at', { ascending: false })
      .then(({ data }) => { setSavedMenus(data ?? []); setSavedMenusLoading(false) })
  }, [])

  // ── Active menu mutations ──

  function handleAdd(recipe) {
    setMenuItems((prev) => [
      ...prev,
      {
        uid: crypto.randomUUID(),
        recipeId: recipe.id,
        title: recipe.title,
        source: recipe.source ?? null,
        cuisineType: recipe.cuisine_type ?? null,
        baseServings: recipe.base_servings ?? 4,
        plannedServings: recipe.base_servings ?? 4,
      },
    ])
    setShowPicker(false)
  }

  function handleRemove(uid) {
    setMenuItems((prev) => prev.filter((item) => item.uid !== uid))
  }

  function handleServingChange(uid, value) {
    setMenuItems((prev) =>
      prev.map((item) => item.uid === uid ? { ...item, plannedServings: value } : item)
    )
  }

  function handleClear() {
    clearActiveMenu()
    setMenuItems([])
    setShowClearConfirm(false)
  }

  // ── Save menu ──

  async function handleSave(title) {
    setSaving(true)
    try {
      const { data: menuRow, error: menuErr } = await supabase
        .from('menus')
        .insert({ title })
        .select()
        .single()
      if (menuErr) throw menuErr

      const itemRows = menuItems.map((item) => ({
        menu_id: menuRow.id,
        recipe_id: item.recipeId,
        recipe_title: item.title,
        source: item.source,
        planned_servings: item.plannedServings,
      }))

      if (itemRows.length > 0) {
        const { error: itemErr } = await supabase.from('menu_items').insert(itemRows)
        if (itemErr) throw itemErr
      }

      // Prepend to local saved menus list
      setSavedMenus((prev) => [{ ...menuRow, menu_items: itemRows }, ...prev])
      setShowSaveModal(false)
      setToast(`Menu saved as "${title}"`)
    } catch (err) {
      setToast(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  // ── Reload saved menu to active ──

  function handleReload(fetchedItems) {
    const items = fetchedItems.map((item) => ({
      uid: crypto.randomUUID(),
      recipeId: item.recipe_id ?? null,
      title: item.recipe_title,
      source: item.source ?? null,
      cuisineType: null,
      baseServings: item.planned_servings ?? 4,
      plannedServings: item.planned_servings ?? 4,
    }))
    setMenuItems(items)
    setSelectedSavedMenu(null)
    setToast('Menu reloaded to active menu')
  }

  // ── Delete saved menu ──

  async function handleDeleteSaved(menu) {
    await supabase.from('menu_items').delete().eq('menu_id', menu.id)
    await supabase.from('menus').delete().eq('id', menu.id)
    setSavedMenus((prev) => prev.filter((m) => m.id !== menu.id))
    setSelectedSavedMenu(null)
  }

  // ── Render ──

  return (
    <div className="max-w-2xl mx-auto p-4 pb-24 space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Menu</h2>
        <div className="flex gap-2">
          {menuItems.length > 0 && (
            <>
              <button
                onClick={() => setShowClearConfirm(true)}
                className="px-3 py-1.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setShowSaveModal(true)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors"
              >
                Save Menu
              </button>
            </>
          )}
        </div>
      </div>

      {/* Add Recipe button */}
      <button
        onClick={() => setShowPicker(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed border-gray-200 text-sm font-medium text-gray-500 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/50 transition-colors"
      >
        <Plus size={16} />
        Add Recipe
      </button>

      {/* Active menu list */}
      {menuItems.length === 0 ? (
        <div className="text-center py-12">
          <CalendarDays size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 text-sm">Your menu is empty — add a recipe to get started.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {menuItems.map((item) => {
            const badge = scaleBadge(item.plannedServings, item.baseServings)
            return (
              <div
                key={item.uid}
                className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                    {badge && (
                      <span className="text-xs bg-indigo-50 text-indigo-600 font-semibold px-1.5 py-0.5 rounded-md shrink-0">
                        {badge}
                      </span>
                    )}
                  </div>
                  {(item.source || item.cuisineType) && (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {[item.source, item.cuisineType].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </div>

                <ServingControl
                  value={item.plannedServings}
                  onChange={(v) => handleServingChange(item.uid, v)}
                />

                <button
                  onClick={() => handleRemove(item.uid)}
                  className="shrink-0 text-gray-300 hover:text-red-400 transition-colors ml-1"
                >
                  <X size={16} />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Saved Menus section */}
      <div className="pt-4">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Saved Menus</h3>
        {savedMenusLoading ? (
          <div className="flex justify-center py-4">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : savedMenus.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">No saved menus yet.</p>
        ) : (
          <div className="space-y-2">
            {savedMenus.map((menu) => (
              <button
                key={menu.id}
                onClick={() => setSelectedSavedMenu(menu)}
                className="w-full text-left bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 hover:shadow-md transition-shadow flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-sm font-medium text-gray-900">{menu.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(menu.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    {menu.menu_items?.length > 0 && ` · ${menu.menu_items.length} recipe${menu.menu_items.length !== 1 ? 's' : ''}`}
                  </p>
                </div>
                <ChevronRight size={16} className="text-gray-300 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
      {showPicker && <RecipePicker onAdd={handleAdd} onClose={() => setShowPicker(false)} />}
      {showSaveModal && <SaveMenuModal onSave={handleSave} onClose={() => setShowSaveModal(false)} saving={saving} />}
      {showClearConfirm && <ClearConfirmModal onConfirm={handleClear} onClose={() => setShowClearConfirm(false)} />}
      {selectedSavedMenu && (
        <SavedMenuModal
          menu={selectedSavedMenu}
          onReload={(fetchedItems) => handleReload(fetchedItems)}
          onDelete={() => handleDeleteSaved(selectedSavedMenu)}
          onClose={() => setSelectedSavedMenu(null)}
        />
      )}

      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  )
}
