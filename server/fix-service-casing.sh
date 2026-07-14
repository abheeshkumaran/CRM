#!/bin/bash
set -e

echo "🔧 Fixing service file casing..."

# List of files to fix (uppercase -> lowercase)
FILES=(
  "AssignmentRuleService:assignmentRuleService"
  "GoalService:goalService"
  "NotificationService:notificationService"
  "SalesTargetService:salesTargetService"
  "TaskService:taskService"
  "WebhookService:webhookService"
  "WhatsAppService:whatsAppService"
)

for file_pair in "${FILES[@]}"; do
  OLD=$(echo $file_pair | cut -d: -f1)
  NEW=$(echo $file_pair | cut -d: -f2)
  
  echo "Processing $OLD -> $NEW..."
  
  # Copy content to ensure we have lowercase version
  if [ -f "src/services/${OLD}.ts" ]; then
    cp "src/services/${OLD}.ts" "src/services/${NEW}.ts"
    echo "  ✓ Created lowercase version"
  fi
  
  # Remove uppercase from Git index only (keep file locally)
  git rm --cached "src/services/${OLD}.ts" 2>/dev/null || echo "  - Already removed from Git"
  
  # Add lowercase version
  git add "src/services/${NEW}.ts"
  echo "  ✓ Added to Git"
done

echo "✅ All files processed!"
echo ""
echo "Files in Git now:"
git ls-files src/services/*.ts | sort
