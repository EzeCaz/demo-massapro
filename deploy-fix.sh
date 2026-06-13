#!/bin/bash
# Deploy the Hebrew PDF fix to GitHub and trigger Vercel deployment
#
# Usage: ./deploy-fix.sh <GITHUB_TOKEN>
#
# To create a GitHub Personal Access Token:
# 1. Go to https://github.com/settings/tokens/new
# 2. Give it a name like "deploy-fix"
# 3. Select scopes: repo (full control)
# 4. Click "Generate token"
# 5. Copy the token and run: ./deploy-fix.sh ghp_xxxxxxxxxxxx

set -e

TOKEN="${1:?Usage: $0 <GITHUB_TOKEN>}"
REPO="eze404/massapro-demo"
FILE_PATH="src/app/api/scenarios/[id]/pdf/route.ts"
BRANCH="main"

echo "=== Deploying Hebrew PDF fix ==="

# Push the commit using the token
cd /home/z/my-project
git remote set-url origin "https://eze404:${TOKEN}@github.com/${REPO}.git"
git push origin main

echo ""
echo "=== Push successful! ==="
echo "Vercel will auto-deploy from the GitHub push."
echo "Check deployment at: https://vercel.com/dashboard"

# Clean up the token from the remote URL
git remote set-url origin "https://github.com/${REPO}.git"

echo "Done!"
