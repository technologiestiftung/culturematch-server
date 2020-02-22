#!/bin/sh

export LC_ALL=en_US.UTF-8

# --- Get SSL Certificate
certbot --nginx -d $3 --non-interactive --agree-tos -m $4
# certbot renew --dry-run
