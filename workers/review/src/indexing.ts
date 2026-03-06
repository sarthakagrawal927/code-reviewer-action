import { Parser, Language, type Node as TSNode } from 'web-tree-sitter';
import type {
  IndexedCodeLanguage,
  IndexedFileRecord,
  IndexedSymbolKind,
  IndexingChunkStrategy,
  SemanticChunkRecord,
} from '@code-reviewer/shared-types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type SourceFileForIndexing = {
  repositoryId: string;
  sourceRef: string;
  path: string;
  blobSha: string;
  content: string;
};

export type TreeSitterChunkingConfig = {
  maxFileBytes: number;
  maxChunkLines: number;
};

// ── Hashing (Web Crypto API — works in CF Workers) ────────────────────────────

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ── Language detection ────────────────────────────────────────────────────────

const EXTENSION_MAP: Record<string, IndexedCodeLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'tsx',
  '.js': 'javascript',
  '.jsx': 'jsx',
  '.py': 'python',
  '.go': 'go',
  '.java': 'java',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.rs': 'rust',
  '.kt': 'kotlin',
  '.swift': 'swift',
  '.sql': 'sql',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.json': 'json',
  '.md': 'markdown',
};

export function detectLanguage(path: string): IndexedCodeLanguage {
  const dot = path.lastIndexOf('.');
  if (dot === -1) return 'other';
  const ext = path.slice(dot).toLowerCase();
  return EXTENSION_MAP[ext] ?? 'other';
}

// ── Tree-sitter init ──────────────────────────────────────────────────────────

let initialized = false;
const languageCache = new Map<string, Language>();

async function ensureInit(): Promise<void> {
  if (initialized) return;
  await Parser.init();
  initialized = true;
}

async function getLanguage(_lang: IndexedCodeLanguage): Promise<Language | null> {
  if (languageCache.has(_lang)) return languageCache.get(_lang)!;
  // Grammar WASM loading depends on deployment environment.
  // In CF Workers we cannot reliably load from filesystem or URL,
  // so we return null to trigger the line-based fallback.
  return null;
}

// ── Node type → symbol kind mapping ───────────────────────────────────────────

const NODE_TYPE_TO_SYMBOL_KIND: Record<string, IndexedSymbolKind> = {
  function_declaration: 'function',
  function_definition: 'function',
  class_declaration: 'class',
  class_definition: 'class',
  method_definition: 'method',
  interface_declaration: 'interface',
  type_alias_declaration: 'type',
  enum_declaration: 'enum',
  variable_declarator: 'const',
};

const LANGUAGE_NODE_TYPES: Record<string, string[]> = {
  javascript: ['function_declaration', 'class_declaration', 'method_definition', 'variable_declarator'],
  jsx: ['function_declaration', 'class_declaration', 'method_definition', 'variable_declarator'],
  typescript: [
    'function_declaration',
    'class_declaration',
    'method_definition',
    'variable_declarator',
    'interface_declaration',
    'type_alias_declaration',
    'enum_declaration',
  ],
  tsx: [
    'function_declaration',
    'class_declaration',
    'method_definition',
    'variable_declarator',
    'interface_declaration',
    'type_alias_declaration',
    'enum_declaration',
  ],
  python: ['function_definition', 'class_definition'],
};

// ── Tree-sitter chunking ──────────────────────────────────────────────────────

interface ExtractedNode {
  kind: IndexedSymbolKind;
  name: string | undefined;
  startLine: number; // 0-based
  endLine: number; // 0-based inclusive
  content: string;
}

function extractNodes(
  rootNode: TSNode,
  lines: string[],
  lang: IndexedCodeLanguage
): ExtractedNode[] {
  const targetTypes = LANGUAGE_NODE_TYPES[lang];
  if (!targetTypes) return [];

  const results: ExtractedNode[] = [];
  const targetSet = new Set(targetTypes);

  function walk(node: TSNode, depth: number): void {
    if (targetSet.has(node.type)) {
      const kind = NODE_TYPE_TO_SYMBOL_KIND[node.type];
      if (!kind) return;

      // For variable_declarator, only keep top-level arrow functions
      if (node.type === 'variable_declarator') {
        if (depth > 2) return; // not top-level (program > lexical_declaration > variable_declarator)
        const init = node.childForFieldName('value');
        if (!init || init.type !== 'arrow_function') return;
      }

      const startLine = node.startPosition.row;
      const endLine = node.endPosition.row;
      const content = lines.slice(startLine, endLine + 1).join('\n');
      const name = node.childForFieldName('name')?.text;

      results.push({ kind, name, startLine, endLine, content });
    }

    for (let i = 0; i < node.childCount; i++) {
      walk(node.child(i)!, depth + 1);
    }
  }

  walk(rootNode, 0);
  return results;
}

// ── Fallback line-based chunking ──────────────────────────────────────────────

function fallbackChunks(
  lines: string[],
  maxChunkLines: number
): Array<{ startLine: number; endLine: number; content: string }> {
  const chunks: Array<{ startLine: number; endLine: number; content: string }> = [];
  const totalLines = lines.length;
  if (totalLines === 0) return chunks;

  for (let start = 0; start < totalLines; start += maxChunkLines) {
    const end = Math.min(start + maxChunkLines, totalLines) - 1;
    const content = lines.slice(start, end + 1).join('\n');
    chunks.push({ startLine: start, endLine: end, content });
  }

  return chunks;
}

// ── Split oversized nodes ─────────────────────────────────────────────────────

const MIN_CHUNK_LINES = 20;

function splitNode(
  node: ExtractedNode,
  lines: string[],
  maxChunkLines: number
): ExtractedNode[] {
  const nodeLines = node.endLine - node.startLine + 1;
  if (nodeLines <= maxChunkLines) return [node];

  const subChunks: ExtractedNode[] = [];
  for (let start = node.startLine; start <= node.endLine; start += maxChunkLines) {
    const end = Math.min(start + maxChunkLines - 1, node.endLine);
    // Don't create tiny trailing chunks — merge with previous
    if (end - start + 1 < MIN_CHUNK_LINES && subChunks.length > 0) {
      const prev = subChunks[subChunks.length - 1]!;
      prev.endLine = end;
      prev.content = lines.slice(prev.startLine, end + 1).join('\n');
      continue;
    }
    const content = lines.slice(start, end + 1).join('\n');
    subChunks.push({
      kind: node.kind,
      name: node.name,
      startLine: start,
      endLine: end,
      content,
    });
  }

  return subChunks;
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function chunkFileWithTreeSitter(
  file: SourceFileForIndexing,
  config: TreeSitterChunkingConfig
): Promise<{ fileRecord: IndexedFileRecord; chunks: SemanticChunkRecord[] }> {
  const { repositoryId, sourceRef, path, blobSha, content } = file;
  const sizeBytes = new TextEncoder().encode(content).length;
  const lang = detectLanguage(path);
  const contentSha256 = await sha256(content);
  const now = new Date().toISOString();
  const chunkStrategy: IndexingChunkStrategy = 'tree-sitter';

  const fileRecordId = await sha256(`${repositoryId}:${sourceRef}:${path}:${contentSha256}`);

  const fileRecord: IndexedFileRecord = {
    id: fileRecordId,
    repositoryId,
    sourceRef,
    path,
    blobSha,
    contentSha256,
    language: lang,
    sizeBytes,
    indexedAt: now,
    chunkStrategy,
  };

  const lines = content.split('\n');

  // Skip files that exceed size limit
  if (sizeBytes > config.maxFileBytes) {
    return { fileRecord, chunks: [] };
  }

  await ensureInit();
  const grammar = await getLanguage(lang);

  let rawChunks: Array<{
    kind: IndexedSymbolKind;
    name: string | undefined;
    startLine: number;
    endLine: number;
    content: string;
  }>;

  if (grammar) {
    // Tree-sitter parse
    const parser = new Parser();
    parser.setLanguage(grammar);
    const tree = parser.parse(content);

    if (!tree) {
      // Parse failed — fall back to line-based
      rawChunks = fallbackChunks(lines, config.maxChunkLines).map((c) => ({
        kind: 'module' as IndexedSymbolKind,
        name: undefined,
        ...c,
      }));
    } else {
      const nodes = extractNodes(tree.rootNode, lines, lang);

      // Split oversized nodes + flatten
      rawChunks = nodes.flatMap((n) => splitNode(n, lines, config.maxChunkLines));

      // If tree-sitter found nothing, fall back to line-based
      if (rawChunks.length === 0) {
        rawChunks = fallbackChunks(lines, config.maxChunkLines).map((c) => ({
          kind: 'module' as IndexedSymbolKind,
          name: undefined,
          ...c,
        }));
      }
    }
  } else {
    // No grammar available — line-based fallback
    rawChunks = fallbackChunks(lines, config.maxChunkLines).map((c) => ({
      kind: 'module' as IndexedSymbolKind,
      name: undefined,
      ...c,
    }));
  }

  // Deduplicate by content SHA and build SemanticChunkRecords
  const seenShas = new Set<string>();
  const chunks: SemanticChunkRecord[] = [];
  let ordinal = 0;

  for (const raw of rawChunks) {
    const chunkSha = await sha256(raw.content);
    if (seenShas.has(chunkSha)) continue;
    seenShas.add(chunkSha);

    const chunkId = await sha256(
      `${repositoryId}:${sourceRef}:${path}:${raw.startLine}:${raw.endLine}:${chunkSha}`
    );

    chunks.push({
      id: chunkId,
      repositoryId,
      sourceRef,
      filePath: path,
      fileContentSha256: contentSha256,
      language: lang,
      symbolKind: raw.kind,
      symbolName: raw.name,
      chunkOrdinal: ordinal++,
      startLine: raw.startLine,
      endLine: raw.endLine,
      content: raw.content,
      contentSha256: chunkSha,
      createdAt: now,
    });
  }

  return { fileRecord, chunks };
}
