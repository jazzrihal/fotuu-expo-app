import { registerWebModule, NativeModule } from 'expo';

// LocationSearchModule is not available on the web platform.
class LocationSearchModule extends NativeModule<{}> {}

export default registerWebModule(LocationSearchModule, 'LocationSearchModule');
