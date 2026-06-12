import { useCallback } from 'react';
import { useMMKVObject } from 'react-native-mmkv';

export const DISABLED_REPOSITORIES = 'DISABLED_REPOSITORIES';

export default function useDisabledRepositories() {
  const [disabledRepositories = [], setDisabledRepositories] = useMMKVObject<
    number[]
  >(DISABLED_REPOSITORIES);

  const toggleDisabledRepository = useCallback(
    (repositoryId: number) => {
      setDisabledRepositories(prev => {
        const list = prev || [];
        if (list.includes(repositoryId)) {
          return list.filter(id => id !== repositoryId);
        }
        return [...list, repositoryId];
      });
    },
    [setDisabledRepositories],
  );

  return {
    disabledRepositories,
    toggleDisabledRepository,
  };
}
