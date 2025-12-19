# startNodes.ps1
Write-Host "Iniciando red blockchain P2P con 3 nodos..." -ForegroundColor Green

# Primer Nodo
Write-Host "Iniciando Nodo 1 (HTTP: 3001, P2P: 5002)..." -ForegroundColor Yellow
$env:peers="ws://localhost:5001"
$env:P2P_PORT=5002
$env:HTTP_PORT=3001
Start-Process -FilePath "cmd" -ArgumentList "/c", "set peers=ws://localhost:5001 && set P2P_PORT=5002 && set HTTP_PORT=3001 && npm run dev" -WindowStyle Normal

# Esperar para que el primer nodo se inicie
Start-Sleep -Seconds 8

# Segundo Nodo
Write-Host "Iniciando Nodo 2 (HTTP: 3002, P2P: 5003)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "set peers=ws://localhost:5002 && set P2P_PORT=5003 && set HTTP_PORT=3002 && npm run dev" -WindowStyle Normal

# Esperar para que el segundo nodo se inicie
Start-Sleep -Seconds 8

# Tercer Nodo
Write-Host "Iniciando Nodo 3 (HTTP: 3003, P2P: 5004)..." -ForegroundColor Yellow
Start-Process -FilePath "cmd" -ArgumentList "/c", "set peers=ws://localhost:5003 && set P2P_PORT=5004 && set HTTP_PORT=3003 && npm run dev" -WindowStyle Normal

Write-Host "Todos los nodos iniciados!" -ForegroundColor Green
Write-Host "URLs disponibles:" -ForegroundColor Cyan
Write-Host "  Nodo 1: http://localhost:3001" -ForegroundColor White
Write-Host "  Nodo 2: http://localhost:3002" -ForegroundColor White  
Write-Host "  Nodo 3: http://localhost:3003" -ForegroundColor White