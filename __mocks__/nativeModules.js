// require('react-native-gesture-handler/jestSetup');
// require('react-native-reanimated').setUpTests();

jest.mock('@op-engineering/op-sqlite', () => ({
  open: jest.fn(() => ({
    execute: jest.fn(),
    executeAsync: jest.fn(),
    executeBatch: jest.fn(),
    executeBatchAsync: jest.fn(),
    close: jest.fn(),
    attach: jest.fn(),
    detach: jest.fn(),
    transaction: jest.fn(),
  })),
}));

jest.mock('@preeternal/react-native-cookie-manager', () => ({
  __esModule: true,
  default: {
    set: jest.fn(() => Promise.resolve(true)),
    setFromResponse: jest.fn(() => Promise.resolve(true)),
    get: jest.fn(() => Promise.resolve({})),
    clearAll: jest.fn(() => Promise.resolve(true)),
    clearByName: jest.fn(() => Promise.resolve(true)),
  },
}));

jest.mock('react-native-quick-base64', () => ({
  byteLength: jest.fn(),
  toByteArray: jest.fn(),
  fromByteArray: jest.fn(),
}));

jest.mock('react-native-quick-crypto', () => ({
  createHash: jest.fn(),
  createHmac: jest.fn(),
  pbkdf2Sync: jest.fn(),
  randomBytes: jest.fn(),
  randomUUID: jest.fn(() => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
    /[xy]/g,
    c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    },
  )),
}));

jest.mock('react-native-device-info', () => require('react-native-device-info/jest/react-native-device-info-mock'));

jest.mock('@specs/NativeFile', () => ({
  __esModule: true,
  default: {
    writeFile: jest.fn(),
    readFile: jest.fn(() => ''),
    copyFile: jest.fn(),
    moveFile: jest.fn(),
    exists: jest.fn(() => true),
    mkdir: jest.fn(),
    unlink: jest.fn(),
    readDir: jest.fn(() => []),
    getFileSize: jest.fn(() => 0),
    getFreeSpace: jest.fn(() => 1000000),
    detectImageMimeType: jest.fn(() => 'application/octet-stream'),
    getFileName: jest.fn((uri, fallback) => {
      // Simulate path-based extraction
      const segments = uri.split('/');
      return segments[segments.length - 1] || fallback;
    }),
    downloadFile: jest.fn().mockResolvedValue(),
    getConstants: jest.fn(() => ({
      ExternalDirectoryPath: '/mock/external',
      ExternalCachesDirectoryPath: '/mock/caches',
    })),
  },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(() => 'exp://mock'),
  addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  openURL: jest.fn(),
}));

jest.mock('expo-notifications', () => ({
  scheduleNotificationAsync: jest.fn(),
  updateNotification: jest.fn(),
  setNotificationHandler: jest.fn(),
  addNotificationReceivedListener: jest.fn(),
  addNotificationResponseReceivedListener: jest.fn(),
  removeNotificationSubscription: jest.fn(),
}));

jest.mock('react-native-background-actions', () => ({
  start: jest.fn(),
  stop: jest.fn(),
  updateNotification: jest.fn(),
  isRunning: jest.fn(() => false),
}));

jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(() => Promise.resolve({ user: { id: 'mock', email: 'mock@mock.com' } })),
    signOut: jest.fn(() => Promise.resolve(true)),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
    getTokens: jest.fn(() => Promise.resolve({ idToken: 'mockId', accessToken: 'mockAccess' })),
  },
}));

jest.mock('@react-native-documents/picker', () => ({
  pick: jest.fn(() => Promise.resolve([])),
  keepLocalCopy: jest.fn(() => Promise.resolve([])),
  saveDocuments: jest.fn(() => Promise.resolve([])),
}));

jest.mock('@specs/NativeLocalServer', () => ({
  __esModule: true,
  default: {
    start: jest.fn().mockResolvedValue(true),
    stop: jest.fn().mockResolvedValue(true),
  },
}));

jest.mock('@specs/NativeEpub', () => ({
  __esModule: true,
  default: {
    parseNovelAndChapters: jest.fn(() => ({
      name: 'Mock Novel',
      cover: null,
      summary: null,
      author: null,
      artist: null,
      chapters: [],
      cssPaths: [],
      imagePaths: [],
    })),
  },
}));

jest.mock('@specs/NativeTTSMediaControl', () => ({
  __esModule: true,
  default: {
    showMediaNotification: jest.fn(),
    updatePlaybackState: jest.fn(),
    updateProgress: jest.fn(),
    dismiss: jest.fn(),
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

jest.mock('@specs/NativeVolumeButtonListener', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

jest.mock('@specs/NativeSPenRemote', () => ({
  __esModule: true,
  default: {
    addListener: jest.fn(),
    removeListeners: jest.fn(),
  },
}));

jest.mock('@specs/NativeZipArchive', () => ({
  __esModule: true,
  default: {
    zip: jest.fn().mockResolvedValue(),
    unzip: jest.fn().mockResolvedValue(),
    remoteUnzip: jest.fn().mockResolvedValue(),
    remoteZip: jest.fn().mockResolvedValue(''),
    zipEpub: jest.fn().mockResolvedValue(),
  },
}));
