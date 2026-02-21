import { createServer } from 'http';
import { loadApiWorkerConfig } from './config';
import { GitHubClient } from './github';
import { toHttpContext } from './http';
import { routeRequest } from './router';
import { InMemoryApiStore } from './store';

function applyCorsHeaders(response: import('http').ServerResponse, corsOrigin: string): void {
  response.setHeader('access-control-allow-origin', corsOrigin);
  response.setHeader('access-control-allow-methods', 'GET,POST,PUT,OPTIONS');
  response.setHeader(
    'access-control-allow-headers',
    'content-type,authorization,x-github-delivery,x-github-event,x-hub-signature-256'
  );
  response.setHeader('access-control-max-age', '600');
}

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
      applyCorsHeaders(response, config.corsOrigin);

      if ((request.method || 'GET').toUpperCase() === 'OPTIONS') {
        response.statusCode = 204;
        response.end();
        return;
      }

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
      applyCorsHeaders(response, config.corsOrigin);
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
        `githubDrift ${githubClient ? 'enabled' : 'disabled'}, ` +
        `cors ${config.corsOrigin})`
    );
  });
}

void bootstrap();
