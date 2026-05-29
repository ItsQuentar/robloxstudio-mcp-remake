export interface OpenCloudConfig {
  apiKey?: string;
  cookie?: string;
  baseUrl?: string;
  timeout?: number;
}

export interface AssetSearchParams {
  searchCategoryType: 'Audio' | 'Model' | 'Decal' | 'Plugin' | 'MeshPart' | 'Video' | 'FontFamily';
  query?: string;
  pageToken?: string;
  pageNumber?: number;
  maxPageSize?: number;
  sortDirection?: 'None' | 'Ascending' | 'Descending';
  sortCategory?: 'Relevance' | 'Trending' | 'Top' | 'AudioDuration' | 'CreateTime' | 'UpdatedTime' | 'Ratings';
  includeOnlyVerifiedCreators?: boolean;
  userId?: number;
  groupId?: number;
}

export interface CreatorInfo {
  userId?: number;
  groupId?: number;
  name?: string;
  verified?: boolean;
}

export interface VotingInfo {
  showVotes: boolean;
  upVotes: number;
  downVotes: number;
  canVote: boolean;
  voteCount: number;
  upVotePercent: number;
}

export interface AssetInfo {
  id: number;
  name: string;
  description?: string;
  assetTypeId?: number;
  createTime?: string;
  updateTime?: string;
  categoryPath?: string;
}

export interface CreatorStoreAsset {
  voting?: VotingInfo;
  creator?: CreatorInfo;
  asset?: AssetInfo;
  creatorStoreProduct?: {
    purchasable: boolean;
    purchasePrice?: {
      currencyCode: string;
      quantity: {
        significand: number;
        exponent: number;
      };
    };
  };
}

export interface AssetSearchResponse {
  nextPageToken?: string;
  creatorStoreAssets: CreatorStoreAsset[];
  totalResults: number;
  filteredKeyword?: string;
}

export interface ThumbnailResponse {
  targetId: number;
  state: 'Completed' | 'Pending' | 'Error' | 'Blocked';
  imageUrl?: string;
}

export class OpenCloudClient {
  private apiKey: string;
  private cookie: string;
  private baseUrl: string;
  private timeout: number;

  constructor(config: OpenCloudConfig = {}) {
    this.apiKey = config.apiKey || process.env.ROBLOX_OPEN_CLOUD_API_KEY || '';
    this.cookie = config.cookie || process.env.ROBLOX_COOKIE || '';
    this.baseUrl = config.baseUrl || 'https://apis.roblox.com';
    this.timeout = config.timeout || 30000;
  }

  hasAuth(): boolean {
    return !!this.apiKey || !!this.cookie;
  }

  private async request<T>(
    endpoint: string,
    options: {
      method?: string;
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      headers?: Record<string, string>;
      useCookie?: boolean;
    } = {}
  ): Promise<T> {
    const { method = 'GET', params, body, headers = {}, useCookie = false } = options;

    if (!this.apiKey && !this.cookie) {
      throw new Error(
        'Authentication not configured. Set ROBLOX_OPEN_CLOUD_API_KEY or ROBLOX_COOKIE environment variable.'
      );
    }

    const url = new URL(endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`);
    if (params) {
      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
          url.searchParams.set(key, String(value));
        }
      }
    }

    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...headers,
    };

    if (this.apiKey && !useCookie) {
      finalHeaders['x-api-key'] = this.apiKey;
    } else if (this.cookie) {
      finalHeaders['Cookie'] = `.ROBLOSECURITY=${this.cookie}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url.toString(), {
        method,
        headers: finalHeaders,
        body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorBody = await response.text();
        let errorMessage: string;
        try {
          const errorJson = JSON.parse(errorBody);
          errorMessage = errorJson.detail || errorJson.message || errorBody;
        } catch {
          errorMessage = errorBody;
        }

        if (response.status === 401) {
          throw new Error('Invalid or expired Authentication (API key or Cookie)');
        } else if (response.status === 403) {
          throw new Error(`Authentication lacks required permissions: ${errorMessage}`);
        } else if (response.status === 429) {
          throw new Error('Rate limit exceeded. Please try again later.');
        } else {
          throw new Error(`Roblox API error (${response.status}): ${errorMessage}`);
        }
      }

      return (await response.json()) as T;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
        throw error;
      }
      throw new Error(`Unknown error: ${String(error)}`);
    }
  }

  async searchAssets(params: AssetSearchParams): Promise<AssetSearchResponse> {
    return this.request<AssetSearchResponse>('/toolbox-service/v2/assets:search', {
      params: {
        searchCategoryType: params.searchCategoryType,
        query: params.query,
        pageToken: params.pageToken,
        pageNumber: params.pageNumber,
        maxPageSize: params.maxPageSize || 25,
        sortDirection: params.sortDirection,
        sortCategory: params.sortCategory,
        includeOnlyVerifiedCreators: params.includeOnlyVerifiedCreators,
        userId: params.userId,
        groupId: params.groupId,
      },
    });
  }

  async getAssetDetails(assetId: number): Promise<CreatorStoreAsset> {
    if (this.apiKey) {
      return this.request<CreatorStoreAsset>(`/toolbox-service/v2/assets/${assetId}`);
    } else {
      const data = await this.request<any>(`https://economy.roblox.com/v2/assets/${assetId}/details`, { useCookie: true });
      return {
        asset: {
          id: data.AssetId,
          name: data.Name,
          description: data.Description,
          assetTypeId: data.AssetTypeId,
          createTime: data.Created,
          updateTime: data.Updated,
        },
        creator: {
          userId: data.Creator.CreatorTargetId,
          name: data.Creator.Name,
          verified: data.Creator.HasVerifiedBadge,
        }
      };
    }
  }

  async uploadDecal(fileBuffer: Buffer, assetName: string, description: string): Promise<{ assetId: number }> {
    if (!this.cookie) {
      throw new Error('upload_decal requires ROBLOX_COOKIE for authentication.');
    }

    const csrfRes = await fetch('https://auth.roblox.com/v2/logout', {
      method: 'POST',
      headers: { 'Cookie': `.ROBLOSECURITY=${this.cookie}` }
    });
    const csrfToken = csrfRes.headers.get('x-csrf-token');
    if (!csrfToken) throw new Error('Failed to get CSRF token for upload');

    const formData = new FormData();
    const blob = new Blob([new Uint8Array(fileBuffer)], { type: 'image/png' });
    formData.append('file', blob, 'decal.png');
    formData.append('assetName', assetName);
    formData.append('description', description);
    formData.append('assetTypeId', '13'); 
    
    const response = await fetch('https://publish.roblox.com/v1/assets/upload', {
      method: 'POST',
      headers: {
        'Cookie': `.ROBLOSECURITY=${this.cookie}`,
        'x-csrf-token': csrfToken,
      },
      body: formData as any,
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Upload failed: ${err}`);
    }

    return (await response.json()) as { assetId: number };
  }

  async getAssetThumbnail(
    assetId: number,
    size: '150x150' | '420x420' | '768x432' = '420x420'
  ): Promise<{ base64: string; mimeType: string } | null> {
    const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${assetId}&size=${size}&format=Png`;

    try {
      const response = await fetch(url);
      if (!response.ok) return null;

      const data = (await response.json()) as { data: ThumbnailResponse[] };
      const thumbnail = data.data[0];

      if (!thumbnail || thumbnail.state !== 'Completed' || !thumbnail.imageUrl) {
        return null;
      }

      // Fetch the actual image and convert to base64
      const imageResponse = await fetch(thumbnail.imageUrl);
      if (!imageResponse.ok) return null;

      const arrayBuffer = await imageResponse.arrayBuffer();
      const base64 = Buffer.from(arrayBuffer).toString('base64');
      return { base64, mimeType: 'image/png' };
    } catch {
      return null;
    }
  }

  async getAssetThumbnails(
    assetIds: number[],
    size: '150x150' | '420x420' | '768x432' = '420x420'
  ): Promise<Map<number, string>> {
    const result = new Map<number, string>();
    if (assetIds.length === 0) return result;

    const batches = [];
    for (let i = 0; i < assetIds.length; i += 100) {
      batches.push(assetIds.slice(i, i + 100));
    }

    for (const batch of batches) {
      const url = `https://thumbnails.roblox.com/v1/assets?assetIds=${batch.join(',')}&size=${size}&format=Png`;
      try {
        const response = await fetch(url);
        if (response.ok) {
          const data = (await response.json()) as { data: ThumbnailResponse[] };
          for (const thumbnail of data.data) {
            if (thumbnail.state === 'Completed' && thumbnail.imageUrl) {
              result.set(thumbnail.targetId, thumbnail.imageUrl);
            }
          }
        }
      } catch {
        // Continue with other batches on failure
      }
    }

    return result;
  }
}
