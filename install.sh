#!/bin/bash
# Roblox Studio MCP Remake - One-Click Install Script (macOS/Linux)
# Usage: curl -fsSL https://raw.githubusercontent.com/qqww2w2K/robloxstudio-mcp-remake/main/install.sh | bash

PACKAGE="robloxstudio-mcp-remake"
MCP_COMMAND="npx"
MCP_ARGS='["-y", "'$PACKAGE'@latest"]'

echo ""
echo "=== Roblox Studio MCP Remake Installer ==="
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "[ERROR] Node.js not found. Please install Node.js 18+ first."
    echo "  Download: https://nodejs.org/"
    exit 1
fi
echo "[OK] Node.js found: $(node --version)"

# Helper function to register MCP server
register_mcp() {
    local config_path="$1"
    local app_name="$2"
    local config_dir
    config_dir=$(dirname "$config_path")

    echo "Registering MCP server for $app_name..."

    if [ ! -d "$config_dir" ]; then
        mkdir -p "$config_dir"
    fi

    if [ -f "$config_path" ]; then
        # Update existing config using node
        node -e "
            const fs = require('fs');
            const path = '$config_path';
            let config = {};
            try { config = JSON.parse(fs.readFileSync(path, 'utf8')); } catch {}
            if (!config.mcpServers) config.mcpServers = {};
            config.mcpServers.robloxstudio = { command: '$MCP_COMMAND', args: $MCP_ARGS };
            fs.writeFileSync(path, JSON.stringify(config, null, 2));
        " 2>/dev/null
    else
        # Create new config
        cat > "$config_path" << EOF
{
  "mcpServers": {
    "robloxstudio": {
      "command": "$MCP_COMMAND",
      "args": $MCP_ARGS
    }
  }
}
EOF
    fi

    if [ $? -eq 0 ]; then
        echo "[OK] $app_name configured"
    else
        echo "[SKIP] $app_name: configuration failed"
    fi
}

# Claude Code
register_mcp "$HOME/.claude.json" "Claude Code"

# Claude Desktop
if [ "$(uname)" = "Darwin" ]; then
    register_mcp "$HOME/Library/Application Support/Claude/claude_desktop_config.json" "Claude Desktop"
else
    register_mcp "$HOME/.config/Claude/claude_desktop_config.json" "Claude Desktop"
fi

# Cursor
register_mcp "$HOME/.cursor/mcp.json" "Cursor"

# Codex CLI
register_mcp "$HOME/.codex/config.json" "Codex CLI"

# Gemini CLI
register_mcp "$HOME/.gemini/settings.json" "Gemini CLI"

echo ""
echo "=== Install Complete ==="
echo ""
echo "Next steps:"
echo "  1. Restart your AI app (Claude Code, Cursor, Codex, Gemini)"
echo "  2. Open Roblox Studio"
echo "  3. Install the plugin from: studio-plugin/MCPPlugin.rbxmx"
echo "  4. Start chatting with AI!"
echo ""
