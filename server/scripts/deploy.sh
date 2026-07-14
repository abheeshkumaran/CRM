#!/bin/bash
set -e

echo "🚀 Starting Deployment..."

SKIP_BUILD=false
for arg in "$@"; do
    if [ "$arg" == "--skip-build" ]; then
        SKIP_BUILD=true
    fi
done

# Check disk space before starting
AVAILABLE_KB=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE_KB / 1024 / 1024))

echo "💾 Available disk space: ${AVAILABLE_GB}GB"

if [ "$AVAILABLE_KB" -lt 2000000 ]; then
    echo "⚠️  Low disk space detected (less than 2GB). Running emergency cleanup..."
    
    # Clean npm cache (aggressive)
    echo "🧹 NUKING npm cache..."
    rm -rf ~/.npm
    npm cache clean --force 2>/dev/null || true
    
    # Remove old PM2 logs
    pm2 flush 2>/dev/null || true
    
    # Clear journal logs (if sudo available)
    echo "🧹 Vacuuming system logs..."
    sudo journalctl --vacuum-time=1d 2>/dev/null || true
    
    # Remove old log files (older than 7 days)
    # find ~/backend -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
    
    # Clean apt cache if we have sudo
    sudo apt-get clean 2>/dev/null || true
    sudo apt-get autoclean 2>/dev/null || true
    
    # Remove old kernels/packages
    sudo apt-get autoremove -y 2>/dev/null || true
    
    # Check space again
    AVAILABLE_KB=$(df / | tail -1 | awk '{print $4}')
    AVAILABLE_GB=$((AVAILABLE_KB / 1024 / 1024))
    echo "💾 Available disk space after cleanup: ${AVAILABLE_GB}GB"
    
    if [ "$AVAILABLE_KB" -lt 300000 ]; then
        echo "❌ Still not enough disk space (less than 300MB). Manual intervention required!"
        exit 1
    fi
fi

# Load NVM
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

echo "🛑 Stopping Backend API to free up memory for builds..."
pm2 stop crm-api || true

# 1. Update Backend (Self)
echo "📥 Updating Backend..."
BACKEND_DIR=$(git rev-parse --show-toplevel)
cd "$BACKEND_DIR"

# Clean up stale locks
if [ -f .git/index.lock ]; then
    echo "🧹 Removing stale git lock..."
    rm -f .git/index.lock
fi

# Preserve .env (not tracked in git for security)
if [ -f .env ]; then
    echo "🔐 Backing up .env..."
    cp .env /tmp/.env.backup
fi

git fetch origin main
git reset --hard origin/main

# Remove node_modules BEFORE git clean to avoid conflicts
echo "🧹 Removing node_modules to save space before reinstall..."
rm -rf node_modules || find node_modules -type f -delete 2>/dev/null || true
rm -rf node_modules || true

git clean -fdx -e .env -e dist -e uploads

# Restore .env if it was deleted
if [ ! -f .env ] && [ -f /tmp/.env.backup ]; then
    echo "🔐 Restoring .env from backup..."
    cp /tmp/.env.backup .env
    rm -f /tmp/.env.backup
elif [ -f /tmp/.env.backup ]; then
    rm -f /tmp/.env.backup
fi

# Remove duplicate uppercase service files (Linux is case-sensitive)
# echo "🔧 Cleaning up duplicate service files..."
# find src/services -name "[A-Z]*.ts" -delete

# Remove package-lock.json to force regeneration with correct versions
echo "🔄 Regenerating package-lock.json..."
rm -f package-lock.json

# Install all dependencies (Prisma CLI is needed for migrations)
echo "📦 Installing dependencies..."
npm install

echo "🗄️ Running Migrations..."
npx prisma@5.22.0 db push --accept-data-loss
npx prisma@5.22.0 generate

if [ "$SKIP_BUILD" = false ]; then
    echo "🏗️ Building Backend..."
    # IMPORTANT: Clean dist entirely to avoid stale files with wrong casing
    rm -rf dist 
    npm run build
else
    echo "⏭️ Skipping build as requested (Dist already uploaded)"
    # Verify dist folder exists
    if [ ! -d "dist" ] || [ ! -f "dist/index.js" ]; then
        echo "❌ ERROR: dist folder not found or incomplete. Building now..."
        rm -rf dist
        npm run build
    fi
fi
node copy-prisma.js

# 2. Update Frontend (Truly Nuclear: Fresh transient build to avoid ghosting)
TRANS_DIR="/home/ubuntu/frontend_transient"
echo "📥 Updating Frontend in $TRANS_DIR..."
sudo rm -rf "$TRANS_DIR"
git clone https://github.com/dilshadbvoc-ui/Dad-frontend.git "$TRANS_DIR"

cd "$TRANS_DIR"
echo "📦 Installing Frontend dependencies..."
npm install --legacy-peer-deps
# Force fix for cookie resolution before build
npm install cookie@1.1.0 --save-exact 

echo "🏗️ Building Frontend..."
# Extract SERVER_URL from backend's .env file to configure VITE_API_URL for production
if [ -f "$BACKEND_DIR/.env" ]; then
    VITE_API_URL=$(grep "^SERVER_URL=" "$BACKEND_DIR/.env" | cut -d'=' -f2- | tr -d '\r' | tr -d '"' | tr -d "'")
    if [ -n "$VITE_API_URL" ]; then
        echo "🌐 Configured VITE_API_URL=$VITE_API_URL from backend .env"
        export VITE_API_URL
    fi
fi

# 800MB is enough for Vite but leaves ~200MB free on 1GB EC2
NODE_OPTIONS=--max-old-space-size=2048 npm run build

# Nuclear Deployment: Force sync frontend to multiple standardized locations
echo "📂 Synchronizing Frontend assets to Backend and Nginx..."

# Target 1: Backend internal serving folder (Primary for Dashboard)
sudo mkdir -p "$BACKEND_DIR/client/dist"
sudo rm -rf "$BACKEND_DIR/client/dist/*"
sudo cp -r dist/* "$BACKEND_DIR/client/dist/"

# Target 2: Nginx root (Static files/Marketing fallback)
sudo mkdir -p /var/www/crm-client
sudo rm -rf /var/www/crm-client/*
sudo cp -r dist/* /var/www/crm-client/

echo "✨ Frontend standardly aligned in all target directories."

echo "▶️ Starting Backend API..."
cd "$BACKEND_DIR"
pm2 delete crm-api || true
pm2 start dist/index.js -i max --name "crm-api"

echo "✅ Deployment Complete!"
