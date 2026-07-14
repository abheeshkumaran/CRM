#!/bin/bash

echo "🚨 Emergency Disk Space Cleanup"
echo "================================"

# Show current disk usage
echo ""
echo "📊 Current disk usage:"
df -h / | grep -E "Filesystem|/$"

echo ""
echo "🔍 Checking largest directories in ~/backend..."
du -sh ~/backend/* 2>/dev/null | sort -h | tail -10

echo ""
echo "🧹 Starting cleanup..."

cd ~/backend || exit 1

# 1. Remove node_modules (will be reinstalled)
if [ -d "node_modules" ]; then
    echo "  🗑️  Removing node_modules..."
    rm -rf node_modules
    echo "  ✅ node_modules removed"
fi

# 2. Clean npm cache
echo "  🗑️  Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true
echo "  ✅ npm cache cleaned"

# 3. Remove old log files
echo "  🗑️  Removing old log files..."
find . -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
pm2 flush 2>/dev/null || true
echo "  ✅ Old logs removed"

# 4. Remove dist folder (will be rebuilt)
if [ -d "dist" ]; then
    echo "  🗑️  Removing dist folder..."
    rm -rf dist
    echo "  ✅ dist folder removed"
fi

# 5. Remove uploads older than 30 days (if exists)
if [ -d "uploads" ]; then
    echo "  🗑️  Removing old uploads..."
    find uploads -type f -mtime +30 -delete 2>/dev/null || true
    echo "  ✅ Old uploads removed"
fi

# 6. Clean system cache (if we have sudo)
echo "  🗑️  Cleaning system cache..."
sudo apt-get clean 2>/dev/null || true
sudo apt-get autoclean 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true
echo "  ✅ System cache cleaned"

# 7. Clean journal logs (if we have sudo)
echo "  🗑️  Cleaning journal logs..."
sudo journalctl --vacuum-time=7d 2>/dev/null || true
echo "  ✅ Journal logs cleaned"

# 8. Docker cleanup (if installed)
if command -v docker &> /dev/null; then
    echo "  🗑️  Cleaning Docker..."
    docker system prune -af 2>/dev/null || true
    echo "  ✅ Docker cleaned"
fi

echo ""
echo "📊 Disk usage after cleanup:"
df -h / | grep -E "Filesystem|/$"

echo ""
AVAILABLE_KB=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE_KB / 1024 / 1024))

if [ "$AVAILABLE_KB" -gt 2000000 ]; then
    echo "✅ Cleanup successful! ${AVAILABLE_GB}GB available"
    echo ""
    echo "Next steps:"
    echo "  1. Run: npm install --production"
    echo "  2. Run: npx prisma generate"
    echo "  3. Run: npm run build"
    echo "  4. Run: cp -r src/generated/client dist/generated/"
    echo "  5. Run: pm2 restart all"
else
    echo "⚠️  Still low on disk space (${AVAILABLE_GB}GB available)"
    echo ""
    echo "You may need to:"
    echo "  1. Increase EBS volume size in AWS Console"
    echo "  2. Check for large files: du -sh /* | sort -h"
    echo "  3. Remove unnecessary files manually"
fi
