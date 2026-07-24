import { memo } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import {
  createShimmerPlaceholder,
  ShimmerPlaceholderProps,
} from 'react-native-shimmer-placeholder';

const NativeShimmerPlaceholder = createShimmerPlaceholder(LinearGradient);

const ShimmerPlaceholder = memo(
  ({ containerProps, ...props }: ShimmerPlaceholderProps) => (
    <NativeShimmerPlaceholder
      {...props}
      containerProps={{
        ...containerProps,
        accessibilityElementsHidden: true,
        importantForAccessibility: 'no-hide-descendants',
      }}
      isInteraction={false}
    />
  ),
);

export default ShimmerPlaceholder;
