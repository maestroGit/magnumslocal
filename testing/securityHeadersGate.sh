#!/bin/bash

set -euo pipefail

SERVER_URL="${SERVER_URL:-http://localhost:6001}"
SECURITY_TEST_MODE="${SECURITY_TEST_MODE:-development}"

PASS=0
FAIL=0

require_header() {
  local headers="$1"
  local name="$2"
  if echo "$headers" | grep -qi "^${name}:"; then
    echo "PASS header ${name}"
    PASS=$((PASS+1))
  else
    echo "FAIL missing header ${name}"
    FAIL=$((FAIL+1))
  fi
}

extract_csp() {
  local headers="$1"
  echo "$headers" | grep -i '^Content-Security-Policy:' | sed 's/^Content-Security-Policy:[[:space:]]*//I'
}

assert_csp_contains() {
  local csp="$1"
  local token="$2"
  if echo "$csp" | grep -q "$token"; then
    echo "PASS csp contains: $token"
    PASS=$((PASS+1))
  else
    echo "FAIL csp missing: $token"
    FAIL=$((FAIL+1))
  fi
}

assert_csp_not_contains() {
  local csp="$1"
  local token="$2"
  if echo "$csp" | grep -q "$token"; then
    echo "FAIL csp contains forbidden token: $token"
    FAIL=$((FAIL+1))
  else
    echo "PASS csp does not contain: $token"
    PASS=$((PASS+1))
  fi
}

check_endpoint() {
  local path="$1"
  echo "\n== Checking ${SERVER_URL}${path} =="
  local headers
  headers=$(curl -sS -D - -o /dev/null "${SERVER_URL}${path}" | tr -d '\r')

  local status
  status=$(echo "$headers" | awk 'BEGIN{code="000"} /^HTTP\//{code=$2} END{print code}')
  echo "HTTP status: $status"

  require_header "$headers" "Content-Security-Policy"
  require_header "$headers" "X-Content-Type-Options"
  require_header "$headers" "X-Frame-Options"

  local csp
  csp=$(extract_csp "$headers")
  if [[ -z "$csp" ]]; then
    echo "FAIL empty CSP header"
    FAIL=$((FAIL+1))
    return
  fi

  assert_csp_contains "$csp" "default-src 'self'"
  assert_csp_contains "$csp" "script-src"
  assert_csp_contains "$csp" "style-src"
  assert_csp_contains "$csp" "base-uri 'self'"
  assert_csp_contains "$csp" "form-action 'self'"
  assert_csp_contains "$csp" "frame-ancestors 'none'"

  if [[ "$SECURITY_TEST_MODE" == "production" ]]; then
    assert_csp_not_contains "$csp" "unsafe-eval"
  fi
}

echo "======================================"
echo "Security Headers Gate"
echo "SERVER_URL=${SERVER_URL}"
echo "SECURITY_TEST_MODE=${SECURITY_TEST_MODE}"
echo "======================================"

check_endpoint "/"
check_endpoint "/login.html"
check_endpoint "/auth/user"

echo "\n======================================"
echo "Summary: PASS=${PASS} FAIL=${FAIL}"
echo "======================================"

if [[ $FAIL -gt 0 ]]; then
  exit 1
fi
