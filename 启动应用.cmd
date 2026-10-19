@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24 或更新版本，然后重新运行。
  pause
  exit /b 1
)
if not exist node_modules call npm ci
if errorlevel 1 goto failed
call npm run setup
if errorlevel 1 goto failed
call npm run build
if errorlevel 1 goto failed
echo 请在浏览器打开 http://localhost:3000
call npm start
goto end
:failed
echo 启动未完成，请保留上方错误信息。
:end
pause
