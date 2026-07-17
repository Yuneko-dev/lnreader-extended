import { KeyboardAvoidingModal, StableTextInput } from '@components';
import { updateNovelInfo } from '@database/queries/NovelQueries';
import { NovelInfo } from '@database/types';
import { NovelStatus } from '@plugins/types';
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons';
import { getString } from '@strings/translations';
import { ThemeColors } from '@theme/types';
import { translateNovelStatus } from '@utils/translateEnum';
import React, { useCallback, useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

interface EditInfoModalProps {
  theme: ThemeColors;
  hideModal: () => void;
  modalVisible: boolean;
  novel: NovelInfo;
  setNovel: (novel: NovelInfo | undefined) => void;
}

// --- Dynamic style helpers ---
const getStatusLabelColor = (theme: ThemeColors) => ({
  color: theme.onSurfaceVariant,
});
const getScrollViewStyle = () => styles.statusScrollView;
const getStatusChipContainer = () => styles.statusChipContainer;
const getStatusChipPressable = (selected: boolean, theme: ThemeColors) => ({
  backgroundColor: selected ? theme.rippleColor : 'transparent',
});
const getStatusChipText = (selected: boolean, theme: ThemeColors) => ({
  color: selected ? theme.primary : theme.onSurfaceVariant,
});
const getGenreListStyle = () => styles.genreList;

// --- Main Component ---
const EditInfoModal = ({
  theme,
  hideModal,
  modalVisible,
  novel,
  setNovel,
}: EditInfoModalProps) => {
  const initialNovelInfo = useMemo(() => ({ ...novel }), [novel]);
  const [novelInfo, setNovelInfo] = useState(novel);

  const [newGenre, setNewGenre] = useState('');
  const [genreKey, setGenreKey] = useState(0);

  const removeTag = (t: string) => {
    setNovelInfo(prev => ({
      ...prev,
      genres: prev.genres
        ?.split(',')
        .filter(item => item !== t)
        ?.join(','),
    }));
  };

  const onReset = useCallback(() => {
    setNovelInfo(initialNovelInfo);
    updateNovelInfo(initialNovelInfo);
  }, [initialNovelInfo]);

  const status = Object.values(NovelStatus);

  return (
    <KeyboardAvoidingModal
      title={getString('novelScreen.edit.info')}
      visible={modalVisible}
      onDismiss={() => {
        onReset();
        hideModal();
      }}
      onConfirm={() => {
        setNovel(novelInfo);
        updateNovelInfo(novelInfo);
      }}
      onReset={onReset}
    >
      <View style={styles.statusRow}>
        <Text style={getStatusLabelColor(theme)}>
          {getString('novelScreen.edit.status')}
        </Text>
        <ScrollView
          style={getScrollViewStyle()}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {status.map((item, index) => (
            <View style={getStatusChipContainer()} key={'novelInfo' + index}>
              <Pressable
                style={[
                  styles.statusChipPressable,
                  getStatusChipPressable(novelInfo.status === item, theme),
                ]}
                android_ripple={{
                  color: theme.rippleColor,
                }}
                onPress={() =>
                  setNovelInfo(prev => ({ ...prev, status: item }))
                }
              >
                <Text
                  style={getStatusChipText(novelInfo.status === item, theme)}
                >
                  {translateNovelStatus(item)}
                </Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      </View>
      <StableTextInput
        value={novelInfo.name}
        placeholder={getString('novelScreen.edit.title', {
          title: novel.name,
        })}
        numberOfLines={1}
        mode="outlined"
        theme={{ colors: { ...theme } }}
        onChangeText={text => setNovelInfo(prev => ({ ...prev, name: text }))}
        dense
        style={styles.inputWrapper}
      />
      <StableTextInput
        value={novelInfo.author ?? undefined}
        placeholder={getString('novelScreen.edit.author', {
          author: novel.author,
        })}
        numberOfLines={1}
        mode="outlined"
        theme={{ colors: { ...theme } }}
        onChangeText={text => setNovelInfo(prev => ({ ...prev, author: text }))}
        dense
        style={styles.inputWrapper}
      />
      <StableTextInput
        value={novelInfo.artist ?? undefined}
        placeholder={'Artist: ' + novel.artist}
        numberOfLines={1}
        mode="outlined"
        theme={{ colors: { ...theme } }}
        onChangeText={text => setNovelInfo(prev => ({ ...prev, artist: text }))}
        dense
        style={styles.inputWrapper}
      />
      <StableTextInput
        value={novelInfo.summary ?? undefined}
        placeholder={getString('novelScreen.edit.summary', {
          summary: novel.summary?.substring(0, 16),
        })}
        multiline={true}
        numberOfLines={7}
        mode="outlined"
        onChangeText={text =>
          setNovelInfo(prev => ({ ...prev, summary: text }))
        }
        theme={{ colors: { ...theme } }}
        dense
        style={styles.inputWrapper}
      />

      <StableTextInput
        key={'genreInput' + genreKey}
        value={newGenre}
        placeholder={getString('novelScreen.edit.addTag')}
        numberOfLines={1}
        mode="outlined"
        onChangeText={text => setNewGenre(text)}
        onSubmitEditing={() => {
          const newGenreTrimmed = newGenre.trim();

          if (newGenreTrimmed === '') {
            return;
          }

          setNovelInfo(prevVal => ({
            ...prevVal,
            genres: novelInfo.genres
              ? `${novelInfo.genres},` + newGenreTrimmed
              : newGenreTrimmed,
          }));
          setNewGenre('');
          setGenreKey(prev => prev + 1);
        }}
        theme={{ colors: { ...theme } }}
        dense
        style={styles.inputWrapper}
      />

      {novelInfo.genres !== undefined && novelInfo.genres !== '' ? (
        <FlatList
          style={getGenreListStyle()}
          horizontal
          data={novelInfo.genres?.split(',')}
          keyExtractor={(_, index) => 'novelTag' + index}
          renderItem={({ item }) => (
            <GenreChip theme={theme} onPress={() => removeTag(item)}>
              {item}
            </GenreChip>
          )}
          showsHorizontalScrollIndicator={false}
        />
      ) : null}
    </KeyboardAvoidingModal>
  );
};

export default EditInfoModal;

// --- GenreChip with split styles ---
const getGenreChipContainer = (theme: ThemeColors) => ({
  backgroundColor: theme.secondaryContainer,
});
const getGenreChipText = (theme: ThemeColors) => ({
  color: theme.onSecondaryContainer,
});
const getGenreChipIcon = (theme: ThemeColors) => ({
  color: theme.onSecondaryContainer,
});

const GenreChip = ({
  children,
  theme,
  onPress,
}: {
  children: React.ReactNode;
  theme: ThemeColors;
  onPress: () => void;
}) => (
  <View style={[styles.genreChipContainer, getGenreChipContainer(theme)]}>
    <Text style={[styles.genreChipText, getGenreChipText(theme)]}>
      {children}
    </Text>
    <MaterialCommunityIcons
      name="close"
      size={18}
      onPress={onPress}
      style={styles.genreChipIcon}
      {...getGenreChipIcon(theme)}
    />
  </View>
);

const styles = StyleSheet.create({
  errorText: {
    color: '#FF0033',
    paddingTop: 8,
  },
  inputWrapper: {
    fontSize: 14,
    marginBottom: 12,
  },
  statusRow: {
    marginVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusScrollView: {
    marginLeft: 8,
  },
  statusChipContainer: {
    borderRadius: 8,
    overflow: 'hidden',
  },
  statusChipPressable: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  genreList: {
    marginVertical: 8,
  },
  genreChipContainer: {
    flex: 1,
    flexDirection: 'row',
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    marginBottom: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  genreChipText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  genreChipIcon: {
    marginLeft: 4,
  },
});
