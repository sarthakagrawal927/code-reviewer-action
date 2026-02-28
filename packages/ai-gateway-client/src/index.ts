import { GatewayConfig, GatewayReviewRequest, GatewayReviewResponse } from '@code-reviewer/shared-types';
import { reviewDiffWithOpenAICompatibleGateway } from './openaiCompatible';

export class AIGatewayClient {
  private config: GatewayConfig;

  constructor(config: GatewayConfig) {
    this.config = config;
  }

  async reviewDiff(request: GatewayReviewRequest): Promise<GatewayReviewResponse> {
    return reviewDiffWithOpenAICompatibleGateway(this.config, request);
  }
}
