#!/bin/bash
set -e

echo "🔧 Fixing import casing in all files..."

cd "$(dirname "$0")/.."

# Fix imports in controllers
find src/controllers -name "*.ts" -type f -exec sed -i "s|'../services/WebhookService'|'../services/webhookService'|g" {} \;
find src/controllers -name "*.ts" -type f -exec sed -i "s|'../services/GoalService'|'../services/goalService'|g" {} \;
find src/controllers -name "*.ts" -type f -exec sed -i "s|'../services/AssignmentRuleService'|'../services/assignmentRuleService'|g" {} \;
find src/controllers -name "*.ts" -type f -exec sed -i "s|'../services/SalesTargetService'|'../services/salesTargetService'|g" {} \;
find src/controllers -name "*.ts" -type f -exec sed -i "s|'../services/WhatsAppService'|'../services/whatsAppService'|g" {} \;
find src/controllers -name "*.ts" -type f -exec sed -i "s|'../services/NotificationService'|'../services/notificationService'|g" {} \;
find src/controllers -name "*.ts" -type f -exec sed -i "s|'../services/TaskService'|'../services/taskService'|g" {} \;

# Fix imports in services
find src/services -name "*.ts" -type f -exec sed -i "s|'./WebhookService'|'./webhookService'|g" {} \;
find src/services -name "*.ts" -type f -exec sed -i "s|'./GoalService'|'./goalService'|g" {} \;
find src/services -name "*.ts" -type f -exec sed -i "s|'./AssignmentRuleService'|'./assignmentRuleService'|g" {} \;
find src/services -name "*.ts" -type f -exec sed -i "s|'./SalesTargetService'|'./salesTargetService'|g" {} \;
find src/services -name "*.ts" -type f -exec sed -i "s|'./WhatsAppService'|'./whatsAppService'|g" {} \;
find src/services -name "*.ts" -type f -exec sed -i "s|'./NotificationService'|'./notificationService'|g" {} \;
find src/services -name "*.ts" -type f -exec sed -i "s|'./TaskService'|'./taskService'|g" {} \;

echo "✅ Import casing fixed!"
