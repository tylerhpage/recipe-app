import { useState, useEffect, useMemo } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Star, Clock, ChefHat, Search, X, BookOpen, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'

const RECIPE_TYPES = ['Breakfast', 'Lunch', 'Dinner', 'Dessert', 'Side', 'Beverage', 'Snack', 'Appetizer']

async function fetchRecipes() {
  const { data, error } = await supabase
    .from('recipes')
    .select(`
      id, title, recipe_type, cuisine_type, cook_time, main_ingredient, source, is_favorite,
      recipe_tags ( tags ( id, name ) ),
      ingredients ( name )
    `)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ── Recipe card ───────────────────────────────────────────────────────────────

function RecipeCard({ recipe, onToggleFavorite }) {
  const navigate = useNavigate()
  const tags = recipe.recipe_tags?.map((rt) => rt.tags).filter(Boolean) ?? []

  function handleFavorite(e) {
    e.stopPropagation()
    onToggleFavorite(recipe.id, !recipe.is_favorite)
  }

  return (
    <div
      onClick={() => navigate(`/recipe/${recipe.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.98]"
    >
      <div className="p-3 space-y-2">
        {/* Title + favorite row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 leading-snug line-clamp-2">{recipe.title}</h3>
            {recipe.source && (
              <p className="text-xs text-gray-400 mt-0.5 truncate">{recipe.source}</p>
            )}
          </div>
          <button
            onClick={handleFavorite}
            className="shrink-0 p-0.5 -mt-0.5 -mr-0.5 rounded-full hover:bg-gray-100 transition-colors"
          >
            <Star
              size={16}
              strokeWidth={1.75}
              className={recipe.is_favorite ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
            />
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-gray-500 flex-wrap">
          {recipe.recipe_type && (
            <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
              {recipe.recipe_type}
            </span>
          )}
          {recipe.cuisine_type && <span>{recipe.cuisine_type}</span>}
        </div>

        {recipe.cook_time && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={12} />
            {recipe.cook_time}
          </div>
        )}

        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <span key={tag.id} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                {tag.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Library() {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [unmatchedCount, setUnmatchedCount] = useState(0)

  // Filters
  const [search, setSearch] = useState('')
  const [favOnly, setFavOnly] = useState(false)
  const [typeFilter, setTypeFilter] = useState('')
  const [cuisineFilter, setCuisineFilter] = useState('')
  const [sourceFilter, setSourceFilter] = useState('')

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))

    // Count unmatched ingredients (fire independently — banner is non-critical)
    supabase
      .from('ingredients')
      .select('id', { count: 'exact', head: true })
      .is('canonical_name', null)
      .then(({ count }) => setUnmatchedCount(count ?? 0))
  }, [])

  async function handleToggleFavorite(id, isFavorite) {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, is_favorite: isFavorite } : r)))
    const { error } = await supabase.from('recipes').update({ is_favorite: isFavorite }).eq('id', id)
    if (error) {
      setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, is_favorite: !isFavorite } : r)))
    }
  }

  // Distinct cuisine values from loaded data
  const cuisineOptions = useMemo(() => {
    const set = new Set(recipes.map((r) => r.cuisine_type).filter(Boolean))
    return [...set].sort()
  }, [recipes])

  // Distinct source values from loaded data
  const sourceOptions = useMemo(() => {
    const set = new Set(recipes.map((r) => r.source).filter(Boolean))
    return [...set].sort()
  }, [recipes])

  // Apply all filters client-side
  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return recipes.filter((r) => {
      if (favOnly && !r.is_favorite) return false
      if (typeFilter && r.recipe_type !== typeFilter) return false
      if (cuisineFilter && r.cuisine_type !== cuisineFilter) return false
      if (sourceFilter && r.source !== sourceFilter) return false
      if (q) {
        const tagNames = r.recipe_tags?.map((rt) => rt.tags?.name ?? '').join(' ') ?? ''
        const ingNames = r.ingredients?.map((i) => i.name).join(' ') ?? ''
        const haystack = [r.title, r.main_ingredient, r.cuisine_type, r.source, tagNames, ingNames]
          .join(' ')
          .toLowerCase()
        if (!haystack.includes(q)) return false
      }
      return true
    })
  }, [recipes, search, favOnly, typeFilter, cuisineFilter, sourceFilter])

  const hasActiveFilters = search || favOnly || typeFilter || cuisineFilter || sourceFilter

  function clearFilters() {
    setSearch('')
    setFavOnly(false)
    setTypeFilter('')
    setCuisineFilter('')
    setSourceFilter('')
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

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-2xl font-bold text-gray-900">Recipe Library</h2>

      {/* Unmatched ingredients banner */}
      {unmatchedCount > 0 && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <div className="flex items-center gap-2 text-sm text-amber-800">
            <AlertTriangle size={15} className="text-amber-500 shrink-0" />
            <span>
              <span className="font-semibold">{unmatchedCount}</span> ingredient{unmatchedCount !== 1 ? 's' : ''} haven't been mapped to the ingredient library.
            </span>
          </div>
          <Link
            to="/admin/ingredients"
            className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-900 transition-colors whitespace-nowrap"
          >
            Map now →
          </Link>
        </div>
      )}

      {/* Search bar */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          className="input w-full pl-9 pr-9"
          placeholder="Search recipes, ingredients, tags…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Filter row */}
      <div className="flex gap-2 flex-wrap items-center">
        {/* Favorites toggle */}
        <button
          onClick={() => setFavOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${
            favOnly
              ? 'bg-amber-50 border-amber-300 text-amber-600'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Star size={14} className={favOnly ? 'fill-amber-400 text-amber-400' : ''} />
          Favorites
        </button>

        {/* Type dropdown */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={`input py-1.5 pr-8 text-sm ${typeFilter ? 'border-indigo-400 text-indigo-600' : ''}`}
        >
          <option value="">All types</option>
          {RECIPE_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>

        {/* Cuisine dropdown */}
        {cuisineOptions.length > 0 && (
          <select
            value={cuisineFilter}
            onChange={(e) => setCuisineFilter(e.target.value)}
            className={`input py-1.5 pr-8 text-sm ${cuisineFilter ? 'border-indigo-400 text-indigo-600' : ''}`}
          >
            <option value="">All cuisines</option>
            {cuisineOptions.map((c) => <option key={c}>{c}</option>)}
          </select>
        )}

        {/* Source dropdown */}
        {sourceOptions.length > 0 && (
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className={`input py-1.5 pr-8 text-sm ${sourceFilter ? 'border-indigo-400 text-indigo-600' : ''}`}
          >
            <option value="">All sources</option>
            {sourceOptions.map((s) => <option key={s}>{s}</option>)}
          </select>
        )}

        {/* Clear filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors"
          >
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        recipes.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 text-center min-h-[50vh]">
            <ChefHat size={48} className="text-gray-300" />
            <p className="text-gray-500 font-medium">No recipes yet</p>
            <p className="text-sm text-gray-400">Tap Add to upload your first recipe.</p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-3 text-center min-h-[30vh]">
            <Search size={40} className="text-gray-300" />
            <p className="text-gray-500 font-medium">No recipes match your filters</p>
            <button onClick={clearFilters} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              Clear filters
            </button>
          </div>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} onToggleFavorite={handleToggleFavorite} />
          ))}
        </div>
      )}
    </div>
  )
}
