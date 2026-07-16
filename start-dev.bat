@echo off
setlocal EnableExtensions

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"

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

echo [dev] Iniciando O SISTEMA em modo de desenvolvimento...
start "ASCENSION SYSTEM - Dev" cmd /k "cd /d ""%ROOT_DIR%"" && pnpm dev"

endlocal
