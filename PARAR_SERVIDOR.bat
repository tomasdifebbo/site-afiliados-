@echo off
chcp 65001 >nul
title Parar Servidor Achadinhos do Dia
color 0C

echo ========================================================
echo       🛑 PARANDO SERVIDOR ACHADINHOS DO DIA
echo ========================================================
echo.

powershell -NoProfile -Command "$conn = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue; if ($conn) { foreach ($p in $conn.OwningProcess) { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue; Write-Host \"Processo encerrado: $p\" } Write-Host 'Porta 3000 liberada com sucesso!' } else { Write-Host 'Nenhum servidor rodando na porta 3000.' }"

echo.
echo [*] Concluído!
timeout /t 3 >nul
