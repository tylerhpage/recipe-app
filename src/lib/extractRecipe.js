const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

const EXTRACT_PROMPT = `You are processing one or more images or document pages that together make up a single recipe. Read all provided content and extract the complete recipe. Return ONLY a JSON object with this exact structure — no text before or after: { "title": "Recipe name", "base_servings": 4, "main_ingredient": "e.g. Chicken, Salmon, Lentils", "recipe_type": "one of: Breakfast, Lunch, Dinner, Dessert, Side, Beverage, Snack, Appetizer", "cuisine_type": "e.g. Italian, Mexican, American, Thai, etc.", "cook_time": "e.g. 45 minutes, 1 hour 15 minutes", "instructions": "Full original cooking instructions as a single string", "simplified_instructions": ["Step 1", "Step 2"], "ingredients": [{ "name": "full ingredient as written in the recipe, e.g. onion, finely chopped", "shopping_name": "normalized base ingredient for a shopping list — lowercase, no preparation notes, no descriptors such as chopped, diced, minced, sliced, peeled, halved, quartered, grated, shredded, divided, softened, melted, beaten, fresh, dried, ground, large, small, medium, ripe, or similar — e.g. onion", "quantity": "2", "unit": "cups" }] }`

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // result is "data:<mime>;base64,<data>" — strip the prefix
      const base64 = reader.result.split(',')[1]
      resolve(base64)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function mediaTypeForFile(file) {
  // PDF must be sent as document, images as image
  if (file.type === 'application/pdf') return { kind: 'document', mediaType: 'application/pdf' }
  return { kind: 'image', mediaType: file.type || 'image/jpeg' }
}

export async function extractRecipe(files) {
  const contentBlocks = await Promise.all(
    files.map(async (file) => {
      const base64 = await fileToBase64(file)
      const { kind, mediaType } = mediaTypeForFile(file)
      if (kind === 'document') {
        return {
          type: 'document',
          source: { type: 'base64', media_type: mediaType, data: base64 },
        }
      }
      return {
        type: 'image',
        source: { type: 'base64', media_type: mediaType, data: base64 },
      }
    })
  )

  contentBlocks.push({ type: 'text', text: EXTRACT_PROMPT })

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-opus-4-7',
      max_tokens: 4096,
      messages: [{ role: 'user', content: contentBlocks }],
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Anthropic API error ${response.status}: ${err}`)
  }

  const data = await response.json()
  const text = data.content?.[0]?.text ?? ''

  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from any surrounding text
    const match = text.match(/\{[\s\S]*\}/)
    if (match) return JSON.parse(match[0])
    throw new Error('Could not parse recipe JSON from API response')
  }
}
