#!/bin/bash

# Create orphan branch for M67 Sales Engine UI - clean version
# Uses wildcards to add all existing files

set -e

BRANCH_NAME="sales-engine-ui-v2"

echo "Creating clean branch: $BRANCH_NAME"

# Create orphan branch (no history)
git checkout --orphan $BRANCH_NAME

# Remove all files from staging
git rm -rf --cached .

# Helper function to add file if it exists
add_if_exists() {
    if [ -e "$1" ]; then
        git add "$1"
    fi
}

# === ADD ALL CURRENT FILES ===

# App directory (all Sales Engine and API files)
git add app/ 2>/dev/null || true

# Contexts
git add contexts/ 2>/dev/null || true

# Design system
git add design/ 2>/dev/null || true

# Hooks
git add hooks/ 2>/dev/null || true

# Lib
git add lib/ 2>/dev/null || true

# Types
git add types/ 2>/dev/null || true

# === CONFIG FILES ===
add_if_exists "package.json"
add_if_exists "package-lock.json"
add_if_exists "tsconfig.json"
add_if_exists "next.config.js"
add_if_exists "replit.md"
add_if_exists ".gitignore"
add_if_exists ".eslintrc.json"

# Force add next-env.d.ts if it exists
if [ -e "next-env.d.ts" ]; then
    git add -f next-env.d.ts
fi

# === EXCLUDE LEGACY FILES ===
# Remove files we don't want
git reset HEAD -- docs/ 2>/dev/null || true
git reset HEAD -- components/dashboard/ 2>/dev/null || true
git reset HEAD -- app/dashboard/ 2>/dev/null || true
git reset HEAD -- attached_assets/ 2>/dev/null || true
git reset HEAD -- README.md 2>/dev/null || true
git reset HEAD -- .env.example 2>/dev/null || true
git reset HEAD -- .replit 2>/dev/null || true
git reset HEAD -- create-sales-engine-branch.sh 2>/dev/null || true

# === COMMIT ===
git commit -m "M67 Sales Engine UI - standalone branch

Clean implementation of Sales Engine for campaign lifecycle management.
- Dashboard with 5 panels: Health, Blockers, Throughput, Runs, Notices
- Campaign CRUD: create, edit, submit, approve
- M60 API compliance: all endpoints under /api/v1/campaigns/*
- Design system with light theme, Poppins/Inter fonts
- No execution capability - read-only observability only"

echo ""
echo "Branch '$BRANCH_NAME' created successfully!"
echo "To push: git push origin $BRANCH_NAME"
