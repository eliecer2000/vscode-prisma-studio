#!/bin/bash

# Quick installation of the extension

echo "🚀 Quick installation of Prisma Studio Extension"
echo "=============================================="

# Compile
echo "📝 Compiling..."
npm run compile

if [ $? -eq 0 ]; then
    echo "✅ Compilation successful"
    
    # Package
    echo "📦 Packaging..."
    npx vsce package --out prisma-studio.vsix
    
    if [ $? -eq 0 ]; then
        echo "✅ Packaging successful"
        
        # Install
        echo "🔧 Installing in VSCode..."
        /Applications/Visual\ Studio\ Code.app/Contents/Resources/app/bin/code --install-extension prisma-studio.vsix
        
        if [ $? -eq 0 ]; then
            echo "✅ Extension installed successfully!"
            echo ""
            echo "🎉 To use the extension:"
            echo "   • Restart VSCode"
            echo "   • Use Ctrl+Alt+P to open Prisma Studio"
            echo "   • Use Ctrl+Alt+U to change URL"
        else
            echo "❌ Error installing the extension"
        fi
    else
        echo "❌ Error packaging"
    fi
else
    echo "❌ Compilation error"
fi
