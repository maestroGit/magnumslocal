#!/bin/bash
# testing/test-mining-endpoints.sh
# Script de test completo para endpoints de mining (FASE 2)

set -e

API_URL="http://localhost:6001"
COLORS_GREEN='\033[0;32m'
COLORS_RED='\033[0;31m'
COLORS_YELLOW='\033[1;33m'
COLORS_BLUE='\033[0;36m'
COLORS_NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Funciones auxiliares
log_info() {
  echo -e "${COLORS_BLUE}$1${COLORS_NC}"
}

log_success() {
  echo -e "${COLORS_GREEN}✅ $1${COLORS_NC}"
  ((TESTS_PASSED++))
}

log_error() {
  echo -e "${COLORS_RED}❌ $1${COLORS_NC}"
  ((TESTS_FAILED++))
}

log_warning() {
  echo -e "${COLORS_YELLOW}⚠️  $1${COLORS_NC}"
}

test_endpoint() {
  local test_name="$1"
  local expected_code="$2"
  local method="$3"
  local endpoint="$4"
  local data="$5"
  
  echo ""
  log_info "📝 Test: $test_name"
  
  if [ "$method" = "POST" ]; then
    if [ -n "$data" ]; then
      RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        -d "$data" \
        "$API_URL$endpoint")
    else
      RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
        -H "Content-Type: application/json" \
        "$API_URL$endpoint")
    fi
  else
    RESPONSE=$(curl -s -w "\n%{http_code}" "$API_URL$endpoint")
  fi
  
  HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
  BODY=$(echo "$RESPONSE" | sed '$d')
  
  echo "   Endpoint: $method $endpoint"
  echo "   Expected: $expected_code | Got: $HTTP_CODE"
  
  if [ "$HTTP_CODE" = "$expected_code" ]; then
    log_success "$test_name"
    echo "   Response: ${BODY:0:150}..."
    return 0
  else
    log_error "$test_name (Expected $expected_code, got $HTTP_CODE)"
    echo "   Response: $BODY"
    return 1
  fi
}

# Banner
echo ""
log_info "🧪 ========================================"
log_info "   Mining Endpoints - Test Suite (FASE 2)"
log_info "========================================"
echo ""

# Test 1: POST /mine sin transacciones
echo ""
log_info "═══════════════════════════════════════"
log_info " Test 1: Guard - Mempool vacía"
log_info "═══════════════════════════════════════"
test_endpoint \
  "POST /mine rechaza cuando mempool vacía" \
  "409" \
  "POST" \
  "/mine"

# Test 2: Obtener wallet global
echo ""
log_info "═══════════════════════════════════════"
log_info " Test 2: Preparación - Obtener wallet"
log_info "═══════════════════════════════════════"

WALLET_RESPONSE=$(curl -s "$API_URL/wallet/global")
SENDER=$(echo "$WALLET_RESPONSE" | grep -o '"publicKey":"[^"]*"' | cut -d'"' -f4)

if [ -z "$SENDER" ]; then
  log_error "No se pudo obtener wallet global"
  echo "Response: $WALLET_RESPONSE"
  exit 1
else
  log_success "Wallet global obtenida"
  echo "   Public Key: ${SENDER:0:40}..."
fi

# Test 3: Crear transacción
echo ""
log_info "═══════════════════════════════════════"
log_info " Test 3: Crear transacción para mempool"
log_info "═══════════════════════════════════════"

TX_DATA="{
  \"sender\": \"$SENDER\",
  \"recipient\": \"04test_recipient_for_mining_integration_test\",
  \"amount\": 10
}"

TX_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "$TX_DATA" \
  "$API_URL/transact")

TX_HTTP_CODE=$(echo "$TX_RESPONSE" | tail -n1)
TX_BODY=$(echo "$TX_RESPONSE" | sed '$d')

if [ "$TX_HTTP_CODE" = "200" ] || [ "$TX_HTTP_CODE" = "201" ]; then
  log_success "Transacción creada exitosamente"
  echo "   Response: ${TX_BODY:0:150}..."
  TRANSACTION_CREATED=true
else
  log_error "No se pudo crear transacción (código $TX_HTTP_CODE)"
  echo "   Response: $TX_BODY"
  TRANSACTION_CREATED=false
fi

# Test 4: POST /mine con transacciones
if [ "$TRANSACTION_CREATED" = true ]; then
  echo ""
  log_info "═══════════════════════════════════════"
  log_info " Test 4: Minar bloque con transacciones"
  log_info "═══════════════════════════════════════"
  
  MINE_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    "$API_URL/mine")
  
  MINE_HTTP_CODE=$(echo "$MINE_RESPONSE" | tail -n1)
  MINE_BODY=$(echo "$MINE_RESPONSE" | sed '$d')
  
  echo "   Endpoint: POST /mine"
  echo "   Expected: 200 | Got: $MINE_HTTP_CODE"
  
  if [ "$MINE_HTTP_CODE" = "200" ]; then
    log_success "Bloque minado exitosamente"
    
    # Extraer información del bloque
    BLOCK_HASH=$(echo "$MINE_BODY" | grep -o '"hash":"[^"]*"' | head -1 | cut -d'"' -f4)
    TX_COUNT=$(echo "$MINE_BODY" | grep -o '"transactionsCount":[0-9]*' | cut -d':' -f2)
    
    echo "   Block Hash: ${BLOCK_HASH:0:20}..."
    echo "   Transactions: $TX_COUNT"
    echo "   Full Response: ${MINE_BODY:0:200}..."
  else
    log_error "Minado falló (Expected 200, got $MINE_HTTP_CODE)"
    echo "   Response: $MINE_BODY"
  fi
fi

# Test 5: Verificar que mempool quedó vacía
if [ "$TRANSACTION_CREATED" = true ]; then
  echo ""
  log_info "═══════════════════════════════════════"
  log_info " Test 5: Verificar mempool vacía"
  log_info "═══════════════════════════════════════"
  
  # Intentar minar de nuevo (debe fallar con 409)
  test_endpoint \
    "POST /mine rechaza (mempool vacía después de minar)" \
    "409" \
    "POST" \
    "/mine"
fi

# Test 6: POST /mine-transactions (legacy)
echo ""
log_info "═══════════════════════════════════════"
log_info " Test 6: Endpoint legacy"
log_info "═══════════════════════════════════════"

LEGACY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  "$API_URL/mine-transactions")

LEGACY_HTTP_CODE=$(echo "$LEGACY_RESPONSE" | tail -n1)

echo "   Endpoint: POST /mine-transactions"
echo "   Got: $LEGACY_HTTP_CODE"

# Legacy puede ser 409 (sin tx), 302/301 (redirect), o 200
if [ "$LEGACY_HTTP_CODE" = "409" ] || [ "$LEGACY_HTTP_CODE" = "302" ] || [ "$LEGACY_HTTP_CODE" = "301" ] || [ "$LEGACY_HTTP_CODE" = "200" ]; then
  log_success "Endpoint legacy funcional (código $LEGACY_HTTP_CODE)"
else
  log_warning "Endpoint legacy retornó código inesperado: $LEGACY_HTTP_CODE"
fi

# Test 7: Estructura de respuesta completa
echo ""
log_info "═══════════════════════════════════════"
log_info " Test 7: Validar estructura de respuesta"
log_info "═══════════════════════════════════════"

# Crear otra transacción
TX2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d "{\"sender\":\"$SENDER\",\"recipient\":\"04test2\",\"amount\":5}" \
  "$API_URL/transact")

TX2_CODE=$(echo "$TX2_RESPONSE" | tail -n1)

if [ "$TX2_CODE" = "200" ] || [ "$TX2_CODE" = "201" ]; then
  # Minar
  MINE2_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST \
    -H "Content-Type: application/json" \
    "$API_URL/mine")
  
  MINE2_CODE=$(echo "$MINE2_RESPONSE" | tail -n1)
  MINE2_BODY=$(echo "$MINE2_RESPONSE" | sed '$d')
  
  if [ "$MINE2_CODE" = "200" ]; then
    # Verificar campos requeridos
    HAS_SUCCESS=$(echo "$MINE2_BODY" | grep -o '"success":true' || echo "")
    HAS_MESSAGE=$(echo "$MINE2_BODY" | grep -o '"message":"[^"]*"' || echo "")
    HAS_BLOCK=$(echo "$MINE2_BODY" | grep -o '"block":{' || echo "")
    HAS_HASH=$(echo "$MINE2_BODY" | grep -o '"hash":"[^"]*"' || echo "")
    HAS_TIMESTAMP=$(echo "$MINE2_BODY" | grep -o '"timestamp":[0-9]*' || echo "")
    HAS_TX_COUNT=$(echo "$MINE2_BODY" | grep -o '"transactionsCount":[0-9]*' || echo "")
    
    if [ -n "$HAS_SUCCESS" ] && [ -n "$HAS_MESSAGE" ] && [ -n "$HAS_BLOCK" ] && [ -n "$HAS_HASH" ] && [ -n "$HAS_TIMESTAMP" ] && [ -n "$HAS_TX_COUNT" ]; then
      log_success "Estructura de respuesta completa y válida"
      echo "   ✓ success: true"
      echo "   ✓ message: present"
      echo "   ✓ block.hash: present"
      echo "   ✓ block.timestamp: present"
      echo "   ✓ block.transactionsCount: present"
    else
      log_error "Estructura de respuesta incompleta"
      echo "   Missing fields in response"
    fi
  else
    log_warning "No se pudo minar segundo bloque (código $MINE2_CODE)"
  fi
else
  log_warning "No se pudo crear segunda transacción para test de estructura"
fi

# Resumen final
echo ""
log_info "========================================"
log_info "   Resumen de Tests"
log_info "========================================"
echo ""
log_info "Endpoints probados:"
echo "  • POST /mine (guard mempool vacía)"
echo "  • POST /mine (minado exitoso)"
echo "  • POST /mine-transactions (legacy)"
echo ""
log_success "Tests exitosos: $TESTS_PASSED"
if [ $TESTS_FAILED -gt 0 ]; then
  log_error "Tests fallidos: $TESTS_FAILED"
else
  echo -e "${COLORS_GREEN}Tests fallidos: 0${COLORS_NC}"
fi
echo ""
log_info "📊 Total tests: $((TESTS_PASSED + TESTS_FAILED))"
log_info "========================================"
echo ""

if [ $TESTS_FAILED -gt 0 ]; then
  exit 1
fi

log_success "🎉 Todos los tests pasaron exitosamente"
echo ""
