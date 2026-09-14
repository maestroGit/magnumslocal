#!/bin/bash

set -euo pipefail

SERVER_URL="${SERVER_URL:-http://localhost:6001}"
PASS=0
FAIL=0

check_status_range() {
  local code="$1"
  local name="$2"
  if [[ "$code" =~ ^2|3|401$ ]]; then
    echo "PASS status ${name}: ${code}"
    PASS=$((PASS + 1))
  else
    echo "FAIL status ${name}: ${code}"
    FAIL=$((FAIL + 1))
  fi
}

require_header() {
  local headers="$1"
  local name="$2"
  local endpoint="$3"
  if echo "$headers" | grep -qi "^${name}:"; then
    echo "PASS header ${name} in ${endpoint}"
    PASS=$((PASS + 1))
  else
    echo "FAIL missing header ${name} in ${endpoint}"
    FAIL=$((FAIL + 1))
  fi
}

check_route() {
  local path="$1"
  local endpoint="${SERVER_URL}${path}"
  local headers
  headers=$(curl -sS -D - -o /dev/null "$endpoint" | tr -d '\r')
  local code
  code=$(echo "$headers" | awk 'BEGIN{code="000"} /^HTTP\//{code=$2} END{print code}')

  check_status_range "$code" "$path"
  require_header "$headers" "Content-Security-Policy" "$path"
  require_header "$headers" "X-Content-Type-Options" "$path"
  require_header "$headers" "X-Frame-Options" "$path"

  local csp
  csp=$(echo "$headers" | grep -i '^Content-Security-Policy:' | sed 's/^Content-Security-Policy:[[:space:]]*//I')
  if echo "$csp" | grep -q "frame-ancestors 'none'"; then
    echo "PASS CSP frame-ancestors none in ${path}"
    PASS=$((PASS + 1))
  else
    echo "FAIL CSP frame-ancestors missing/invalid in ${path}"
    FAIL=$((FAIL + 1))
  fi
}

check_oauth_redirect() {
  local endpoint="${SERVER_URL}/auth/google"
  local headers
  headers=$(curl -sS -D - -o /dev/null "$endpoint" | tr -d '\r')
  local code
  code=$(echo "$headers" | awk 'BEGIN{code="000"} /^HTTP\//{code=$2} END{print code}')

  if [[ "$code" == "302" || "$code" == "303" ]]; then
    echo "PASS OAuth redirect status: ${code}"
    PASS=$((PASS + 1))
  else
    echo "FAIL OAuth redirect status: ${code}"
    FAIL=$((FAIL + 1))
  fi

  local location
  location=$(echo "$headers" | grep -i '^Location:' | sed 's/^Location:[[:space:]]*//I')
  if echo "$location" | grep -qiE 'accounts\.google\.com|google'; then
    echo "PASS OAuth redirect location looks valid"
    PASS=$((PASS + 1))
  else
    echo "FAIL OAuth redirect location invalid/missing"
    FAIL=$((FAIL + 1))
  fi

  require_header "$headers" "Content-Security-Policy" "/auth/google"
}

echo "======================================"
echo "Security Smoke - OAuth + Critical Routes"
echo "SERVER_URL=${SERVER_URL}"
echo "======================================"

check_route "/"
check_route "/login.html"
check_route "/auth/user"
check_oauth_redirect

echo "\n======================================"
echo "Summary: PASS=${PASS} FAIL=${FAIL}"
echo "======================================"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
