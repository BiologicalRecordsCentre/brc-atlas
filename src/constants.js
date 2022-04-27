import pkg from '../package.json'

export const constants = {
    bigrCdn: 'https://unpkg.com/brc-atlas-bigr/dist',
    thisCdn: `https://cdn.jsdelivr.net/gh/biologicalrecordscentre/brc-atlas@${pkg.version}`
}

// For testing only
//constants.thisCdn = ''