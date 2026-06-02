import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { X, ImagePlus, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { extractRecipe } from '../lib/extractRecipe'
import { supabase } from '../lib/supabase'
import matchIngredients from '../lib/matchIngredients'
import TagSelector from '../components/TagSelector'

const RECIPE_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Side', 'Beverage', 'Snack', 'Appetizer']

// ── Helpers ──────────────────────────────────────────────────────────────────

function blankIngredient() {
  return { id: crypto.randomUUID(), name: '', shopping_name: '', quantity: '', unit: '' }
}

function blankStep() {
  return { id: crypto.randomUUID(), text: '' }
}

// ── Upload step ───────────────────────────────────────────────────────────────

async function saveRecipe({ files, recipe, selectedTagIds }) {
  // 1. Insert recipe row
  const { data: recipeRow, error: recipeErr } = await supabase
    .from('recipes')
    .insert({
      title: recipe.title,
      base_servings: recipe.base_servings,
      main_ingredient: recipe.main_ingredient,
      recipe_type: recipe.recipe_type,
      cuisine_type: recipe.cuisine_type,
      cook_time: recipe.cook_time,
      source: recipe.source || null,
      instructions: recipe.instructions,
      simplified_instructions: recipe.simplified_instructions,
    })
    .select()
    .single()

  if (recipeErr) throw recipeErr

  const recipeId = recipeRow.id

  // 2. Upload photos → Storage, insert recipe_photos rows
  const photoInserts = []
  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const ext = file.name.split('.').pop()
    const path = `${recipeId}/${i}_${Date.now()}.${ext}`
    const { error: uploadErr } = await supabase.storage
      .from('recipe-images')
      .upload(path, file, { contentType: file.type })
    if (uploadErr) throw uploadErr
    const { data: { publicUrl } } = supabase.storage.from('recipe-images').getPublicUrl(path)
    photoInserts.push({ recipe_id: recipeId, image_url: publicUrl, sort_order: i })
  }

  if (photoInserts.length > 0) {
    const { error: photoErr } = await supabase.from('recipe_photos').insert(photoInserts)
    if (photoErr) throw photoErr
  }

  // 3. Match ingredients against lookup table, then insert
  const enrichedIngredients = await matchIngredients(recipe.ingredients)

  const ingredientRows = enrichedIngredients
    .filter((ing) => ing.name.trim())
    .map((ing) => ({
      recipe_id: recipeId,
      name: ing.name,
      shopping_name: ing.shopping_name?.trim() || null,
      quantity: ing.quantity,
      unit: ing.unit,
      canonical_name: ing.canonical_name ?? null,
      grocery_category: ing.grocery_category ?? null,
      lookup_id: ing.lookup_id ?? null,
    }))

  if (ingredientRows.length > 0) {
    const { error: ingErr } = await supabase.from('ingredients').insert(ingredientRows)
    if (ingErr) throw ingErr
  }

  // 4. Insert recipe_tags
  if (selectedTagIds.length > 0) {
    const tagRows = selectedTagIds.map((tag_id) => ({ recipe_id: recipeId, tag_id }))
    const { error: tagErr } = await supabase.from('recipe_tags').insert(tagRows)
    if (tagErr) throw tagErr
  }

  return recipeId
}

// ── File thumbnail ────────────────────────────────────────────────────────────

function FileThumbnail({ file, onRemove }) {
  const isImage = file.type.startsWith('image/')
  const url = isImage ? URL.createObjectURL(file) : null

  return (
    <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border border-gray-200 bg-gray-100">
      {isImage ? (
        <img src={url} alt={file.name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-xs text-gray-500 px-1 text-center">
          <span className="text-2xl">📄</span>
          <span className="truncate w-full text-center">{file.name}</span>
        </div>
      )}
      <button
        onClick={onRemove}
        className="absolute top-0.5 right-0.5 bg-black/60 rounded-full p-0.5 text-white hover:bg-black/80 transition-colors"
      >
        <X size={12} />
      </button>
    </div>
  )
}

// ── Shopping name autocomplete input ─────────────────────────────────────────

function ShoppingNameInput({ value, onChange }) {
  const [suggestions, setSuggestions] = useState([])
  const [showDropdown, setShowDropdown] = useState(false)
  const wrapperRef = useRef(null)

  // Debounced query against ingredients table
  useEffect(() => {
    if (!value || value.length < 2) {
      setSuggestions([])
      setShowDropdown(false)
      return
    }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from('ingredients')
        .select('shopping_name, name')
        .or(`shopping_name.ilike.%${value}%,name.ilike.%${value}%`)
        .limit(10)

      if (!data) return
      const seen = new Set()
      const unique = []
      for (const row of data) {
        const display = row.shopping_name?.trim() || row.name?.trim()
        if (!display || seen.has(display.toLowerCase())) continue
        seen.add(display.toLowerCase())
        unique.push(display)
      }
      setSuggestions(unique)
      setShowDropdown(unique.length > 0)
    }, 300)
    return () => clearTimeout(timer)
  }, [value])

  // Dismiss on outside click
  useEffect(() => {
    if (!showDropdown) return
    function onMouseDown(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showDropdown])

  function pick(display) {
    onChange(display)
    setShowDropdown(false)
    setSuggestions([])
  }

  return (
    <div className="relative flex-1" ref={wrapperRef}>
      <input
        className="input w-full text-xs py-1 text-gray-500"
        placeholder="e.g. Chicken Breast"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true) }}
      />
      {showDropdown && (
        <ul className="absolute z-50 left-0 right-0 mt-0.5 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); pick(s) }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-indigo-50 transition-colors"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ── Ingredients editor ────────────────────────────────────────────────────────

function IngredientsEditor({ ingredients, onChange }) {
  function update(id, field, value) {
    onChange(ingredients.map((ing) => (ing.id === id ? { ...ing, [field]: value } : ing)))
  }

  function remove(id) {
    onChange(ingredients.filter((ing) => ing.id !== id))
  }

  function add() {
    onChange([...ingredients, blankIngredient()])
  }

  return (
    <div className="space-y-2">
      {ingredients.map((ing) => (
        <div key={ing.id} className="flex flex-col gap-1">
          <div className="flex gap-2 items-center">
            <input
              className="input flex-1 min-w-0"
              placeholder="Ingredient name"
              value={ing.name}
              onChange={(e) => update(ing.id, 'name', e.target.value)}
            />
            <input
              className="input w-20"
              placeholder="Qty"
              value={ing.quantity}
              onChange={(e) => update(ing.id, 'quantity', e.target.value)}
            />
            <input
              className="input w-20"
              placeholder="Unit"
              value={ing.unit}
              onChange={(e) => update(ing.id, 'unit', e.target.value)}
            />
            <button onClick={() => remove(ing.id)} className="text-gray-400 hover:text-red-500 transition-colors shrink-0">
              <Trash2 size={16} />
            </button>
          </div>
          <div className="flex items-center gap-2 pl-0">
            <span className="text-xs text-gray-400 shrink-0">Shopping list name:</span>
            <ShoppingNameInput
              value={ing.shopping_name ?? ''}
              onChange={(val) => update(ing.id, 'shopping_name', val)}
            />
          </div>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        <Plus size={16} /> Add ingredient
      </button>
    </div>
  )
}

// ── Steps editor ──────────────────────────────────────────────────────────────

function StepsEditor({ steps, onChange }) {
  function update(id, value) {
    onChange(steps.map((s) => (s.id === id ? { ...s, text: value } : s)))
  }

  function remove(id) {
    onChange(steps.filter((s) => s.id !== id))
  }

  function add() {
    onChange([...steps, blankStep()])
  }

  return (
    <div className="space-y-2">
      {steps.map((step, i) => (
        <div key={step.id} className="flex gap-2 items-start">
          <span className="mt-2.5 text-sm font-semibold text-gray-400 w-5 shrink-0">{i + 1}.</span>
          <textarea
            className="input flex-1 min-h-[60px] resize-none"
            value={step.text}
            onChange={(e) => update(step.id, e.target.value)}
          />
          <button onClick={() => remove(step.id)} className="mt-2 text-gray-400 hover:text-red-500 transition-colors shrink-0">
            <Trash2 size={16} />
          </button>
        </div>
      ))}
      <button
        onClick={add}
        className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700 font-medium transition-colors"
      >
        <Plus size={16} /> Add step
      </button>
    </div>
  )
}

// ── Section wrapper ───────────────────────────────────────────────────────────

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ── Add Ingredient to Library card ───────────────────────────────────────────

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

function AddToLibraryCard() {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [canonicalName, setCanonicalName] = useState('')
  const [category, setCategory] = useState('')
  const [aliases, setAliases] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [exactMatch, setExactMatch] = useState(null) // { name, grocery_category } | null
  const [saving, setSaving] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const nameRef = useRef(null)
  const suggestionsRef = useRef(null)

  // Dismiss dropdown on outside click
  useEffect(() => {
    if (!showSuggestions) return
    function onMouseDown(e) {
      if (
        nameRef.current && !nameRef.current.contains(e.target) &&
        suggestionsRef.current && !suggestionsRef.current.contains(e.target)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [showSuggestions])

  async function handleNameChange(value) {
    setName(value)
    setCanonicalName(value)
    setSuccessMsg('')
    setErrorMsg('')
    setExactMatch(null)

    if (value.length < 2) {
      setSuggestions([])
      setShowSuggestions(false)
      return
    }

    const { data } = await supabase
      .from('ingredient_lookup')
      .select('id, name, grocery_category')
      .ilike('name', `%${value}%`)
      .limit(5)

    if (!data) return
    setSuggestions(data)
    setShowSuggestions(data.length > 0)

    // Check for exact match
    const exact = data.find(
      (row) => row.name.toLowerCase() === value.toLowerCase().trim()
    )
    setExactMatch(exact ?? null)
  }

  function pickSuggestion(s) {
    setName(s.name)
    setCanonicalName(s.name)
    setCategory(s.grocery_category ?? '')
    setShowSuggestions(false)
    const exact = { name: s.name, grocery_category: s.grocery_category }
    setExactMatch(exact)
  }

  async function handleSave() {
    setErrorMsg('')
    setSuccessMsg('')

    const trimmedName = name.trim()
    const trimmedCanonical = canonicalName.trim()

    if (!trimmedName || !trimmedCanonical || !category) {
      setErrorMsg('Name, canonical name, and category are required.')
      return
    }

    setSaving(true)
    try {
      // Final duplicate check
      const { data: check } = await supabase
        .from('ingredient_lookup')
        .select('id, grocery_category')
        .ilike('name', trimmedName)
        .limit(1)
        .single()

      if (check) {
        setExactMatch({ name: trimmedName, grocery_category: check.grocery_category })
        setSaving(false)
        return
      }

      const { error } = await supabase.from('ingredient_lookup').insert({
        name: trimmedName,
        canonical_name: trimmedCanonical,
        grocery_category: category,
        aliases: aliases.trim(),
        usage_count: 0,
      })

      if (error) throw error

      setSuccessMsg(`✓ ${trimmedName} added to ingredient library`)
      setName('')
      setCanonicalName('')
      setCategory('')
      setAliases('')
      setSuggestions([])
      setExactMatch(null)
      setOpen(false)
    } catch (err) {
      setErrorMsg(`Error: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <span className="text-sm font-medium text-gray-500">Add Ingredient to Library</span>
        {open
          ? <ChevronUp size={15} className="text-gray-400 shrink-0" />
          : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
      </button>

      {/* Success message (visible even when collapsed) */}
      {successMsg && (
        <div className="px-4 py-2 bg-green-50 border-t border-green-100 text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Form */}
      {open && (
        <div className="px-4 py-4 space-y-3 border-t border-gray-200 bg-white">

          {/* Name */}
          <div className="relative">
            <label className="label text-xs text-gray-500">Ingredient Name *</label>
            <input
              ref={nameRef}
              className="input w-full text-sm"
              placeholder="e.g. Kosher Salt"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              onFocus={() => { if (suggestions.length > 0) setShowSuggestions(true) }}
            />
            {showSuggestions && (
              <ul
                ref={suggestionsRef}
                className="absolute z-50 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden"
              >
                {suggestions.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); pickSuggestion(s) }}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-gray-800 hover:bg-indigo-50 transition-colors"
                    >
                      <span>{s.name}</span>
                      {s.grocery_category && (
                        <span className="text-xs text-gray-400 shrink-0">{s.grocery_category}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {exactMatch && (
              <p className="mt-1 text-xs text-amber-600">
                Already in library as <span className="font-medium">{exactMatch.grocery_category}</span>
              </p>
            )}
          </div>

          {/* Canonical name */}
          <div>
            <label className="label text-xs text-gray-500">Canonical Name *</label>
            <input
              className="input w-full text-sm"
              placeholder="e.g. Salt"
              value={canonicalName}
              onChange={(e) => { setCanonicalName(e.target.value); setSuccessMsg(''); setErrorMsg('') }}
            />
            <p className="mt-1 text-xs text-gray-400">
              The base name used when combining duplicates on your shopping list (e.g. "Salt" for "Kosher Salt")
            </p>
          </div>

          {/* Category */}
          <div>
            <label className="label text-xs text-gray-500">Grocery Category *</label>
            <select
              className="input w-full text-sm"
              value={category}
              onChange={(e) => { setCategory(e.target.value); setSuccessMsg(''); setErrorMsg('') }}
            >
              <option value="">Select category…</option>
              {GROCERY_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Aliases */}
          <div>
            <label className="label text-xs text-gray-500">Aliases (optional)</label>
            <input
              className="input w-full text-sm"
              placeholder="e.g. cherry tomato, grape tomatoes"
              value={aliases}
              onChange={(e) => { setAliases(e.target.value); setSuccessMsg(''); setErrorMsg('') }}
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600">{errorMsg}</p>
          )}

          <button
            onClick={handleSave}
            disabled={saving || !!exactMatch || !name.trim() || !canonicalName.trim() || !category}
            className="w-full py-2 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {saving ? <><Loader2 size={14} className="animate-spin" /> Saving…</> : 'Save to Library'}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AddRecipe() {
  const navigate = useNavigate()
  const fileInputRef = useRef(null)

  const [files, setFiles] = useState([])
  const [phase, setPhase] = useState('upload') // 'upload' | 'extracting' | 'review' | 'saving'
  const [extractError, setExtractError] = useState(null)
  const [saveError, setSaveError] = useState(null)

  // Review form state
  const [title, setTitle] = useState('')
  const [recipeType, setRecipeType] = useState('')
  const [cuisineType, setCuisineType] = useState('')
  const [mainIngredient, setMainIngredient] = useState('')
  const [cookTime, setCookTime] = useState('')
  const [servings, setServings] = useState('')
  const [source, setSource] = useState('')
  const [ingredients, setIngredients] = useState([])
  const [instructions, setInstructions] = useState('')
  const [steps, setSteps] = useState([])
  const [selectedTagIds, setSelectedTagIds] = useState([])

  // ── File handling ──

  function handleFileChange(e) {
    addFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const handleDrop = useCallback((e) => {
    e.preventDefault()
    addFiles(Array.from(e.dataTransfer.files))
  }, [])

  function addFiles(incoming) {
    const allowed = incoming.filter((f) =>
      ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(f.type)
    )
    setFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name + f.size))
      return [...prev, ...allowed.filter((f) => !existing.has(f.name + f.size))]
    })
  }

  function removeFile(index) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  // ── Extraction ──

  async function handleExtract() {
    setExtractError(null)
    setPhase('extracting')
    try {
      const result = await extractRecipe(files)
      setTitle(result.title ?? '')
      setRecipeType(result.recipe_type ?? '')
      setCuisineType(result.cuisine_type ?? '')
      setMainIngredient(result.main_ingredient ?? '')
      setCookTime(result.cook_time ?? '')
      setServings(String(result.base_servings ?? ''))
      setInstructions(result.instructions ?? '')
      setIngredients(
        (result.ingredients ?? []).map((ing) => ({ ...ing, id: crypto.randomUUID() }))
      )
      setSteps(
        (result.simplified_instructions ?? []).map((text) => ({ id: crypto.randomUUID(), text }))
      )
      setPhase('review')
    } catch (err) {
      setExtractError(err.message)
      setPhase('upload')
    }
  }

  // ── Save ──

  async function handleSave() {
    setSaveError(null)
    setPhase('saving')
    try {
      await saveRecipe({
        files,
        recipe: {
          title,
          base_servings: Number(servings) || null,
          main_ingredient: mainIngredient,
          recipe_type: recipeType,
          cuisine_type: cuisineType,
          cook_time: cookTime,
          source,
          instructions,
          simplified_instructions: steps.map((s) => s.text),
          ingredients,
        },
        selectedTagIds,
      })
      navigate('/')
    } catch (err) {
      setSaveError(err.message)
      setPhase('review')
    }
  }

  // ── Render: Upload phase ──

  if (phase === 'upload' || phase === 'extracting') {
    return (
      <div className="p-6 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Add Recipe</h2>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => e.preventDefault()}
          onClick={() => fileInputRef.current?.click()}
          className="border-2 border-dashed border-gray-300 rounded-2xl p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors"
        >
          <ImagePlus size={36} className="text-gray-400" />
          <p className="text-base font-medium text-gray-700">Add Photos or PDF</p>
          <p className="text-xs text-gray-400">JPG, PNG, WEBP, PDF · Tap or drag & drop</p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.pdf"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Thumbnail strip */}
        {files.length > 0 && (
          <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
            {files.map((file, i) => (
              <FileThumbnail key={i} file={file} onRemove={() => removeFile(i)} />
            ))}
          </div>
        )}

        {extractError && (
          <p className="mt-3 text-sm text-red-600">{extractError}</p>
        )}

        <button
          disabled={files.length === 0 || phase === 'extracting'}
          onClick={handleExtract}
          className="mt-6 w-full py-3 rounded-xl bg-indigo-600 text-white font-semibold disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          {phase === 'extracting' ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Extracting recipe…
            </>
          ) : (
            'Extract Recipe'
          )}
        </button>

        <div className="mt-6">
          <AddToLibraryCard />
        </div>
      </div>
    )
  }

  // ── Render: Review phase ──

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Review Recipe</h2>
        <button
          onClick={() => setPhase('upload')}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Back
        </button>
      </div>

      {/* Basic info */}
      <Section title="Basic Info">
        <div className="space-y-3">
          <div>
            <label className="label">Title</label>
            <input className="input w-full" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Type</label>
              <select className="input w-full" value={recipeType} onChange={(e) => setRecipeType(e.target.value)}>
                <option value="">Select…</option>
                {RECIPE_TYPES.map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Servings</label>
              <input className="input w-full" type="number" min="1" value={servings} onChange={(e) => setServings(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Cuisine</label>
              <input className="input w-full" value={cuisineType} onChange={(e) => setCuisineType(e.target.value)} />
            </div>
            <div>
              <label className="label">Main Ingredient</label>
              <input className="input w-full" value={mainIngredient} onChange={(e) => setMainIngredient(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="label">Cook Time</label>
            <input className="input w-full" value={cookTime} onChange={(e) => setCookTime(e.target.value)} />
          </div>
          <div>
            <label className="label">Source</label>
            <input className="input w-full" placeholder="e.g. Ottolenghi Simple, Smitten Kitchen, Dad's recipe" value={source} onChange={(e) => setSource(e.target.value)} />
          </div>
        </div>
      </Section>

      {/* Ingredients */}
      <Section title="Ingredients">
        <IngredientsEditor ingredients={ingredients} onChange={setIngredients} />
      </Section>

      {/* Simplified steps */}
      <Section title="Simplified Steps">
        <StepsEditor steps={steps} onChange={setSteps} />
      </Section>

      {/* Full instructions */}
      <Section title="Full Instructions">
        <textarea
          className="input w-full min-h-[160px] resize-y"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </Section>

      {/* Tags */}
      <Section title="Tags">
        <TagSelector selected={selectedTagIds} onChange={setSelectedTagIds} />
      </Section>

      {saveError && (
        <p className="text-sm text-red-600">{saveError}</p>
      )}

      {/* Save button */}
      <button
        disabled={!title.trim() || phase === 'saving'}
        onClick={handleSave}
        className="w-full py-4 rounded-xl bg-indigo-600 text-white font-semibold text-base disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
      >
        {phase === 'saving' ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Saving…
          </>
        ) : (
          'Save Recipe'
        )}
      </button>
    </div>
  )
}
