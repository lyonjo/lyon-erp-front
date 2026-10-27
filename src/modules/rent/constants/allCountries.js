// Bundled at build time: no runtime API request or database migration required.
// Install: npm install world-countries
import countries from 'world-countries'

const normalized = countries
  .filter((c) => c.cca2 && c.name?.common)
  .map((c) => ({
    code: c.cca2,
    en: c.name.common,
    ar: c.translations?.ara?.common || c.name.common,
    dial: c.idd?.root
      ? `${c.idd.root}${c.idd.suffixes?.length === 1 ? c.idd.suffixes[0] : ''}`
      : '',
  }))
  .sort((a, b) => a.en.localeCompare(b.en))

// Keep values compatible with the current `customer_details.nationality` field.
export const countryOptions = normalized.map((c) => ({
  value: c.en,
  label: `${c.en} — ${c.ar}`,
  search: `${c.en} ${c.ar} ${c.code}`,
}))

// Multiple countries may legitimately share the same dial code (+1, +7, etc.).
// The existing schema stores the calling code, not the selected country ISO code.
export const dialingOptions = normalized
  .filter((c) => c.dial)
  .map((c) => ({
    value: c.dial,
    label: `${c.en} — ${c.ar} (${c.dial})`,
    search: `${c.en} ${c.ar} ${c.code} ${c.dial}`,
  }))
