@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

REM Porta do servidor de desenvolvimento (e do tunel do ngrok).
set "DEV_PORT=3000"

cd /d "%ROOT_DIR%"

where pnpm >nul 2>&1
if errorlevel 1 (
    echo [erro] pnpm nao encontrado. Instale com "npm install -g pnpm" e tente novamente.
    exit /b 1
)

if not exist "%ROOT_DIR%\node_modules" (
    echo [setup] Dependencias nao encontradas. Instalando com pnpm install...
    call pnpm install
    if errorlevel 1 (
        echo [erro] Falha ao instalar as dependencias.
        exit /b 1
    )
)

echo [dev] Iniciando O SISTEMA em modo de desenvolvimento (porta %DEV_PORT%)...
start "ASCENSION SYSTEM - Dev" cmd /k "cd /d ""%ROOT_DIR%"" && set PORT=%DEV_PORT% && pnpm dev"

REM ----- Tunel publico via ngrok (acesso pelo celular / HTTPS) -----
where ngrok >nul 2>&1
if errorlevel 1 (
    echo.
    echo [aviso] ngrok nao encontrado no PATH. O servidor local segue rodando.
    echo         Instale o ngrok e configure o token com:
    echo             ngrok config add-authtoken SEU_TOKEN
    echo         Depois rode este script novamente para abrir o tunel publico.
) else (
    echo [ngrok] Aguardando o servidor subir antes de abrir o tunel...
    timeout /t 4 /nobreak >nul
    echo [ngrok] Abrindo tunel publico para http://localhost:%DEV_PORT% ...
    echo         URL publica: veja a janela do ngrok ou http://127.0.0.1:4040
    start "ASCENSION SYSTEM - ngrok" cmd /k "ngrok http %DEV_PORT%"
)

endlocal
