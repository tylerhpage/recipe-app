import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Loader2, Plus, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import matchIngredients from '../lib/matchIngredients'
import TagSelector from '../components/TagSelector'

const RECIPE_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Side', 'Beverage', 'Snack', 'Appetizer']

// ── Sub-editors (same as AddRecipe) ──────────────────────────────────────────

function blankIngredient() {
  return { id: crypto.randomUUID(), name: '', shopping_name: '', quantity: '', unit: '' }
}

function blankStep() {
  return { id: crypto.randomUUID(), text: '' }
}

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
            <input
              className="input flex-1 text-xs py-1 text-gray-500"
              placeholder="e.g. Chicken Breast"
              value={ing.shopping_name ?? ''}
              onChange={(e) => update(ing.id, 'shopping_name', e.target.value)}
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

function Section({ title, children }) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">{title}</h3>
      {children}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function EditRecipe() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [loadError, setLoadError] = useState(null)
  const [saveError, setSaveError] = useState(null)

  // Form state
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

  // Load recipe on mount
  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients ( id, name, shopping_name, quantity, unit ),
          recipe_tags ( tags ( id, name ) ),
          recipe_photos ( image_url, sort_order )
        `)
        .eq('id', id)
        .single()

      if (error) {
        setLoadError(error.message)
        setLoading(false)
        return
      }

      setTitle(data.title ?? '')
      setRecipeType(data.recipe_type ?? '')
      setCuisineType(data.cuisine_type ?? '')
      setMainIngredient(data.main_ingredient ?? '')
      setCookTime(data.cook_time ?? '')
      setServings(String(data.base_servings ?? ''))
      setSource(data.source ?? '')
      setInstructions(data.instructions ?? '')

      const rawSteps = (() => {
        const raw = data.simplified_instructions
        if (Array.isArray(raw)) return raw
        if (typeof raw === 'string') { try { return JSON.parse(raw) } catch { return [] } }
        return []
      })()
      setSteps(rawSteps.map((text) => ({ id: crypto.randomUUID(), text })))

      setIngredients(
        (data.ingredients ?? []).map((ing) => ({
          id: ing.id ?? crypto.randomUUID(),
          name: ing.name ?? '',
          shopping_name: ing.shopping_name ?? '',
          quantity: ing.quantity ?? '',
          unit: ing.unit ?? '',
        }))
      )

      setSelectedTagIds(
        (data.recipe_tags ?? []).map((rt) => rt.tags?.id).filter(Boolean)
      )

      setLoading(false)
    }
    load()
  }, [id])

  async function handleSave() {
    setSaveError(null)
    setSaving(true)
    try {
      // 1. Update recipe row
      const { error: recipeErr } = await supabase
        .from('recipes')
        .update({
          title,
          base_servings: Number(servings) || null,
          main_ingredient: mainIngredient,
          recipe_type: recipeType,
          cuisine_type: cuisineType,
          cook_time: cookTime,
          source: source || null,
          instructions,
          simplified_instructions: steps.map((s) => s.text),
        })
        .eq('id', id)

      if (recipeErr) throw recipeErr

      // 2. Replace ingredients — delete existing, re-insert enriched
      const { error: delErr } = await supabase
        .from('ingredients')
        .delete()
        .eq('recipe_id', id)
      if (delErr) throw delErr

      const enrichedIngredients = await matchIngredients(ingredients)
      const ingredientRows = enrichedIngredients
        .filter((ing) => ing.name.trim())
        .map((ing) => ({
          recipe_id: id,
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

      // 3. Replace tags — delete existing, re-insert
      const { error: delTagErr } = await supabase
        .from('recipe_tags')
        .delete()
        .eq('recipe_id', id)
      if (delTagErr) throw delTagErr

      if (selectedTagIds.length > 0) {
        const tagRows = selectedTagIds.map((tag_id) => ({ recipe_id: id, tag_id }))
        const { error: tagErr } = await supabase.from('recipe_tags').insert(tagRows)
        if (tagErr) throw tagErr
      }

      navigate(`/recipe/${id}`)
    } catch (err) {
      setSaveError(err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (loadError) {
    return <div className="p-6"><p className="text-sm text-red-600">{loadError}</p></div>
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8 pb-32">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Edit Recipe</h2>
        <button
          onClick={() => navigate(`/recipe/${id}`)}
          className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          ← Cancel
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

      {saveError && <p className="text-sm text-red-600">{saveError}</p>}

      <button
        disabled={!title.trim() || saving}
        onClick={handleSave}
        className="w-full py-4 rounded-xl bg-indigo-600 text-white font-semibold text-base disabled:opacity-40 flex items-center justify-center gap-2 hover:bg-indigo-700 transition-colors"
      >
        {saving ? <><Loader2 size={18} className="animate-spin" /> Saving…</> : 'Save Changes'}
      </button>
    </div>
  )
}
