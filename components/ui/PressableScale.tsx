import { useRef } from "react";
import {
  Animated,
  Easing,
  Pressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { disabledOpacity, motion } from "../../constants/theme";

// Press feedback for everything tappable. RN's default is a hard opacity
// snap; this eases a small scale at the press token so a tap feels answered
// rather than blinked at. Reduced motion is respected by the tiny distance:
// the control never moves far enough to be a motion effect, and nothing
// depends on the animation to be usable.
export function PressableScale({
  children,
  style,
  disabled,
  scaleTo = 0.97,
  flex,
  ...rest
}: PressableProps & {
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
  // The visual style sits on the inner animated view so the whole box scales
  // on press. That leaves the outer Pressable as the flex child, so a
  // PressableScale that needs to grow inside a row (e.g. an even day strip)
  // passes `flex` and it lands where the layout engine can use it.
  flex?: number;
  children: React.ReactNode;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const animate = (toValue: number) => {
    Animated.timing(scale, {
      toValue,
      duration: motion.press,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  return (
    <Pressable
      {...rest}
      disabled={disabled}
      style={flex !== undefined ? { flex } : undefined}
      onPressIn={(event) => {
        animate(scaleTo);
        rest.onPressIn?.(event);
      }}
      onPressOut={(event) => {
        animate(1);
        rest.onPressOut?.(event);
      }}
    >
      <Animated.View
        style={[
          style,
          { transform: [{ scale }] },
          disabled ? { opacity: disabledOpacity } : null,
        ]}
      >
        {children}
      </Animated.View>
    </Pressable>
  );
}
