export interface ApiKeyBase {
  name: string;
}

export interface ApiKeyCreate extends ApiKeyBase {}

export interface ApiKeyResponse extends ApiKeyBase {
  id: number;
  prefix: string;
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

export interface ApiKeyWithSecret extends ApiKeyResponse {
  key: string;
}
