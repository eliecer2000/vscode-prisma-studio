#!/bin/bash

# Script to install the extension locally in VSCode

echo "🔧 Compiling extension..."
npm run compile

echo "📦 Packaging extension..."
npx vsce package

echo "🚀 Installing extension in VSCode..."
code --install-extension *.vsix

echo "✅ Extension installed. Restart VSCode to use the extension."
echo "💡 Use Ctrl+Alt+P to open Prisma Studio"
