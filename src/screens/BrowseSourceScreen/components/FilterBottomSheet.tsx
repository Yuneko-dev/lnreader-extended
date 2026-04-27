import React, { memo, useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import BottomSheet from '@components/BottomSheet/BottomSheet';
import {
  BottomSheetFlatList,
  BottomSheetModal,
  BottomSheetTextInput,
} from '@gorhom/bottom-sheet';

import { useTheme } from '@hooks/persisted';
import {
  FilterTypes,
  FilterToValues,
  Filters,
} from '@plugins/types/filterTypes';
import { Button, Menu } from '@components/index';
import { Checkbox } from '@components/Checkbox/Checkbox';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { useBoolean } from '@hooks';
import { TextInput, overlay } from 'react-native-paper';
import { getValueFor } from './filterUtils';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Switch from '@components/Switch/Switch';

const insertOrRemoveIntoArray = (array: string[], val: string): string[] =>
  array.indexOf(val) > -1 ? array.filter(ele => ele !== val) : [...array, val];

type SelectedFilters = FilterToValues<Filters>;

type OnFilterChange = (key: string, value: SelectedFilters[string]) => void;

interface FilterItemProps {
  theme: ThemeColors;
  filter: Filters[string];
  filterKey: string;
  filterValue: SelectedFilters[string] | undefined;
  onFilterChange: OnFilterChange;
}

const FilterItem: React.FC<FilterItemProps> = memo(
  ({ theme, filter, filterKey, filterValue, onFilterChange }) => {
    const {
      value: isVisible,
      toggle: toggleCard,
      setFalse: closeCard,
    } = useBoolean();
    const { width: screenWidth } = useWindowDimensions();

    // Fallback to filter's default value when selectedFilters doesn't have this key
    const resolvedValue =
      filterValue ??
      ({ type: filter.type, value: filter.value } as SelectedFilters[string]);

    if (filter.type === FilterTypes.TextInput) {
      const value = getValueFor<(typeof filter)['type']>(filter, resolvedValue);
      return (
        <View style={styles.textContainer}>
          <TextInput
            render={props => <BottomSheetTextInput {...(props as any)} />}
            style={[styles.flex, { width: screenWidth - 48 }]}
            mode="outlined"
            label={
              <Text
                style={[
                  {
                    color: theme.onSurface,
                    backgroundColor: overlay(2, theme.surface),
                  },
                ]}
              >
                {` ${filter.label} `}
              </Text>
            }
            defaultValue={value}
            theme={{ colors: { background: 'transparent' } }}
            outlineColor={theme.onSurface}
            textColor={theme.onSurface}
            onChangeText={text =>
              onFilterChange(filterKey, {
                value: text,
                type: FilterTypes.TextInput,
              })
            }
          />
        </View>
      );
    }
    if (filter.type === FilterTypes.Picker) {
      const value = getValueFor<(typeof filter)['type']>(filter, resolvedValue);
      const label =
        filter.options.find(option => option.value === value)?.label ||
        'whatever';
      const contentStyle = useMemo(
        () => ({ backgroundColor: theme.surfaceVariant }),
        [theme.surfaceVariant],
      );
      return (
        <View style={styles.pickerContainer}>
          <Menu
            fullWidth
            visible={isVisible}
            contentStyle={contentStyle}
            anchor={
              <Pressable
                style={[styles.flex, { width: screenWidth - 48 }]}
                onPress={toggleCard}
              >
                <TextInput
                  mode="outlined"
                  label={
                    <Text
                      style={[
                        {
                          color: isVisible ? theme.primary : theme.onSurface,
                          backgroundColor: overlay(2, theme.surface),
                        },
                      ]}
                    >
                      {` ${filter.label} `}
                    </Text>
                  }
                  value={label}
                  editable={false}
                  theme={{ colors: { background: 'transparent' } }}
                  outlineColor={isVisible ? theme.primary : theme.onSurface}
                  textColor={isVisible ? theme.primary : theme.onSurface}
                />
              </Pressable>
            }
            onDismiss={closeCard}
          >
            {filter.options.map(val => {
              return (
                <Menu.Item
                  key={val.label}
                  title={val.label}
                  titleStyle={{ color: theme.onSurfaceVariant }}
                  onPress={() => {
                    closeCard();
                    onFilterChange(filterKey, {
                      value: val.value,
                      type: FilterTypes.Picker,
                    });
                  }}
                />
              );
            })}
          </Menu>
        </View>
      );
    }
    if (filter.type === FilterTypes.CheckboxGroup) {
      const value = getValueFor<(typeof filter)['type']>(filter, resolvedValue);
      return (
        <View>
          <Pressable
            style={styles.checkboxHeader}
            onPress={toggleCard}
            android_ripple={{ color: theme.rippleColor }}
          >
            <Text style={[{ color: theme.onSurfaceVariant }]}>
              {filter.label}
            </Text>
            <MaterialCommunityIcons
              name={isVisible ? 'chevron-up' : 'chevron-down'}
              color={theme.onSurface}
              size={24}
            />
          </Pressable>
          {isVisible
            ? filter.options.map(val => {
                return (
                  <Checkbox
                    key={val.label}
                    label={val.label}
                    theme={theme}
                    status={value.includes(val.value)}
                    onPress={() =>
                      onFilterChange(filterKey, {
                        type: FilterTypes.CheckboxGroup,
                        value: insertOrRemoveIntoArray(value, val.value),
                      })
                    }
                  />
                );
              })
            : null}
        </View>
      );
    }
    if (filter.type === FilterTypes.Switch) {
      const value = getValueFor<(typeof filter)['type']>(filter, resolvedValue);
      return (
        <Pressable
          android_ripple={{ color: theme.rippleColor }}
          style={styles.container}
          onPress={() => {
            onFilterChange(filterKey, {
              value: !value,
              type: FilterTypes.Switch,
            });
          }}
        >
          <View style={styles.switchContainer}>
            <View style={styles.switchLabelContainer}>
              <Text style={[{ color: theme.onSurface }, styles.switchLabel]}>
                {filter.label}
              </Text>
            </View>
            <Switch
              value={value}
              onValueChange={() => {
                onFilterChange(filterKey, {
                  value: !value,
                  type: FilterTypes.Switch,
                });
              }}
            />
          </View>
        </Pressable>
      );
    }
    if (filter.type === FilterTypes.ExcludableCheckboxGroup) {
      const value = getValueFor<(typeof filter)['type']>(filter, resolvedValue);
      return (
        <View>
          <Pressable
            style={styles.checkboxHeader}
            onPress={toggleCard}
            android_ripple={{ color: theme.rippleColor }}
          >
            <Text style={[{ color: theme.onSurfaceVariant }]}>
              {filter.label}
            </Text>
            <MaterialCommunityIcons
              name={isVisible ? 'chevron-up' : 'chevron-down'}
              color={theme.onSurface}
              size={24}
            />
          </Pressable>
          {isVisible
            ? filter.options.map(val => {
                return (
                  <Checkbox
                    key={val.label}
                    label={val.label}
                    theme={theme}
                    status={
                      value.include?.includes(val.value)
                        ? true
                        : value.exclude?.includes(val.value)
                        ? 'indeterminate'
                        : false
                    }
                    onPress={() => {
                      if (value.exclude?.includes(val.value)) {
                        onFilterChange(filterKey, {
                          type: FilterTypes.ExcludableCheckboxGroup,
                          value: {
                            include: [...(value.include || [])],
                            exclude: [
                              ...(value.exclude?.filter(f => f !== val.value) ||
                                []),
                            ],
                          },
                        });
                      } else if (value.include?.includes(val.value)) {
                        onFilterChange(filterKey, {
                          type: FilterTypes.ExcludableCheckboxGroup,
                          value: {
                            include: [
                              ...(value.include?.filter(f => f !== val.value) ||
                                []),
                            ],
                            exclude: [...(value.exclude || []), val.value],
                          },
                        });
                      } else {
                        onFilterChange(filterKey, {
                          type: FilterTypes.ExcludableCheckboxGroup,
                          value: {
                            include: [...(value.include || []), val.value],
                            exclude: value.exclude,
                          },
                        });
                      }
                    }}
                  />
                );
              })
            : null}
        </View>
      );
    }
    return <></>;
  },
);

interface BottomSheetProps {
  filterSheetRef: React.RefObject<BottomSheetModal | null>;
  filters: Filters;
  setFilters: (filters?: SelectedFilters) => void;
  clearFilters: (filters: Filters) => void;
}

const FilterBottomSheet: React.FC<BottomSheetProps> = ({
  filters,
  filterSheetRef,
  clearFilters,
  setFilters,
}) => {
  const theme = useTheme();
  const { bottom } = useSafeAreaInsets();
  const [selectedFilters, setSelectedFilters] =
    useState<SelectedFilters>(filters);

  // Stable callback for individual filter changes — prevents cascading re-renders
  const handleFilterChange: OnFilterChange = useCallback((key, value) => {
    setSelectedFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  // Memoize the data array to prevent FlatList from re-rendering on every parent render
  const filterEntries = useMemo(
    () =>
      filters ? (Object.entries(filters) as [string, Filters[string]][]) : [],
    [filters],
  );

  const renderItem = useCallback(
    ({ item }: { item: [string, Filters[string]] }) => (
      <FilterItem
        theme={theme}
        filter={item[1]}
        filterKey={item[0]}
        filterValue={selectedFilters[item[0]]}
        onFilterChange={handleFilterChange}
      />
    ),
    [theme, selectedFilters, handleFilterChange],
  );

  const handleReset = useCallback(() => {
    setSelectedFilters(filters);
    clearFilters(filters);
  }, [filters, clearFilters]);

  const handleApply = useCallback(() => {
    setFilters(selectedFilters);
    filterSheetRef?.current?.close();
  }, [setFilters, selectedFilters, filterSheetRef]);

  const borderStyle = useMemo(
    () => [styles.buttonContainer, { borderBottomColor: theme.outline }],
    [theme.outline],
  );

  return (
    <BottomSheet
      bottomSheetRef={filterSheetRef}
      snapPoints={[400, 600]}
      bottomInset={bottom}
      handleComponent={null}
      children={
        <View style={styles.flex}>
          <View style={borderStyle}>
            <Button title={getString('common.reset')} onPress={handleReset} />
            <Button
              title={getString('common.filter')}
              textColor={theme.onPrimary}
              onPress={handleApply}
              mode="contained"
            />
          </View>
          <BottomSheetFlatList
            data={filterEntries}
            keyExtractor={(item: [string, Filters[string]]) =>
              'filter' + item[0]
            }
            renderItem={renderItem}
          />
        </View>
      }
    >
      {/*<BottomSheetFlatList
         data={filters && Object.entries(filters)}
        keyExtractor={(item: [string, unknown]) => 'filter' + item[0]}
        renderItem={({ item }: { item: [string, Filters[string]] }) => (
           <FilterItem
             theme={theme}
             filter={item[1]}
            filterKey={item[0] as keyof Filters}
             selectedFilters={selectedFilters}
             setSelectedFilters={setSelectedFilters}
           />
         )}
       />*/}
    </BottomSheet>
  );
};

export default FilterBottomSheet;

const styles = StyleSheet.create({
  flex: { flex: 1 },
  transparent: {
    backgroundColor: 'transparent',
  },
  buttonContainer: {
    alignItems: 'center',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 8,
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  checkboxHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  container: {
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    flex: 1,
  },

  picker: {
    paddingHorizontal: 24,
    width: 200,
  },
  pickerContainer: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingHorizontal: 24,
  },
  switchContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingHorizontal: 24,
  },
  switchLabel: {
    fontSize: 16,
  },
  switchLabelContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 8,
    paddingHorizontal: 24,
  },
});
