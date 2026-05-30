import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Star, Clock, Users, ChevronDown, ChevronUp, Trash2, Pencil, ChefHat, CalendarPlus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { addRecipeToMenu } from '../lib/activeMenu'

async function fetchRecipe(id) {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      *,
      recipe_photos ( image_url, sort_order ),
      ingredients ( id, name, quantity, unit ),
      recipe_tags ( tags ( id, name ) )
    `)
    .eq('id', id)
    .single()

  if (error) throw error
  return data
}

async function deleteRecipe(id) {
  // Related rows (recipe_photos, ingredients, recipe_tags) should cascade via FK,
  // but we delete explicitly to handle any storage cleanup needed.
  await supabase.from('recipe_tags').delete().eq('recipe_id', id)
  await supabase.from('ingredients').delete().eq('recipe_id', id)

  // Delete storage objects
  const { data: photos } = await supabase
    .from('recipe_photos')
    .select('image_url')
    .eq('recipe_id', id)

  if (photos?.length) {
    const paths = photos.map((p) => {
      // image_url is the full public URL; extract the path after /recipe-images/
      const match = p.image_url.match(/recipe-images\/(.+)$/)
      return match ? match[1] : null
    }).filter(Boolean)

    if (paths.length) {
      await supabase.storage.from('recipe-images').remove(paths)
    }
  }

  await supabase.from('recipe_photos').delete().eq('recipe_id', id)
  const { error } = await supabase.from('recipes').delete().eq('id', id)
  if (error) throw error
}

export default function RecipeDetail() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [recipe, setRecipe] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [showIngredients, setShowIngredients] = useState(true)
  const [showSteps, setShowSteps] = useState(true)
  const [showFullInstructions, setShowFullInstructions] = useState(false)
  const [completedSteps, setCompletedSteps] = useState(new Set())
  const [deleting, setDeleting] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    fetchRecipe(id)
      .then(setRecipe)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [id])

  async function handleToggleFavorite() {
    const next = !recipe.is_favorite
    setRecipe((r) => ({ ...r, is_favorite: next }))
    const { error } = await supabase
      .from('recipes')
      .update({ is_favorite: next })
      .eq('id', id)
    if (error) setRecipe((r) => ({ ...r, is_favorite: !next }))
  }

  async function handleDelete() {
    setDeleting(true)
    try {
      await deleteRecipe(id)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err.message)
      setDeleting(false)
      setConfirmDelete(false)
    }
  }

  function toggleStep(i) {
    setCompletedSteps((prev) => {
      const next = new Set(prev)
      next.has(i) ? next.delete(i) : next.add(i)
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (error) {
    return <div className="p-6"><p className="text-sm text-red-600">{error}</p></div>
  }

  if (!recipe) return null

  const photos = recipe.recipe_photos?.slice().sort((a, b) => a.sort_order - b.sort_order) ?? []
  const tags = recipe.recipe_tags?.map((rt) => rt.tags).filter(Boolean) ?? []

  // simplified_instructions may come back as a string if Supabase returns JSON as text
  const steps = (() => {
    const raw = recipe.simplified_instructions
    if (Array.isArray(raw)) return raw
    if (typeof raw === 'string') {
      try { return JSON.parse(raw) } catch { return [] }
    }
    return []
  })()

  return (
    <div className="max-w-2xl mx-auto pb-24">

      {/* Photo gallery */}
      {photos.length > 0 ? (
        photos.length === 1 ? (
          <div className="aspect-video bg-gray-100">
            <img src={photos[0].image_url} alt={recipe.title} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="flex gap-2 overflow-x-auto p-3 bg-gray-100">
            {photos.map((p, i) => (
              <img
                key={i}
                src={p.image_url}
                alt={`${recipe.title} ${i + 1}`}
                className="h-56 w-auto rounded-xl shrink-0 object-cover"
              />
            ))}
          </div>
        )
      ) : (
        <div className="aspect-video bg-gray-100 flex items-center justify-center text-gray-300">
          <ChefHat size={56} />
        </div>
      )}

      <div className="p-5 space-y-6">

        {/* Header row */}
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 leading-snug">{recipe.title}</h1>
            {recipe.source && (
              <p className="text-sm text-gray-400 mt-0.5">{recipe.source}</p>
            )}
            <div className="flex flex-wrap items-center gap-2 mt-2">
              {recipe.recipe_type && (
                <span className="bg-indigo-50 text-indigo-600 text-xs font-semibold px-2.5 py-1 rounded-full">
                  {recipe.recipe_type}
                </span>
              )}
              {recipe.cuisine_type && (
                <span className="text-sm text-gray-500">{recipe.cuisine_type}</span>
              )}
            </div>
          </div>
          <button onClick={handleToggleFavorite} className="p-2 rounded-full hover:bg-gray-100 transition-colors shrink-0">
            <Star
              size={24}
              strokeWidth={1.75}
              className={recipe.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-gray-400'}
            />
          </button>
        </div>

        {/* Meta row */}
        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
          {recipe.cook_time && (
            <div className="flex items-center gap-1.5">
              <Clock size={15} className="text-gray-400" />
              {recipe.cook_time}
            </div>
          )}
          {recipe.base_servings && (
            <div className="flex items-center gap-1.5">
              <Users size={15} className="text-gray-400" />
              Makes {recipe.base_servings} servings
            </div>
          )}
          {recipe.main_ingredient && (
            <div className="flex items-center gap-1.5">
              <ChefHat size={15} className="text-gray-400" />
              {recipe.main_ingredient}
            </div>
          )}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span key={tag.id} className="text-xs bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">
                {tag.name}
              </span>
            ))}
          </div>
        )}

        {/* Ingredients — collapsible, expanded by default */}
        {recipe.ingredients?.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowIngredients((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Ingredients
              {showIngredients ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showIngredients && (
              <ul className="px-4 pb-4 space-y-2 border-t border-gray-100 pt-3">
                {recipe.ingredients.map((ing) => (
                  <li key={ing.id} className="flex items-baseline gap-2 text-sm">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                    <span className="text-gray-500 shrink-0">
                      {[ing.quantity, ing.unit].filter(Boolean).join(' ')}
                    </span>
                    <span className="text-gray-900">{ing.name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Steps — collapsible, expanded by default */}
        {steps.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowSteps((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Steps
              {showSteps ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showSteps && (
              <ol className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
                {steps.map((step, i) => (
                  <li
                    key={i}
                    onClick={() => toggleStep(i)}
                    className={`flex gap-3 cursor-pointer select-none transition-opacity ${
                      completedSteps.has(i) ? 'opacity-40' : ''
                    }`}
                  >
                    <span
                      className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        completedSteps.has(i)
                          ? 'bg-indigo-600 border-indigo-600 text-white'
                          : 'border-gray-300 text-gray-400'
                      }`}
                    >
                      {completedSteps.has(i) ? '✓' : i + 1}
                    </span>
                    <span className={`text-sm text-gray-700 pt-0.5 leading-relaxed ${completedSteps.has(i) ? 'line-through' : ''}`}>
                      {step}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Full instructions collapsible */}
        {recipe.instructions && (
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowFullInstructions((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Full Instructions
              {showFullInstructions ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showFullInstructions && (
              <div className="px-4 pb-4 text-sm text-gray-600 whitespace-pre-wrap leading-relaxed border-t border-gray-100">
                {recipe.instructions}
              </div>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={() => { addRecipeToMenu(recipe); navigate('/menu') }}
          >
            <CalendarPlus size={16} />
            Add to Menu
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            onClick={() => navigate(`/edit/${id}`)}
          >
            <Pencil size={16} />
            Edit
          </button>
          <button
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-100 text-sm font-medium text-red-500 hover:bg-red-50 transition-colors ml-auto"
            onClick={() => setConfirmDelete(true)}
          >
            <Trash2 size={16} />
            Delete
          </button>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Delete recipe?</h3>
            <p className="text-sm text-gray-500">
              This will permanently delete <span className="font-medium text-gray-700">"{recipe.title}"</span> and all its photos. This cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
