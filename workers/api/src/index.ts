import { createServer } from 'http';
import { loadApiWorkerConfig } from './config';
import { GitHubClient } from './github';
import { toHttpContext } from './http';
import { routeRequest } from './router';
import { InMemoryApiStore } from './store';

async function bootstrap() {
  const config = loadApiWorkerConfig();
  const store = new InMemoryApiStore();
  const githubClient = config.githubDriftCheckToken
    ? new GitHubClient({
        baseUrl: config.githubApiBaseUrl,
        token: config.githubDriftCheckToken,
      })
    : undefined;

  const server = createServer(async (request, response) => {
    try {
      const context = await toHttpContext(request);
      const result = await routeRequest(context, {
        store,
        authToken: config.authToken,
        githubClient,
      });

      response.statusCode = result.status;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(JSON.stringify(result.body, null, 2));
    } catch (error) {
      response.statusCode = 500;
      response.setHeader('content-type', 'application/json; charset=utf-8');
      response.end(
        JSON.stringify(
          {
            error: 'internal_error',
            message: error instanceof Error ? error.message : 'Unknown error.',
          },
          null,
          2
        )
      );
    }
  });

  server.listen(config.port, config.host, () => {
    console.log(
      `[worker-api] listening on http://${config.host}:${config.port} ` +
        `(auth ${config.authToken ? 'enabled' : 'disabled'}, ` +
        `githubDrift ${githubClient ? 'enabled' : 'disabled'})`
    );
  });
}

void bootstrap();
