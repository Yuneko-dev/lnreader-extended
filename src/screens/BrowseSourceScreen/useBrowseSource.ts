import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { NovelItem } from '@plugins/types';

import { getPlugin } from '@plugins/pluginManager';
import { FilterToValues, Filters } from '@plugins/types/filterTypes';

export const useBrowseSource = (
  pluginId: string,
  showLatestNovels?: boolean,
) => {
  const [isLoading, setIsLoading] = useState(true);
  const [novels, setNovels] = useState<NovelItem[]>([]);
  const [error, setError] = useState<string>();

  const [currentPage, setCurrentPage] = useState(1);
  const [filterValues, setFilterValues] = useState<Filters | undefined>(
    (getPlugin(pluginId) as any)?.filters,
  );
  const [selectedFilters, setSelectedFilters] = useState<
    FilterToValues<Filters> | undefined
  >(filterValues);
  const [hasNextPage, setHasNextPage] = useState(true);

  const isScreenMounted = useRef(true);
  // Guard against race conditions: track the latest fetch request
  const fetchIdRef = useRef(0);

  const fetchNovels = useCallback(
    async (page: number, filters?: FilterToValues<Filters>) => {
      if (isScreenMounted.current === true) {
        const fetchId = ++fetchIdRef.current;
        try {
          const plugin = getPlugin(pluginId);
          if (!plugin) {
            throw new Error(`Unknown plugin: ${pluginId}`);
          }
          await plugin
            .popularNovels(page, {
              showLatestNovels,
              filters,
            })
            .then(res => {
              // Discard stale responses
              if (fetchId !== fetchIdRef.current) return;
              setNovels(prevState =>
                page === 1 ? res : [...prevState, ...res],
              );
              if (!res.length) {
                setHasNextPage(false);
              }
            })
            .catch(e => {
              if (fetchId !== fetchIdRef.current) return;
              setError(e.message);
              setHasNextPage(false);
            });
          if (fetchId === fetchIdRef.current) {
            setFilterValues((plugin as any).filters);
          }
        } catch (err: unknown) {
          if (fetchId === fetchIdRef.current) {
            setError(`${err}`);
          }
        } finally {
          if (fetchId === fetchIdRef.current) {
            setIsLoading(false);
          }
        }
      }
    },
    [pluginId, showLatestNovels],
  );

  const fetchNextPage = useCallback(() => {
    if (hasNextPage) setCurrentPage(prevState => prevState + 1);
  }, [hasNextPage]);

  /**
   * On screen unmount
   */
  useEffect(() => {
    return () => {
      isScreenMounted.current = false;
    };
  }, []);

  useEffect(() => {
    fetchNovels(currentPage, selectedFilters);
  }, [fetchNovels, currentPage, selectedFilters]);

  const refetchNovels = useCallback(() => {
    setError('');
    setIsLoading(true);
    setNovels([]);
    setCurrentPage(1);
    fetchNovels(1, selectedFilters);
  }, [fetchNovels, selectedFilters]);

  const clearFilters = useCallback(
    (filters: Filters) => setSelectedFilters(filters),
    [],
  );

  const setFilters = useCallback((filters?: FilterToValues<Filters>) => {
    setIsLoading(true);
    setCurrentPage(1);
    setNovels([]);
    setHasNextPage(true);
    setSelectedFilters(filters);
  }, []);

  return useMemo(
    () => ({
      isLoading,
      novels,
      hasNextPage,
      fetchNextPage,
      error,
      filterValues,
      setFilters,
      clearFilters,
      refetchNovels,
    }),
    [
      isLoading,
      novels,
      hasNextPage,
      fetchNextPage,
      error,
      filterValues,
      setFilters,
      clearFilters,
      refetchNovels,
    ],
  );
};

export const useSearchSource = (pluginId: string) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<NovelItem[]>([]);
  const [searchError, setSearchError] = useState<string>();
  const [hasNextSearchPage, setHasNextSearchPage] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchText, setSearchText] = useState('');

  const isScreenMounted = useRef(true);
  const searchIdRef = useRef(0);

  const searchSource = useCallback((searchTerm: string) => {
    setSearchResults([]);
    setHasNextSearchPage(true);
    setCurrentPage(1);
    setSearchText(searchTerm);
    setIsSearching(true);
  }, []);

  const fetchNovels = useCallback(
    async (localSearchText: string, page: number) => {
      if (isScreenMounted.current === true) {
        const searchId = ++searchIdRef.current;
        try {
          const plugin = getPlugin(pluginId);
          if (!plugin) {
            throw new Error(`Unknown plugin: ${pluginId}`);
          }
          const res = await plugin.searchNovels(localSearchText, page);
          if (searchId !== searchIdRef.current) return;
          setSearchResults(prevState =>
            page === 1 ? res : [...prevState, ...res],
          );
          if (!res.length) {
            setHasNextSearchPage(false);
          }
        } catch (err: unknown) {
          if (searchId !== searchIdRef.current) return;
          setSearchError(`${err}`);
          setHasNextSearchPage(false);
        } finally {
          if (searchId === searchIdRef.current) {
            setIsSearching(false);
          }
        }
      }
    },
    [pluginId],
  );

  const searchNextPage = useCallback(() => {
    if (hasNextSearchPage) setCurrentPage(prevState => prevState + 1);
  }, [hasNextSearchPage]);

  useEffect(() => {
    return () => {
      isScreenMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (searchText) {
      fetchNovels(searchText, currentPage);
    }
  }, [currentPage, fetchNovels, searchText]);

  const clearSearchResults = useCallback(() => {
    setSearchText('');
    setSearchResults([]);
    setCurrentPage(1);
    setHasNextSearchPage(true);
  }, []);

  return useMemo(
    () => ({
      isSearching,
      searchResults,
      hasNextSearchPage,
      searchNextPage,
      searchSource,
      clearSearchResults,
      searchError,
    }),
    [
      isSearching,
      searchResults,
      hasNextSearchPage,
      searchNextPage,
      searchSource,
      clearSearchResults,
      searchError,
    ],
  );
};
