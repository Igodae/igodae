@echo off
chcp 65001 > nul
title 이거돼? — GitHub + Vercel 자동 배포

echo.
echo  ╔══════════════════════════════════════════╗
echo  ║   이거돼? 자동 배포 실행기               ║
echo  ║   GitHub push + Vercel Production 배포   ║
echo  ╚══════════════════════════════════════════╝
echo.

:: ── 0. 프로젝트 루트 확인
if not exist "package.json" (
    echo [오류] package.json이 없습니다. 프로젝트 루트에서 실행하세요.
    pause & exit /b 1
)

:: ── 1. Node.js 확인
where node > nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Node.js 미설치. https://nodejs.org 에서 설치하세요.
    pause & exit /b 1
)

:: ── 2. Git 확인
where git > nul 2>&1
if %errorlevel% neq 0 (
    echo [오류] Git 미설치. https://git-scm.com 에서 설치하세요.
    pause & exit /b 1
)

:: ── 3. Vercel CLI 확인 / 자동 설치
where vercel > nul 2>&1
if %errorlevel% neq 0 (
    echo [설치] Vercel CLI 설치 중...
    npm install -g vercel
    if %errorlevel% neq 0 ( echo [오류] Vercel CLI 설치 실패 & pause & exit /b 1 )
    echo [완료] Vercel CLI 설치됨
)

:: ── 4. 현재 브랜치 확인
for /f "tokens=*" %%b in ('git branch --show-current') do set BRANCH=%%b
echo [Git] 현재 브랜치: %BRANCH%
echo.

:: ── 5. 변경사항 표시
echo [Git] 변경된 파일:
git status --short
echo.

:: ── 6. 커밋 메시지 입력
set /p COMMIT_MSG="커밋 메시지 입력 (엔터 = 자동 메시지): "
if "%COMMIT_MSG%"=="" (
    for /f "tokens=2 delims==" %%d in ('wmic os get LocalDateTime /value') do set DT=%%d
    set COMMIT_MSG=chore: auto deploy %DT:~0,8%-%DT:~8,6%
)

:: ── 7. GitHub push
echo.
echo [Git] 스테이징...
git add -A

echo [Git] 커밋: %COMMIT_MSG%
git commit -m "%COMMIT_MSG%"
if %errorlevel% neq 0 ( echo [정보] 새 변경사항 없음 — 커밋 건너뜀 )

echo [Git] origin/%BRANCH% 로 push 중...
git push origin %BRANCH%
if %errorlevel% neq 0 (
    echo [오류] git push 실패. 원격 저장소 연결을 확인하세요.
    pause & exit /b 1
)
echo [완료] GitHub push 성공!

:: ── 8. Vercel Production 배포
echo.
echo [Vercel] Production 배포 시작...
vercel --prod
if %errorlevel% neq 0 (
    echo [오류] Vercel 배포 실패
    echo        vercel login 후 다시 시도하거나 vercel link 로 프로젝트 연결하세요.
    pause & exit /b 1
)

:: ── 9. 완료
echo.
echo  ══════════════════════════════════════════
echo   GitHub   : https://github.com/mnsjwn/igodae
echo   배포 URL : https://wine-beta.vercel.app
echo   Vercel   : https://vercel.com/dashboard
echo  ══════════════════════════════════════════
echo.
pause
