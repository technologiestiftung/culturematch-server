#!/bin/sh

export LC_ALL=en_US.UTF-8

# --- Configure nginx
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

service nginx reload

cat > /etc/nginx/sites-enabled/api-service << EOM
server_tokens off;

server {
    listen 80;
    server_name $3;
    return 301 https://\$host\$request_uri;
}

upstream service_api {
  server localhost:3000;
}

server {
  listen 443 ssl;
  server_name $3;

  client_max_body_size 200M;

  ssl_protocols TLSv1.2;
  ssl_prefer_server_ciphers on;
  ssl_ciphers 'ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-SHA38';
  ssl_ecdh_curve secp384r1;
  ssl_session_cache shared:SSL:10m;
  ssl_session_tickets off;
  ssl_stapling on;
  ssl_stapling_verify on;
  resolver 8.8.8.8 8.8.4.4 valid=300s;
  resolver_timeout 5s;
  add_header X-Frame-Options DENY;
  add_header X-Content-Type-Options nosniff;

  location / {
    proxy_pass http://service_api;
    proxy_cache_bypass \$http_upgrade;
    proxy_http_version 1.1;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host \$host;
    proxy_set_header Host \$proxy_host;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-NginX-Proxy true;
    proxy_set_header X-Real-IP \$remote_addr;
  }

  location ^~ /.well-known {
    allow all;
    alias /usr/share/nginx/html/.well-known;
  }
}
EOM

service nginx reload
