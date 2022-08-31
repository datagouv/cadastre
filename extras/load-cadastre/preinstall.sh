sudo apt update
sudo apt upgrade -y
sudo apt install -y postgresql-server-dev-11 \
                    postgresql-client-11 \
                    postgresql-11-postgis-2.5-scripts

wget https://repo.anaconda.com/miniconda/Miniconda3-latest-Linux-x86_64.sh -O ~/miniconda.sh
bash ~/miniconda.sh -b -p $HOME/miniconda

eval "$($HOME/miniconda/bin/conda shell.bash hook)"
alias conda=$HOME/miniconda/bin/conda
conda init bash
conda config --set auto_activate_base false
unalias conda
source .

conda create --name gdal_latest -y
conda activate gdal_latest
conda install gdal -y

current_path=$(pwd)
cd /tmp
sudo -u postgres \
     psql -c "CREATE USER cadastre_superuser WITH SUPERUSER PASSWORD 'mypassword';"
cd $current_path
