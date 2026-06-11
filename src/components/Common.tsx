import React from 'react';
import { StyleSheet, View } from 'react-native';

const Row = ({
  children,
  style = {},
}: {
  children?: React.ReactNode;
  style?: any;
}) => <View style={[styles.row, style]}>{children}</View>;

export { Row };

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
  },
});
