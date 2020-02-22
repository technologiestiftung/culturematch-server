#!/bin/sh

export LC_ALL=en_US.UTF-8

# --- Configure Firewall
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable
ufw status
