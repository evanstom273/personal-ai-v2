#!/usr/bin/env bash
set -euo pipefail

# Vercel ignoreCommand: exit 0 = skip build, exit 1 = run build.
#
# - Always build main (production deploys).
# - Build pull request previews so the Vercel GitHub check completes instead of
#   showing "Cancelled", which can block merges when branch protection requires it.
# - Skip direct pushes to non-main branches without a PR to conserve Hobby minutes.

branch="${VERCEL_GIT_COMMIT_REF:-}"
pr_id="${VERCEL_GIT_PULL_REQUEST_ID:-}"

if [[ "$branch" == "main" ]]; then
	echo "Proceeding with Vercel production build for main"
	exit 1
fi

if [[ -n "$pr_id" ]]; then
	echo "Proceeding with Vercel preview build for PR #${pr_id} (${branch})"
	exit 1
fi

echo "Skipping Vercel build for branch: ${branch} (no PR context)"
exit 0
