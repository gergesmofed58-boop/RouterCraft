export type RouterConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'auth_failed'
  | 'unreachable'
  | 'unsupported_auth';

export interface RouterCredentials {
  ip: string;
  username: string;
  password: string;
}

export interface RouterLiveInfo {
  ip: string;
  username: string;
  endpointUsed: string;
  driverName: string;
  detectedVendorOrModel?: string;
  responseStatus?: number;
  responseSnippet?: string;
}

export interface RouterAuthResult {
  ok: boolean;
  state: RouterConnectionState;
  message: string;
  info?: RouterLiveInfo;
}
