import { useState, type ReactNode } from 'react';
import { Animated, PanResponder, Pressable, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors } from '../theme/colors';
import { Icon } from './Icon';

const REVEAL = 72;   // width of the trash button
const DELETE = 180;  // swipe this far to delete straight away

/** Swipe state and gesture handlers for one row; created once per row. */
function createSwipe(onDelete: () => void) {
  const x = new Animated.Value(0);
  let opened = false;
  const snap = (to: number) => {
    opened = to !== 0;
    Animated.spring(x, { toValue: to, useNativeDriver: false, bounciness: 0 }).start();
  };
  const remove = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    Animated.timing(x, { toValue: -600, duration: 160, useNativeDriver: false }).start(() => onDelete());
  };
  const pan = PanResponder.create({
    onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderMove: (_, g) => x.setValue(Math.min(0, (opened ? -REVEAL : 0) + g.dx)),
    onPanResponderRelease: (_, g) => {
      const end = (opened ? -REVEAL : 0) + g.dx;
      if (end < -DELETE) remove();
      else if (end < -REVEAL / 2) snap(-REVEAL);
      else snap(0);
    },
    onPanResponderTerminate: () => snap(opened ? -REVEAL : 0),
  });
  return { x, pan, remove };
}

/**
 * Swipe left to reveal a trash button; swipe far to delete. The child must
 * have an opaque background so the button stays hidden until revealed.
 * Rows are keyed by item, so onDelete is captured once.
 */
export function SwipeRow({ children, onDelete }: { children: ReactNode; onDelete: () => void }) {
  const [{ x, pan, remove }] = useState(() => createSwipe(onDelete));
  return (
    <View style={{ overflow: 'hidden', borderRadius: 10 }}>
      <Animated.View style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: REVEAL,
        opacity: x.interpolate({ inputRange: [-REVEAL, -4, 0], outputRange: [1, 1, 0], extrapolate: 'clamp' }) }}>
        <Pressable onPress={remove} accessibilityLabel="Delete set"
          style={{ flex: 1, backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderRadius: 10 }}>
          <Icon name="trash" size={22} color="#fff" />
        </Pressable>
      </Animated.View>
      <Animated.View style={{ transform: [{ translateX: x }] }} {...pan.panHandlers}>
        {children}
      </Animated.View>
    </View>
  );
}
