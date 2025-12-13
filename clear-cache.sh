#!/bin/bash
# Clear Metro and Expo caches

echo "Clearing caches..."

# Clear Metro bundler cache
rm -rf .metro
rm -rf node_modules/.cache

# Clear Expo cache
rm -rf .expo

# Clear watchman (if installed)
watchman watch-del-all 2>/dev/null || true

echo "Caches cleared! Now run: npm start or npx expo start --clear"

