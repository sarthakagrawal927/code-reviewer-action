import { createHash } from 'crypto';
import {
  IndexedCodeLanguage,
  IndexedFileRecord,
  IndexedSymbolKind,
  SemanticChunkRecord,
} from '@code-reviewer/shared-types';

export type SourceFileForIndexing = {
  repositoryId: string;
  sourceRef: string;
  path: string;
  blobSha: string;
  content: string;
};

export type SyntaxChunkingConfig = {
  maxFileBytes: number;
  maxChunkLines: number;
};

type ChunkCandidate = {
  symbolKind: IndexedSymbolKind;
  symbolName?: string;
  startLine: number;
  endLine: number;
};

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function detectLanguage(path: string): IndexedCodeLanguage {
  if (path.endsWith('.ts')) return 'typescript';
  if (path.endsWith('.tsx')) return 'tsx';
  if (path.endsWith('.js')) return 'javascript';
  if (path.endsWith('.jsx')) return 'jsx';
  if (path.endsWith('.py')) return 'python';
  if (path.endsWith('.go')) return 'go';
  if (path.endsWith('.java')) return 'java';
  if (path.endsWith('.cs')) return 'csharp';
  if (path.endsWith('.rb')) return 'ruby';
  if (path.endsWith('.php')) return 'php';
  if (path.endsWith('.rs')) return 'rust';
  if (path.endsWith('.kt')) return 'kotlin';
  if (path.endsWith('.swift')) return 'swift';
  if (path.endsWith('.sql')) return 'sql';
  if (path.endsWith('.yaml') || path.endsWith('.yml')) return 'yaml';
  if (path.endsWith('.json')) return 'json';
  if (path.endsWith('.md')) return 'markdown';
  return 'other';
}

function splitLines(content: string): string[] {
  return content.split(/\r?\n/);
}

function inferSymbolKind(rawType: string): IndexedSymbolKind {
  if (rawType === 'class') return 'class';
  if (rawType === 'interface') return 'interface';
  if (rawType === 'type') return 'type';
  if (rawType === 'enum') return 'enum';
  if (rawType === 'const' || rawType === 'let' || rawType === 'var') return 'const';
  return 'function';
}

function findCandidates(lines: string[], language: IndexedCodeLanguage): ChunkCandidate[] {
  const candidates: ChunkCandidate[] = [];
  const patterns: Array<{
    pattern: RegExp;
    resolve(match: RegExpExecArray): { symbolKind: IndexedSymbolKind; symbolName?: string };
  }> = [];

  if (language === 'typescript' || language === 'tsx' || language === 'javascript' || language === 'jsx') {
    patterns.push({
      pattern: /^\s*(?:export\s+)?(class|interface|type|enum|function|const|let|var)\s+([A-Za-z0-9_$]+)/,
      resolve: match => ({
        symbolKind: inferSymbolKind(match[1] || 'function'),
        symbolName: match[2],
      }),
    });
    patterns.push({
      pattern: /^\s*(?:export\s+)?(?:async\s+)?function\s+([A-Za-z0-9_$]+)/,
      resolve: match => ({
        symbolKind: 'function',
        symbolName: match[1],
      }),
    });
    patterns.push({
      pattern: /^\s*(?:export\s+)?const\s+([A-Za-z0-9_$]+)\s*=\s*(?:async\s*)?\(/,
      resolve: match => ({
        symbolKind: 'const',
        symbolName: match[1],
      }),
    });
  } else if (language === 'python') {
    patterns.push({
      pattern: /^\s*(class|def)\s+([A-Za-z_][A-Za-z0-9_]*)/,
      resolve: match => ({
        symbolKind: match[1] === 'class' ? 'class' : 'function',
        symbolName: match[2],
      }),
    });
  } else {
    patterns.push({
      pattern: /^\s*(class|interface|type|enum|function|def)\s+([A-Za-z_][A-Za-z0-9_]*)/,
      resolve: match => ({
        symbolKind: inferSymbolKind(match[1] || 'function'),
        symbolName: match[2],
      }),
    });
  }

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    for (const item of patterns) {
      const match = item.pattern.exec(line);
      if (!match) continue;
      const resolved = item.resolve(match);
      candidates.push({
        symbolKind: resolved.symbolKind,
        symbolName: resolved.symbolName,
        startLine: index + 1,
        endLine: lines.length,
      });
      break;
    }
  }

  if (candidates.length === 0) {
    candidates.push({
      symbolKind: 'module',
      startLine: 1,
      endLine: lines.length,
    });
    return candidates;
  }

  for (let i = 0; i < candidates.length; i += 1) {
    const next = candidates[i + 1];
    if (next) {
      candidates[i].endLine = Math.max(candidates[i].startLine, next.startLine - 1);
    }
  }

  return candidates;
}

function clampCandidate(candidate: ChunkCandidate, maxChunkLines: number): ChunkCandidate[] {
  const totalLines = candidate.endLine - candidate.startLine + 1;
  if (totalLines <= maxChunkLines) {
    return [candidate];
  }

  const slices: ChunkCandidate[] = [];
  let start = candidate.startLine;

  while (start <= candidate.endLine) {
    const end = Math.min(candidate.endLine, start + maxChunkLines - 1);
    slices.push({
      symbolKind: candidate.symbolKind,
      symbolName: candidate.symbolName,
      startLine: start,
      endLine: end,
    });
    start = end + 1;
  }

  return slices;
}

export function buildSyntaxAwareIndexForFile(
  file: SourceFileForIndexing,
  config: SyntaxChunkingConfig
): { fileRecord: IndexedFileRecord; chunks: SemanticChunkRecord[] } {
  const sizeBytes = Buffer.byteLength(file.content, 'utf8');
  if (sizeBytes > config.maxFileBytes) {
    throw new Error(
      `File ${file.path} is ${sizeBytes} bytes, above maxFileBytes=${config.maxFileBytes}.`
    );
  }

  const language = detectLanguage(file.path);
  const fileContentSha256 = sha256(file.content);
  const indexedAt = new Date().toISOString();
  const lines = splitLines(file.content);

  const fileRecord: IndexedFileRecord = {
    id: `file_${sha256(`${file.repositoryId}:${file.sourceRef}:${file.path}:${fileContentSha256}`)}`,
    repositoryId: file.repositoryId,
    sourceRef: file.sourceRef,
    path: file.path,
    blobSha: file.blobSha,
    contentSha256: fileContentSha256,
    language,
    sizeBytes,
    indexedAt,
    chunkStrategy: 'syntax-aware',
  };

  const rawCandidates = findCandidates(lines, language);
  const candidates = rawCandidates.flatMap(candidate =>
    clampCandidate(candidate, Math.max(20, config.maxChunkLines))
  );

  const chunks: SemanticChunkRecord[] = [];
  let ordinal = 0;
  for (const candidate of candidates) {
    const content = lines.slice(candidate.startLine - 1, candidate.endLine).join('\n').trim();
    if (!content) {
      continue;
    }

    ordinal += 1;
    const contentSha256 = sha256(content);
    const id = `chunk_${sha256(
      `${file.repositoryId}:${file.sourceRef}:${file.path}:${candidate.startLine}:${candidate.endLine}:${contentSha256}`
    )}`;
    chunks.push({
      id,
      repositoryId: file.repositoryId,
      sourceRef: file.sourceRef,
      filePath: file.path,
      fileContentSha256,
      language,
      symbolKind: candidate.symbolKind,
      symbolName: candidate.symbolName,
      chunkOrdinal: ordinal,
      startLine: candidate.startLine,
      endLine: candidate.endLine,
      content,
      contentSha256,
      createdAt: indexedAt,
    });
  }

  return {
    fileRecord,
    chunks,
  };
}
