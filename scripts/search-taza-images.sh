#!/usr/bin/env bash
# Search real product images for 38 taza products via z-ai image-search.
# Writes /home/z/my-project/upload/taza-product-images.json
set -u

OUT_JSON="/home/z/my-project/upload/taza-product-images.json"
RAW_DIR="/home/z/my-project/upload/raw-search-results"
mkdir -p "$RAW_DIR"

# slug|query  (pipe-separated for easy parsing)
ITEMS=(
  "novascript-ai-writer|AI writing assistant software interface"
  "pixelforge-image-generator|AI image generator art tool"
  "voxai-voice-cloning-suite|AI voice cloning audio software"
  "devguard-pro-license|software security license code key"
  "sheetflow-automation|spreadsheet automation SaaS tool"
  "inboxzen-email-marketing|email marketing software dashboard"
  "cinemaster-luts-bundle|video LUT color grading filter"
  "the-indie-maker-playbook|indie maker entrepreneur ebook guide"
  "launchkit-landing-templates|website landing page template design"
  "aurora-icon-set|UI icon set design pack"
  "mastering-prompt-engineering|prompt engineering AI course online"
  "founders-circle-membership|startup founders membership community"
  "datawave-analytics-platform|data analytics dashboard platform"
  "synthwave-music-pack|synthwave retro music production"
  "cloudvault-backup-license|cloud backup storage software"
  "briefbot-ai-assistant|AI assistant chatbot interface"
  "resumeboost-ai-tool|AI resume builder tool"
  "pitchdeck-pro-templates|startup pitch deck presentation templates"
  "codecraft-design-patterns|software design patterns ebook programming"
  "photofx-lightroom-presets|Lightroom photo presets pack"
  "web3-dev-bootcamp|web3 blockchain development course coding"
  "taskflow-pm-tool|project management task tool kanban"
  "renderfarm-gpu-credits|GPU render farm cloud computing"
  "brandkit-logo-bundle|logo brand identity design bundle"
  "stripe-connect-integration-kit|Stripe payment API integration code"
  "paypal-checkout-pro|PayPal checkout payment button"
  "paddle-billing-suite|Paddle billing subscription software"
  "lemon-squeezy-storefront-pack|Lemon Squeezy digital storefront"
  "cryptopay-gateway|crypto cryptocurrency payment gateway"
  "razorpay-route-integration|Razorpay payment gateway India"
  "neon-drift-racer|neon racing arcade game cover art"
  "dungeon-of-aether|fantasy dungeon RPG game art"
  "pixel-kingdom-builder-kit|pixel art kingdom builder game"
  "starbound-tactics|space strategy tactics game cover"
  "steam-gift-card-50|Steam gift card 50 dollar"
  "netflix-gift-card-30|Netflix gift card 30 dollar"
  "spotify-premium-3-month-card|Spotify Premium gift card subscription"
  "amazon-gift-card-100|Amazon gift card 100 dollar"
)

# Broader fallback queries if the primary search returns no results
FALLBACK_QUERIES=(
  "novascript-ai-writer|AI writing software"
  "pixelforge-image-generator|AI art generator"
  "voxai-voice-cloning-suite|voice cloning software"
  "devguard-pro-license|software license key"
  "sheetflow-automation|spreadsheet automation"
  "inboxzen-email-marketing|email marketing dashboard"
  "cinemaster-luts-bundle|video color grading LUT"
  "the-indie-maker-playbook|entrepreneur ebook guide"
  "launchkit-landing-templates|landing page template"
  "aurora-icon-set|UI icon pack"
  "mastering-prompt-engineering|prompt engineering course"
  "founders-circle-membership|startup community membership"
  "datawave-analytics-platform|data analytics dashboard"
  "synthwave-music-pack|synthwave music production"
  "cloudvault-backup-license|cloud backup software"
  "briefbot-ai-assistant|AI chatbot interface"
  "resumeboost-ai-tool|resume builder tool"
  "pitchdeck-pro-templates|pitch deck presentation"
  "codecraft-design-patterns|software design patterns book"
  "photofx-lightroom-presets|Lightroom presets pack"
  "web3-dev-bootcamp|web3 development course"
  "taskflow-pm-tool|project management kanban"
  "renderfarm-gpu-credits|GPU render farm cloud"
  "brandkit-logo-bundle|logo design bundle"
  "stripe-connect-integration-kit|Stripe payment integration"
  "paypal-checkout-pro|PayPal checkout button"
  "paddle-billing-suite|billing subscription software"
  "lemon-squeezy-storefront-pack|digital storefront ecommerce"
  "cryptopay-gateway|crypto payment gateway"
  "razorpay-route-integration|payment gateway integration"
  "neon-drift-racer|neon racing game art"
  "dungeon-of-aether|fantasy RPG dungeon game"
  "pixel-kingdom-builder-kit|pixel art game"
  "starbound-tactics|space strategy game"
  "steam-gift-card-50|Steam gift card"
  "netflix-gift-card-30|Netflix gift card"
  "spotify-premium-3-month-card|Spotify gift card"
  "amazon-gift-card-100|Amazon gift card"
)

declare -A FALLBACK
for entry in "${FALLBACK_QUERIES[@]}"; do
  slug="${entry%%|*}"
  q="${entry#*|}"
  FALLBACK["$slug"]="$q"
done

# Temporary JSON map file (slug<TAB>url)
MAP_FILE="/tmp/taza-map.tsv"
: > "$MAP_FILE"

search_one() {
  local slug="$1"
  local query="$2"
  local raw_json
  local raw_file="$RAW_DIR/${slug}.json"
  # Use cached raw file if it exists and yields a non-empty URL.
  if [ -f "$raw_file" ]; then
    raw_json=$(cat "$raw_file")
  else
    raw_json=""
  fi
  # Extract first original_url — skip log lines before JSON
  local url
  url=$(echo "$raw_json" | python3 -c '
import json, sys, re
text = sys.stdin.read()
idx = text.find("{")
if idx < 0:
    print("")
    sys.exit(0)
try:
    data = json.loads(text[idx:])
except Exception:
    print("")
    sys.exit(0)
if not data.get("success"):
    print("")
    sys.exit(0)
results = data.get("results") or []
if not results:
    print("")
    sys.exit(0)
print(results[0].get("original_url") or "")
')
  if [ -z "$url" ]; then
    # No cache or cache empty — run the search live.
    raw_json=$(z-ai image-search --query "$query" --count 3 --no-rank --gl us 2>/dev/null)
    echo "$raw_json" > "$raw_file"
    url=$(echo "$raw_json" | python3 -c '
import json, sys
text = sys.stdin.read()
idx = text.find("{")
if idx < 0:
    print("")
    sys.exit(0)
try:
    data = json.loads(text[idx:])
except Exception:
    print("")
    sys.exit(0)
if not data.get("success"):
    print("")
    sys.exit(0)
results = data.get("results") or []
if not results:
    print("")
    sys.exit(0)
print(results[0].get("original_url") or "")
')
  fi
  echo "$url"
}

verify_url() {
  local url="$1"
  [ -z "$url" ] && return 1
  # HEAD request (no redirect-follow needed; OSS direct), look for image content type
  local ctype
  ctype=$(curl -sI --max-time 10 "$url" 2>/dev/null | grep -i "^content-type:" | head -1 | tr -d '\r')
  case "$ctype" in
    *image*) return 0 ;;
    *) return 1 ;;
  esac
}

i=0
total=${#ITEMS[@]}
for entry in "${ITEMS[@]}"; do
  i=$((i+1))
  slug="${entry%%|*}"
  query="${entry#*|}"
  echo "[$i/$total] Searching: $slug"
  url=$(search_one "$slug" "$query")
  if [ -z "$url" ] || ! verify_url "$url"; then
    echo "  -> primary failed, trying fallback"
    fb="${FALLBACK[$slug]:-}"
    if [ -n "$fb" ]; then
      url=$(search_one "$slug" "$fb")
    fi
  fi
  if [ -z "$url" ] || ! verify_url "$url"; then
    # try one more time with broader query
    url=""
    echo "  -> still failing, marking null"
  fi
  printf "%s\t%s\n" "$slug" "$url" >> "$MAP_FILE"
  echo "  -> $url"
done

# Convert TSV to JSON object
python3 - "$MAP_FILE" "$OUT_JSON" <<'PY'
import json, sys
tsv, out = sys.argv[1], sys.argv[2]
obj = {}
with open(tsv) as f:
    for line in f:
        line = line.rstrip("\n")
        if not line:
            continue
        slug, url = line.split("\t", 1)
        obj[slug] = url if url else None
with open(out, "w") as f:
    json.dump(obj, f, indent=2, ensure_ascii=False)
    f.write("\n")
print(f"Wrote {len(obj)} entries to {out}")
filled = sum(1 for v in obj.values() if v)
print(f"Filled: {filled}/{len(obj)}")
PY
