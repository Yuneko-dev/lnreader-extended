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
  },
}));
