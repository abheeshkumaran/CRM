#!/bin/bash
set -e

echo "🔧 Fixing TypeScript compilation errors..."

cd "$(dirname "$0")/.."

# Remove remaining frontend files
echo "Removing frontend service files..."
rm -f src/services/api.ts
rm -f src/services/socketService.ts

echo "Removing frontend utility files..."
rm -f src/utils/environmentChecker.ts
rm -f src/utils/mobileBridge.ts

# Fix file casing issues by renaming to lowercase
echo "Fixing file casing issues..."

# Services
[ -f src/services/WebhookService.ts ] && mv src/services/WebhookService.ts src/services/webhookService.ts || true
[ -f src/services/GoalService.ts ] && mv src/services/GoalService.ts src/services/goalService.ts || true
[ -f src/services/AssignmentRuleService.ts ] && mv src/services/AssignmentRuleService.ts src/services/assignmentRuleService.ts || true
[ -f src/services/SalesTargetService.ts ] && mv src/services/SalesTargetService.ts src/services/salesTargetService.ts || true
[ -f src/services/WhatsAppService.ts ] && mv src/services/WhatsAppService.ts src/services/whatsAppService.ts || true
[ -f src/services/TaskService.ts ] && mv src/services/TaskService.ts src/services/taskService.ts || true
[ -f src/services/NotificationService.ts ] && mv src/services/NotificationService.ts src/services/notificationService.ts || true

echo "✅ TypeScript errors fixed!"
echo ""
echo "Remaining files in src/:"
ls -la src/
