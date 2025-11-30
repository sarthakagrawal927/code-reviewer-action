import * as github from '@actions/github';
import * as core from '@actions/core';

export class GitHubClient {
  private octokit;
  private context;

  constructor(token: string) {
    this.octokit = github.getOctokit(token);
    this.context = github.context;
  }

  async getPRDiff(): Promise<string> {
    const { owner, repo, number } = this.context.issue;
    
    if (!number) {
      throw new Error('No PR number found in context');
    }

    const response = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: number,
      mediaType: {
        format: 'diff'
      }
    });

    return response.data as unknown as string;
  }

  async postComment(body: string): Promise<void> {
    const { owner, repo, number } = this.context.issue;

    if (!number) {
      throw new Error('No PR number found in context');
    }

    await this.octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: number,
      body
    });
  }

  async getPRFiles(): Promise<{ filename: string; sha: string }[]> {
    const { owner, repo, number } = this.context.issue;

    if (!number) {
      throw new Error('No PR number found in context');
    }

    const { data: files } = await this.octokit.rest.pulls.listFiles({
      owner,
      repo,
      pull_number: number
    });

    return files.map(file => ({
      filename: file.filename,
      sha: file.sha
    }));
  }

  async createReviewComment(path: string, body: string): Promise<void> {
    const { owner, repo, number } = this.context.issue;

    if (!number) {
      throw new Error('No PR number found in context');
    }

    // For a simple test, we'll try to comment on the PR itself or a general review comment
    // Review comments usually require a position or line. 
    // However, creating a general PR review with a comment is safer for "just testing" if we don't have a specific line.
    // But the user asked to comment on the *first file*.
    // To comment on a file, we usually need a commit_id and path.
    
    const pr = await this.octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: number
    });

    await this.octokit.rest.pulls.createReview({
      owner,
      repo,
      pull_number: number,
      commit_id: pr.data.head.sha,
      event: 'COMMENT',
      comments: [
        {
          path,
          body,
          // If we don't specify line/position, it might fail or be a file-level comment if supported.
          // File-level comments are not standard in the API without a position in the diff.
          // Let's try to comment on line 1 if possible, or just use the createReview API which allows file comments in some contexts?
          // Actually, the safest way for a "Hi" test on a file is to pick line 1.
          line: 1
        }
      ]
    });
  }
}
