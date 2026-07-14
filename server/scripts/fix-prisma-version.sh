#!/bin/bash
# Fix Prisma version mismatch on production server
# Run this on the EC2 server to downgrade Prisma to match local version

set -e

echo "🔧 Fixing Prisma Version Mismatch..."

# Check current version
echo "📋 Current Prisma version:"
npx prisma --version | grep "prisma"

# Downgrade to 5.22.0 to match local
echo "⬇️  Downgrading Prisma to 5.22.0..."
npm install prisma@5.22.0 @prisma/client@5.22.0

# Verify new version
echo "✅ New Prisma version:"
npx prisma --version | grep "prisma"

# Regenerate Prisma Client
echo "🔄 Regenerating Prisma Client..."
npx prisma generate

echo "✅ Prisma version fixed! You can now run deployments."
