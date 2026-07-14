#!/bin/bash

# Database Backup Script for PYPE
# This script creates automated backups of the PostgreSQL database

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/pype_backup_$DATE.sql"
RETENTION_DAYS=30

# Database connection from .env
DATABASE_URL="postgresql://postgres:troy1998@pypecrm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/mern_crm?sslmode=require"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

echo "========================================="
echo "PYPE Database Backup"
echo "========================================="
echo "Date: $(date)"
echo "Backup file: $BACKUP_FILE"
echo ""

# Create backup
echo "Creating backup..."
pg_dump "$DATABASE_URL" > "$BACKUP_FILE"

if [ $? -eq 0 ]; then
    echo "✅ Backup created successfully!"
    
    # Compress backup
    echo "Compressing backup..."
    gzip "$BACKUP_FILE"
    
    if [ $? -eq 0 ]; then
        echo "✅ Backup compressed successfully!"
        BACKUP_FILE="$BACKUP_FILE.gz"
        
        # Get file size
        SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        echo "Backup size: $SIZE"
    else
        echo "⚠️  Compression failed, keeping uncompressed backup"
    fi
    
    # Delete old backups
    echo ""
    echo "Cleaning up old backups (older than $RETENTION_DAYS days)..."
    find "$BACKUP_DIR" -name "pype_backup_*.sql.gz" -type f -mtime +$RETENTION_DAYS -delete
    find "$BACKUP_DIR" -name "pype_backup_*.sql" -type f -mtime +$RETENTION_DAYS -delete
    
    # List current backups
    echo ""
    echo "Current backups:"
    ls -lh "$BACKUP_DIR"/pype_backup_* 2>/dev/null || echo "No backups found"
    
    echo ""
    echo "========================================="
    echo "✅ Backup completed successfully!"
    echo "========================================="
    
else
    echo "❌ Backup failed!"
    exit 1
fi

# Optional: Upload to S3 or cloud storage
# Uncomment and configure if you want cloud backups
# aws s3 cp "$BACKUP_FILE" s3://your-backup-bucket/mern-crm/

echo ""
echo "To restore from this backup, run:"
echo "gunzip -c $BACKUP_FILE | psql \$DATABASE_URL"
echo ""