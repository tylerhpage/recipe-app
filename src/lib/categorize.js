const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

export const CATEGORIES = [
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

export const CATEGORY_EMOJI = {
  'Meat & Seafood':       '🥩',
  'Dairy & Eggs':         '🥛',
  'Produce - Vegetables': '🥦',
  'Produce - Fruit':      '🍎',
  'Pantry & Dry Goods':   '🥫',
  'Spices & Condiments':  '🧂',
  'Bread & Bakery':       '🥖',
  'Frozen':               '❄️',
  'Other':                '🧴',
}

// Hardcoded lookup: lowercase ingredient name → category
// Longer / more specific keys take priority in the substring match below.
const LOOKUP = {
  // ── Meat & Seafood ────────────────────────────────────────────────────────
  'chicken breast':   'Meat & Seafood',
  'chicken thighs':   'Meat & Seafood',
  'chicken thigh':    'Meat & Seafood',
  'ground chicken':   'Meat & Seafood',
  'ground beef':      'Meat & Seafood',
  'ground turkey':    'Meat & Seafood',
  'ground pork':      'Meat & Seafood',
  'pork chops':       'Meat & Seafood',
  'pork chop':        'Meat & Seafood',
  'pork tenderloin':  'Meat & Seafood',
  'pork belly':       'Meat & Seafood',
  'beef tenderloin':  'Meat & Seafood',
  'beef chuck':       'Meat & Seafood',
  'flank steak':      'Meat & Seafood',
  'ribeye':           'Meat & Seafood',
  'sirloin':          'Meat & Seafood',
  'lamb chops':       'Meat & Seafood',
  'lamb shoulder':    'Meat & Seafood',
  'chicken':          'Meat & Seafood',
  'beef':             'Meat & Seafood',
  'pork':             'Meat & Seafood',
  'steak':            'Meat & Seafood',
  'bacon':            'Meat & Seafood',
  'ham':              'Meat & Seafood',
  'sausage':          'Meat & Seafood',
  'turkey':           'Meat & Seafood',
  'lamb':             'Meat & Seafood',
  'veal':             'Meat & Seafood',
  'duck':             'Meat & Seafood',
  'prosciutto':       'Meat & Seafood',
  'pancetta':         'Meat & Seafood',
  'salami':           'Meat & Seafood',
  'pepperoni':        'Meat & Seafood',
  'salmon':           'Meat & Seafood',
  'tuna':             'Meat & Seafood',
  'shrimp':           'Meat & Seafood',
  'prawns':           'Meat & Seafood',
  'cod':              'Meat & Seafood',
  'tilapia':          'Meat & Seafood',
  'halibut':          'Meat & Seafood',
  'mahi':             'Meat & Seafood',
  'sea bass':         'Meat & Seafood',
  'crab':             'Meat & Seafood',
  'lobster':          'Meat & Seafood',
  'scallops':         'Meat & Seafood',
  'clams':            'Meat & Seafood',
  'mussels':          'Meat & Seafood',
  'anchovies':        'Meat & Seafood',
  'anchovy':          'Meat & Seafood',
  'sardines':         'Meat & Seafood',

  // ── Dairy & Eggs ─────────────────────────────────────────────────────────
  'whole milk':        'Dairy & Eggs',
  'skim milk':         'Dairy & Eggs',
  '2% milk':          'Dairy & Eggs',
  'unsalted butter':   'Dairy & Eggs',
  'heavy cream':       'Dairy & Eggs',
  'heavy whipping cream': 'Dairy & Eggs',
  'sour cream':        'Dairy & Eggs',
  'cream cheese':      'Dairy & Eggs',
  'cheddar cheese':    'Dairy & Eggs',
  'mozzarella cheese': 'Dairy & Eggs',
  'parmesan cheese':   'Dairy & Eggs',
  'feta cheese':       'Dairy & Eggs',
  'goat cheese':       'Dairy & Eggs',
  'ricotta cheese':    'Dairy & Eggs',
  'gruyere':           'Dairy & Eggs',
  'swiss cheese':      'Dairy & Eggs',
  'brie':              'Dairy & Eggs',
  'blue cheese':       'Dairy & Eggs',
  'greek yogurt':      'Dairy & Eggs',
  'plain yogurt':      'Dairy & Eggs',
  'half and half':     'Dairy & Eggs',
  'condensed milk':    'Dairy & Eggs',
  'evaporated milk':   'Dairy & Eggs',
  'buttermilk':        'Dairy & Eggs',
  'whipped cream':     'Dairy & Eggs',
  'milk':              'Dairy & Eggs',
  'butter':            'Dairy & Eggs',
  'cream':             'Dairy & Eggs',
  'cheddar':           'Dairy & Eggs',
  'mozzarella':        'Dairy & Eggs',
  'parmesan':          'Dairy & Eggs',
  'feta':              'Dairy & Eggs',
  'ricotta':           'Dairy & Eggs',
  'cheese':            'Dairy & Eggs',
  'yogurt':            'Dairy & Eggs',
  'eggs':              'Dairy & Eggs',
  'egg':               'Dairy & Eggs',
  'egg yolk':          'Dairy & Eggs',
  'egg whites':        'Dairy & Eggs',

  // ── Produce - Vegetables ─────────────────────────────────────────────────
  'red onion':         'Produce - Vegetables',
  'yellow onion':      'Produce - Vegetables',
  'white onion':       'Produce - Vegetables',
  'green onions':      'Produce - Vegetables',
  'green onion':       'Produce - Vegetables',
  'scallions':         'Produce - Vegetables',
  'scallion':          'Produce - Vegetables',
  'cherry tomatoes':   'Produce - Vegetables',
  'roma tomatoes':     'Produce - Vegetables',
  'grape tomatoes':    'Produce - Vegetables',
  'bell pepper':       'Produce - Vegetables',
  'bell peppers':      'Produce - Vegetables',
  'red pepper':        'Produce - Vegetables',
  'green pepper':      'Produce - Vegetables',
  'yellow pepper':     'Produce - Vegetables',
  'jalapeño':          'Produce - Vegetables',
  'jalapeno':          'Produce - Vegetables',
  'serrano':           'Produce - Vegetables',
  'sweet potato':      'Produce - Vegetables',
  'sweet potatoes':    'Produce - Vegetables',
  'baby spinach':      'Produce - Vegetables',
  'brussels sprouts':  'Produce - Vegetables',
  'bok choy':          'Produce - Vegetables',
  'snow peas':         'Produce - Vegetables',
  'sugar snap peas':   'Produce - Vegetables',
  'green beans':       'Produce - Vegetables',
  'string beans':      'Produce - Vegetables',
  'onion':             'Produce - Vegetables',
  'onions':            'Produce - Vegetables',
  'garlic':            'Produce - Vegetables',
  'tomato':            'Produce - Vegetables',
  'tomatoes':          'Produce - Vegetables',
  'carrot':            'Produce - Vegetables',
  'carrots':           'Produce - Vegetables',
  'celery':            'Produce - Vegetables',
  'potato':            'Produce - Vegetables',
  'potatoes':          'Produce - Vegetables',
  'broccoli':          'Produce - Vegetables',
  'cauliflower':       'Produce - Vegetables',
  'spinach':           'Produce - Vegetables',
  'kale':              'Produce - Vegetables',
  'lettuce':           'Produce - Vegetables',
  'arugula':           'Produce - Vegetables',
  'zucchini':          'Produce - Vegetables',
  'squash':            'Produce - Vegetables',
  'cucumber':          'Produce - Vegetables',
  'mushroom':          'Produce - Vegetables',
  'mushrooms':         'Produce - Vegetables',
  'eggplant':          'Produce - Vegetables',
  'asparagus':         'Produce - Vegetables',
  'corn':              'Produce - Vegetables',
  'peas':              'Produce - Vegetables',
  'leek':              'Produce - Vegetables',
  'leeks':             'Produce - Vegetables',
  'shallot':           'Produce - Vegetables',
  'shallots':          'Produce - Vegetables',
  'cabbage':           'Produce - Vegetables',
  'artichoke':         'Produce - Vegetables',
  'beet':              'Produce - Vegetables',
  'beets':             'Produce - Vegetables',
  'radish':            'Produce - Vegetables',
  'fennel':            'Produce - Vegetables',
  'parsnip':           'Produce - Vegetables',
  'turnip':            'Produce - Vegetables',
  'rutabaga':          'Produce - Vegetables',
  'kohlrabi':          'Produce - Vegetables',
  'okra':              'Produce - Vegetables',
  'endive':            'Produce - Vegetables',
  'radicchio':         'Produce - Vegetables',
  'watercress':        'Produce - Vegetables',
  'sprouts':           'Produce - Vegetables',
  'edamame':           'Produce - Vegetables',

  // ── Produce - Fruit ──────────────────────────────────────────────────────
  'lemon':             'Produce - Fruit',
  'lemons':            'Produce - Fruit',
  'lime':              'Produce - Fruit',
  'limes':             'Produce - Fruit',
  'orange':            'Produce - Fruit',
  'oranges':           'Produce - Fruit',
  'apple':             'Produce - Fruit',
  'apples':            'Produce - Fruit',
  'banana':            'Produce - Fruit',
  'bananas':           'Produce - Fruit',
  'strawberries':      'Produce - Fruit',
  'strawberry':        'Produce - Fruit',
  'blueberries':       'Produce - Fruit',
  'blueberry':         'Produce - Fruit',
  'raspberries':       'Produce - Fruit',
  'blackberries':      'Produce - Fruit',
  'grapes':            'Produce - Fruit',
  'mango':             'Produce - Fruit',
  'mangoes':           'Produce - Fruit',
  'pineapple':         'Produce - Fruit',
  'peach':             'Produce - Fruit',
  'peaches':           'Produce - Fruit',
  'pear':              'Produce - Fruit',
  'pears':             'Produce - Fruit',
  'plum':              'Produce - Fruit',
  'plums':             'Produce - Fruit',
  'avocado':           'Produce - Fruit',
  'avocados':          'Produce - Fruit',
  'grapefruit':        'Produce - Fruit',
  'kiwi':              'Produce - Fruit',
  'watermelon':        'Produce - Fruit',
  'cantaloupe':        'Produce - Fruit',
  'honeydew':          'Produce - Fruit',
  'cherries':          'Produce - Fruit',
  'cherry':            'Produce - Fruit',
  'pomegranate':       'Produce - Fruit',
  'papaya':            'Produce - Fruit',
  'passion fruit':     'Produce - Fruit',
  'fig':               'Produce - Fruit',
  'figs':              'Produce - Fruit',
  'dates':             'Produce - Fruit',
  'cranberries':       'Produce - Fruit',

  // ── Pantry & Dry Goods ───────────────────────────────────────────────────
  'extra virgin olive oil': 'Pantry & Dry Goods',
  'olive oil':         'Pantry & Dry Goods',
  'vegetable oil':     'Pantry & Dry Goods',
  'canola oil':        'Pantry & Dry Goods',
  'coconut oil':       'Pantry & Dry Goods',
  'sesame oil':        'Pantry & Dry Goods',
  'avocado oil':       'Pantry & Dry Goods',
  'all-purpose flour': 'Pantry & Dry Goods',
  'bread flour':       'Pantry & Dry Goods',
  'whole wheat flour': 'Pantry & Dry Goods',
  'almond flour':      'Pantry & Dry Goods',
  'brown sugar':       'Pantry & Dry Goods',
  'powdered sugar':    'Pantry & Dry Goods',
  'confectioners sugar': 'Pantry & Dry Goods',
  'granulated sugar':  'Pantry & Dry Goods',
  'maple syrup':       'Pantry & Dry Goods',
  'baking soda':       'Pantry & Dry Goods',
  'baking powder':     'Pantry & Dry Goods',
  'cocoa powder':      'Pantry & Dry Goods',
  'chocolate chips':   'Pantry & Dry Goods',
  'dark chocolate':    'Pantry & Dry Goods',
  'vanilla extract':   'Pantry & Dry Goods',
  'white rice':        'Pantry & Dry Goods',
  'brown rice':        'Pantry & Dry Goods',
  'jasmine rice':      'Pantry & Dry Goods',
  'basmati rice':      'Pantry & Dry Goods',
  'arborio rice':      'Pantry & Dry Goods',
  'chicken broth':     'Pantry & Dry Goods',
  'beef broth':        'Pantry & Dry Goods',
  'vegetable broth':   'Pantry & Dry Goods',
  'chicken stock':     'Pantry & Dry Goods',
  'beef stock':        'Pantry & Dry Goods',
  'canned tomatoes':   'Pantry & Dry Goods',
  'crushed tomatoes':  'Pantry & Dry Goods',
  'diced tomatoes':    'Pantry & Dry Goods',
  'tomato paste':      'Pantry & Dry Goods',
  'tomato sauce':      'Pantry & Dry Goods',
  'coconut milk':      'Pantry & Dry Goods',
  'black beans':       'Pantry & Dry Goods',
  'kidney beans':      'Pantry & Dry Goods',
  'cannellini beans':  'Pantry & Dry Goods',
  'chickpeas':         'Pantry & Dry Goods',
  'lentils':           'Pantry & Dry Goods',
  'soy sauce':         'Pantry & Dry Goods',
  'fish sauce':        'Pantry & Dry Goods',
  'worcestershire sauce': 'Pantry & Dry Goods',
  'apple cider vinegar': 'Pantry & Dry Goods',
  'white wine vinegar': 'Pantry & Dry Goods',
  'balsamic vinegar':  'Pantry & Dry Goods',
  'red wine vinegar':  'Pantry & Dry Goods',
  'rice vinegar':      'Pantry & Dry Goods',
  'almonds':           'Pantry & Dry Goods',
  'walnuts':           'Pantry & Dry Goods',
  'cashews':           'Pantry & Dry Goods',
  'peanuts':           'Pantry & Dry Goods',
  'pecans':            'Pantry & Dry Goods',
  'pine nuts':         'Pantry & Dry Goods',
  'peanut butter':     'Pantry & Dry Goods',
  'almond butter':     'Pantry & Dry Goods',
  'tahini':            'Pantry & Dry Goods',
  'breadcrumbs':       'Pantry & Dry Goods',
  'panko':             'Pantry & Dry Goods',
  'cornstarch':        'Pantry & Dry Goods',
  'cornmeal':          'Pantry & Dry Goods',
  'active dry yeast':  'Pantry & Dry Goods',
  'instant yeast':     'Pantry & Dry Goods',
  'rolled oats':       'Pantry & Dry Goods',
  'quick oats':        'Pantry & Dry Goods',
  'flour':             'Pantry & Dry Goods',
  'sugar':             'Pantry & Dry Goods',
  'honey':             'Pantry & Dry Goods',
  'rice':              'Pantry & Dry Goods',
  'pasta':             'Pantry & Dry Goods',
  'spaghetti':         'Pantry & Dry Goods',
  'penne':             'Pantry & Dry Goods',
  'fettuccine':        'Pantry & Dry Goods',
  'rigatoni':          'Pantry & Dry Goods',
  'linguine':          'Pantry & Dry Goods',
  'noodles':           'Pantry & Dry Goods',
  'oats':              'Pantry & Dry Goods',
  'beans':             'Pantry & Dry Goods',
  'stock':             'Pantry & Dry Goods',
  'vinegar':           'Pantry & Dry Goods',
  'nuts':              'Pantry & Dry Goods',
  'seeds':             'Pantry & Dry Goods',
  'yeast':             'Pantry & Dry Goods',
  'oil':               'Pantry & Dry Goods',
  'chocolate':         'Pantry & Dry Goods',

  // ── Spices & Condiments ──────────────────────────────────────────────────
  'kosher salt':       'Spices & Condiments',
  'sea salt':          'Spices & Condiments',
  'black pepper':      'Spices & Condiments',
  'white pepper':      'Spices & Condiments',
  'smoked paprika':    'Spices & Condiments',
  'sweet paprika':     'Spices & Condiments',
  'chili powder':      'Spices & Condiments',
  'cayenne pepper':    'Spices & Condiments',
  'red pepper flakes': 'Spices & Condiments',
  'garlic powder':     'Spices & Condiments',
  'onion powder':      'Spices & Condiments',
  'italian seasoning': 'Spices & Condiments',
  'dried oregano':     'Spices & Condiments',
  'dried thyme':       'Spices & Condiments',
  'dried basil':       'Spices & Condiments',
  'dried rosemary':    'Spices & Condiments',
  'bay leaves':        'Spices & Condiments',
  'bay leaf':          'Spices & Condiments',
  'ground cumin':      'Spices & Condiments',
  'ground coriander':  'Spices & Condiments',
  'ground ginger':     'Spices & Condiments',
  'ground cinnamon':   'Spices & Condiments',
  'ground nutmeg':     'Spices & Condiments',
  'ground cloves':     'Spices & Condiments',
  'ground turmeric':   'Spices & Condiments',
  'curry powder':      'Spices & Condiments',
  'garam masala':      'Spices & Condiments',
  'five spice':        'Spices & Condiments',
  'dijon mustard':     'Spices & Condiments',
  'whole grain mustard': 'Spices & Condiments',
  'lemon juice':       'Spices & Condiments',
  'lime juice':        'Spices & Condiments',
  'hot sauce':         'Spices & Condiments',
  'sriracha':          'Spices & Condiments',
  'hoisin sauce':      'Spices & Condiments',
  'oyster sauce':      'Spices & Condiments',
  'teriyaki sauce':    'Spices & Condiments',
  'ranch dressing':    'Spices & Condiments',
  'balsamic glaze':    'Spices & Condiments',
  'salt':              'Spices & Condiments',
  'pepper':            'Spices & Condiments',
  'cumin':             'Spices & Condiments',
  'paprika':           'Spices & Condiments',
  'cayenne':           'Spices & Condiments',
  'turmeric':          'Spices & Condiments',
  'cinnamon':          'Spices & Condiments',
  'oregano':           'Spices & Condiments',
  'thyme':             'Spices & Condiments',
  'rosemary':          'Spices & Condiments',
  'basil':             'Spices & Condiments',
  'parsley':           'Spices & Condiments',
  'cilantro':          'Spices & Condiments',
  'dill':              'Spices & Condiments',
  'nutmeg':            'Spices & Condiments',
  'ginger':            'Spices & Condiments',
  'mustard':           'Spices & Condiments',
  'ketchup':           'Spices & Condiments',
  'mayonnaise':        'Spices & Condiments',
  'mayo':              'Spices & Condiments',
  'salsa':             'Spices & Condiments',
  'coriander':         'Spices & Condiments',
  'cardamom':          'Spices & Condiments',
  'allspice':          'Spices & Condiments',
  'cloves':            'Spices & Condiments',
  'saffron':           'Spices & Condiments',
  'mint':              'Spices & Condiments',
  'sage':              'Spices & Condiments',
  'tarragon':          'Spices & Condiments',
  'chives':            'Spices & Condiments',
  'marjoram':          'Spices & Condiments',

  // ── Bread & Bakery ───────────────────────────────────────────────────────
  'white bread':       'Bread & Bakery',
  'whole wheat bread': 'Bread & Bakery',
  'sourdough bread':   'Bread & Bakery',
  'pita bread':        'Bread & Bakery',
  'burger buns':       'Bread & Bakery',
  'hot dog buns':      'Bread & Bakery',
  'bread':             'Bread & Bakery',
  'baguette':          'Bread & Bakery',
  'rolls':             'Bread & Bakery',
  'pita':              'Bread & Bakery',
  'tortilla':          'Bread & Bakery',
  'tortillas':         'Bread & Bakery',
  'naan':              'Bread & Bakery',
  'croissant':         'Bread & Bakery',
  'sourdough':         'Bread & Bakery',
  'bagel':             'Bread & Bakery',
  'bagels':            'Bread & Bakery',
  'english muffin':    'Bread & Bakery',
  'english muffins':   'Bread & Bakery',
  'puff pastry':       'Bread & Bakery',
  'pie crust':         'Bread & Bakery',
  'pizza dough':       'Bread & Bakery',
  'flatbread':         'Bread & Bakery',
  'lavash':            'Bread & Bakery',

  // ── Frozen ───────────────────────────────────────────────────────────────
  'frozen peas':       'Frozen',
  'frozen corn':       'Frozen',
  'frozen broccoli':   'Frozen',
  'frozen spinach':    'Frozen',
  'frozen berries':    'Frozen',
  'frozen edamame':    'Frozen',
  'frozen shrimp':     'Frozen',
  'ice cream':         'Frozen',
  'frozen yogurt':     'Frozen',
  'frozen pie':        'Frozen',
}

// Returns the best matching category from the lookup, or null if not found.
// Longer / more specific keys take priority.
function lookupCategory(name) {
  const lower = name.toLowerCase().trim()
  if (LOOKUP[lower]) return LOOKUP[lower]
  // Sort by key length descending so longer phrases win
  const keys = Object.keys(LOOKUP).sort((a, b) => b.length - a.length)
  for (const key of keys) {
    if (lower.includes(key)) return LOOKUP[key]
  }
  return null
}

// Calls the Anthropic API to categorize a batch of unknown ingredient names.
async function batchCategorize(names) {
  const prompt =
    `Categorize each ingredient into exactly one of these categories: ${CATEGORIES.join(', ')}.\n` +
    `Return ONLY a JSON array of strings, one category per ingredient, in the same order as the input. No other text.\n` +
    `Ingredients: ${JSON.stringify(names)}`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error(`Anthropic API error ${response.status}`)
  const data = await response.json()
  const text = data.content?.[0]?.text ?? '[]'

  try {
    const parsed = JSON.parse(text)
    if (Array.isArray(parsed)) return parsed
  } catch { /* fall through */ }

  // Try to extract a JSON array from any surrounding text
  const match = text.match(/\[[\s\S]*?\]/)
  if (match) {
    try { return JSON.parse(match[0]) } catch { /* fall through */ }
  }

  return names.map(() => 'Other')
}

/**
 * Attach a `.category` field to each item object (must have `.name`).
 * Items already matching the hardcoded lookup are resolved locally;
 * any remaining unknowns are batched into a single Anthropic API call.
 *
 * @param {Array<{name: string, [key: string]: any}>} items
 * @returns {Promise<Array>} same items with `.category` populated
 */
export async function categorizeItems(items) {
  const result = items.map(item => ({ ...item, category: item.category ?? lookupCategory(item.name) }))
  const unknowns = result.filter(r => !r.category)

  if (unknowns.length > 0) {
    try {
      const categories = await batchCategorize(unknowns.map(u => u.name))
      let i = 0
      for (const item of result) {
        if (!item.category) item.category = categories[i++] ?? 'Other'
      }
    } catch {
      for (const item of result) {
        if (!item.category) item.category = 'Other'
      }
    }
  }

  return result
}

/**
 * Categorize a single ingredient name.
 * Checks the hardcoded lookup first; falls back to the API.
 */
export async function categorizeOne(name) {
  const cat = lookupCategory(name)
  if (cat) return cat
  try {
    const results = await batchCategorize([name])
    return results[0] ?? 'Other'
  } catch {
    return 'Other'
  }
}
