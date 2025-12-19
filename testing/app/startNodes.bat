@echo off
echo Iniciando red blockchain P2P con 3 nodos...

rem Primer Nodo
echo Iniciando Nodo 1 (HTTP: 3001, P2P: 5002)...
start "Nodo 1" cmd /k "set peers=ws://localhost:5001 && set P2P_PORT=5002 && set HTTP_PORT=3001 && npm run dev"

rem Esperar unos segundos para asegurarse de que el primer nodo se ha iniciado
timeout /t 8

rem Segundo Nodo
echo Iniciando Nodo 2 (HTTP: 3002, P2P: 5003)...
start "Nodo 2" cmd /k "set peers=ws://localhost:5002 && set P2P_PORT=5003 && set HTTP_PORT=3002 && npm run dev"

rem Esperar unos segundos para asegurarse de que el segundo nodo se ha iniciado
timeout /t 8

rem Tercer Nodo
echo Iniciando Nodo 3 (HTTP: 3003, P2P: 5004)...
start "Nodo 3" cmd /k "set peers=ws://localhost:5003 && set P2P_PORT=5004 && set HTTP_PORT=3003 && npm run dev"

echo.
echo Todos los nodos iniciados!
echo URLs disponibles:
echo   Nodo 1: http://localhost:3001
echo   Nodo 2: http://localhost:3002  
echo   Nodo 3: http://localhost:3003
echo.
echo Para detener los nodos, cierra las ventanas de CMD correspondientes.
pause
