#!/bin/bash
# Fix frontend build by removing backend code from client repository

set -e

echo "🚨 FIXING FRONTEND BUILD"
echo "========================"
echo ""
echo "This will remove backend code from the frontend repository."
echo "Backend code belongs in the server repository only."
echo ""

# Confirm
read -p "Continue? (y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo "🧹 Step 1: Removing backend directories..."
rm -rf src/controllers
rm -rf src/middleware
rm -rf src/routes
rm -rf src/scripts

echo "🧹 Step 2: Removing backend files..."
rm -f src/index.ts
rm -f src/socket.ts
rm -f src/config/cloudinary.ts

echo "📝 Step 3: Fixing service file casing..."
cd src/services
for file in *Service.ts; do
  if [ -f "$file" ]; then
    # Convert to lowercase (first letter)
    lowercase=$(echo "$file" | sed 's/^\(.\)/\L\1/')
    if [ "$file" != "$lowercase" ]; then
      echo "  Renaming: $file → $lowercase"
      git mv "$file" "$lowercase" 2>/dev/null || mv "$file" "$lowercase"
    fi
  fi
done
cd ../..

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "📊 Changes made:"
git status --short

echo ""
echo "🚀 Step 4: Committing changes..."
git add -A
git commit -m "fix: remove backend code from frontend repository

- Remove controllers, middleware, routes directories
- Remove backend entry point (index.ts, socket.ts)
- Remove backend config (cloudinary.ts)
- Fix service file casing for Linux compatibility

This fixes Vercel build errors about missing Express/bcryptjs modules."

echo ""
echo "📤 Step 5: Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Done! Vercel will automatically redeploy."
echo ""
echo "Watch deployment at: https://vercel.com"
echo ""
