import { NativeModule, requireOptionalNativeModule } from 'expo';

export type BackgroundUploadEvents = {
  onProgress: (event: { uploadId: string; progress: number }) => void;
  onComplete: (event: { uploadId: string }) => void;
  onError: (event: { uploadId: string; message: string }) => void;
};

declare class BackgroundUploadModule extends NativeModule<BackgroundUploadEvents> {
  startUpload(
    fileUri: string,
    uploadUrl: string,
    uploadToken: string,
    contentType: string,
  ): Promise<string>;
  cancelUpload(uploadId: string): Promise<void>;
}

export default requireOptionalNativeModule<BackgroundUploadModule>('BackgroundUpload');
