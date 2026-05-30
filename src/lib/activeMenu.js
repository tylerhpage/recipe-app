const KEY = 'recipe_app_active_menu'

export function loadActiveMenu() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveActiveMenu(items) {
  localStorage.setItem(KEY, JSON.stringify(items))
}

export function clearActiveMenu() {
  localStorage.removeItem(KEY)
}

export function addRecipeToMenu(recipe) {
  const items = loadActiveMenu()
  items.push({
    uid: crypto.randomUUID(),          // unique per slot so same recipe can appear twice
    recipeId: recipe.id,
    title: recipe.title,
    source: recipe.source ?? null,
    cuisineType: recipe.cuisine_type ?? null,
    baseServings: recipe.base_servings ?? 4,
    plannedServings: recipe.base_servings ?? 4,
  })
  saveActiveMenu(items)
  return items
}
