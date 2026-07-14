#!/bin/bash

# Test Shareable Link - Quick Verification Script
# This script tests if the shareable link feature is working correctly

echo "🔍 Testing Shareable Link Feature..."
echo "=================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test slug (update this with your actual slug)
SLUG="kr8h3l87"

# Step 1: Check if backend is running
echo "1️⃣  Checking backend server..."
if curl -s http://localhost:5001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Backend server is running${NC}"
else
    echo -e "${RED}✗ Backend server is NOT running${NC}"
    echo "   Start it with: cd server && npm run dev"
    exit 1
fi
echo ""

# Step 2: Check if frontend is running
echo "2️⃣  Checking frontend server..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend server is running${NC}"
else
    echo -e "${RED}✗ Frontend server is NOT running${NC}"
    echo "   Start it with: cd client && npm run dev"
    exit 1
fi
echo ""

# Step 3: Test API endpoint
echo "3️⃣  Testing API endpoint..."
API_RESPONSE=$(curl -s -w "\n%{http_code}" http://localhost:5001/api/share/$SLUG)
HTTP_CODE=$(echo "$API_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$API_RESPONSE" | sed '$d')

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ API endpoint returns 200 OK${NC}"
    
    # Check if response has required fields
    if echo "$RESPONSE_BODY" | grep -q "product"; then
        echo -e "${GREEN}✓ Response contains product data${NC}"
    else
        echo -e "${RED}✗ Response missing product data${NC}"
    fi
    
    if echo "$RESPONSE_BODY" | grep -q "seller"; then
        echo -e "${GREEN}✓ Response contains seller data${NC}"
    else
        echo -e "${RED}✗ Response missing seller data${NC}"
    fi
    
    if echo "$RESPONSE_BODY" | grep -q "shareConfig"; then
        echo -e "${GREEN}✓ Response contains shareConfig${NC}"
    else
        echo -e "${YELLOW}⚠ Response missing shareConfig (optional)${NC}"
    fi
    
    # Extract brochure URL
    BROCHURE_URL=$(echo "$RESPONSE_BODY" | grep -o '"brochureUrl":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$BROCHURE_URL" ]; then
        echo -e "${GREEN}✓ Brochure URL found: $BROCHURE_URL${NC}"
        
        # Test brochure access
        echo ""
        echo "4️⃣  Testing brochure file access..."
        BROCHURE_HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:5001$BROCHURE_URL")
        if [ "$BROCHURE_HTTP_CODE" = "200" ]; then
            echo -e "${GREEN}✓ Brochure file is accessible${NC}"
        else
            echo -e "${RED}✗ Brochure file returns $BROCHURE_HTTP_CODE${NC}"
        fi
    else
        echo -e "${YELLOW}⚠ No brochure URL in response${NC}"
    fi
    
    # Extract YouTube URL
    YOUTUBE_URL=$(echo "$RESPONSE_BODY" | grep -o '"youtubeUrl":"[^"]*"' | cut -d'"' -f4)
    if [ ! -z "$YOUTUBE_URL" ]; then
        echo -e "${GREEN}✓ YouTube URL found: $YOUTUBE_URL${NC}"
    else
        echo -e "${YELLOW}⚠ No YouTube URL in response${NC}"
    fi
    
else
    echo -e "${RED}✗ API endpoint returns $HTTP_CODE${NC}"
    echo "Response: $RESPONSE_BODY"
    exit 1
fi
echo ""

# Step 5: Summary
echo "=================================="
echo "📊 Test Summary"
echo "=================================="
echo ""
echo "✅ Backend: Running"
echo "✅ Frontend: Running"
echo "✅ API Endpoint: Working"
echo ""
echo "🔗 Test the shareable link:"
echo "   http://localhost:5173/shared-product/$SLUG"
echo ""
echo "📝 What to check in browser:"
echo "   1. Page loads without errors"
echo "   2. YouTube video displays (if configured)"
echo "   3. PDF brochure displays (if uploaded)"
echo "   4. Product details show correctly"
echo "   5. Seller contact info displays"
echo ""
echo "💡 Open browser DevTools (F12) to check for errors"
echo ""

# Optional: Open browser automatically
read -p "Open the link in browser? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v open &> /dev/null; then
        open "http://localhost:5173/shared-product/$SLUG"
    elif command -v xdg-open &> /dev/null; then
        xdg-open "http://localhost:5173/shared-product/$SLUG"
    else
        echo "Please open manually: http://localhost:5173/shared-product/$SLUG"
    fi
fi
