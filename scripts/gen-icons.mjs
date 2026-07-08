// Generates the PWA icons — a vinyl record in Wet Arcade colors.
// Run: node scripts/gen-icons.mjs   (outputs committed to public/)
import sharp from 'sharp'
import { mkdirSync } from 'fs'

const record = (pad, bg) => `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512">
  <rect width="512" height="512" fill="${bg}"/>
  <circle cx="256" cy="256" r="${216 - pad}" fill="#161616"/>
  <circle cx="256" cy="256" r="${188 - pad}" fill="none" stroke="#232323" stroke-width="5"/>
  <circle cx="256" cy="256" r="${158 - pad}" fill="none" stroke="#232323" stroke-width="5"/>
  <circle cx="256" cy="256" r="${128 - pad}" fill="none" stroke="#232323" stroke-width="5"/>
  <circle cx="256" cy="256" r="${84 - pad * 0.5}" fill="#1f8a7d"/>
  <circle cx="256" cy="256" r="${80 - pad * 0.5}" fill="none" stroke="#35a893" stroke-width="3"/>
  <circle cx="256" cy="256" r="11" fill="#f7f3ea" stroke="#0e0e0e" stroke-width="3"/>
  <path d="M 256 256 m -${150 - pad},0 a ${150 - pad},${150 - pad} 0 0 1 ${(150 - pad) * 2},0"
        fill="none" stroke="rgba(255,255,255,0.10)" stroke-width="26"/>
</svg>`

mkdirSync('public', { recursive: true })
await sharp(Buffer.from(record(0, '#f7f3ea'))).resize(512, 512).png().toFile('public/icon-512.png')
await sharp(Buffer.from(record(0, '#f7f3ea'))).resize(192, 192).png().toFile('public/icon-192.png')
// maskable: turquoise full-bleed, record shrunk into the 80% safe zone
await sharp(Buffer.from(record(52, '#1f8a7d'))).resize(512, 512).png().toFile('public/icon-maskable-512.png')
await sharp(Buffer.from(record(0, '#f7f3ea'))).resize(180, 180).png().toFile('public/apple-touch-icon.png')
console.log('icons written to public/')
