@echo off
cd /d "%~dp0"

if not exist node_modules (
    echo node_modules가 없습니다. npm install 실행 중...
    npm install
)

npm run dev
pause
