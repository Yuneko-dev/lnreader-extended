import NativeFile from '@specs/NativeFile';
import { showToast } from '@utils/showToast';

import { Storage } from '../helpers/storage';
import { installPlugin, updatePlugin } from '../pluginManager';
import { PluginItem, PluginSettings } from '../types';

jest.mock('react-native-mmkv', () => {
  const stores = new Map<string, Map<string, string | number | boolean>>();

  const createStore = (id = 'default') => {
    if (!stores.has(id)) {
      stores.set(id, new Map());
    }
    const store = stores.get(id)!;

    return {
      set: jest.fn((key: string, value: string | number | boolean) => {
        store.set(key, value);
      }),
      getString: jest.fn((key: string) => {
        const value = store.get(key);
        return typeof value === 'string' ? value : undefined;
      }),
      getAllKeys: jest.fn(() => Array.from(store.keys())),
      remove: jest.fn((key: string) => {
        store.delete(key);
      }),
      clearAll: jest.fn(() => {
        store.clear();
      }),
    };
  };

  return {
    createMMKV: jest.fn((options?: { id?: string }) =>
      createStore(options?.id),
    ),
  };
});

jest.mock('@database/queries/RepositoryQueries', () => ({
  getRepositoriesFromDb: jest.fn(),
}));

jest.mock('@hooks/persisted/useDisabledRepositories', () => ({
  DISABLED_REPOSITORIES: 'DISABLED_REPOSITORIES',
}));

jest.mock('@hooks/persisted/useUserAgent', () => ({
  getUserAgent: jest.fn(() => 'Test User Agent'),
}));

jest.mock('@utils/showToast', () => ({
  showToast: jest.fn(),
}));

jest.mock('../helpers/fetch', () => ({
  downloadFile: jest.fn(),
  fetchApi: jest.fn(),
  fetchProto: jest.fn(),
  fetchText: jest.fn(),
}));

const pluginItem = (id: string, version: string): PluginItem => ({
  id,
  name: id,
  site: `https://${id}.example`,
  lang: 'English',
  version,
  url: `https://${id}.example/plugin.js`,
  iconUrl: `https://${id}.example/icon.png`,
});

const pluginCode = (
  id: string,
  version: string,
  pluginSettings: PluginSettings,
) => `
exports.default = {
  id: ${JSON.stringify(id)},
  name: ${JSON.stringify(id)},
  site: ${JSON.stringify(`https://${id}.example`)},
  lang: 'English',
  version: ${JSON.stringify(version)},
  url: ${JSON.stringify(`https://${id}.example/plugin.js`)},
  iconUrl: ${JSON.stringify(`https://${id}.example/icon.png`)},
  pluginSettings: ${JSON.stringify(pluginSettings)},
  popularNovels: async () => [],
  parseNovel: async () => ({ name: 'Novel', path: '/novel', chapters: [] }),
  parseChapter: async () => '',
  searchNovels: async () => [],
};
`;

const mockFetchCode = (code: string) => {
  (global.fetch as jest.Mock).mockResolvedValueOnce({
    text: jest.fn().mockResolvedValue(code),
  });
};

describe('pluginManager lifecycle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global as typeof globalThis & { fetch: jest.Mock }).fetch = jest.fn();
  });

  it('preserves existing plugin settings when an update adds a setting', async () => {
    const settingsV1: PluginSettings = {
      host: { label: 'Host', value: 'https://default.example', type: 'Text' },
      enabled: { label: 'Enabled', value: true, type: 'Switch' },
      mode: {
        label: 'Mode',
        value: 'a',
        type: 'Select',
        options: [
          { label: 'A', value: 'a' },
          { label: 'B', value: 'b' },
        ],
      },
    };
    const settingsV2: PluginSettings = {
      ...settingsV1,
      chapterGroups: {
        label: 'Chapter groups',
        value: ['main'],
        type: 'CheckboxGroup',
        options: [
          { label: 'Main', value: 'main' },
          { label: 'Side', value: 'side' },
        ],
      },
    };

    mockFetchCode(pluginCode('settings-update', '1.0.0', settingsV1));
    await installPlugin(pluginItem('settings-update', '1.0.0'));

    const storage = new Storage('settings-update');
    storage.set('host', 'https://custom.example');
    storage.set('enabled', false);
    storage.set('mode', 'b');

    mockFetchCode(pluginCode('settings-update', '1.1.0', settingsV2));
    await updatePlugin(pluginItem('settings-update', '1.0.0'));

    expect(storage.get('host')).toBe('https://custom.example');
    expect(storage.get('enabled')).toBe(false);
    expect(storage.get('mode')).toBe('b');
    expect(storage.get('chapterGroups')).toEqual(['main']);
  });

  it('rejects install or update when exported plugin id differs from metadata id', async () => {
    mockFetchCode(pluginCode('actual-id', '1.0.0', {}));

    const result = await installPlugin(pluginItem('expected-id', '1.0.0'));

    expect(result).toBeUndefined();
    expect(showToast).toHaveBeenCalledWith(
      'Rejected plugin with mismatched id: expected-id',
    );
    expect(NativeFile.writeFile).not.toHaveBeenCalled();
  });

  it('normalizes stale plugin setting values after a setting type changes', async () => {
    const settingsV1: PluginSettings = {
      token: { label: 'Token', value: false, type: 'Switch' },
    };
    const settingsV2: PluginSettings = {
      token: { label: 'Token', value: 'default-token', type: 'Text' },
    };

    mockFetchCode(pluginCode('settings-migrate', '1.0.0', settingsV1));
    await installPlugin(pluginItem('settings-migrate', '1.0.0'));

    const storage = new Storage('settings-migrate');
    storage.set('token', true);

    mockFetchCode(pluginCode('settings-migrate', '1.1.0', settingsV2));
    await updatePlugin(pluginItem('settings-migrate', '1.0.0'));

    expect(storage.get('token')).toBe('default-token');
  });
});
