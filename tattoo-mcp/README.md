# Tattoo MCP Server

This is a custom Model Context Protocol (MCP) server designed specifically for the Tattoo Hub project. It provides AI agents with direct database access, RLS auditing capabilities, and webhook simulation tools.

## Setup

1. Copy `.env.example` to `.env`.
2. Add your Supabase `DATABASE_URL` to the `.env` file.
   - Example: `postgresql://postgres.[ref]:[password]@[host]:6543/postgres`
3. Build the project:
   ```bash
   npm run build
   ```

## Integration with AI Clients

To give your AI assistant access to these tools, you need to register this MCP server in your AI client's configuration file.

### For Claude Desktop App
Add the following to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "tattoo-mcp": {
      "command": "node",
      "args": [
        "/home/dazaran/Загрузки/Tattoo HUB/tattoo-mcp/dist/index.js"
      ],
      "env": {
        "DATABASE_URL": "postgresql://postgres.[ref]:[password]@[host]:6543/postgres"
      }
    }
  }
}
```

*Note: You can pass the environment variables directly in the config, or ensure the `.env` file is loaded by the script.*

## Tools Provided

1. `simulator_fire_event`: Fires a mock HTTP POST request to test webhooks (like Stripe or Auth hooks).
2. `auditor_check_rls`: Simulates a database query under a specific role (e.g., `authenticated`) and user ID to verify Row Level Security policies.
3. `db_execute_sql`: Executes raw SQL queries for database inspection and manual testing.
