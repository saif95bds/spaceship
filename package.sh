#!/bin/bash
set -euo pipefail

echo "🧹 Cleaning previous build..."
rm -rf ./dist

echo "🔨 Building project..."
npm run build

echo "📦 Creating zip package..."
cd dist
zip -r ../spaceship.zip *
cd ..

echo "✅ Package created: spaceship.zip"
echo "📊 Package size: $(ls -lh spaceship.zip | awk '{print $5}')"
