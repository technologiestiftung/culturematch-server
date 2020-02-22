#!/bin/sh

mkdir -p ~/database-backups

ENV=$1
PROJECT=$2
NUMBER_OF_BACKUPS=$3

if [ -z "$NUMBER_OF_BACKUPS" ];
  then
    echo "var is unset";
    NUMBER_OF_BACKUPS=30
  else
    echo "var is set to '$NUMBER_OF_BACKUPS'";
fi

TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
FILENAME=~/database-backups/${TIMESTAMP}_${PROJECT}_${ENV}.sql

sudo -u postgres pg_dump api > $FILENAME

echo "Created new database backup: ${FILENAME}"

NUMBER=$(($NUMBER_OF_BACKUPS + 1))

echo $NUMBER_OF_BACKUPS
echo $NUMBER

cd ~/database-backups
ls -tp | grep -v '/$' | tail -n +$NUMBER | xargs -I {} rm -- {}