#!/bin/bash
echo "Starting Roblox MCP Dashboard..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    open roblox-mcp-dashboard.html
else
    xdg-open roblox-mcp-dashboard.html || sensible-browser roblox-mcp-dashboard.html
fi

echo "Starting Roblox MCP Server..."
npx -y robloxstudio-mcp-remake@latest
