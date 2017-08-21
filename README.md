# edigeo2geojson

[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

Script permettant d'extraire les géométries des fichiers EDIGéO, ainsi que la relation Numéro de voie <=> Parcelle.

## Prérequis

* Node.js >= 8

## Installation

```bash
npm install edigeo2geojson -g
```

## Utilisation

### Extraction des données pour département dans des fichiers GeoJSON

```bash
edigeo2geojson data/dep75.zip out/dep75
```

NB : Le dossier de destination doit être créé au préalable.
