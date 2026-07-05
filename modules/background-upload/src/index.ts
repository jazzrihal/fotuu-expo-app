/**
 * Native background upload module.
 *
 * Platform support:
 *   iOS   — NSURLSession-based upload that persists when the app is backgrounded
 *            (see expo-module.config.json: "platforms": ["apple"]).
 *   Android — No native module. startUpload() throws, and sync-manager.ts catches
 *             the error and falls back to an in-process JS/XHR upload via the
 *             standard Supabase Storage client. Background persistence is not
 *             available on Android until a Kotlin module is added.
 */
import BackgroundUploadModule from './BackgroundUploadModule';

export type UploadProgressEvent = { uploadId: string; progress: number };
export type UploadCompleteEvent = { uploadId: string };
export type UploadErrorEvent = { uploadId: string; message: string };

/**
 * Starts a background PUT upload via NSURLSession.
 * The upload continues even if the app is sent to the background.
 *
 * @param fileUri   Local file:// URI to upload
 * @param uploadUrl Presigned PUT URL (e.g. Supabase signed upload URL)
 * @param uploadToken Bearer token for the Authorization header
 * @param contentType MIME type of the file
 * @returns uploadId string identifying this transfer
 */
export async function startUpload(
  fileUri: string,
  uploadUrl: string,
  uploadToken: string,
  contentType = 'image/jpeg',
): Promise<string> {
  if (!BackgroundUploadModule) {
    throw new Error('BackgroundUpload native module is unavailable. Rebuild the app.');
  }
  return BackgroundUploadModule.startUpload(fileUri, uploadUrl, uploadToken, contentType);
}

export function addProgressListener(
  listener: (event: UploadProgressEvent) => void,
) {
  return BackgroundUploadModule?.addListener('onProgress', listener);
}

export function addCompleteListener(
  listener: (event: UploadCompleteEvent) => void,
) {
  return BackgroundUploadModule?.addListener('onComplete', listener);
}

export function addErrorListener(
  listener: (event: UploadErrorEvent) => void,
) {
  return BackgroundUploadModule?.addListener('onError', listener);
}
