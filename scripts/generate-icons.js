/**
 * Generates icon-192.png and icon-512.png from the SVG sources.
 * Requires the `sharp` package: npm install -D sharp
 * Then run: node scripts/generate-icons.js
 */
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = resolve(__dirname, '../public/icons')

let sharp
try {
  sharp = (await import('sharp')).default
} catch {
  console.error('sharp is not installed. Run: npm install -D sharp')
  process.exit(1)
}

const sizes = [192, 512]

for (const size of sizes) {
  const svgPath = resolve(iconsDir, `icon-${size}.svg`)
  const pngPath = resolve(iconsDir, `icon-${size}.png`)
  const svgBuffer = readFileSync(svgPath)
  await sharp(svgBuffer).resize(size, size).png().toFile(pngPath)
  console.log(`Created ${pngPath}`)
}
