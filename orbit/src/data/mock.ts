import type { MCPTool } from '../types/models'
export type { MCPTool }

export const mcpTools: MCPTool[] = [
  {
    id: 'gmail',
    name: 'Gmail',
    description: 'Read, search, and draft emails from your inbox',
    icon: 'Mail',
    connected: false,
    configSnippet: `{
  "mcpServers": {
    "gmail": {
      "command": "npx",
      "args": ["-y", "@mcp/gmail-server"],
      "env": {
        "GMAIL_OAUTH_TOKEN": "****"
      }
    }
  }
}`,
  },
  {
    id: 'slack',
    name: 'Slack',
    description: 'Send messages, read channels, and manage threads',
    icon: 'MessageSquare',
    connected: true,
    configSnippet: `{
  "mcpServers": {
    "slack": {
      "command": "npx",
      "args": ["-y", "@mcp/slack-server"],
      "env": {
        "SLACK_BOT_TOKEN": "xoxb-****"
      }
    }
  }
}`,
  },
  {
    id: 'github',
    name: 'GitHub',
    description: 'Browse repos, create issues, review pull requests',
    icon: 'Github',
    connected: true,
    configSnippet: `{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@mcp/github-server"],
      "env": {
        "GITHUB_TOKEN": "ghp_****"
      }
    }
  }
}`,
  },
  {
    id: 'calendar',
    name: 'Google Calendar',
    description: 'View events, create meetings, check availability',
    icon: 'Calendar',
    connected: false,
    configSnippet: `{
  "mcpServers": {
    "calendar": {
      "command": "npx",
      "args": ["-y", "@mcp/gcal-server"],
      "env": {
        "GOOGLE_OAUTH_TOKEN": "****"
      }
    }
  }
}`,
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Search pages, create documents, manage databases',
    icon: 'BookOpen',
    connected: false,
    configSnippet: `{
  "mcpServers": {
    "notion": {
      "command": "npx",
      "args": ["-y", "@mcp/notion-server"],
      "env": {
        "NOTION_API_KEY": "ntn_****"
      }
    }
  }
}`,
  },
  {
    id: 'filesystem',
    name: 'Local Files',
    description: 'Read, write, and search files on your local machine',
    icon: 'FolderOpen',
    connected: true,
    configSnippet: `{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@mcp/filesystem-server", "/Users/you/Documents"]
    }
  }
}`,
  },
]
