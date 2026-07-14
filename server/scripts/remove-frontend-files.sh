#!/bin/bash
set -e

echo "🧹 Removing frontend files from backend repository..."

cd "$(dirname "$0")/.."

# Remove frontend entry points
echo "Removing frontend entry points..."
rm -f src/App.tsx src/App.css src/main.tsx src/index.css src/config.ts

# Remove frontend directories
echo "Removing frontend directories..."
rm -rf src/assets
rm -rf src/components
rm -rf src/contexts
rm -rf src/hooks
rm -rf src/lib
rm -rf src/pages

# Remove frontend config files from root
echo "Removing frontend config files..."
rm -f index.html
rm -f vite.config.ts
rm -f tailwind.config.js
rm -f postcss.config.js
rm -f tsconfig.app.json
rm -f tsconfig.node.json

# Remove public directory
echo "Removing public directory..."
rm -rf public

echo "✅ Frontend files removed successfully!"
echo ""
echo "Remaining backend structure:"
ls -la src/
