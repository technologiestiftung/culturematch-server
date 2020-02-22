#!/bin/sh

EMAIL="admin@prototype.berlin"
DB_PASSWORD="api"
ADMIN_PASSWORD="admin"
URL=$1
IP=$2

sh /home/vagrant/app/bin/provision/initial.sh $DB_PASSWORD $ADMIN_PASSWORD $URL $EMAIL

# --- Configure nginx
echo "Configuring nginx..."
cat > /etc/nginx/sites-enabled/default << EOM
server {
  listen 80 default_server;
  listen [::]:80 default_server;

  root /usr/share/nginx/html;

  # Add index.php to the list if you are using PHP
  index index.html index.htm index.nginx-debian.html;

  server_name _;

  location / {
    try_files \$uri \$uri/ =404;
  }

  location ~ /.well-known {
  allow all;
  }
}
EOM

service nginx reload >/dev/null

cat > /etc/nginx/sites-enabled/api-service << EOM
server {
  listen 80;
  server_name $URL;

  client_max_body_size 200M;

  location / {
    proxy_pass http://localhost:3000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_cache_bypass \$http_upgrade;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-NginX-Proxy true;
    proxy_set_header X-Real-IP \$remote_addr;
  }
}
EOM

service nginx reload >/dev/null

echo "Setting up redis..."
sh /home/vagrant/app/bin/provision/redis.sh $DB_PASSWORD $ADMIN_PASSWORD $URL $EMAIL >/dev/null

echo "Installing nodemon and loopback-cli..."
npm i -g nodemon >/dev/null
npm i -g loopback-cli --unsafe-perm >/dev/null

echo "Copying .env file..."
cp /home/vagrant/app/.env.example /home/vagrant/app/.env >/dev/null

perl -pi -e "s/REPLACE_DB_PASSWORD/$DB_PASSWORD/g" /home/vagrant/app/.env >/dev/null
perl -pi -e "s/REPLACE_ADMIN_PASSWORD/$ADMIN_PASSWORD/g" /home/vagrant/app/.env >/dev/null
perl -pi -e "s/REPLACE_URL/http:\/\/$URL/g" /home/vagrant/app/.env >/dev/null

echo "=================================================="
echo "Yeah, I just finished provisioning a new protobox!"
echo "=================================================="
echo
echo "Database password: $DB_PASSWORD"
echo
echo "Admin email: admin@prototype.berlin"
echo "Admin password: $ADMIN_PASSWORD"
echo
echo "Don't forget to add a new entry to your hosts file:"
echo
echo "$IP     $URL"
echo
echo "=================================================="
echo "                 Have a nice day!"
echo "=================================================="
