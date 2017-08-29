# Cadastre

[![XO code style](https://img.shields.io/badge/code_style-XO-5ed9c7.svg)](https://github.com/sindresorhus/xo)

Scripts permettant de produire les données cadastre à partir des fichiers EDIGÉO mis à disposition par la DGFiP.

## Prérequis

* [Node.js](https://nodejs.org) >= 8

⚠️ L'installation de Node.js via `apt` (Ubuntu, Debian) ne permet pas immédiatement d'installer des modules `npm` globaux.
Pour éviter des problèmes de permissions, il est recommandé de suivre [ces instructions](https://docs.npmjs.com/getting-started/fixing-npm-permissions#option-2-change-npms-default-directory-to-another-directory).

* Pour France entière : un CPU avec au moins 8 coeurs, ou __beaucoup__ de patience
* Pour France entière : au moins 160 Go d'espace disponible (50 pour les fichiers sources, 50 pour l'espace de travail, 30 pour les fichiers départementaux, 30 pour les fichiers communaux)

## Installation

```bash
npm install @etalab/cadastre -g
```

Ce module installe de nombreuses dépendances, dont [GDAL](www.gdal.org). Son installation peut prendre plusieurs minutes. Si vous êtes pressé, utilisez [yarn](https://yarnpkg.com/lang/en/docs/install/).

## Téléchargement des fichiers sources EDIGÉO

_À venir_

## Production des fichiers

Actuellement la production des fichiers se déroule en 3 étapes, via 3 commandes.

### Préparation des fichiers EDIGÉO

Tout d'abord la commande `prepare` explore le dossier contenant les archives départementales EDIGÉO, les décompresse dans le dossier de travail tout en organisant les archives correspondant aux feuilles cadastrales par départements et par communes.

Pour France entière l'opération ne prend que quelques minutes sur une machine moyenne.

```bash
cadastre-builder prepare sources/ cadastre/
```

* `sources/` : dossier contenant les archives sous la forme `depXX.zip`
* `cadastre/` : dossier de travail qui sera réutilisé pour les autres commandes

### Extraction des données et production des fichiers communaux

La commande `extract` déclenche l'analyse et l'extraction de tous les départements et toutes les communes présentes dans le dossier de travail.

Les archives correspondant aux feuilles cadastrales, sous la forme `XXXX-XXX-XX-XX.tar.bz2`, sont successivement extraites dans le répertoire temporaire de votre système puis analysées par GDAL et par le parseur développé par Etalab.

Un fichier GeoJSON est produit pour chaque couche et pour chaque commune.

Pour France entière, l'opération prend environ __140 heures__ par coeur de CPU moderne disponible. Sur une machine classique il n'est pas envisageable de lancer l'opération d'un coup. Néanmoins le script gère efficacement la présence de multiples coeurs. Sur une instance Cloud de 32 coeurs louée à l'heure, le temps de traitement est inférieure à 5 heures, pour quelques euros.

```bash
cadastre-builder extract cadastre/
```

### Production des fichiers GeoJSON départementaux

La commande `merge` permet d'obtenir des fichiers GeoJSON départementaux à partir des fichiers communaux.

L'opération France entière dure quelques minutes.

```
cadastre-builder merge cadastre/
```

## TODO

* Fusionner les commandes
* Téléchargement automatique des sources
* CLI plus flexible
* Moindre consommation d'espace disque et de CPU

## Licence

MIT
