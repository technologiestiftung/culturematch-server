#!/bin/sh

echo "nameserver 1.1.1.1" | sudo tee /etc/resolv.conf > /dev/null
sudo /etc/init.d/networking restart