import { supabase } from "../lib/supabase";

const DESCRIPTOR_WORDS = [
  "fresh", "dried", "frozen", "canned", "chopped", "sliced", "diced",
  "minced", "grated", "shredded", "peeled", "cooked", "raw", "large",
  "medium", "small", "divided", "optional", "boneless", "skinless",
  "bone-in", "skin-on", "trimmed", "halved", "quartered", "crushed",
  "ground", "whole", "toasted", "roasted", "packed", "ripe", "thin",
  "thick", "finely", "roughly", "freshly", "extra-virgin", "extra virgin",
  "unsweetened", "plain", "coarse", "fine", "young", "mature", "rinsed",
  "drained", "washed", "pressed",
];

// Build once — longest phrases first so multi-word tokens don't partially match
const DESCRIPTOR_PATTERN = new RegExp(
  "\\b(" +
    DESCRIPTOR_WORDS.slice()
      .sort((a, b) => b.length - a.length)
      .map((w) => w.replace(/[-]/g, "\\-"))
      .join("|") +
    ")\\b",
  "gi"
);

function cleanIngredientName(raw) {
  let name = raw;

  // 1. Strip parenthetical notes
  name = name.replace(/\(.*?\)/g, "");

  // 2. Strip everything after the first comma
  name = name.split(",")[0];

  // 3. Strip leading quantities and measurements
  name = name.replace(
    /^\d+[\d\/\s]*(cup|cups|tbsp|tsp|tablespoon|tablespoons|teaspoon|teaspoons|oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|liter|liters|pinch|bunch|clove|cloves|slice|slices|can|cans|package|packages|sprig|sprigs|leaf|leaves|head|heads|rib|ribs|stalk|stalks|piece|pieces|inch|inches)s?\s+/i,
    ""
  );

  // Strip a plain leading number with no unit
  name = name.replace(/^\d+\s+/, "");

  // 4. Strip size/descriptor words
  name = name.replace(DESCRIPTOR_PATTERN, "");

  // 5. Strip trailing adjectives
  name = name.replace(/\b(divided|optional|garnish|taste|serving|needed)\b/gi, "");

  // 6. Collapse whitespace and trim
  name = name.replace(/\s+/g, " ").trim();

  return name;
}

async function lookupIngredient(rawName) {
  // 1. Clean the name first
  const cleaned = cleanIngredientName(rawName);
  if (!cleaned) return null;

  // 2. Exact match on cleaned name (case-insensitive via ilike)
  const { data: exact } = await supabase
    .from("ingredient_lookup")
    .select("id, canonical_name, grocery_category")
    .ilike("name", cleaned)
    .limit(1)
    .single();

  if (exact) return exact;

  // 3. Additional descriptor stripping on the already-cleaned name
  const stripped = cleaned.replace(DESCRIPTOR_PATTERN, "").replace(/\s+/g, " ").trim();
  if (!stripped || stripped.toLowerCase() === cleaned.toLowerCase()) return null;

  const { data: strippedMatch } = await supabase
    .from("ingredient_lookup")
    .select("id, canonical_name, grocery_category")
    .ilike("name", stripped)
    .limit(1)
    .single();

  return strippedMatch ?? null;
}

export default async function matchIngredients(ingredients) {
  const results = await Promise.all(
    ingredients.map(async (ingredient) => {
      const rawName = (ingredient.name ?? "").trim();
      if (!rawName) {
        return { ...ingredient, canonical_name: null, grocery_category: null, lookup_id: null };
      }

      const match = await lookupIngredient(rawName);

      if (match) {
        return {
          ...ingredient,
          canonical_name: match.canonical_name,
          grocery_category: match.grocery_category,
          lookup_id: match.id,
        };
      }

      return { ...ingredient, canonical_name: null, grocery_category: null, lookup_id: null };
    })
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
    supabase.rpc("increment_ingredient_usage", { ids: matchedIds });
  }

  return results;
}
