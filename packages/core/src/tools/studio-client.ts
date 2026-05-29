import { BridgeService } from '../bridge-service.js';

export class StudioHttpClient {
  private bridge: BridgeService;
  private defaultDataModel: string | undefined;

  constructor(bridge: BridgeService) {
    this.bridge = bridge;
  }

  setDataModel(dataModel: string | undefined) {
    this.defaultDataModel = dataModel;
  }

  async request(endpoint: string, data: any, timeoutMs?: number, retries: number = 1): Promise<any> {
    let lastError: Error | null = null;
    const dataModel = this.defaultDataModel || data.dataModel || 'edit';

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const requestData = { ...data };
        if (this.defaultDataModel && !requestData.dataModel) {
          requestData.dataModel = this.defaultDataModel;
        }
        const response = await this.bridge.sendRequest(endpoint, requestData, timeoutMs);
        return response;
      } catch (error) {
        lastError = error as Error;
        const isTimeout = (error as Error).message?.includes('timeout');

        if (!isTimeout || attempt === retries) {
          if (isTimeout) {
            throw new Error(
              `Request timeout after ${retries + 1} attempts. The Studio plugin may be busy or disconnected.`
            );
          }
          throw error;
        }

        // Skip retry if plugin is known to be dead
        if (!this.bridge.isPluginAlive(dataModel)) {
          throw new Error('Studio plugin appears to be disconnected. Check Studio and plugin status.');
        }

        // Wait before retry (short backoff)
        await new Promise(r => setTimeout(r, 300 * (attempt + 1)));
      }
    }

    throw lastError;
  }
}