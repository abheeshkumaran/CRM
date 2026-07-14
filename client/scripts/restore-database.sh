#!/bin/bash

# Database Restore Script for PYPE
# This script restores the PostgreSQL database from a backup

# Configuration
BACKUP_DIR="./backups"
DATABASE_URL="postgresql://postgres:troy1998@pypecrm.cj0mo4q44gde.ap-south-1.rds.amazonaws.com:5432/mern_crm?sslmode=require"

echo "========================================="
echo "PYPE Database Restore"
echo "========================================="
echo ""

# List available backups
echo "Available backups:"
echo ""
ls -lht "$BACKUP_DIR"/pype_backup_* 2>/dev/null

if [ $? -ne 0 ]; then
    echo "❌ No backups found in $BACKUP_DIR"
    exit 1
fi

echo ""
echo "Enter the backup file name to restore (or 'latest' for most recent):"
read BACKUP_CHOICE

if [ "$BACKUP_CHOICE" = "latest" ]; then
    BACKUP_FILE=$(ls -t "$BACKUP_DIR"/pype_backup_*.sql.gz 2>/dev/null | head -1)
    if [ -z "$BACKUP_FILE" ]; then
        BACKUP_FILE=$(ls -t "$BACKUP_DIR"/pype_backup_*.sql 2>/dev/null | head -1)
    fi
else
    BACKUP_FILE="$BACKUP_DIR/$BACKUP_CHOICE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ Backup file not found: $BACKUP_FILE"
    exit 1
fi

echo ""
echo "⚠️  WARNING: This will REPLACE all current database data!"
echo "Backup file: $BACKUP_FILE"
echo ""
echo "Are you sure you want to continue? (yes/no)"
read CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Restore cancelled."
    exit 0
fi

echo ""
echo "Creating safety backup of current database..."
SAFETY_BACKUP="$BACKUP_DIR/pre_restore_backup_$(date +%Y%m%d_%H%M%S).sql"
pg_dump "$DATABASE_URL" > "$SAFETY_BACKUP"

if [ $? -eq 0 ]; then
    echo "✅ Safety backup created: $SAFETY_BACKUP"
    gzip "$SAFETY_BACKUP"
else
    echo "⚠️  Safety backup failed, but continuing..."
fi

echo ""
echo "Restoring database..."

# Check if backup is compressed
if [[ "$BACKUP_FILE" == *.gz ]]; then
    echo "Decompressing and restoring..."
    gunzip -c "$BACKUP_FILE" | psql "$DATABASE_URL"
else
    echo "Restoring from uncompressed backup..."
    psql "$DATABASE_URL" < "$BACKUP_FILE"
fi

if [ $? -eq 0 ]; then
    echo ""
    echo "========================================="
    echo "✅ Database restored successfully!"
    echo "========================================="
    echo ""
    echo "Restored from: $BACKUP_FILE"
    echo "Safety backup: $SAFETY_BACKUP.gz"
else
    echo ""
    echo "========================================="
    echo "❌ Restore failed!"
    echo "========================================="
    echo ""
    echo "You can restore from the safety backup:"
    echo "gunzip -c $SAFETY_BACKUP.gz | psql \$DATABASE_URL"
    exit 1
fi