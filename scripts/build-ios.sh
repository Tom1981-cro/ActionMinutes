#!/bin/bash

# ActionMinutes iOS Build Script
# Run this on your Mac after cloning the repository

set -e

echo "🚀 ActionMinutes iOS Build Script"
echo "================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script must be run on macOS${NC}"
    exit 1
fi

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode is not installed. Please install Xcode from the App Store.${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Xcode is installed${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Node.js is installed: $(node -v)${NC}"

# Check for CocoaPods
if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}⚠️ CocoaPods not found. Installing...${NC}"
    sudo gem install cocoapods
fi
echo -e "${GREEN}✅ CocoaPods is installed${NC}"

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."

echo ""
echo "📦 Step 1: Installing Node.js dependencies..."
npm install

echo ""
echo "🔨 Step 2: Building web assets..."
npm run build

echo ""
echo "📱 Step 3: Installing iOS pods..."
cd ios/App
pod install --repo-update
cd ../..

echo ""
echo "🔄 Step 4: Syncing to iOS..."
npx cap sync ios

echo ""
echo "================================="
echo -e "${GREEN}✅ Build preparation complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Run 'npx cap open ios' to open in Xcode"
echo "2. Select your development team in Signing & Capabilities"
echo "3. Select a device or simulator"
echo "4. Press Cmd+R to run, or Product → Archive for App Store"
echo ""
echo "Happy building! 🎉"
