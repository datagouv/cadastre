/* eslint camelcase: off */

const {communes, sections, feuilles, parcelles, batiments, lieux_dits, subdivisions_fiscales, prefixes_sections} = {
  communes: [
    {name: 'id', type: 'character', length: 5},
    {name: 'nom', type: 'character', length: 80},
    {name: 'created', type: 'date'},
    {name: 'updated', type: 'date'},
  ],
  sections: [
    {name: 'id', type: 'character', length: 10},
    {name: 'commune', type: 'character', length: 5},
    {name: 'prefixe', type: 'character', length: 3},
    {name: 'code', type: 'character', length: 2},
    {name: 'created', type: 'date'},
    {name: 'updated', type: 'date'},
  ],
  feuilles: [
    {name: 'id', type: 'character', length: 12},
    {name: 'commune', type: 'character', length: 5},
    {name: 'prefixe', type: 'character', length: 3},
    {name: 'section', type: 'character', length: 2},
    {name: 'numero', type: 'character', length: 2},
    {name: 'qualite', type: 'character', length: 2},
    {name: 'modeConfection', type: 'character', length: 2},
    {name: 'echelle', type: 'number', length: 6, precision: 0},
    {name: 'created', type: 'date'},
    {name: 'updated', type: 'date'},
  ],
  parcelles: [
    {name: 'id', type: 'character', length: 14},
    {name: 'commune', type: 'character', length: 5},
    {name: 'prefixe', type: 'character', length: 3},
    {name: 'section', type: 'character', length: 2},
    {name: 'numero', type: 'character', length: 4},
    {name: 'contenance', type: 'number', length: 12, precision: 0},
    {name: 'created', type: 'date'},
    {name: 'updated', type: 'date'},
  ],
  batiments: [
    {name: 'commune', type: 'character', length: 5},
    {name: 'nom', type: 'character', length: 80},
    {name: 'type', type: 'character', length: 2},
    {name: 'created', type: 'date'},
    {name: 'updated', type: 'date'},
  ],
  lieux_dits: [
    {name: 'commune', type: 'character', length: 5},
    {name: 'nom', type: 'character', length: 80},
    {name: 'created', type: 'date'},
    {name: 'updated', type: 'date'},
  ],
  subdivisions_fiscales: [
    {name: 'parcelle', type: 'character', length: 14},
    {name: 'lettre', type: 'character', length: 1},
    {name: 'created', type: 'date'},
    {name: 'updated', type: 'date'},
  ],
  prefixes_sections: [
    {name: 'id', type: 'character', length: 6},
    {name: 'commune', type: 'character', length: 5},
    {name: 'prefixe', type: 'character', length: 3},
    {name: 'ancienne', type: 'character', length: 5},
    {name: 'nom', type: 'character', length: 80},
  ],
}

export {communes, sections, feuilles, parcelles, batiments, lieux_dits, subdivisions_fiscales, prefixes_sections}
