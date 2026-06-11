import { Button, Modal } from '@components';
import { NovelInfo } from '@database/types';
import { MigrateNovelScreenProps } from '@navigators/types';
import { NovelItem } from '@plugins/types';
import ServiceManager from '@services/ServiceManager';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import { showToast } from '@utils/showToast';
import React, { useState } from 'react';
import { FlatList, FlatListProps, StyleSheet, Text, View } from 'react-native';
import { Portal } from 'react-native-paper';

import GlobalSearchNovelCover from '../globalsearch/GlobalSearchNovelCover';
import { SourceSearchResult } from './MigrationNovels';

interface MigrationNovelListProps {
  data: SourceSearchResult;
  fromNovel: NovelInfo;
  theme: ThemeColors;
  library: NovelInfo[];
  navigation: MigrateNovelScreenProps['navigation'];
}

interface SelectedNovel {
  path: string;
  name: string;
}

const MigrationNovelList = ({
  data,
  fromNovel,
  theme,
  library,
  navigation,
}: MigrationNovelListProps) => {
  const pluginId = data.id;
  const [selectedNovel, setSelectedNovel] = useState<SelectedNovel>(
    {} as SelectedNovel,
  );
  const [migrateNovelDialog, setMigrateNovelDialog] = useState(false);
  const showMigrateNovelDialog = () => setMigrateNovelDialog(true);
  const hideMigrateNovelDialog = () => setMigrateNovelDialog(false);

  const inLibrary = (path: string) =>
    library.some(obj => obj.pluginId === pluginId && obj.path === path);

  const renderItem: FlatListProps<NovelItem>['renderItem'] = ({ item }) => (
    <GlobalSearchNovelCover
      novel={item}
      theme={theme}
      onPress={() => showModal(item.path, item.name)}
      onLongPress={() =>
        navigation.push('ReaderStack', {
          screen: 'Novel',
          params: { pluginId: pluginId, ...item },
        })
      }
      inLibrary={inLibrary(item.path)}
    />
  );

  const showModal = (path: string, name: string) => {
    if (inLibrary(path)) {
      showToast(getString('browseScreen.migration.novelAlreadyInLibrary'));
    } else {
      setSelectedNovel({ path, name });
      showMigrateNovelDialog();
    }
  };

  return (
    <>
      <FlatList
        contentContainerStyle={styles.flatListCont}
        horizontal={true}
        data={data.novels}
        keyExtractor={(item, index) => index + item.path}
        renderItem={renderItem}
        ListEmptyComponent={
          <Text
            style={[
              {
                color: theme.onSurfaceVariant,
              },
              styles.padding,
            ]}
          >
            {getString('sourceScreen.noResultsFound')}
          </Text>
        }
      />
      <Portal>
        <Modal visible={migrateNovelDialog} onDismiss={hideMigrateNovelDialog}>
          <Text
            style={[
              {
                color: theme.onSurface,
              },
              styles.text,
            ]}
          >
            {getString('browseScreen.migration.dialogMessage', {
              url: selectedNovel.name,
            })}
          </Text>
          <View style={styles.row}>
            <Button
              onPress={hideMigrateNovelDialog}
              title={getString('common.cancel')}
            />
            <Button
              onPress={() => {
                hideMigrateNovelDialog();
                ServiceManager.manager.addTask({
                  name: 'MIGRATE_NOVEL',
                  data: {
                    pluginId,
                    fromNovel,
                    toNovelPath: selectedNovel.path,
                  },
                });
              }}
              title={getString('novelScreen.migrate')}
            />
          </View>
        </Modal>
      </Portal>
    </>
  );
};

export default MigrationNovelList;

const styles = StyleSheet.create({
  flatListCont: {
    flexGrow: 1,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  text: {
    fontSize: 18,
    marginBottom: 16,
  },
  padding: { padding: 8, paddingVertical: 4 },
});
