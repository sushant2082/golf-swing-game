/**
 * Continent per country, for the "close" state on the country column.
 *
 * Covers every country present in roster.js. A country missing from this map
 * simply never scores "near" — it degrades to an exact-match-only column
 * rather than breaking, but the merge report will show it as a gap.
 */
export const CONTINENTS = {
  // North America
  'United States': 'North America',
  Canada: 'North America',
  Mexico: 'North America',

  // South America
  Argentina: 'South America',
  Chile: 'South America',
  Colombia: 'South America',
  Paraguay: 'South America',

  // Europe
  England: 'Europe',
  Scotland: 'Europe',
  Wales: 'Europe',
  'Northern Ireland': 'Europe',
  Ireland: 'Europe',
  Spain: 'Europe',
  France: 'Europe',
  Germany: 'Europe',
  Italy: 'Europe',
  Austria: 'Europe',
  Belgium: 'Europe',
  Denmark: 'Europe',
  Finland: 'Europe',
  Norway: 'Europe',
  Sweden: 'Europe',
  Poland: 'Europe',

  // Asia
  Japan: 'Asia',
  'South Korea': 'Asia',
  Taiwan: 'Asia',
  Thailand: 'Asia',
  India: 'Asia',
  Philippines: 'Asia',

  // Oceania
  Australia: 'Oceania',
  'New Zealand': 'Oceania',
  Fiji: 'Oceania',

  // Africa
  'South Africa': 'Africa',
  Zimbabwe: 'Africa',
}
