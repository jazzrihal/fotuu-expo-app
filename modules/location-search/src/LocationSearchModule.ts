import { NativeModule, requireNativeModule } from 'expo';

declare class LocationSearchModule extends NativeModule<{}> {
  setValueAsync(value: string): Promise<void>;
}

export default requireNativeModule<LocationSearchModule>('LocationSearch');
