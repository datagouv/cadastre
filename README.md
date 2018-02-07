# Cadastre

[![npm version](https://badge.fury.io/js/%40etalab%2Fcadastre.svg)](https://badge.fury.io/js/%40etalab%2Fcadastre)
[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

Scripts permettant de préparer les données cadastrales diffusées par Etalab.

## Prérequis

* [Node.js](https://nodejs.org) >= 8
* [yarn](https://yarnpkg.com/lang/en/docs/install/)

* Pour France entière : un CPU avec au moins 16 coeurs, ou __beaucoup__ de patience
* Pour France entière : au moins 160 Go d'espace disponible (50 pour les fichiers sources, 50 pour l'espace de travail, 30 pour les fichiers départementaux, 30 pour les fichiers communaux)

## Installation

```bash
yarn global add @etalab/cadastre
```

## Données sources

Pour produire la totalité des fichiers, il est nécessaire de se procurer :

* Les archives départementales brutes PCI/EDIGÉO, PCI/TIFF et PCI/DXF mises à disposition par la DGFiP (par convention)
* Le [Référentiel Topographique Simplifié](https://www.data.gouv.fr/fr/datasets/59d2c07888ee3814dbdaf501/) et les [données cadastrales](https://www.data.gouv.fr/fr/datasets/5a1572c9c751df784fb348fd/) mis à disposition par l'[Eurométropole de Strasbourg](https://www.data.gouv.fr/fr/organizations/strasbourg-eurometropole/)

Pour ne générer que les données GeoJSON, les données PCI/EDIGÉO par feuille telles que [diffusées par Etalab](https://cadastre.data.gouv.fr/data/dgfip-pci-vecteur/latest/edigeo/) remplacent les archives brutes ne pouvant être obtenues que par convention.

## Production des fichiers

Actuellement la production des fichiers se déroule en 4 étapes, via 4 commandes.

### Préparation des fichiers PCI

Tout d'abord la commande `import-pci` explore le dossier contenant les archives départementales PCI, les décompresse et organise leur contenu pour la diffusion. Cette commande supporte à la fois les données PCI Vecteur et PCI Image.

L'import du PCI Vecteur au format DXF doit être fait séparément (facultatif mais nécessaire à la diffusion officielle).

Pour France entière l'opération ne prend que quelques minutes sur une machine moyenne.

```bash
# EDIGÉO
cadastre-builder import-pci --bundle edigeo sources-edigeo/ dist/

# DXF-CC
cadastre-builder import-pci --bundle dxf-cc sources-dxf-cc/ dist/
```

* `sources-edigeo/` : dossier contenant les archives sources sous la forme `******depXX.zip`
* `sources-dxf/` : dossier contenant les archives sources DXF sous la forme `******depXX.zip`
* `dist/` : dossier de travail qui contiendra les données de sortie

Les types de bundle supportés sont : `edigeo`, `edigeo-cc`, `dxf` et `dxf-cc`.

### Extraction des données du PCI Vecteur et production des fichiers communaux

La commande `extract-pci` déclenche l'analyse et l'extraction de tous les départements et toutes les communes présentes dans le dossier de travail.

Les archives correspondant aux feuilles cadastrales, sous la forme `XXXX-XXX-XX-XX.tar.bz2`, sont successivement extraites dans le répertoire temporaire de votre système puis analysées par le [parser développé par Etalab](https://github.com/etalab/edigeo-parser).

Un fichier GeoJSON est produit pour chaque couche et pour chaque commune.

Pour France entière, l'opération prend environ __240 heures__ par coeur de CPU moderne disponible. Néanmoins le script gère efficacement la présence de multiples coeurs.
Sur une machine dédiée avec 48 coeurs le traitement prend environ 5 heures et 30 minutes.

```bash
cadastre-builder extract-pci dist/
```

NB : Les objets bruts sont systématiquement produits et placés dans un dossier `raw`.

### Extraction des données cadastrales de l'EMS et production des fichiers communaux

La commande `extract-ems` déclenche l'analyse et l'extraction des données cadastrales mises à disposition par l'Eurométropole de Strasbourg..

Un fichier GeoJSON est produit pour chaque couche résultante et pour chaque commune.

L'opération dure moins de 5 minutes.

```bash
cadastre-builder extract-ems --rts chemin/vers/BD-Ref-2000.zip --parcelles chemin/vers/parcelles.zip --sections chemin/vers/sections.zip dist/
```

Les paramètres `--parcelles` et `--sections` sont facultatifs. En leur absence, ce sont les géométries du Référentiel Topographique Simplifié qui sont prises en compte.

### Production des fichiers GeoJSON départementaux

La commande `merge` permet d'obtenir des fichiers GeoJSON départementaux à partir des fichiers communaux.

L'opération France entière dure environ 30 minutes.

```
cadastre-builder merge dist/
```

## Licence

MIT
