import { useLibrarySettings } from '@hooks/persisted';
import { LibrarySettings } from '@hooks/persisted/useSettings';
import {
  useLibrary,
  UseLibraryReturnType,
} from '@screens/library/hooks/useLibrary';
import React, { createContext, useContext, useMemo } from 'react';

// type Library = Category & { novels: LibraryNovelInfo[] };

type LibraryContextType = UseLibraryReturnType & {
  settings: LibrarySettings;
};

const defaultValue = {} as LibraryContextType;
const LibraryContext = createContext<LibraryContextType>(defaultValue);

export function LibraryContextProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const useLibraryParams = useLibrary();
  const settings = useLibrarySettings();

  const contextValue = useMemo(
    () => ({ ...useLibraryParams, settings }),
    [useLibraryParams, settings],
  );

  return (
    <LibraryContext.Provider value={contextValue}>
      {children}
    </LibraryContext.Provider>
  );
}

export const useLibraryContext = (): LibraryContextType => {
  return useContext(LibraryContext);
};
