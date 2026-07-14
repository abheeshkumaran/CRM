#!/bin/bash

# Manual Deployment Script for Dad CRM Backend
# This script deploys the latest code to EC2 server

set -e  # Exit on any error

echo "🚀 Starting Manual Deployment to EC2..."
echo ""

# Configuration
EC2_HOST="65.2.29.78"
EC2_USER="ubuntu"
SSH_KEY="$(dirname "$0")/crm-key.pem"

# Check if SSH key exists
if [ ! -f "$SSH_KEY" ]; then
    echo "❌ SSH key not found at $SSH_KEY"
    echo "Please ensure the SSH key exists"
    exit 1
fi

echo "📡 Connecting to EC2 server..."
echo ""

# Deploy via SSH
ssh -i "$SSH_KEY" "$EC2_USER@$EC2_HOST" "DEPLOY_ARGS='$*' bash -s" << 'ENDSSH'
    set -e
    
    echo "📂 Navigating to backend directory..."
    cd ~/backend || { echo "❌ Backend directory not found!"; exit 1; }
    
    echo "🔄 Pulling latest code from GitHub..."
    # Remove stale git lock if it exists
    [ -f .git/index.lock ] && rm -f .git/index.lock
    
    # Force clean state
    git fetch origin main
    git reset --hard origin/main
    
    # Auto-tune database connection pool for db.t3.small capacity
    if [ -f .env ]; then
        echo "🔧 Tuning database connection_limit to 35 in production .env..."
        sed -i 's/connection_limit=[0-9]\+/connection_limit=35/g' .env
    fi
    
    echo "🔧 Running deployment script with args: $DEPLOY_ARGS"
    chmod +x scripts/deploy.sh
    ./scripts/deploy.sh $DEPLOY_ARGS
    
    echo ""
    echo "✅ Deployment completed successfully!"
ENDSSH

echo ""
echo "🎉 Manual deployment finished!"
echo ""
echo "You can verify the deployment by:"
echo "  1. Checking PM2 status: ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'pm2 status'"
echo "  2. Viewing logs: ssh -i $SSH_KEY $EC2_USER@$EC2_HOST 'pm2 logs crm-api --lines 50'"
echo "  3. Testing API: curl https://api.dadcrm.com/health"
echo ""
