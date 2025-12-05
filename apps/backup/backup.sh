#!/bin/sh

# Configurações
TIMESTAMP=$(date +"%Y%m%d%H%M%S")
BACKUP_FILE="backup-$TIMESTAMP.sql.gz"
S3_BUCKET="backup-financas" # Nome do seu bucket no R2

echo "Starting backup process at $(date)..."

# 1. Dump do banco de dados
echo "Dumping database..."
PGPASSWORD=$POSTGRES_PASSWORD pg_dump -h db -U $POSTGRES_USER -d $POSTGRES_DB | gzip > /tmp/$BACKUP_FILE

if [ $? -eq 0 ]; then
  echo "Database dump successful."
else
  echo "Error dumping database."
  exit 1
fi

# 2. Upload para o Cloudflare R2 (usando AWS CLI)
echo "Uploading to R2..."
aws s3 cp /tmp/$BACKUP_FILE s3://$S3_BUCKET/$BACKUP_FILE --endpoint-url $R2_ENDPOINT_URL

if [ $? -eq 0 ]; then
  echo "Upload successful."
  rm /tmp/$BACKUP_FILE
else
  echo "Error uploading to R2."
  exit 1
fi

echo "Backup process completed at $(date)."
