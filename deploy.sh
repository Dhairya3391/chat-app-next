#!/bin/bash

# Azure Custom Deployment Script for PNPM
# This script ensures pnpm is used instead of npm

echo "Starting Azure deployment with PNPM..."

# Install pnpm if not available
if ! command -v pnpm &> /dev/null; then
    echo "Installing pnpm..."
    npm install -g pnpm
fi

# Install dependencies with pnpm
echo "Installing dependencies with pnpm..."
pnpm install --frozen-lockfile

# Build the application
echo "Building the application..."
pnpm run build

echo "Deployment completed successfully!"
