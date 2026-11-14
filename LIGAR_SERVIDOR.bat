@echo off
chcp 65001 >nul
title Servidor Achadinhos do Dia - Next.js (Porta 3000)
color 0A

echo ========================================================
echo       🚀 SERVIDOR ACHADINHOS DO DIA - NEXT.JS
echo ========================================================
echo.

cd /d "%~dp0"

echo [*] Verificando se a porta 3000 esta livre...
powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($conn) { foreach ($p in $conn.OwningProcess) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } }"

echo [*] Abrindo seu navegador em http://localhost:3000/admin...
start powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 3; Start-Process 'http://localhost:3000/admin'"

echo.
echo [*] Iniciando o servidor Next.js...
echo [*] Mantenha esta janela aberta enquanto estiver usando o site.
echo [*] Para fechar o servidor, basta fechar esta janela.
echo ========================================================
echo.

npm run dev
