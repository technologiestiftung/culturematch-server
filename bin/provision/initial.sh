#!/bin/sh

export LC_ALL=en_US.UTF-8

# --- Set hostname
if [ -n "$5" ]; then
  echo "Setting hostname to $5..."
  sudo hostnamectl set-hostname $5 >/dev/null
fi

# --- Install Dependencies
echo "Running apt-get update and apt-get upgrade..."
add-apt-repository ppa:certbot/certbot -y >/dev/null
DEBIAN_FRONTEND=noninteractive apt-get update -yq >/dev/null
DEBIAN_FRONTEND=noninteractive apt-get upgrade -yq >/dev/null

echo "Installing dependencies..."
apt-get install -y build-essential >/dev/null
apt-get install -y graphicsmagick >/dev/null
apt-get install -y tcl >/dev/null
apt-get install -y software-properties-common >/dev/null
apt-get install -y nginx >/dev/null
apt-get install -y git >/dev/null
apt-get install -y python-certbot-nginx >/dev/null

echo "Installing node 10..."
curl -sL https://deb.nodesource.com/setup_10.x | sudo -E bash - >/dev/null
apt-get install -y nodejs >/dev/null

echo "Installing pm2..."
npm install -g pm2 >/dev/null
pm2 startup systemd >/dev/null

# --- Use non-root user
echo "Creating deploy user..."
useradd deploy >/dev/null
mkdir /home/deploy >/dev/null
mkdir /home/deploy/app >/dev/null
mkdir /home/deploy/.ssh >/dev/null
chmod 700 /home/deploy/.ssh >/dev/null
cp /root/.ssh/authorized_keys /home/deploy/.ssh/ >/dev/null
chmod 400 /home/deploy/.ssh/authorized_keys >/dev/null
chown deploy:deploy /home/deploy -R >/dev/null

# --- Database
echo "Installing PostgreSQL 10..."
sudo sh -c "echo 'deb http://apt.postgresql.org/pub/repos/apt/ `lsb_release -c -s`-pgdg main' >> /etc/apt/sources.list.d/pgdg.list" >/dev/null
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add - >/dev/null
DEBIAN_FRONTEND=noninteractive sudo apt-get update -yq >/dev/null
sudo apt-get install postgresql-10 -y >/dev/null

sudo -u postgres sh -c "psql -c \"CREATE USER api WITH PASSWORD '$1';\"" >/dev/null
sudo -u postgres sh -c "psql -c \"CREATE DATABASE api;\"" >/dev/null
sudo -u postgres sh -c "psql -c \"GRANT ALL PRIVILEGES ON DATABASE api TO api;\"" >/dev/null
