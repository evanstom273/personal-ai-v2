#!/usr/bin/env bash
set -euo pipefail

# Vercel: only deploy the production branch (main). Preview branches are skipped to
# conserve Hobby-tier build minutes; merge to main triggers production.
branch="${VERCEL_GIT_COMMIT_REF:-}"

if [[ "$branch" == "main" ]]; then
	echo "Proceeding with Vercel production build for main"
	exit 1
fi

echo "Skipping Vercel build for branch: ${branch} (production deploys from main only)"
exit 0
