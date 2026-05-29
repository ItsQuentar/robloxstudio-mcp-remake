# Roblox Studio MCP Remake - One-Click Install Script (Windows)
# Usage: irm https://raw.githubusercontent.com/qqww2w2K/robloxstudio-mcp-remake/main/install.ps1 | iex

$PACKAGE = "robloxstudio-mcp-remake"
$MCP_COMMAND = "npx"
$MCP_ARGS = @("-y", "$PACKAGE@latest")

Write-Host ""
Write-Host "=== Roblox Studio MCP Remake Installer ===" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node --version 2>$null
    Write-Host "[OK] Node.js found: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found. Please install Node.js 18+ first." -ForegroundColor Red
    Write-Host "  Download: https://nodejs.org/" -ForegroundColor Yellow
    exit 1
}

# Claude Code
Write-Host ""
Write-Host "Registering MCP server for Claude Code..." -ForegroundColor Yellow
try {
    $claudeConfig = "$env:USERPROFILE\.claude.json"
    if (Test-Path $claudeConfig) {
        $config = Get-Content $claudeConfig -Raw | ConvertFrom-Json
    } else {
        $config = @{}
    }
    if (-not $config.mcpServers) {
        $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue @{} -Force
    }
    $config.mcpServers | Add-Member -NotePropertyName "robloxstudio" -NotePropertyValue @{
        command = $MCP_COMMAND
        args = $MCP_ARGS
    } -Force
    $config | ConvertTo-Json -Depth 10 | Set-Content $claudeConfig
    Write-Host "[OK] Claude Code configured" -ForegroundColor Green
} catch {
    Write-Host "[SKIP] Claude Code: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# Claude Desktop
Write-Host "Registering MCP server for Claude Desktop..." -ForegroundColor Yellow
try {
    $claudeDesktopConfig = "$env:APPDATA\Claude\claude_desktop_config.json"
    if (Test-Path $claudeDesktopConfig) {
        $config = Get-Content $claudeDesktopConfig -Raw | ConvertFrom-Json
    } else {
        $config = @{ mcpServers = @{} }
    }
    if (-not $config.mcpServers) {
        $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue @{} -Force
    }
    $config.mcpServers | Add-Member -NotePropertyName "robloxstudio" -NotePropertyValue @{
        command = $MCP_COMMAND
        args = $MCP_ARGS
    } -Force
    $config | ConvertTo-Json -Depth 10 | Set-Content $claudeDesktopConfig
    Write-Host "[OK] Claude Desktop configured" -ForegroundColor Green
} catch {
    Write-Host "[SKIP] Claude Desktop: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# Cursor
Write-Host "Registering MCP server for Cursor..." -ForegroundColor Yellow
try {
    $cursorConfig = "$env:USERPROFILE\.cursor\mcp.json"
    $cursorDir = Split-Path $cursorConfig
    if (-not (Test-Path $cursorDir)) { New-Item -ItemType Directory -Path $cursorDir -Force | Out-Null }
    if (Test-Path $cursorConfig) {
        $config = Get-Content $cursorConfig -Raw | ConvertFrom-Json
    } else {
        $config = @{ mcpServers = @{} }
    }
    if (-not $config.mcpServers) {
        $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue @{} -Force
    }
    $config.mcpServers | Add-Member -NotePropertyName "robloxstudio" -NotePropertyValue @{
        command = $MCP_COMMAND
        args = $MCP_ARGS
    } -Force
    $config | ConvertTo-Json -Depth 10 | Set-Content $cursorConfig
    Write-Host "[OK] Cursor configured" -ForegroundColor Green
} catch {
    Write-Host "[SKIP] Cursor: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# Codex CLI
Write-Host "Registering MCP server for Codex CLI..." -ForegroundColor Yellow
try {
    $codexConfig = "$env:USERPROFILE\.codex\config.json"
    $codexDir = Split-Path $codexConfig
    if (-not (Test-Path $codexDir)) { New-Item -ItemType Directory -Path $codexDir -Force | Out-Null }
    if (Test-Path $codexConfig) {
        $config = Get-Content $codexConfig -Raw | ConvertFrom-Json
    } else {
        $config = @{ mcpServers = @{} }
    }
    if (-not $config.mcpServers) {
        $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue @{} -Force
    }
    $config.mcpServers | Add-Member -NotePropertyName "robloxstudio" -NotePropertyValue @{
        command = $MCP_COMMAND
        args = $MCP_ARGS
    } -Force
    $config | ConvertTo-Json -Depth 10 | Set-Content $codexConfig
    Write-Host "[OK] Codex CLI configured" -ForegroundColor Green
} catch {
    Write-Host "[SKIP] Codex CLI: $($_.Exception.Message)" -ForegroundColor DarkGray
}

# Gemini CLI
Write-Host "Registering MCP server for Gemini CLI..." -ForegroundColor Yellow
try {
    $geminiConfig = "$env:USERPROFILE\.gemini\settings.json"
    $geminiDir = Split-Path $geminiConfig
    if (-not (Test-Path $geminiDir)) { New-Item -ItemType Directory -Path $geminiDir -Force | Out-Null }
    if (Test-Path $geminiConfig) {
        $config = Get-Content $geminiConfig -Raw | ConvertFrom-Json
    } else {
        $config = @{ mcpServers = @{} }
    }
    if (-not $config.mcpServers) {
        $config | Add-Member -NotePropertyName "mcpServers" -NotePropertyValue @{} -Force
    }
    $config.mcpServers | Add-Member -NotePropertyName "robloxstudio" -NotePropertyValue @{
        command = $MCP_COMMAND
        args = $MCP_ARGS
    } -Force
    $config | ConvertTo-Json -Depth 10 | Set-Content $geminiConfig
    Write-Host "[OK] Gemini CLI configured" -ForegroundColor Green
} catch {
    Write-Host "[SKIP] Gemini CLI: $($_.Exception.Message)" -ForegroundColor DarkGray
}

Write-Host ""
Write-Host "=== Install Complete ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Restart your AI app (Claude Code, Cursor, Codex, Gemini)" -ForegroundColor White
Write-Host "  2. Open Roblox Studio" -ForegroundColor White
Write-Host "  3. Install the plugin from: studio-plugin/MCPPlugin.rbxmx" -ForegroundColor White
Write-Host "  4. Start chatting with AI!" -ForegroundColor White
Write-Host ""
