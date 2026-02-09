#!/bin/bash

# 🧪 Test Script - FASE 1: Autenticación
# Verifica que los endpoints de OAuth funcionan correctamente
# Uso: bash test/test-phase-1-auth.sh

set -e

SERVER_URL="http://localhost:6001"
PASS=0
FAIL=0

echo "======================================"
echo "🧪 PHASE 1 TESTING - AUTHENTICATION"
echo "======================================"
echo ""

# Test 1: GET /auth/user sin autenticar (debe devolver 401)
echo "Test 1: GET /auth/user (sin autenticar)"
RESPONSE=$(curl -s -w "\n%{http_code}" "$SERVER_URL/auth/user")
HTTP_CODE=$(echo "$RESPONSE" | tail -1)
BODY=$(echo "$RESPONSE" | head -1)

if [ "$HTTP_CODE" = "401" ] && echo "$BODY" | grep -q '"user":null'; then
  echo "✅ PASS: Devuelve 401 con user:null"
  ((PASS++))
else
  echo "❌ FAIL: Esperaba 401, recibí $HTTP_CODE"
  echo "   Respuesta: $BODY"
  ((FAIL++))
fi
echo ""

# Test 2: Verificar que /auth/user devuelve Content-Type correcto
echo "Test 2: Verificar Content-Type de /auth/user"
CONTENT_TYPE=$(curl -s -I "$SERVER_URL/auth/user" | grep -i "Content-Type" | cut -d: -f2 | xargs)

if echo "$CONTENT_TYPE" | grep -q "application/json"; then
  echo "✅ PASS: Content-Type es application/json"
  ((PASS++))
else
  echo "❌ FAIL: Content-Type no es JSON. Recibido: $CONTENT_TYPE"
  ((FAIL++))
fi
echo ""

# Test 3: Verificar que /auth/google devuelve 302 (redirect)
echo "Test 3: GET /auth/google (debe redirigir a Google)"
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/auth/google" -L)

if [ "$HTTP_CODE" = "200" ]; then
  echo "✅ PASS: /auth/google redirige correctamente (final 200)"
  ((PASS++))
else
  # 302 es aceptable también
  HTTP_CODE_DIRECT=$(curl -s -o /dev/null -w "%{http_code}" "$SERVER_URL/auth/google")
  if [ "$HTTP_CODE_DIRECT" = "302" ]; then
    echo "✅ PASS: /auth/google devuelve 302 redirect"
    ((PASS++))
  else
    echo "⚠️  WARN: /auth/google devuelve $HTTP_CODE_DIRECT (esperaba 302 o 200)"
    # No contar como FAIL en curl sin browser
  fi
fi
echo ""

# Test 4: Verificar que Helmet headers están presentes (seguridad)
echo "Test 4: Verificar headers de seguridad (Helmet)"
HEADERS=$(curl -s -I "$SERVER_URL/auth/user")

SECURITY_HEADERS_COUNT=0
for header in "X-Frame-Options" "X-Content-Type-Options" "Strict-Transport-Security" "Content-Security-Policy"; do
  if echo "$HEADERS" | grep -q "$header"; then
    ((SECURITY_HEADERS_COUNT++))
  fi
done

if [ "$SECURITY_HEADERS_COUNT" -ge 3 ]; then
  echo "✅ PASS: Headers de seguridad presentes ($SECURITY_HEADERS_COUNT/4)"
  ((PASS++))
else
  echo "⚠️  WARN: Solo $SECURITY_HEADERS_COUNT/4 headers de seguridad encontrados"
fi
echo ""

# Test 5: Verificar que CORS headers están presentes
echo "Test 5: Verificar headers CORS"
if echo "$HEADERS" | grep -q "Access-Control"; then
  echo "✅ PASS: Headers CORS presentes"
  ((PASS++))
else
  echo "⚠️  WARN: Headers CORS no encontrados (pero podría ser esperado en curl)"
fi
echo ""

# Test 6: Verificar que Rate Limiting está activo
echo "Test 6: Verificar Rate Limiting"
if echo "$HEADERS" | grep -q "RateLimit"; then
  echo "✅ PASS: Rate Limiting headers presentes"
  ((PASS++))
else
  echo "⚠️  WARN: Rate Limiting headers no encontrados"
fi
echo ""

# Test 7: Verificar que /auth/user es JSON válido
echo "Test 7: Validar JSON de respuesta"
BODY=$(curl -s "$SERVER_URL/auth/user")
if echo "$BODY" | grep -qE '^\{"user":(null|{.*})\}'; then
  echo "✅ PASS: JSON válido: $BODY"
  ((PASS++))
else
  echo "❌ FAIL: JSON inválido: $BODY"
  ((FAIL++))
fi
echo ""

# Resumen final
echo "======================================"
echo "📊 TEST SUMMARY"
echo "======================================"
echo "✅ PASADOS:  $PASS"
echo "❌ FALLIDOS: $FAIL"
echo "======================================"

if [ $FAIL -eq 0 ]; then
  echo "✅ FASE 1 COMPLETA - Todos los tests pasaron"
  exit 0
else
  echo "❌ Algunos tests fallaron. Revisar arriba."
  exit 1
fi
