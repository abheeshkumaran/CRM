#!/bin/bash
set -e

echo "🔧 Fixing service file casing..."

cd src/services

# List of files to fix
FILES=(
  "AssignmentRuleService"
  "GoalService"
  "NotificationService"
  "SalesTargetService"
  "TaskService"
  "WebhookService"
  "WhatsAppService"
)

for file in "${FILES[@]}"; do
  LOWER=$(echo "$file" | sed 's/\([A-Z]\)/\L\1/g' | sed 's/^./\L&/')
  
  echo "Processing $file -> $LOWER..."
  
  # Remove uppercase from Git index
  git rm --cached "${file}.ts" 2>/dev/null && echo "  ✓ Removed uppercase from Git" || echo "  - Not in Git"
  
  # Add lowercase version (file already exists on macOS)
  git add "${LOWER}.ts" 2>/dev/null && echo "  ✓ Added lowercase to Git" || echo "  - Already in Git"
done

cd ../..

echo "✅ All files processed!"
echo ""
echo "Files in Git now:"
git ls-files src/services/*.ts | sort
