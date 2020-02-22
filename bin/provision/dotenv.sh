#!/bin/sh

export LC_ALL=en_US.UTF-8

# --- Create .env from .env.example and replace placeholders
cp /home/deploy/app/.env.example /home/deploy/app/.env

SESSION_SECRET=$(openssl rand -base64 32 | tr -dc '[:alnum:]\n\r')

perl -pi -e "s/REPLACE_DB_PASSWORD/$1/g" /home/deploy/app/.env
perl -pi -e "s/REPLACE_ADMIN_PASSWORD/$2/g" /home/deploy/app/.env
perl -pi -e "s/REPLACE_URL/https:\/\/$3/g" /home/deploy/app/.env
perl -pi -e "s/REPLACE_SESSION_SECRET/$SESSION_SECRET/g" /home/deploy/app/.env
