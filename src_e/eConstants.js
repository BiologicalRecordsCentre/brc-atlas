import pkg from '../package.json'

export const constants = {
    bigrCdn: 'https://unpkg.com/brc-atlas-bigr/dist',
    thisCdn: `https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas@${pkg.version}`
}

// For testing only
//constants.thisCdn = ''

export const countriesEbms = [
    'Austria',
    'Belgium',
    'Croatia',
    'Czechia',
    'Finland',
    'France',
    'Germany',
    'Hungary',
    'Ireland',
    'Italy',
    'Luxembourg',
    'Norway',
    'Portugal',
    'Slovenia',
    'Spain',
    'Sweden',
    'Switzerland',
    'Netherlands',
    'United Kingdom',
  ]