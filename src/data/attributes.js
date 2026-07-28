/**
 * Attribute data for the guess grid.
 *
 * Everything the grid compares is derived from `players.js` where possible —
 * tour, country and handedness are already there, and the debut decade comes
 * from the `years` field. Only major championship counts are new.
 *
 * ⚠️ MAJORS NEED VERIFYING BEFORE LAUNCH. These were written from memory, not
 * from a source. They are right for the well-known cases (Nicklaus 18, Woods
 * 15, Sörenstam 10) but the counts for active players drift every season, and
 * a wrong number here makes the grid actively lie to players — a yellow "close"
 * on a wrong figure is worse than no grid at all. Check these against a current
 * source and correct before shipping.
 */

/** Professional major championships won. */
export const MAJORS = {
  // PGA Tour — active
  'scottie-scheffler': 4,
  'rory-mcilroy': 5,
  'jon-rahm': 2,
  'brooks-koepka': 5,
  'justin-thomas': 2,
  'jordan-spieth': 3,
  'collin-morikawa': 2,
  'xander-schauffele': 2,
  'viktor-hovland': 0,
  'bryson-dechambeau': 2,
  'dustin-johnson': 2,
  'patrick-cantlay': 0,
  'ludvig-aberg': 0,
  'tommy-fleetwood': 0,
  'shane-lowry': 1,
  'matt-fitzpatrick': 1,
  'hideki-matsuyama': 1,
  'cameron-smith': 1,
  'tony-finau': 0,
  'rickie-fowler': 0,
  'max-homa': 0,
  'wyndham-clark': 1,
  'jason-day': 1,
  'adam-scott': 1,
  'sergio-garcia': 1,
  'phil-mickelson': 6,
  'bubba-watson': 2,
  'brian-harman': 1,
  'keegan-bradley': 1,
  'sahith-theegala': 0,
  'sungjae-im': 0,
  'zach-johnson': 2,

  // LPGA
  'nelly-korda': 2,
  'lydia-ko': 3,
  'jin-young-ko': 2,
  'brooke-henderson': 2,
  'lexi-thompson': 1,
  'annika-sorenstam': 10,
  'lorena-ochoa': 2,
  'inbee-park': 7,
  'se-ri-pak': 5,
  'karrie-webb': 7,
  'michelle-wie-west': 1,
  'yani-tseng': 5,
  'charley-hull': 0,
  'minjee-lee': 3,
  'celine-boutier': 1,
  'rose-zhang': 0,
  'atthaya-thitikul': 0,
  'nancy-lopez': 3,
  'mickey-wright': 13,
  'babe-zaharias': 10,

  // Legends
  'tiger-woods': 15,
  'jack-nicklaus': 18,
  'arnold-palmer': 7,
  'gary-player': 9,
  'ben-hogan': 9,
  'sam-snead': 7,
  'bobby-jones': 7,
  'byron-nelson': 5,
  'seve-ballesteros': 5,
  'nick-faldo': 6,
  'greg-norman': 2,
  'tom-watson': 8,
  'lee-trevino': 6,
  'payne-stewart': 3,
  'ernie-els': 4,
  'fred-couples': 1,
  'vijay-singh': 3,
  'nick-price': 3,
  'johnny-miller': 2,
  'bernhard-langer': 2,
  'colin-montgomerie': 0,
  'ian-woosnam': 1,
}

/**
 * Continent per country, used for the "close" state on the country column.
 * Keys match the plain-text country names in players.js.
 */
export const CONTINENTS = {
  'United States': 'North America',
  Canada: 'North America',
  Mexico: 'North America',

  England: 'Europe',
  Scotland: 'Europe',
  Wales: 'Europe',
  'Northern Ireland': 'Europe',
  Ireland: 'Europe',
  Spain: 'Europe',
  France: 'Europe',
  Germany: 'Europe',
  Sweden: 'Europe',
  Norway: 'Europe',

  Japan: 'Asia',
  'South Korea': 'Asia',
  Taiwan: 'Asia',
  Thailand: 'Asia',

  Australia: 'Oceania',
  'New Zealand': 'Oceania',
  Fiji: 'Oceania',

  'South Africa': 'Africa',
  Zimbabwe: 'Africa',
}
