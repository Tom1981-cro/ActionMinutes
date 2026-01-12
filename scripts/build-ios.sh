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
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if running on macOS
if [[ "$OSTYPE" != "darwin"* ]]; then
    echo -e "${RED}❌ This script must be run on macOS${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Running on macOS${NC}"

# Check for Xcode
if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ Xcode is not installed. Please install Xcode from the App Store.${NC}"
    exit 1
fi
XCODE_VERSION=$(xcodebuild -version | head -n 1)
echo -e "${GREEN}✅ $XCODE_VERSION${NC}"

# Check for Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js 18+${NC}"
    echo "   Visit: https://nodejs.org/"
    exit 1
fi
NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js $NODE_VERSION${NC}"

# Check for npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ npm $(npm -v)${NC}"

# Check for CocoaPods
if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}⚠️  CocoaPods not found. Installing...${NC}"
    sudo gem install cocoapods
    echo -e "${GREEN}✅ CocoaPods installed${NC}"
else
    echo -e "${GREEN}✅ CocoaPods $(pod --version)${NC}"
fi

# Navigate to project root
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR/.."
PROJECT_DIR=$(pwd)

echo ""
echo -e "${BLUE}📁 Project directory: $PROJECT_DIR${NC}"
echo ""

# Step 1: Install Node dependencies
echo "📦 Step 1: Installing Node.js dependencies..."
npm install
echo -e "${GREEN}✅ Dependencies installed${NC}"

# Step 2: Build web assets
echo ""
echo "🔨 Step 2: Building web assets..."
npm run build
echo -e "${GREEN}✅ Web assets built${NC}"

# Step 3: Install iOS Pods
echo ""
echo "📱 Step 3: Installing iOS CocoaPods..."
cd ios/App
pod install --repo-update
cd ../..
echo -e "${GREEN}✅ iOS pods installed${NC}"

# Step 4: Sync Capacitor
echo ""
echo "🔄 Step 4: Syncing Capacitor to iOS..."
npx cap sync ios
echo -e "${GREEN}✅ Capacitor synced${NC}"

# Done
echo ""
echo "================================="
echo -e "${GREEN}✅ Build preparation complete!${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. Run 'npx cap open ios' to open in Xcode"
echo "2. Select your development team in Signing & Capabilities"
echo "3. Select a device or simulator from the top bar"
echo "4. Press Cmd+R to run on device/simulator"
echo "5. For App Store: Product → Archive"
echo ""
echo -e "${YELLOW}Opening Xcode in 3 seconds...${NC}"
sleep 3
npx cap open ios

echo ""
echo "🎉 Happy building!"
