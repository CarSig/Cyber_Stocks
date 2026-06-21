#!/usr/bin/env bash
# Stop hook: WARN (non-blocking) when this turn left throwaway test code
# that wasn't saved into a real *.test.ts / *.test.tsx file.
#
# Detectors (only the two with low false-positive rates):
#   - Scratch files written outside src/: *.spec.{js,ts,jsx,tsx}, *.scratch.*,
#     test-*.{js,ts}, scratch*.{js,ts} — almost always real leftovers.
#   - Inline -e invocations with assertion-style code (expect(, assert,
#     describe(, it(, test(, process.exit(1)) — sometimes legitimate
#     exploration, but worth surfacing so it doesn't silently disappear.
#
# Always exits 0 (warn-only). Writes to stderr; the model sees the warning
# next turn and the user sees it in the transcript.

set -u

INPUT="$(cat)"

TRANSCRIPT="$(printf '%s' "$INPUT" | grep -o '"transcript_path":"[^"]*"' | head -1 | sed 's/^"transcript_path":"//; s/"$//')"
if [ -z "$TRANSCRIPT" ] || [ ! -f "$TRANSCRIPT" ]; then
  exit 0
fi

# Only scan lines added since this hook last ran for this session.
MARKER_DIR="${CLAUDE_PROJECT_DIR:-.}/.claude/hooks/.state"
mkdir -p "$MARKER_DIR" 2>/dev/null
SESSION_ID="$(printf '%s' "$INPUT" | grep -o '"session_id":"[^"]*"' | head -1 | sed 's/^"session_id":"//; s/"$//')"
MARKER="$MARKER_DIR/${SESSION_ID:-default}.offset"
LAST_OFFSET=0
[ -f "$MARKER" ] && LAST_OFFSET="$(cat "$MARKER" 2>/dev/null || echo 0)"
TOTAL_LINES="$(wc -l < "$TRANSCRIPT" 2>/dev/null || echo 0)"
TOTAL_LINES="${TOTAL_LINES// /}"
if [ "$TOTAL_LINES" -le "$LAST_OFFSET" ]; then
  echo "$TOTAL_LINES" > "$MARKER"
  exit 0
fi

NEW_LINES="$(tail -n +$((LAST_OFFSET + 1)) "$TRANSCRIPT")"
echo "$TOTAL_LINES" > "$MARKER"

WARNINGS=""

# --- Scratch files written outside src/ --------------------------------------
WRITES="$(printf '%s' "$NEW_LINES" \
  | grep -oE '"name":"Write","input":\{"file_path":"[^"]*"' \
  | sed 's/.*"file_path":"//; s/"$//')"
while IFS= read -r f; do
  [ -z "$f" ] && continue
  case "$f" in
    *.test.ts|*.test.tsx|*.test.js|*.test.jsx) continue ;;
    */src/*) continue ;;
  esac
  case "$f" in
    *.spec.js|*.spec.ts|*.spec.jsx|*.spec.tsx|*.scratch.*|*/test-*.js|*/test-*.ts|*/scratch*.js|*/scratch*.ts)
      WARNINGS="${WARNINGS}  [scratch file written] ${f}\n"
      ;;
  esac
done <<< "$WRITES"

# --- Inline -e with assertion-style code -------------------------------------
# Scan whole JSONL lines containing an inline-eval invocation. A simple
# `[^"]*` extractor can't cross JSON-escaped quotes (\") so we work line-wise
# and let the assertion-keyword check do the disambiguation.
INLINE_LINES="$(printf '%s' "$NEW_LINES" \
  | grep -E '"name":"Bash"' \
  | grep -E '(node -e|tsx -e|ts-node -e|bun -e|deno eval)' \
  | head -20)"
while IFS= read -r line; do
  [ -z "$line" ] && continue
  if printf '%s' "$line" | grep -qE 'assert|expect\(|describe\(|\bit\(|\btest\(|console\.assert|process\.exit\(1\)'; then
    # The command field may contain escaped quotes, so a non-greedy
    # extract is unreliable. Just grab the substring starting at the
    # first runner keyword and truncate.
    snippet="$(printf '%s' "$line" \
      | grep -oE '(node -e|tsx -e|ts-node -e|bun -e|deno eval).{0,140}' \
      | head -1 \
      | sed 's/\\"/"/g')"
    WARNINGS="${WARNINGS}  [inline -e with assertions] ${snippet}...\n"
  fi
done <<< "$INLINE_LINES"

if [ -z "$WARNINGS" ]; then
  exit 0
fi

{
  printf 'Note: throwaway test code in this turn — consider moving into a real test file.\n'
  printf '%b' "$WARNINGS"
  printf 'Real tests live alongside the code as *.test.ts / *.test.tsx under frontend/src/ or backend_nest/src/.\n'
} >&2
exit 0
