# Chargement de la base de données cadastre sous Linux

L'utilisateur par défaut est `cadastre_superuser` et le mot de passe est `mypassword`

Les tests ont été efectués sur Debian 10

Installation sur le serveur Linux

```bash
chmod +x preinstall.sh
./preinstall.sh
```

Activer conda pour avoir une version de GDAL récente

```bash
conda activate gdal_latest
```

S'il est nécessaire de nettoyer la base

```bash
current_path=$(pwd)
cd /tmp
sudo -u postgres \
     psql -c "DROP DATABASE cadastre";
cd $current_path
rm -rf 2022*
```

Test de chargement de la base en tâche de fond

```bash
conda activate gdal_latest
nohup bash -c "time ./cadastre_linux_download.sh > results.log 2>&1" >> results.log &
```

Pour vérifier qu'il n'y a pas d'erreur de validité de géométries après correction automatique

```
PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE_DEFAULT=postgres
PGUSER=cadastre_superuser
PGPASSWORD=mypassword
PGDATABASE=cadastre

millesime=2022-04-01
categories=("batiments" "communes" "feuilles" "lieux_dits" "parcelles" "prefixes_sections" "sections" "subdivisions_fiscales")
CONNECTION_STRING="host=${PGHOST} port=${PGPORT} dbname=${PGDATABASE} user=${PGUSER} password=${PGPASSWORD}"
target_schema=$(echo millesime_$(echo $millesime | tr '-' '_'))

for category in "${categories[@]}";
  do dept=${depts[$i]}
    echo "Count ${category} - $(date +"%Y-%m-%dT%H:%M:%S%:z")"
    psql "$CONNECTION_STRING" -c "SELECT count(*) FROM ${target_schema}.${category} WHERE NOT St_IsValid(geom);"
done;
```
