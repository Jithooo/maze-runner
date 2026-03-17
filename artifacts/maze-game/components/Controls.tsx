import React, { useRef } from "react";
import { View, StyleSheet, Platform, PanResponder, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ControlState {
  joyX: number; // -1 (left/turn-left) to 1 (right/turn-right)
  joyY: number; // -1 (forward) to 1 (backward)
}

interface Props {
  onControlChange: (state: ControlState) => void;
  primaryColor?: string;
}

const BASE_R = 72;
const THUMB_R = 28;
const MAX_DRAG = BASE_R - THUMB_R + 4;

export default function Controls({ onControlChange, primaryColor = "#00FF88" }: Props) {
  const insets = useSafeAreaInsets();
  const thumbAnim = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const stateRef = useRef<ControlState>({ joyX: 0, joyY: 0 });
  const springRef = useRef<Animated.CompositeAnimation | null>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        springRef.current?.stop();
      },
      onPanResponderMove: (_, g) => {
        const dist = Math.sqrt(g.dx * g.dx + g.dy * g.dy);
        const clamped = Math.min(dist, MAX_DRAG);
        const angle = Math.atan2(g.dy, g.dx);
        const cx = Math.cos(angle) * clamped;
        const cy = Math.sin(angle) * clamped;

        thumbAnim.setValue({ x: cx, y: cy });

        const nx = cx / MAX_DRAG;
        const ny = cy / MAX_DRAG;
        stateRef.current = { joyX: nx, joyY: ny };
        onControlChange({ joyX: nx, joyY: ny });
      },
      onPanResponderRelease: () => {
        springRef.current = Animated.spring(thumbAnim, {
          toValue: { x: 0, y: 0 },
          useNativeDriver: false,
          tension: 100,
          friction: 8,
        });
        springRef.current.start();
        stateRef.current = { joyX: 0, joyY: 0 };
        onControlChange({ joyX: 0, joyY: 0 });
      },
      onPanResponderTerminate: () => {
        thumbAnim.setValue({ x: 0, y: 0 });
        stateRef.current = { joyX: 0, joyY: 0 };
        onControlChange({ joyX: 0, joyY: 0 });
      },
    })
  ).current;

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  const alpha = primaryColor === "#FF6A00" ? "rgba(255,106,0," : "rgba(0,255,136,";

  return (
    <View
      style={[styles.container, { paddingBottom: bottomPad + 20 }]}
      pointerEvents="box-none"
    >
      <View style={styles.joystickWrapper} {...panResponder.panHandlers}>
        {/* Outer base */}
        <View
          style={[
            styles.base,
            {
              borderColor: `${alpha}0.35)`,
              backgroundColor: `${alpha}0.06)`,
            },
          ]}
        >
          {/* Dashed inner guide ring */}
          <View
            style={[
              styles.innerRing,
              { borderColor: `${alpha}0.18)` },
            ]}
          />

          {/* Direction labels */}
          <View style={styles.labelUp}>
            <View style={[styles.arrow, styles.arrowUp, { borderBottomColor: `${alpha}0.4)` }]} />
          </View>
          <View style={styles.labelDown}>
            <View style={[styles.arrow, styles.arrowDown, { borderTopColor: `${alpha}0.4)` }]} />
          </View>
          <View style={styles.labelLeft}>
            <View style={[styles.arrow, styles.arrowLeft, { borderRightColor: `${alpha}0.4)` }]} />
          </View>
          <View style={styles.labelRight}>
            <View style={[styles.arrow, styles.arrowRight, { borderLeftColor: `${alpha}0.4)` }]} />
          </View>

          {/* Thumb */}
          <Animated.View
            style={[
              styles.thumb,
              {
                backgroundColor: primaryColor,
                borderColor: "rgba(255,255,255,0.6)",
                transform: thumbAnim.getTranslateTransform(),
              },
            ]}
          />
        </View>
      </View>

      {/* Instructions */}
      <View style={styles.hint} pointerEvents="none">
        <View style={[styles.hintDot, { backgroundColor: `${alpha}0.5)` }]} />
        <View style={[styles.hintLine, { backgroundColor: `${alpha}0.15)` }]} />
        <View style={[styles.hintDot, { backgroundColor: `${alpha}0.5)` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "flex-start",
    paddingHorizontal: 32,
    alignItems: "flex-end",
  },
  joystickWrapper: {
    width: BASE_R * 2 + 20,
    height: BASE_R * 2 + 20,
    alignItems: "center",
    justifyContent: "center",
  },
  base: {
    width: BASE_R * 2,
    height: BASE_R * 2,
    borderRadius: BASE_R,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  innerRing: {
    position: "absolute",
    width: MAX_DRAG * 2,
    height: MAX_DRAG * 2,
    borderRadius: MAX_DRAG,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  thumb: {
    width: THUMB_R * 2,
    height: THUMB_R * 2,
    borderRadius: THUMB_R,
    borderWidth: 2.5,
    opacity: 0.9,
  },
  labelUp: { position: "absolute", top: 10, alignSelf: "center" },
  labelDown: { position: "absolute", bottom: 10, alignSelf: "center" },
  labelLeft: { position: "absolute", left: 10, alignSelf: "center" },
  labelRight: { position: "absolute", right: 10, alignSelf: "center" },
  arrow: { width: 0, height: 0 },
  arrowUp: { borderLeftWidth: 6, borderRightWidth: 6, borderBottomWidth: 9, borderLeftColor: "transparent", borderRightColor: "transparent" },
  arrowDown: { borderLeftWidth: 6, borderRightWidth: 6, borderTopWidth: 9, borderLeftColor: "transparent", borderRightColor: "transparent" },
  arrowLeft: { borderTopWidth: 6, borderBottomWidth: 6, borderRightWidth: 9, borderTopColor: "transparent", borderBottomColor: "transparent" },
  arrowRight: { borderTopWidth: 6, borderBottomWidth: 6, borderLeftWidth: 9, borderTopColor: "transparent", borderBottomColor: "transparent" },
  hint: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingRight: 24,
    paddingBottom: 20,
    gap: 8,
  },
  hintDot: { width: 6, height: 6, borderRadius: 3 },
  hintLine: { flex: 0, width: 30, height: 1 },
});
