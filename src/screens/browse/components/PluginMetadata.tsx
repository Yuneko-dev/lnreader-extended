import {
  PluginContentType,
  PluginContentWarning,
  PluginItem,
} from '@plugins/types';
import React from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';

export const PLUGIN_METADATA_SEPARATOR = 'ㆍ';

const getContentTypePrefix = (contentType?: PluginContentType) => {
  switch (contentType) {
    case PluginContentType.VIDEO:
      return '📺 ';
    case PluginContentType.IMAGE:
      return '🖼️ ';
    case PluginContentType.MIXED:
      return '🧭 ';
    default:
      return '';
  }
};

export const getPluginDisplayName = (
  plugin: Pick<PluginItem, 'contentType' | 'name'>,
) => getContentTypePrefix(plugin.contentType) + plugin.name;

export const hasAdultContentWarning = (contentWarning?: PluginContentWarning) =>
  (contentWarning ?? PluginContentWarning.UNSPECIFIED) >
  PluginContentWarning.SAFE;

interface AdultContentWarningBadgeProps {
  color: string;
  separatorStyle: StyleProp<TextStyle>;
  style?: StyleProp<TextStyle>;
}

export const AdultContentWarningBadge = ({
  color,
  separatorStyle,
  style,
}: AdultContentWarningBadgeProps) => (
  <Text style={[style, { color }]}>
    <Text style={separatorStyle}>{PLUGIN_METADATA_SEPARATOR}</Text>
    18+
  </Text>
);
