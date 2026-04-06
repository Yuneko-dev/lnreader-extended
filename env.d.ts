declare module 'react-native-config' {
  export interface NativeConfig {
    MYANIMELIST_CLIENT_ID: string;
    ANILIST_CLIENT_ID: string;
    GIT_HASH: string;
    RELEASE_DATE: string;
    BUILD_TYPE: 'Debug' | 'Release' | 'Beta' | 'Github Action';
  }

  export const Config: NativeConfig;
  export default Config;
}
