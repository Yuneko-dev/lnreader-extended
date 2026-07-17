import React from 'react';
import { StyleSheet, View } from 'react-native';

const Row = ({
  children,
  style = {},
  horizontalSpacing,
  verticalSpacing,
}: {
  children?: React.ReactNode;
  style?: any;
  horizontalSpacing?: number | `${number}%`;
  verticalSpacing?: number | `${number}%`;
}) => (
  <View
    style={[
      styles.row,
      style,
      {
        paddingHorizontal: horizontalSpacing,
        paddingVertical: verticalSpacing,
      },
    ]}
  >
    {children}
  </View>
);

export { Row };

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
