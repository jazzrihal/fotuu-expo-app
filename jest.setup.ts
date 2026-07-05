// Required for React 19 concurrent mode in tests
(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

// Global mocks for native modules used by post-manager, post-db, sync-manager

jest.mock('expo-sqlite', () => ({
  openDatabaseAsync: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///mock-documents/',
  getInfoAsync: jest.fn(),
  makeDirectoryAsync: jest.fn(),
  copyAsync: jest.fn(),
  deleteAsync: jest.fn(),
}));

jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(() => jest.fn()),
  fetch: jest.fn(() => Promise.resolve({ isConnected: true })),
}));

jest.mock('./modules/background-upload/src', () => ({
  startUpload: jest.fn(),
}));
