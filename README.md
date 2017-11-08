# Cadastre

[![npm version](https://badge.fury.io/js/%40etalab%2Fcadastre.svg)](https://badge.fury.io/js/%40etalab%2Fcadastre)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

Scripts permettant de préparer les données cadastrales diffusées par Etalab.

## Prérequis

* [Node.js](https://nodejs.org) >= 8

⚠️ L'installation de Node.js via `apt` (Ubuntu, Debian) ne permet pas immédiatement d'installer des modules `npm` globaux.
Pour éviter des problèmes de permissions, il est recommandé de suivre [ces instructions](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory).

* Pour France entière : un CPU avec au moins 4 coeurs, ou __beaucoup__ de patience
* Pour France entière : au moins 160 Go d'espace disponible (50 pour les fichiers sources, 50 pour l'espace de travail, 30 pour les fichiers départementaux, 30 pour les fichiers communaux)

## Installation

```bash
npm install @etalab/cadastre -g
```

Ce module installe de nombreuses dépendances, dont [GDAL](www.gdal.org). Son installation peut prendre plusieurs minutes. Si vous êtes pressé, utilisez [yarn](https://yarnpkg.com/lang/en/docs/install/).

## Données sources

Pour produire la totalité des fichiers, il est nécessaire de se procurer :

* Les archives départementales brutes PCI/EDIGÉO, PCI/TIFF et PCI/DXF mises à disposition par la DGFiP (par convention)
* La [BD Réf 2000](https://www.data.gouv.fr/fr/datasets/bd-ref-2000-eurometropole-de-strasbourg/) mise à disposition par l'[Eurométropole de Strasbourg](https://www.data.gouv.fr/fr/organizations/strasbourg-eurometropole/)

Pour ne générer que les données GeoJSON, les données PCI/EDIGÉO par feuille telles que [diffusées par Etalab](https://cadastre.data.gouv.fr/data/dgfip-pci-vecteur/latest/edigeo/) remplacent les archives brutes ne pouvant être obtenues que par convention.

## Production des fichiers

Actuellement la production des fichiers se déroule en 4 étapes, via 4 commandes.

### Préparation des fichiers PCI

Tout d'abord la commande `import-pci` explore le dossier contenant les archives départementales PCI, les décompresse et organise leur contenu pour la diffusion. Cette commande supporte à la fois les données PCI Vecteur et PCI Image.

L'import du PCI Vecteur au format DXF doit être fait séparément (facultatif mais nécessaire à la diffusion officielle).

Pour France entière l'opération ne prend que quelques minutes sur une machine moyenne.

```bash
cadastre-builder import-pci sources/ dist/

# DXF
cadastre-builder import-pci --dxf sources-dxf/ dist/
```

* `sources/` : dossier contenant les archives sources sous la forme `******depXX.zip`
* `sources-dxf/` : dossier contenant les archives sources DXF sous la forme `******depXX.zip`
* `dist/` : dossier de travail qui contiendra les données de sortie

### Extraction des données du PCI Vecteur et production des fichiers communaux

La commande `extract-pci` déclenche l'analyse et l'extraction de tous les départements et toutes les communes présentes dans le dossier de travail.

Les archives correspondant aux feuilles cadastrales, sous la forme `XXXX-XXX-XX-XX.tar.bz2`, sont successivement extraites dans le répertoire temporaire de votre système puis analysées par GDAL et par le parseur développé par Etalab.

Un fichier GeoJSON est produit pour chaque couche et pour chaque commune.

Pour France entière, l'opération prend environ __40 heures__ par coeur de CPU moderne disponible. Néanmoins le script gère efficacement la présence de multiples coeurs.
Sur une machine dédiée avec 4 coeurs (8 threads) le traitement prend environ 10 heures.

```bash
cadastre-builder extract-pci dist/

# Mode données super-brutes (non supporté, à usage interne Etalab)
cadastre-builder extract-pci --raw dist/
```

### Extraction des données de la BD Réf 2000 et production des fichiers communaux

La commande `extract-ems` déclenche l'analyse et l'extraction des données cadastrales contenues dans la BD Réf 2000.

Un fichier GeoJSON est produit pour chaque couche résultante et pour chaque commune.

L'opération dure moins de 5 minutes.

```bash
cadastre-builder extract-ems chemin/vers/BD-Ref-2000.zip dist/
```

### Production des fichiers GeoJSON départementaux

La commande `merge` permet d'obtenir des fichiers GeoJSON départementaux à partir des fichiers communaux.

L'opération France entière dure plus d'une heure.

```
cadastre-builder merge dist/
```

## Licence

MIT
