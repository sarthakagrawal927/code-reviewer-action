import OpenAI from 'openai';

export class AIClient {
  private openai;
  private model;

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
}
