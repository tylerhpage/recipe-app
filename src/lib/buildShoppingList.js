import { supabase } from './supabase'
import { loadActiveMenu } from './activeMenu'
import { categorizeItems } from './categorize'

// ── Quantity helpers ──────────────────────────────────────────────────────────

/**
 * Parse a text quantity string into a float.
 * Handles integers, decimals, simple fractions ("1/2"), and mixed numbers ("1 1/2").
 * Returns null if unparseable (treat as "to taste" / unmeasured).
 */
function parseQuantity(q) {
  if (!q) return null
  const s = String(q).trim()
  // Mixed number: "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/)
  if (mixed) return parseInt(mixed[1]) + parseInt(mixed[2]) / parseInt(mixed[3])
  // Simple fraction: "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/)
  if (frac) return parseInt(frac[1]) / parseInt(frac[2])
  // Decimal / integer
  const num = parseFloat(s)
  return isNaN(num) ? null : num
}

/**
 * Format a float back to a human-friendly quantity string.
 * Converts common decimal fractions back to fraction notation (½, ¼, ¾, ⅓, ⅔).
 */
function formatQuantity(n) {
  if (n === null || n === undefined) return ''
  const FRACS = [
    [3, 4], [2, 3], [1, 2], [1, 3], [1, 4],
  ]
  const whole = Math.floor(n)
  const remainder = n - whole
  for (const [num, den] of FRACS) {
    if (Math.abs(remainder - num / den) < 0.04) {
      const fracStr = `${num}/${den}`
      return whole > 0 ? `${whole} ${fracStr}` : fracStr
    }
  }
  // Fall back to a decimal, stripping unnecessary trailing zeros
  const rounded = Math.round(n * 100) / 100
  return String(parseFloat(rounded.toFixed(2)))
}

// ── Core build function ───────────────────────────────────────────────────────

/**
 * Build a categorized shopping list from the active menu stored in localStorage.
 *
 * Steps:
 *  1. Load active menu items (each has recipeId, baseServings, plannedServings).
 *  2. Group by recipeId, accumulating total planned servings when the same recipe
 *     appears multiple times.
 *  3. Fetch all ingredients for the involved recipes from Supabase.
 *  4. Scale each ingredient: quantity × (totalPlanned ÷ baseServings).
 *  5. Merge duplicate ingredients (same name + unit) by summing scaled amounts.
 *  6. Run categorization and return the final item array.
 *
 * @returns {Promise<Array<{name, quantity, unit, brand, category, is_checked, is_manual}>>}
 */
export async function buildShoppingList() {
  const menuItems = loadActiveMenu()
  console.log('[buildShoppingList] active menu items:', menuItems)

  if (!menuItems.length) {
    console.warn('[buildShoppingList] active menu is empty — nothing to build')
    return []
  }

  // ── 1. Group by recipeId ──
  // Normalise property names: activeMenu.js uses recipeId/baseServings/plannedServings,
  // but older localStorage entries may use recipe_id/base_servings/planned_servings.
  const recipeMap = {}
  for (const item of menuItems) {
    const id = item.recipeId ?? item.recipe_id ?? item.id ?? null
    if (!id) {
      console.warn('[buildShoppingList] menu item missing recipeId, skipping:', item)
      continue
    }
    const base = item.baseServings ?? item.base_servings ?? 4
    const planned = item.plannedServings ?? item.planned_servings ?? base
    if (!recipeMap[id]) {
      recipeMap[id] = { baseServings: base, totalPlanned: 0 }
    }
    recipeMap[id].totalPlanned += planned
  }

  const recipeIds = Object.keys(recipeMap)
  console.log('[buildShoppingList] recipe IDs to fetch:', recipeIds)
  console.log('[buildShoppingList] recipe scaling map:', recipeMap)

  if (!recipeIds.length) {
    console.warn('[buildShoppingList] no valid recipeIds found in menu')
    return []
  }

  // ── 2. Fetch ingredients ──
  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('recipe_id, name, shopping_name, canonical_name, quantity, unit, grocery_category')
    .in('recipe_id', recipeIds)

  console.log('[buildShoppingList] ingredients query result:', { ingredients, error })

  if (error) throw new Error(`Supabase error fetching ingredients: ${error.message}`)
  if (!ingredients?.length) {
    console.warn('[buildShoppingList] no ingredients returned from Supabase for these recipe IDs')
    return []
  }

  // ── 3. Scale + merge ──
  // Key: "name (lowercase) ||| unit (lowercase)" to group duplicates.
  const merged = {}

  for (const ing of ingredients) {
    const recipe = recipeMap[ing.recipe_id]
    if (!recipe) continue

    const ratio = recipe.baseServings > 0
      ? recipe.totalPlanned / recipe.baseServings
      : 1

    const parsed = parseQuantity(ing.quantity)
    const scaled = parsed !== null ? parsed * ratio : null

    // Merge key: prefer canonical_name so variants ("Kosher Salt", "Sea Salt") combine;
    // fall back to shopping_name then name.
    const mergeKey = (ing.canonical_name || ing.shopping_name || ing.name || '').toLowerCase().trim()
    // Display name follows the same priority for the label shown on the list.
    const displayName = (ing.canonical_name || ing.shopping_name || ing.name || '').trim()
    const key = `${mergeKey}|||${(ing.unit ?? '').toLowerCase().trim()}`

    if (!merged[key]) {
      merged[key] = {
        name: displayName,
        scaledQty: scaled,
        unit: ing.unit ?? '',
        canSum: parsed !== null,
        grocery_category: ing.grocery_category ?? null,
      }
    } else {
      // Only sum if both sides have numeric quantities
      if (scaled !== null && merged[key].canSum) {
        merged[key].scaledQty = (merged[key].scaledQty ?? 0) + scaled
      } else {
        // One side is non-numeric — can't sum; drop the quantity
        merged[key].canSum = false
        merged[key].scaledQty = null
      }
    }
  }

  // ── 4. Shape into item objects ──
  const raw = Object.values(merged).map((m) => ({
    name: m.name,
    quantity: m.canSum && m.scaledQty !== null ? formatQuantity(m.scaledQty) : '',
    unit: m.unit,
    brand: null,
    is_manual: false,
    is_checked: false,
    // Pre-populate category from DB so categorizeItems can skip AI for known items
    category: m.grocery_category ?? null,
  }))

  // ── 5. Categorize ──
  return categorizeItems(raw)
}
