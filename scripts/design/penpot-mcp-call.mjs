import { readFile } from 'node:fs/promises'
import { Client } from '@modelcontextprotocol/sdk/client/index.js'
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js'

const [toolName = 'execute_code', inputPath] = process.argv.slice(2)

if (!inputPath) {
  throw new Error('Usage: node scripts/design/penpot-mcp-call.mjs <tool> <json-or-code-file>')
}

const rawInput = await readFile(inputPath, 'utf8')
const args = toolName === 'execute_code'
  ? { code: rawInput }
  : JSON.parse(rawInput)

const client = new Client({ name: 'momentum-design-automation', version: '1.0.0' })
const transport = new StreamableHTTPClientTransport(new URL('http://localhost:4401/mcp'))

await client.connect(transport)

try {
  const result = await client.callTool({ name: toolName, arguments: args })
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`)
} finally {
  await client.close()
}
