require('dotenv').config()
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

const SUPABASE_URL = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

const DESCRIPTOR_WORDS = [
  'fresh', 'dried', 'frozen', 'canned', 'chopped', 'sliced', 'diced',
  'minced', 'grated', 'shredded', 'peeled', 'cooked', 'raw', 'large',
  'medium', 'small', 'divided', 'optional', 'boneless', 'skinless',
  'bone-in', 'skin-on', 'trimmed', 'halved', 'quartered', 'crushed',
  'ground', 'whole', 'toasted', 'roasted', 'packed', 'ripe', 'thin',
  'thick', 'finely', 'roughly', 'freshly', 'extra-virgin', 'extra virgin',
  'unsweetened', 'plain', 'coarse', 'fine', 'young', 'mature', 'rinsed',
  'drained', 'washed', 'pressed',
]

const DESCRIPTOR_PATTERN = new RegExp(
  '\\b(' +
    DESCRIPTOR_WORDS.slice()
      .sort((a, b) => b.length - a.length)
      .map((w) => w.replace(/[-]/g, '\\-'))
      .join('|') +
    ')\\b',
  'gi'
)

function cleanIngredientName(raw) {
  let name = raw

  // 1. Strip parenthetical notes
  name = name.replace(/\(.*?\)/g, '')

  // 2. Strip everything after the first comma
  name = name.split(',')[0]

  // 3. Strip leading quantities and measurements
  name = name.replace(
    /^\d+[\d\/\s]*(cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|liter|liters|pinch|bunch|clove|cloves|slice|slices|can|cans|package|packages|sprig|sprigs|leaf|leaves|head|heads|rib|ribs|stalk|stalks|piece|pieces|inch|inches)s?\s+/i,
    ''
  )

  // Strip a plain leading number with no unit
  name = name.replace(/^\d+\s+/, '')

  // 4. Strip size/descriptor words
  name = name.replace(DESCRIPTOR_PATTERN, '')

  // 5. Strip trailing adjectives
  name = name.replace(/\b(divided|optional|garnish|taste|serving|needed)\b/gi, '')

  // 6. Collapse whitespace and trim
  name = name.replace(/\s+/g, ' ').trim()

  return name
}

// Attempt clean → exact → stripped against ingredient_lookup for a single term.
async function tryMatch(term) {
  if (!term) return null

  const cleaned = cleanIngredientName(term)
  if (!cleaned) return null

  // Exact match on cleaned term
  const { data: exact } = await supabase
    .from('ingredient_lookup')
    .select('id, canonical_name, grocery_category')
    .ilike('name', cleaned)
    .limit(1)
    .single()

  if (exact) return { match: exact, method: 'exact' }

  // Additional descriptor stripping on the already-cleaned term
  const stripped = cleaned.replace(DESCRIPTOR_PATTERN, '').replace(/\s+/g, ' ').trim()
  if (!stripped || stripped.toLowerCase() === cleaned.toLowerCase()) return null

  const { data: strippedMatch } = await supabase
    .from('ingredient_lookup')
    .select('id, canonical_name, grocery_category')
    .ilike('name', stripped)
    .limit(1)
    .single()

  if (strippedMatch) return { match: strippedMatch, method: 'stripped' }
  return null
}

async function lookupIngredient(ingredient) {
  // Try shopping_name first, fall back to name
  const primaryTerm = ingredient.shopping_name?.trim() || ingredient.name?.trim()
  const fallbackTerm = ingredient.shopping_name ? ingredient.name?.trim() : null

  // Try primary term
  let result = await tryMatch(primaryTerm)

  // Try fallback if primary failed and it's different from primary
  if (!result && fallbackTerm && fallbackTerm !== primaryTerm) {
    result = await tryMatch(fallbackTerm)
  }

  return result ?? { match: null, method: 'unmatched' }
}

async function processBatch(batch) {
  return Promise.all(
    batch.map(async (ingredient) => {
      if (!ingredient.name?.trim() && !ingredient.shopping_name?.trim()) {
        return { ingredient, match: null, method: 'unmatched' }
      }

      const { match, method } = await lookupIngredient(ingredient)

      if (match) {
        const { error } = await supabase
          .from('ingredients')
          .update({
            canonical_name: match.canonical_name,
            grocery_category: match.grocery_category,
            lookup_id: match.id,
          })
          .eq('id', ingredient.id)

        if (error) {
          const label = ingredient.shopping_name || ingredient.name
          console.warn(`  Warning: failed to update id=${ingredient.id} (${label}): ${error.message}`)
          return { ingredient, match: null, method: 'unmatched' }
        }
      }

      return { ingredient, match, method }
    })
  )
}

async function main() {
  console.log('Fetching unprocessed ingredients (canonical_name is null)…\n')

  const { data: ingredients, error } = await supabase
    .from('ingredients')
    .select('id, name, shopping_name')
    .is('canonical_name', null)

  if (error) {
    console.error('Failed to fetch ingredients:', error.message)
    process.exit(1)
  }

  if (!ingredients || ingredients.length === 0) {
    console.log('No unprocessed ingredients found — everything is already backfilled.')
    return
  }

  console.log(`Found ${ingredients.length} ingredient(s) to process.\n`)

  const BATCH_SIZE = 20
  let exactCount = 0
  let strippedCount = 0
  const unmatched = []

  for (let i = 0; i < ingredients.length; i += BATCH_SIZE) {
    const batch = ingredients.slice(i, i + BATCH_SIZE)
    const batchEnd = Math.min(i + BATCH_SIZE, ingredients.length)
    process.stdout.write(`  Processing ${i + 1}–${batchEnd} / ${ingredients.length}…`)

    const results = await processBatch(batch)

    for (const { ingredient, match, method } of results) {
      if (method === 'exact') exactCount++
      else if (method === 'stripped') strippedCount++
      else {
        const label = ingredient.shopping_name
          ? `${ingredient.shopping_name} (raw: ${ingredient.name})`
          : (ingredient.name ?? '(empty)')
        unmatched.push(label)
      }
    }

    console.log(' done.')
  }

  const total = ingredients.length
  const matchedTotal = exactCount + strippedCount

  console.log('\n--- Backfill Complete ---')
  console.log(`Total ingredients processed: ${total}`)
  console.log(`Matched (exact):    ${exactCount}`)
  console.log(`Matched (stripped): ${strippedCount}`)
  console.log(`Unmatched:          ${unmatched.length}`)

  if (unmatched.length > 0) {
    console.log('\n--- Unmatched Ingredients (add these to the library) ---')
    for (const name of unmatched) {
      console.log(`- ${name}`)
    }

    const outPath = path.join(__dirname, '..', 'data', 'unmatched_ingredients.txt')
    fs.writeFileSync(outPath, unmatched.join('\n') + '\n', 'utf-8')
    console.log(`\nUnmatched names written to: ${outPath}`)
  } else {
    console.log('\nAll ingredients matched — nothing to write to unmatched_ingredients.txt')
  }
}

main().catch((err) => {
  console.error('Unexpected error:', err)
  process.exit(1)
})
