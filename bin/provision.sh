#!/bin/sh

EMAIL="admin@prototype.berlin"
DB_PASSWORD=$(openssl rand -base64 32 | tr -dc '[:alnum:]\n\r')
ADMIN_PASSWORD=$(openssl rand -base64 32 | tr -dc '[:alnum:]\n\r')

echo "Please enter the URL of the new environment:"
read URL

echo "Please enter the preferred hostname (projectname-enironment) or press ENTER:"
read HOSTNAME

ssh root@$URL "bash -s $DB_PASSWORD $ADMIN_PASSWORD $URL $EMAIL $HOSTNAME" < ./bin/provision/initial.sh

echo "Setting up nginx..."
ssh root@$URL "bash -s $DB_PASSWORD $ADMIN_PASSWORD $URL $EMAIL" < ./bin/provision/nginx.sh >/dev/null

echo "Setting up certbot..."
ssh root@$URL "bash -s $DB_PASSWORD $ADMIN_PASSWORD $URL $EMAIL" < ./bin/provision/certbot.sh >/dev/null

echo "Setting up firewall..."
ssh root@$URL "bash -s $DB_PASSWORD $ADMIN_PASSWORD $URL $EMAIL" < ./bin/provision/firewall.sh >/dev/null

echo "Setting up redis..."
ssh root@$URL "bash -s $DB_PASSWORD $ADMIN_PASSWORD $URL $EMAIL" < ./bin/provision/redis.sh >/dev/null

echo "Setting up .env file..."
scp .env.example root@$URL:"/home/deploy/app"

ssh root@$URL "bash -s $DB_PASSWORD $ADMIN_PASSWORD $URL $EMAIL" < ./bin/provision/dotenv.sh >/dev/null

echo "====================================================="
echo "Yeah, I just finished provisioning a new environment!"
echo "====================================================="
echo
echo "Database password: $DB_PASSWORD"
echo
echo "Admin email: $EMAIL"
echo "Admin password: $ADMIN_PASSWORD"
echo
echo "====================================================="
echo "                   Have a nice day!"
echo "====================================================="
