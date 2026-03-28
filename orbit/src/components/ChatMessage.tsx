import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import OrbitMark from './OrbitMark'

type ChatMessageProps = {
  role: 'user' | 'assistant'
  content: string
  model?: string
  timestamp: string
  isStreaming?: boolean
}

const codeTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.08)',
    fontSize: '12px',
    margin: '12px 0',
    padding: '12px',
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'none',
    fontSize: '12px',
  },
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '')
          const code = String(children).replace(/\n$/, '')
          if (match) {
            return (
              <SyntaxHighlighter
                style={codeTheme}
                language={match[1]}
                PreTag="div"
              >
                {code}
              </SyntaxHighlighter>
            )
          }
          return (
            <code
              className="rounded-md bg-white/8 px-1.5 py-0.5 font-mono text-[12px] text-stone-200"
              {...props}
            >
              {children}
            </code>
          )
        },
        p({ children }) {
          return <p className="mb-3 last:mb-0">{children}</p>
        },
        ul({ children }) {
          return <ul className="mb-3 ml-4 list-disc space-y-1 last:mb-0">{children}</ul>
        },
        ol({ children }) {
          return <ol className="mb-3 ml-4 list-decimal space-y-1 last:mb-0">{children}</ol>
        },
        li({ children }) {
          return <li className="text-white/78">{children}</li>
        },
        strong({ children }) {
          return <strong className="font-semibold text-stone-100">{children}</strong>
        },
        a({ href, children }) {
          return (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-[#7d92ff] underline decoration-white/20 hover:decoration-white/40">
              {children}
            </a>
          )
        },
        blockquote({ children }) {
          return (
            <blockquote className="my-3 border-l-2 border-white/15 pl-3 text-white/58">
              {children}
            </blockquote>
          )
        },
        table({ children }) {
          return (
            <div className="my-3 overflow-x-auto rounded-xl border border-white/8">
              <table className="w-full text-[12px]">{children}</table>
            </div>
          )
        },
        th({ children }) {
          return <th className="border-b border-white/8 bg-white/4 px-3 py-2 text-left font-medium text-stone-200">{children}</th>
        },
        td({ children }) {
          return <td className="border-b border-white/5 px-3 py-2 text-white/68">{children}</td>
        },
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

export default function ChatMessage({
  role,
  content,
  model,
  timestamp,
  isStreaming = false,
}: ChatMessageProps) {
  const isUser = role === 'user'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%]">
          <div className="rounded-2xl bg-white/8 px-4 py-2.5">
            <div className="text-[13px] font-medium leading-[1.5] text-stone-50">
              {content}
            </div>
          </div>
          {timestamp && (
            <div className="mt-1 text-right text-[11px] font-mono text-white/24">
              {timestamp}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-0.5">
        <div className="flex h-5 w-5 items-center justify-center rounded-full border border-white/8 bg-white/4">
          <OrbitMark className="h-3.5 w-3.5 text-white/78" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-[13px] leading-[1.75] text-white/78">
          <MarkdownContent content={content} />
          {isStreaming && (
            <span
              className="ml-px inline-block h-[1.1em] w-[2px] align-text-bottom bg-white"
              style={{ animation: 'blink-cursor 500ms step-end infinite' }}
            />
          )}
        </div>

        {timestamp && (
          <div className="mt-1 text-[11px] font-mono text-white/24">
            {timestamp}
          </div>
        )}
      </div>
    </div>
  )
}
