import { UserFileKind } from '../types/user-file/kind';

/**
 * A document as everything but the download route sees it: all of the
 * metadata, none of the bytes.
 */
export interface UserFileSummary {
  id: string;
  kind: UserFileKind;
  name: string;
  filename: string;
  /** The PDF's own size in bytes — what a user recognises as "2.1 MB". */
  byteSize: number;
  /** What the row actually costs once compressed. */
  storedSize: number;
  created_at: string;
  updated_at: string;
}
