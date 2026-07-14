#!/bin/bash

# Database Backup Script
# This script creates daily backups of the PostgreSQL database

# Configuration
BACKUP_DIR="$HOME/database-backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/backup_$DATE.sql"
RETENTION_DAYS=7

# Database connection details from .env
DB_HOST="pypecrm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com"
DB_PORT="5432"
DB_NAME="dadcrm"
DB_USER="postgres"
DB_PASSWORD="troy1996"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "Starting database backup at $(date)"

# Create backup using pg_dump
PGPASSWORD="$DB_PASSWORD" pg_dump \
  -h "$DB_HOST" \
  -p "$DB_PORT" \
  -U "$DB_USER" \
  -d "$DB_NAME" \
  -F c \
  -f "$BACKUP_FILE" \
  --no-owner \
  --no-acl

# Check if backup was successful
if [ $? -eq 0 ]; then
    echo "✅ Backup completed successfully: $BACKUP_FILE"
    
    # Compress the backup
    gzip "$BACKUP_FILE"
    echo "✅ Backup compressed: ${BACKUP_FILE}.gz"
    
    # Get backup size
    BACKUP_SIZE=$(du -h "${BACKUP_FILE}.gz" | cut -f1)
    echo "📦 Backup size: $BACKUP_SIZE"
    
    # Remove old backups (older than RETENTION_DAYS)
    echo "🧹 Cleaning up old backups (older than $RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    
    # List remaining backups
    echo "📋 Available backups:"
    ls -lh "$BACKUP_DIR"/backup_*.sql.gz 2>/dev/null || echo "No backups found"
    
else
    echo "❌ Backup failed!"
    exit 1
fi

echo "Backup completed at $(date)"
