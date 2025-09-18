# Scripts

This directory contains utility scripts for development and deployment of the Prisma Studio VSCode extension.

## Available Scripts

### `dev.sh`
**Purpose**: Development mode with automatic file watching  
**Usage**: `./scripts/dev.sh` or `npm run dev`  
**Description**: Starts TypeScript compiler in watch mode. Files are automatically recompiled when changes are detected. Press Ctrl+C to stop.

### `install-local.sh`
**Purpose**: Local extension installation  
**Usage**: `./scripts/install-local.sh` or `npm run install-local`  
**Description**: 
- Compiles the extension
- Packages it into a .vsix file
- Installs the extension in VSCode
- Requires VSCode restart to activate

### `quick-install.sh`
**Purpose**: Complete build and install process  
**Usage**: `./scripts/quick-install.sh`  
**Description**: 
- Compiles the extension with error handling
- Packages into `prisma-studio.vsix`
- Installs directly to VSCode (macOS path)
- Provides detailed feedback and usage instructions

## Prerequisites

- Node.js and npm installed
- VSCode installed
- `vsce` package (Visual Studio Code Extension manager)

## Usage Notes

- Make scripts executable: `chmod +x scripts/*.sh`
- For development: Use `dev.sh` for continuous compilation
- For testing: Use `install-local.sh` for quick local installation
- For deployment: Use `quick-install.sh` for complete build process