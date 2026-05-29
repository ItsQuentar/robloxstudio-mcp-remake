@echo off
setlocal
echo ======================================================
echo  ROBLOX MCP REMAKE - SETUP ^& UPDATE
echo ======================================================
echo.
echo [1/4] Updating dependencies...
call npm install --silent
echo.
echo [2/4] Building local packages...
call npm run build:all
echo.
echo [3/4] Publishing to NPM...
cd packages\robloxstudio-mcp-remake
call npm publish --access public
cd ..\..
echo.
echo [4/4] Syncing local files...
echo Done!
echo.
echo ======================================================
echo  SETUP COMPLETE! Published to NPM ^& Ready!
echo ======================================================
echo.
echo To use in Gemini CLI:
echo gemini mcp add robloxstudio npx --trust -- -y robloxstudio-mcp-remake@latest
echo.
echo To use local dev build:
echo gemini mcp add robloxstudio node --trust -- %cd%\packages\robloxstudio-mcp-remake\dist\index.js
echo.
echo To update Roblox Plugin in Studio:
echo node packages\robloxstudio-mcp-remake\dist\index.js --install-plugin
echo.
call gemini
pause
endlocal