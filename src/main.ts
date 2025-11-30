import * as core from '@actions/core';
import { GitHubClient } from './github';
import { AIClient } from './ai';

async function run() {
  try {
    const openaiApiKey = core.getInput('openai_api_key');
    const githubToken = core.getInput('github_token');
    const model = core.getInput('model') || 'gpt-4-turbo';

    // if (!openaiApiKey) {
    //   throw new Error('OpenAI API Key is required');
    // }

    const githubClient = new GitHubClient(githubToken);
    // const aiClient = new AIClient(openaiApiKey, model);

    core.info('Fetching PR files...');
    const files = await githubClient.getPRFiles();

    if (files.length === 0) {
      core.info('No files found in PR.');
      return;
    }

    const firstFile = files[0];
    core.info(`Found file: ${firstFile.filename}`);
    core.info('Posting "Hi" comment...');
    
    try {
        await githubClient.createReviewComment(firstFile.filename, 'Hi');
        core.info('Comment posted successfully.');
    } catch (e) {
        core.warning(`Failed to post review comment: ${e}`);
        // Fallback to general comment if review comment fails (e.g. line 1 not in diff)
        await githubClient.postComment(`Hi (General Comment - could not comment on ${firstFile.filename})`);
    }

    /*
    core.info('Fetching PR diff...');
    const diff = await githubClient.getPRDiff();

    if (!diff) {
      core.info('No diff found, skipping review.');
      return;
    }

    core.info('Sending diff to AI for review...');
    const review = await aiClient.reviewDiff(diff);

    core.info('Posting review comments...');
    await githubClient.postComment(review);
    */

    core.info('Review completed successfully.');
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed('An unknown error occurred');
    }
  }
}

run();
