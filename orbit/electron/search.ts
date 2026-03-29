import https from 'https'

export type SearchResult = {
  title: string
  url: string
  snippet: string
}

function fetchUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      timeout: 8000,
    }, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        fetchUrl(res.headers.location).then(resolve).catch(reject)
        return
      }
      let data = ''
      res.on('data', (chunk) => (data += chunk))
      res.on('end', () => resolve(data))
      res.on('error', reject)
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('Search request timed out')) })
  })
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n)))
}

/**
 * Search DuckDuckGo HTML lite — no API key needed.
 */
export async function webSearch(query: string, maxResults = 5): Promise<SearchResult[]> {
  const encoded = encodeURIComponent(query)
  const url = `https://html.duckduckgo.com/html/?q=${encoded}`
  const html = await fetchUrl(url)

  const results: SearchResult[] = []
  const blocks = html.split('class="result__body"')

  for (let i = 1; i < blocks.length && results.length < maxResults; i++) {
    const block = blocks[i]
    const titleMatch = block.match(/class="result__a"[^>]*>([\s\S]*?)<\/a>/)
    const urlMatch = block.match(/class="result__url"[^>]*>([\s\S]*?)<\/a>/)
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\//)

    if (titleMatch) {
      const title = decodeHtmlEntities(titleMatch[1].replace(/<[^>]+>/g, '').trim())
      let href = ''
      if (urlMatch) {
        href = urlMatch[1].replace(/<[^>]+>/g, '').trim()
        if (!href.startsWith('http')) href = 'https://' + href
      }
      const snippet = snippetMatch
        ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())
        : ''

      results.push({ title, url: href, snippet })
    }
  }

  return results
}

export function formatSearchResults(results: SearchResult[]): string {
  if (results.length === 0) return 'No search results found.'
  return results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join('\n\n')
}
