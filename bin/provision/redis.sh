#!/bin/sh

export LC_ALL=en_US.UTF-8

# --- Install and configure redis
cd /tmp
curl -O http://download.redis.io/redis-stable.tar.gz
tar xzvf redis-stable.tar.gz
cd redis-stable
make
# make test
make install

sudo mkdir /etc/redis
sudo cp /tmp/redis-stable/redis.conf /etc/redis
sed -i 's=supervised.*=supervised systemd=' /etc/redis/redis.conf
sed -i 's=dir.*=dir /var/lib/redis=' /etc/redis/redis.conf

cat > /etc/systemd/system/redis.service << EOM
[Unit]
Description=Redis In-Memory Data Store
After=network.target

[Service]
User=redis
Group=redis
ExecStart=/usr/local/bin/redis-server /etc/redis/redis.conf
ExecStop=/usr/local/bin/redis-cli shutdown
Restart=always

[Install]
WantedBy=multi-user.target
EOM

sudo adduser --system --group --no-create-home redis
sudo mkdir /var/lib/redis
sudo chown redis:redis /var/lib/redis
sudo chmod 770 /var/lib/redis

sudo systemctl start redis
sudo systemctl status redis
sudo systemctl enable redis

