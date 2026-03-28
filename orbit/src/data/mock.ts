import type { Message, Conversation, MCPTool } from '../types/models'
export type { Message, Conversation, MCPTool }

export const conversations: Conversation[] = [
  {
    id: 'conv-1',
    title: 'Python async patterns',
    lastMessage: 'Here\'s how to structure async/await in Python...',
    timestamp: '2 hours ago',
    model: 'Llama 3.3',
    messages: [
      {
        id: 'msg-1',
        role: 'user',
        content: 'Can you explain Python async/await patterns? I\'m trying to build a web scraper that fetches multiple pages concurrently.',
        timestamp: '2:14 PM',
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Great question! Python\'s `asyncio` library makes concurrent I/O operations elegant. Here\'s the key pattern:\n\n```python\nimport asyncio\nimport aiohttp\n\nasync def fetch_page(session, url):\n    async with session.get(url) as response:\n        return await response.text()\n\nasync def scrape_all(urls):\n    async with aiohttp.ClientSession() as session:\n        tasks = [fetch_page(session, url) for url in urls]\n        return await asyncio.gather(*tasks)\n```\n\nThe `asyncio.gather()` call runs all fetch operations concurrently. Each `fetch_page` coroutine yields control while waiting for the HTTP response, allowing other fetches to proceed.\n\nKey points:\n- Use `aiohttp` instead of `requests` (which is synchronous)\n- `gather()` runs coroutines concurrently, not in parallel\n- Add error handling with `return_exceptions=True`\n- Consider `asyncio.Semaphore` to limit concurrent connections',
        model: 'Llama 3.3',
        timestamp: '2:14 PM',
      },
    ],
  },
  {
    id: 'conv-2',
    title: 'React component design',
    lastMessage: 'For a design system, I\'d recommend starting with...',
    timestamp: 'Yesterday',
    model: 'Mistral',
    messages: [
      {
        id: 'msg-3',
        role: 'user',
        content: 'What\'s the best approach to building a React component library?',
        timestamp: '4:30 PM',
      },
      {
        id: 'msg-4',
        role: 'assistant',
        content: 'For a design system, I\'d recommend starting with these foundational decisions:\n\n1. **Styling approach**: CSS-in-JS (Styled Components), utility-first (Tailwind), or CSS Modules\n2. **Component API**: Compound components vs flat props\n3. **Accessibility**: Build ARIA patterns into every component from day one\n\nStart with primitives: Button, Input, Card, Modal. Then compose upward.',
        model: 'Mistral',
        timestamp: '4:31 PM',
      },
    ],
  },
  {
    id: 'conv-3',
    title: 'Data analysis workflow',
    lastMessage: 'You can use pandas to quickly clean and transform...',
    timestamp: '3 days ago',
    model: 'Llama 3.3',
    messages: [],
  },
]

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


export const suggestions = [
  { icon: 'FileText', title: 'Summarize a document', description: 'Upload a PDF or paste text to get a concise summary' },
  { icon: 'Code', title: 'Write code', description: 'Generate, debug, or explain code in any language' },
  { icon: 'BarChart3', title: 'Analyze data', description: 'Process CSV files, find patterns, create visualizations' },
]

export const aiResponses = [
  "I'd be happy to help with that! Let me think through this step by step.\n\nFirst, let's consider the key factors at play here. The approach you're describing is quite common in modern software development, and there are several well-established patterns we can follow.\n\nHere's what I'd recommend:\n\n1. **Start with a clear data model** - Define your types upfront so everything flows naturally\n2. **Keep state management simple** - You likely don't need Redux; React's built-in state is powerful enough\n3. **Optimize for readability** - Future you will thank present you\n\nWould you like me to elaborate on any of these points?",
  "That's a great question! Here's a concise breakdown:\n\n```typescript\n// The key pattern you need\nconst processData = async (input: DataStream) => {\n  const validated = schema.parse(input)\n  const transformed = pipe(\n    validated,\n    normalize,\n    deduplicate,\n    enrich\n  )\n  return transformed\n}\n```\n\nThe functional pipeline approach keeps each transformation step isolated and testable. You can swap steps in and out without affecting the rest of the chain.\n\nLet me know if you want me to break down any of these transformation functions!",
  "Interesting approach! Let me offer a few thoughts:\n\nThe architecture you're describing follows the **hexagonal architecture** pattern (also called ports and adapters). It's excellent for:\n\n- **Testability**: Mock any external dependency easily\n- **Flexibility**: Swap databases, APIs, or UIs without touching business logic\n- **Clarity**: Each layer has a clear, single responsibility\n\nThe trade-off is initial setup complexity, but it pays dividends as the project grows. For a project of your scale, I think it's the right call.\n\nShall I sketch out the folder structure?",
]
