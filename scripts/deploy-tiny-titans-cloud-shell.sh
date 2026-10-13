#!/usr/bin/env bash
# Private-repository Cloud Shell release: no GitHub-hosted Actions runners needed.
# bash scripts/deploy-tiny-titans-cloud-shell.sh plan|preflight|auth-check|hosting|functions:selected|functions:all|firestore:rules|firestore:indexes|storage|all-backend [function names]
set -Eeuo pipefail

readonly PROJECT="tinytitans-hoggy-companion"
readonly REPOSITORY="Mort2307/Tiny-Titans-Hoggy-Companion"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

die() { printf 'STOP: %s\n' "$*" >&2; exit 1; }
say() { printf '\nTINY TITANS > %s\n' "$*"; }
need() { command -v "$1" >/dev/null 2>&1 || die "Missing $1. See docs/FIREBASE-DEPLOYMENT.md (Cloud Shell section)."; }

scope="${1:-plan}"
selection="${2:-}"
case "$scope" in
  plan|preflight|auth-check|hosting|functions:selected|functions:all|firestore:rules|firestore:indexes|storage|all-backend) ;;
  *) die "Unknown deployment scope: $scope" ;;
esac

need git
need node
need gcloud
node_major="$(node --version | sed -E 's/^v([0-9]+).*/\1/')"
[[ "$node_major" =~ ^[0-9]+$ ]] && (( node_major >= 22 )) || die "Node.js 22+ is required (currently $(node --version)). Use nvm install 22 && nvm use 22."

node scripts/tiny-titans-firebase-release.mjs guard
node --test scripts/tiny-titans-firebase-release.test.mjs

remote="$(git remote get-url origin 2>/dev/null || true)"
case "$remote" in
  "https://github.com/$REPOSITORY"|"https://github.com/$REPOSITORY.git"|"git@github.com:$REPOSITORY"|"git@github.com:$REPOSITORY.git") ;;
  *) die "Git remote origin does not match the private Tiny Titans repository." ;;
esac

commit="$(git rev-parse HEAD)"
branch="$(git branch --show-current)"
say "Repository: $REPOSITORY | branch: $branch | commit: $commit | Firebase: $PROJECT"

if [[ "$scope" == "plan" ]]; then
  node scripts/tiny-titans-firebase-release.mjs plan
  exit 0
fi
if [[ "$scope" == "preflight" ]]; then
  say "Read-only Firebase preflight: install dependencies and run full build + validation"
  npm ci --no-audit --no-fund
  npm run build
  [[ -f dist/index.html ]] || die "Build missing dist/index.html."
  echo "PASS: App build and validation completed without deploying."
  exit 0
fi

need firebase
if ! firebase projects:list --json | node --input-type=module -e '
let raw=""; for await (const part of process.stdin) raw+=part;
let data; try { data=JSON.parse(raw); } catch { process.exit(1); }
const projects=data.result||[];
if (!Array.isArray(projects)||!projects.some(p=>p.projectId==="tinytitans-hoggy-companion")) process.exit(1);
'; then
  die "Firebase CLI cannot access $PROJECT. Use firebase login --no-localhost (or valid Application Default Credentials), then retry."
fi

say "Firebase authentication verified for $PROJECT."
if [[ "$scope" == "auth-check" ]]; then
  echo "PASS: GitHub source guard, release safety tests and Firebase access. Nothing deployed."
  exit 0
fi

[[ "$branch" == "master" ]] || die "Production release requires master. Merge PR #78, then switch to master."
git diff --quiet && git diff --cached --quiet || die "Uncommitted tracked changes found. Commit or discard before releasing."
git fetch --quiet origin master || die "Cannot fetch private repository master; use gh auth login && gh auth setup-git."
remote_head="$(git rev-parse refs/remotes/origin/master)"
[[ "$commit" == "$remote_head" ]] || die "Local master differs from origin/master. Run git pull --ff-only origin master and retry."

case "$scope" in
  functions:selected)
    [[ -n "$selection" ]] || die "Pass 1–20 comma-separated function names as the second argument."
    export SELECTED_FUNCTIONS="$selection"
    deploy_scope="$(node scripts/tiny-titans-firebase-release.mjs targets | tail -n 1)"
    [[ "$deploy_scope" == functions:* ]] || die "Invalid function selection." ;;
  *) [[ -z "$selection" ]] || die "Function names only apply to functions:selected." ;;
esac

if [[ "$scope" == "all-backend" ]]; then
  confirmation="ALL-BACKEND-TINY-TITANS"
else
  confirmation="DEPLOY-TINY-TITANS"
fi
echo "Target Firebase: $PROJECT | Scope: $scope | Commit: $commit"
read -r -p "Type $confirmation to approve production deployment: " approval
[[ "$approval" == "$confirmation" ]] || die "Cancelled without changes."

if [[ "$scope" == "hosting" ]]; then
  if [[ -z "${VITE_RECAPTCHA_ENTERPRISE_SITE_KEY:-}" ]]; then
    echo "The production App Check public reCAPTCHA Enterprise site key is required."
    read -r -s -p "Paste VITE_RECAPTCHA_ENTERPRISE_SITE_KEY (hidden entry): " VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
    echo
    export VITE_RECAPTCHA_ENTERPRISE_SITE_KEY
  fi
  [[ "$VITE_RECAPTCHA_ENTERPRISE_SITE_KEY" =~ ^[A-Za-z0-9_-]{20,200}$ ]] || die "App Check site key missing or malformed."
fi

say "Installing dependencies and running production build validation"
npm ci --no-audit --no-fund
npm run build
[[ -f dist/index.html ]] || die "Production build is missing dist/index.html."

if [[ "$scope" == "hosting" ]]; then
  export GITHUB_SHA="$commit"
  node scripts/tiny-titans-firebase-release.mjs stamp
  say "Deploying Keeper and legacy Hosting targets"
  firebase deploy --only hosting:legacy,hosting:keeper --project "$PROJECT" --non-interactive
  say "Verifying exact commit on both live Hosting sites"
  node scripts/tiny-titans-firebase-release.mjs verify-hosting
else
  if [[ "$scope" == functions:* || "$scope" == "all-backend" ]]; then
    say "Installing and validating Cloud Functions dependencies"
    npm --prefix functions ci --no-audit --no-fund
    find functions -path 'functions/node_modules' -prune -o -name '*.js' -type f -print0 | xargs -0 -r -n 1 node --check
  fi

  # Rule mergers can modify tracked firestore.rules. Restore the original
  # clean-checkout content on completion/failure, preserving repeatability.
  backup=""
  restore_rules() {
    if [[ -n "$backup" && -f "$backup" ]]; then
      cp "$backup" firestore.rules
      rm -f "$backup"
    fi
  }
  trap restore_rules EXIT

  case "$scope" in
    functions:selected)
      firebase deploy --only "$deploy_scope" --project "$PROJECT" --non-interactive ;;
    functions:all)
      export TINY_TITANS_FUNCTION_DEPLOY_START_BATCH="${TINY_TITANS_FUNCTION_DEPLOY_START_BATCH:-1}"
      node scripts/deploy-functions-batched.mjs ;;
    firestore:rules)
      backup="$(mktemp)"
      cp firestore.rules "$backup"
      node scripts/assemble-firestore-rules.mjs
      firebase deploy --only firestore:rules --project "$PROJECT" --non-interactive ;;
    firestore:indexes)
      firebase deploy --only firestore:indexes --project "$PROJECT" --non-interactive ;;
    storage)
      firebase deploy --only storage --project "$PROJECT" --non-interactive ;;
    all-backend)
      backup="$(mktemp)"
      cp firestore.rules "$backup"
      node scripts/assemble-firestore-rules.mjs
      firebase deploy --only firestore,storage --project "$PROJECT" --non-interactive
      export TINY_TITANS_FUNCTION_DEPLOY_START_BATCH="${TINY_TITANS_FUNCTION_DEPLOY_START_BATCH:-1}"
      node scripts/deploy-functions-batched.mjs ;;
  esac
fi
say "Firebase release completed: project=$PROJECT | scope=$scope | commit=$commit"
