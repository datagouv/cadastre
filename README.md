# import-cadastre

Script permettant d'extraire les géométries des fichiers EDIGéO, ainsi que la relation Numéro de voie <=> Parcelle.

## Prérequis

* Node.js >= 6
* [yarn](https://yarnpkg.com) (mais ça fonctionne aussi avec npm)

## Installation

```bash
yarn
```

## Utilisation

### Extraction des données pour département dans des fichiers GeoJSON

```bash
yarn extract data/dep75.zip out/dep75
```

NB : Le dossier de destination doit être créé au préalable.
