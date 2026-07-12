import { ContentTypeDefinition } from './types';
import { shortVideoContentType } from './shortVideo';
import { youtubeLongContentType } from './youtubeLong';
import { thumbnailPackContentType } from './thumbnailPack';

export const CONTENT_TYPES: ContentTypeDefinition<unknown>[] = [
  shortVideoContentType as ContentTypeDefinition<unknown>,
  youtubeLongContentType as unknown as ContentTypeDefinition<unknown>,
  thumbnailPackContentType as unknown as ContentTypeDefinition<unknown>,
];

export const DEFAULT_CONTENT_TYPE_ID = 'short_video';

export function getContentType(id: string): ContentTypeDefinition<unknown> {
  return CONTENT_TYPES.find(ct => ct.id === id) || (shortVideoContentType as ContentTypeDefinition<unknown>);
}

export * from './types';
