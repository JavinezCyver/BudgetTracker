@echo off
title PocketPlan - Local Website
cd /d "%~dp0"
echo Starting PocketPlan at http://127.0.0.1:5173/
echo Keep this window open while using the website.
echo.
call npm.cmd run dev
echo.
echo The local server has stopped.
pause
