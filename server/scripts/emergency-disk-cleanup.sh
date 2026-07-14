#!/bin/bash
# Emergency disk space cleanup for EC2 server
# Run this when deployment fails due to disk space

set -e

echo "🚨 EMERGENCY DISK SPACE CLEANUP"
echo "================================"

# Show current disk usage
echo "📊 Current disk usage:"
df -h /

echo ""
echo "🧹 Starting aggressive cleanup..."

# 1. Clean npm cache completely
echo "1️⃣ Cleaning npm cache..."
npm cache clean --force 2>/dev/null || true

# 2. Remove node_modules (will be reinstalled)
echo "2️⃣ Removing node_modules..."
rm -rf ~/backend/node_modules
rm -rf ~/frontend/node_modules 2>/dev/null || true
rm -rf ~/client/node_modules 2>/dev/null || true

# 3. Clean PM2 logs
echo "3️⃣ Flushing PM2 logs..."
pm2 flush 2>/dev/null || true
rm -rf ~/.pm2/logs/* 2>/dev/null || true

# 4. Remove old log files
echo "4️⃣ Removing old log files..."
find ~/backend -name "*.log" -type f -delete 2>/dev/null || true
find ~/frontend -name "*.log" -type f -delete 2>/dev/null || true
find ~/client -name "*.log" -type f -delete 2>/dev/null || true

# 5. Clean apt cache (requires sudo)
echo "5️⃣ Cleaning apt cache..."
sudo apt-get clean 2>/dev/null || true
sudo apt-get autoclean 2>/dev/null || true
sudo apt-get autoremove -y 2>/dev/null || true

# 6. Remove old journal logs (requires sudo)
echo "6️⃣ Cleaning system journal logs..."
sudo journalctl --vacuum-time=3d 2>/dev/null || true

# 7. Remove old dist builds
echo "7️⃣ Removing old build artifacts..."
rm -rf ~/backend/dist 2>/dev/null || true
rm -rf ~/frontend/dist 2>/dev/null || true
rm -rf ~/client/dist 2>/dev/null || true

# 8. Remove zip/tar files
echo "8️⃣ Removing archive files..."
find ~/ -maxdepth 2 -name "*.zip" -type f -delete 2>/dev/null || true
find ~/ -maxdepth 2 -name "*.tar.gz" -type f -delete 2>/dev/null || true

# 9. Clean Docker if installed
echo "9️⃣ Cleaning Docker (if installed)..."
docker system prune -af 2>/dev/null || true

# 10. Remove old kernels (requires sudo)
echo "🔟 Removing old kernels..."
sudo apt-get autoremove --purge -y 2>/dev/null || true

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 New disk usage:"
df -h /

echo ""
AVAILABLE_KB=$(df / | tail -1 | awk '{print $4}')
AVAILABLE_GB=$((AVAILABLE_KB / 1024 / 1024))
echo "💾 Available space: ${AVAILABLE_GB}GB"

if [ "$AVAILABLE_KB" -lt 1000000 ]; then
    echo ""
    echo "⚠️  WARNING: Still less than 1GB free!"
    echo "Consider upgrading your EC2 instance or adding EBS volume."
else
    echo ""
    echo "✅ Sufficient space available. You can now deploy."
fi
