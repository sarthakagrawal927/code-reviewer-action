import OpenAI from 'openai';

export type ReviewSeverity = 'low' | 'medium' | 'high' | 'critical';

export type ReviewFinding = {
  severity: ReviewSeverity;
  title: string;
  summary: string;
  file?: string;
  line?: number;
};

const VALID_SEVERITIES: ReviewSeverity[] = ['low', 'medium', 'high', 'critical'];

function cleanString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const cleaned = value.trim();
  return cleaned.length > 0 ? cleaned : null;
}

function parseSeverity(value: unknown): ReviewSeverity | null {
  const severity = cleanString(value)?.toLowerCase();
  if (!severity) {
    return null;
  }

  return VALID_SEVERITIES.includes(severity as ReviewSeverity) ? (severity as ReviewSeverity) : null;
}

export class AIClient {
  private openai: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4-turbo') {
    this.openai = new OpenAI({ apiKey });
    this.model = model;
  }

  async reviewDiff(diff: string): Promise<string> {
    const prompt = `You are an expert code reviewer. Review the following pull request diff and provide constructive feedback.
    Focus on potential bugs, security issues, performance improvements, and code style.
    
    Diff:
    ${diff}
    `;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      messages: [
        { role: 'system', content: 'You are a helpful code reviewer.' },
        { role: 'user', content: prompt }
      ]
    });

    return response.choices[0].message.content || 'No comments generated.';
  }

  async extractFindings(diff: string): Promise<ReviewFinding[]> {
    const prompt = `Review this pull request diff and identify concrete issues.
Return only JSON with this shape:
{
  "findings": [
    {
      "severity": "low|medium|high|critical",
      "title": "short title",
      "summary": "what is wrong and why it matters",
      "file": "path/to/file.ext (optional)",
      "line": 123 (optional)
    }
  ]
}
If there are no issues, return {"findings":[]}.

Diff:
${diff}`;

    const response = await this.openai.chat.completions.create({
      model: this.model,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content:
            'You are a precise code reviewer. Report only real issues, avoid speculative findings, and use the requested JSON format.'
        },
        { role: 'user', content: prompt }
      ]
    });

    const content = response.choices[0].message.content;
    if (!content) {
      throw new Error('OpenAI returned an empty findings response.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch (error) {
      throw new Error(`Failed to parse findings JSON response: ${String(error)}`);
    }

    const findingsRaw =
      Array.isArray(parsed)
        ? parsed
        : parsed && typeof parsed === 'object' && Array.isArray((parsed as { findings?: unknown }).findings)
          ? (parsed as { findings: unknown[] }).findings
          : null;

    if (!findingsRaw) {
      throw new Error('Findings response is missing a "findings" array.');
    }

    const findings: ReviewFinding[] = [];
    for (const raw of findingsRaw) {
      if (!raw || typeof raw !== 'object') {
        continue;
      }

      const finding = raw as {
        severity?: unknown;
        title?: unknown;
        summary?: unknown;
        file?: unknown;
        line?: unknown;
      };

      const severity = parseSeverity(finding.severity);
      const summary = cleanString(finding.summary);
      const title = cleanString(finding.title) ?? summary?.slice(0, 120);

      if (!severity || !summary || !title) {
        continue;
      }

      const file = cleanString(finding.file) ?? undefined;
      const line =
        typeof finding.line === 'number' && Number.isInteger(finding.line) && finding.line > 0
          ? finding.line
          : undefined;

      findings.push({
        severity,
        title,
        summary,
        file,
        line
      });
    }

    return findings;
  }
}
