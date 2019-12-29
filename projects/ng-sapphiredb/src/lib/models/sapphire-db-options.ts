import {InjectionToken} from '@angular/core';

export interface SapphireDbOptions {
  connectionType?: 'websocket'|'sse'|'poll';
  serverBaseUrl?: string;
  useSsl?: boolean;
  apiKey?: string;
  apiSecret?: string;
  pollingTime?: number;
}

export const SAPPHIRE_DB_OPTIONS = new InjectionToken<SapphireDbOptions>('sapphire-db.options');
