#!/bin/bash
# Helper script to continue refactoring after deployment
# Usage: ./scripts/continue-refactoring.sh [module-name]

set -e

MODULE_NAME=$1

if [ -z "$MODULE_NAME" ]; then
    echo "Usage: ./scripts/continue-refactoring.sh [module-name]"
    echo ""
    echo "Available modules to extract:"
    echo "  - tasks"
    echo "  - settings"
    echo "  - library"
    echo "  - milestones"
    echo "  - reference-links"
    echo "  - households"
    echo "  - positions"
    echo "  - trading-journal"
    echo "  - accounts"
    echo "  - webhooks"
    echo "  - reports"
    echo "  - admin"
    echo "  - revenue"
    echo "  - kpi"
    exit 1
fi

echo "🔍 Finding routes for module: $MODULE_NAME"
echo ""

# Find routes (case-insensitive search)
echo "Routes found:"
grep -n "^  app\.\(get\|post\|put\|patch\|delete\)\('/api/$MODULE_NAME" server/routes.ts || \
grep -n "^  app\.\(get\|post\|put\|patch\|delete\)\('/api/.*$MODULE_NAME" server/routes.ts || \
echo "No routes found. Try checking the exact route pattern."

echo ""
echo "📝 Next steps:"
echo "1. Review the routes above"
echo "2. Create server/routes/$MODULE_NAME.ts"
echo "3. Extract routes to the new file"
echo "4. Update server/routes.ts to import the new module"
echo "5. Run: npm run build"
echo "6. Test the routes"
echo "7. Commit: git commit -m 'Refactor: Extract $MODULE_NAME routes'"
echo ""
echo "See REFACTORING_CONTINUATION_GUIDE.md for detailed instructions."




