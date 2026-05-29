interface PendingRequest {
  id: string;
  endpoint: string;
  data: any;
  timestamp: number;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

type PollResolver = (value: { requestId: string; request: { endpoint: string; data: any } } | null) => void;

// Fast ID generator (counter-based, no UUID overhead)
let _idCounter = 0;
function fastId(): string {
  return `r_${(++_idCounter).toString(36)}_${Date.now().toString(36)}`;
}

// Timeout presets for different operation types
const TIMEOUT_PRESETS: Record<string, number> = {
  read: 30000,      // Read operations: 30s
  write: 60000,     // Write operations: 60s
  execute: 120000,  // Luau execution: 120s
  heavy: 180000,    // Heavy operations (sync, build): 180s
};

function getTimeoutForEndpoint(endpoint: string): number {
  if (endpoint.includes('execute') || endpoint.includes('luau')) return TIMEOUT_PRESETS.execute;
  if (endpoint.includes('sync') || endpoint.includes('build') || endpoint.includes('import')) return TIMEOUT_PRESETS.heavy;
  if (endpoint.includes('get') || endpoint.includes('search') || endpoint.includes('file-tree') || endpoint.includes('list')) return TIMEOUT_PRESETS.read;
  return TIMEOUT_PRESETS.write;
}

export class BridgeService {
  private pendingRequests: Map<string, Map<string, PendingRequest>> = new Map();
  private waitingPolls: Map<string, Array<PollResolver>> = new Map();
  private defaultTimeout = 60000;
  private pluginLastSeen: Map<string, number> = new Map();

  constructor() {
    this.pendingRequests.set('edit', new Map());
    this.pendingRequests.set('server', new Map());
    this.pendingRequests.set('client', new Map());
    this.waitingPolls.set('edit', []);
    this.waitingPolls.set('server', []);
    this.waitingPolls.set('client', []);
  }

  markPluginSeen(dataModel: string) {
    this.pluginLastSeen.set(dataModel, Date.now());
  }

  isPluginAlive(dataModel: string): boolean {
    const lastSeen = this.pluginLastSeen.get(dataModel);
    if (!lastSeen) return true; // Assume alive if never seen
    return Date.now() - lastSeen < 15000; // 15s threshold
  }

  async sendRequest(endpoint: string, data: any, timeoutMs?: number): Promise<any> {
    const requestId = fastId();
    const targetModel = data.dataModel || 'edit';
    const queue = this.pendingRequests.get(targetModel) || this.pendingRequests.get('edit')!;
    const effectiveTimeout = timeoutMs || getTimeoutForEndpoint(endpoint);

    return new Promise((resolve, reject) => {
      // Fast path: if there are waiting polls, resolve immediately (zero latency)
      const waiters = this.waitingPolls.get(targetModel) || this.waitingPolls.get('edit')!;
      if (waiters.length > 0) {
        const resolvePoll = waiters.shift()!;
        resolvePoll({ requestId, request: { endpoint, data } });
      }

      const timeoutId = setTimeout(() => {
        if (queue.has(requestId)) {
          queue.delete(requestId);
          reject(new Error(`Request timeout for DataModel: ${targetModel}`));
        }
      }, effectiveTimeout);

      const request: PendingRequest = {
        id: requestId,
        endpoint,
        data,
        timestamp: Date.now(),
        resolve,
        reject,
        timeoutId
      };

      queue.set(requestId, request);
    });
  }

  async getPendingRequest(targetModel: string = 'edit', wait: boolean = true): Promise<{ requestId: string; request: { endpoint: string; data: any } } | null> {
    const queue = this.pendingRequests.get(targetModel) || this.pendingRequests.get('edit')!;
    const oldestRequest = queue.values().next().value;

    if (oldestRequest) {
      return {
        requestId: oldestRequest.id,
        request: {
          endpoint: oldestRequest.endpoint,
          data: oldestRequest.data
        }
      };
    }

    if (wait) {
      return new Promise((resolve) => {
        const waiters = this.waitingPolls.get(targetModel) || this.waitingPolls.get('edit')!;
        const timeoutId = setTimeout(() => {
          const idx = waiters.indexOf(resolve);
          if (idx !== -1) {
            waiters.splice(idx, 1);
            resolve(null);
          }
        }, 20000); // 20s timeout for long polling

        waiters.push((val) => {
          clearTimeout(timeoutId);
          resolve(val);
        });
      });
    }

    return null;
  }

  resolveRequest(requestId: string, response: any) {
    for (const queue of this.pendingRequests.values()) {
      const request = queue.get(requestId);
      if (request) {
        clearTimeout(request.timeoutId);
        queue.delete(requestId);
        request.resolve(response);
        return;
      }
    }
  }

  rejectRequest(requestId: string, error: any) {
    for (const queue of this.pendingRequests.values()) {
      const request = queue.get(requestId);
      if (request) {
        clearTimeout(request.timeoutId);
        queue.delete(requestId);
        request.reject(error);
        return;
      }
    }
  }

  clearAllPendingRequests() {
    for (const queue of this.pendingRequests.values()) {
      for (const [, request] of queue.entries()) {
        clearTimeout(request.timeoutId);
        request.reject(new Error('Connection closed'));
      }
      queue.clear();
    }
    for (const waiters of this.waitingPolls.values()) {
      waiters.forEach(resolve => resolve(null));
      waiters.length = 0;
    }
  }
}
