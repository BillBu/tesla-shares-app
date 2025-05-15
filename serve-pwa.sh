#!/bin/bash

# Build the PWA
npm run build:pwa

# Use http-server to serve the built PWA
echo "Installing http-server if not already installed..."
npm install -g http-server

echo "Starting server for PWA testing..."
http-server ./dist/tesla-shares-app/browser -p 8080 --gzip -c-1

# Note: Press Ctrl+C to stop the server
