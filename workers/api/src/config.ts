export type ApiWorkerConfig = {
  host: string;
  port: number;
  authToken?: string;
  githubApiBaseUrl: string;
  githubDriftCheckToken?: string;
};

export function loadApiWorkerConfig(): ApiWorkerConfig {
  const host = process.env.API_WORKER_HOST?.trim() || '127.0.0.1';
  const portRaw = process.env.API_WORKER_PORT?.trim() || '8080';
  const parsedPort = Number(portRaw);

  if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
    throw new Error(`Invalid API_WORKER_PORT: "${portRaw}".`);
  }

  const authToken = process.env.API_WORKER_AUTH_TOKEN?.trim() || undefined;
  const githubApiBaseUrl = process.env.GITHUB_API_BASE_URL?.trim() || 'https://api.github.com';
  const githubDriftCheckToken =
    process.env.GITHUB_DRIFT_CHECK_TOKEN?.trim() ||
    process.env.GITHUB_APP_INSTALLATION_TOKEN?.trim() ||
    process.env.GITHUB_TOKEN?.trim() ||
    undefined;

  return {
    host,
    port: parsedPort,
    authToken,
    githubApiBaseUrl,
    githubDriftCheckToken,
  };
}
