depts=("01" "02" "03" "04" "05" "06" "07" "08" "09" "10" "11" "12" "13" "14" "15" "16" "17" "18" "19" "21" "22" "23" "24" "25" "26" "27" "28" "29" "2A" "2B" "30" "31" "32" "33" "34" "35" "36" "37" "38" "39" "40" "41" "42" "43" "44" "45" "46" "47" "48" "49" "50" "51" "52" "53" "54" "55" "56" "57" "58" "59" "60" "61" "62" "63" "64" "65" "66" "67" "68" "69" "70" "71" "72" "73" "74" "75" "76" "77" "78" "79" "80" "81" "82" "83" "84" "85" "86" "87" "88" "89" "90" "91" "92" "93" "94" "95" "971" "972" "973" "974" "976")

PGHOST="${PGHOST:-localhost}"
PGPORT="${PGPORT:-5432}"
PGDATABASE_DEFAULT=postgres
PGUSER=cadastre_superuser
PGPASSWORD=mypassword
PGDATABASE=cadastre

millesime=2022-04-01
baseurl="https://cadastre.data.gouv.fr/data/etalab-cadastre/${millesime}/geojson/departements"
categories=("batiments" "communes" "feuilles" "lieux_dits" "parcelles" "prefixes_sections" "sections" "subdivisions_fiscales")
CONNECTION_STRING_DEFAULT="host=${PGHOST} port=${PGPORT} dbname=${PGDATABASE_DEFAULT} user=${PGUSER} password=${PGPASSWORD}"
CONNECTION_STRING="host=${PGHOST} port=${PGPORT} dbname=${PGDATABASE} user=${PGUSER} password=${PGPASSWORD}"
target_schema=$(echo millesime_$(echo $millesime | tr '-' '_'))

echo "SELECT 'CREATE DATABASE ${PGDATABASE}' WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = '${PGDATABASE}')\gexec" | psql "$CONNECTION_STRING_DEFAULT"
psql "$CONNECTION_STRING" -c "CREATE SCHEMA IF NOT EXISTS ${target_schema}"
psql "$CONNECTION_STRING" -c "CREATE EXTENSION IF NOT EXISTS postgis"


mkdir $millesime
cd $millesime
for category in "${categories[@]}";
  do for i in "${!depts[@]}";
       do dept=${depts[$i]}
          echo "${baseurl}/${dept}/cadastre-${dept}-${category}.json.gz"
          wget "${baseurl}/${dept}/cadastre-${dept}-${category}.json.gz"
          if [ "$i" == "0" ]
          then
            ogr2ogr -f "PostgreSQL" PG:"$CONNECTION_STRING" \
                    -lco OVERWRITE=yes \
                    -lco SCHEMA="${target_schema}" \
                    -lco SPATIAL_INDEX=GIST \
                    -lco GEOMETRY_NAME=geom \
                    -gt 65536 \
                    --config PG_USE_COPY YES \
                    -nlt PROMOTE_TO_MULTI \
                    -nln $category \
                    "/vsigzip/cadastre-${dept}-${category}.json.gz";
          else
            ogr2ogr -append -update \
                    -f "PostgreSQL" PG:"${CONNECTION_STRING} active_schema=${target_schema}" \
                    -gt 65536 \
                    --config PG_USE_COPY YES \
                    -nlt PROMOTE_TO_MULTI \
                    -nln $category \
                    "/vsigzip/cadastre-${dept}-${category}.json.gz";
          fi
     done;
done;
cd ..
rm -rf $millesime

for category in "${categories[@]}";
  do dept=${depts[$i]}
    echo "Fix data validity ${category} - $(date +"%Y-%m-%dT%H:%M:%S%:z")"
    psql "$CONNECTION_STRING" \
    -c "UPDATE ${target_schema}.${category}
    SET geom = CASE
      WHEN ST_GeometryType(ST_MakeValid(geom)) IN ('ST_GeometryCollection', 'ST_MultiLineString')
        THEN ST_Multi(ST_CollectionExtract(ST_ForceCollection(ST_MakeValid(geom)),3))
      ELSE ST_Multi(ST_MakeValid(geom))
    END
    WHERE NOT St_IsValid(geom);"
    echo "End data validity ${category} - $(date +"%Y-%m-%dT%H:%M:%S%:z")"
done;

