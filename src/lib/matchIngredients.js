import { supabase } from './supabase';

function cleanIngredientName(name) {
  let n = name;
  n = n.replace(/\(.*?\)/g, '');
  n = n.split(',')[0];
  n = n.replace(/^\d+[\d\/\s]*(cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|liter|liters|pinch|bunch|clove|cloves|slice|slices|can|cans|package|packages|sprig|sprigs|leaf|leaves|head|heads|rib|ribs|stalk|stalks|piece|pieces|inch|inches)s?\s+/i, '');
  n = n.replace(/^\d+\s+/, '');
  const DESCRIPTOR_WORDS = ['fresh','dried','frozen','canned','chopped','sliced','diced','minced','grated','shredded','peeled','cooked','raw','large','medium','small','divided','optional','boneless','skinless','bone-in','skin-on','trimmed','halved','quartered','crushed','ground','whole','toasted','roasted','packed','ripe','thin','thick','finely','roughly','freshly','extra-virgin','extra virgin','unsweetened','plain','coarse','fine','rinsed','drained','washed','pressed'];
  const sorted = DESCRIPTOR_WORDS.slice().sort((a, b) => b.length - a.length);
  const pattern = new RegExp('\\b(' + sorted.map(w => w.replace(/[-]/g, '\\-')).join('|') + ')\\b', 'gi');
  n = n.replace(pattern, '');
  n = n.replace(/\b(divided|optional|garnish|taste|serving|needed)\b/gi, '');
  n = n.replace(/\s+/g, ' ').trim();
  return n;
}

async function tryMatch(term) {
  if (!term) return null;
  const cleaned = cleanIngredientName(term);
  if (!cleaned) return null;

  // Exact match on cleaned name
  const { data: exact } = await supabase
    .from('ingredient_lookup')
    .select('id, canonical_name, grocery_category')
    .ilike('name', cleaned)
    .limit(1)
    .single();

  if (exact) return exact;

  // Stripped match — remove remaining descriptors and try again
  const stripped = cleaned.replace(/\b(whole|ground|dried|fresh|large|medium|small)\b/gi, '').replace(/\s+/g, ' ').trim();
  if (stripped && stripped !== cleaned) {
    const { data: strippedMatch } = await supabase
      .from('ingredient_lookup')
      .select('id, canonical_name, grocery_category')
      .ilike('name', stripped)
      .limit(1)
      .single();

    if (strippedMatch) return strippedMatch;
  }

  return null;
}

async function lookupIngredient(ingredient) {
  const primaryTerm = ingredient.shopping_name?.trim() || ingredient.name?.trim();
  const fallbackTerm = ingredient.shopping_name?.trim() ? ingredient.name?.trim() : null;

  let result = await tryMatch(primaryTerm);

  if (!result && fallbackTerm && fallbackTerm !== primaryTerm) {
    result = await tryMatch(fallbackTerm);
  }

  return result;
}

export default async function matchIngredients(ingredients) {
  // Skip ingredients already marked as IGNORE
  const toProcess = ingredients.filter(ing => ing.canonical_name !== 'IGNORE');

  const matches = await Promise.all(toProcess.map(ing => lookupIngredient(ing)));

  // Build a lookup map of results keyed by index within toProcess
  const enriched = new Map(
    toProcess.map((ingredient, i) => {
      const match = matches[i];
      return [
        ingredient,
        match
          ? { ...ingredient, canonical_name: match.canonical_name, grocery_category: match.grocery_category, lookup_id: match.id }
          : { ...ingredient, canonical_name: null, grocery_category: null, lookup_id: null },
      ];
    })
  );

  // Merge back — IGNORE ingredients pass through unchanged
  const results = ingredients.map(ing =>
    ing.canonical_name === 'IGNORE' ? ing : (enriched.get(ing) ?? ing)
  );

  // Collect matched ids for usage_count increment
  const matchedIds = results
    .map((r) => r.lookup_id)
    .filter((id) => id != null);

  const matched = matchedIds.length;
  const unmatched = results.length - matched;

  console.log(
    `matchIngredients: ${matched} matched, ${unmatched} unmatched (of ${results.length} total)`
  );

  // Fire-and-forget usage count update
  if (matchedIds.length > 0) {
    supabase.rpc('increment_ingredient_usage', { ids: matchedIds });
  }

  return results;
}
