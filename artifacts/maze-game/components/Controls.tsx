import React, { useRef, useCallback } from "react";
import { View, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface ControlState {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
  turnLeft: boolean;
  turnRight: boolean;
}

interface Props {
  onControlChange: (state: ControlState) => void;
}

const INITIAL_STATE: ControlState = {
  forward: false,
  backward: false,
  left: false,
  right: false,
  turnLeft: false,
  turnRight: false,
};

export default function Controls({ onControlChange }: Props) {
  const stateRef = useRef<ControlState>({ ...INITIAL_STATE });
  const insets = useSafeAreaInsets();

  const press = useCallback((key: keyof ControlState, down: boolean) => {
    stateRef.current = { ...stateRef.current, [key]: down };
    onControlChange({ ...stateRef.current });
  }, [onControlChange]);

  const bottomPad = Platform.OS === "web" ? 34 : insets.bottom;

  return (
    <View style={[styles.container, { paddingBottom: bottomPad + 16 }]} pointerEvents="box-none">
      {/* Movement D-pad left */}
      <View style={styles.leftCluster}>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnActive]}
          onPressIn={() => press("forward", true)}
          onPressOut={() => press("forward", false)}
        >
          <Ionicons name="chevron-up" size={28} color="rgba(0,255,136,0.9)" />
        </Pressable>
        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnActive]}
            onPressIn={() => press("left", true)}
            onPressOut={() => press("left", false)}
          >
            <Ionicons name="chevron-back" size={28} color="rgba(0,255,136,0.9)" />
          </Pressable>
          <View style={[styles.btn, styles.centerBtn]} />
          <Pressable
            style={({ pressed }) => [styles.btn, pressed && styles.btnActive]}
            onPressIn={() => press("right", true)}
            onPressOut={() => press("right", false)}
          >
            <Ionicons name="chevron-forward" size={28} color="rgba(0,255,136,0.9)" />
          </Pressable>
        </View>
        <Pressable
          style={({ pressed }) => [styles.btn, pressed && styles.btnActive]}
          onPressIn={() => press("backward", true)}
          onPressOut={() => press("backward", false)}
        >
          <Ionicons name="chevron-down" size={28} color="rgba(0,255,136,0.9)" />
        </Pressable>
      </View>

      {/* Turn controls right */}
      <View style={styles.rightCluster}>
        <View style={styles.btnRow}>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.turnBtn, pressed && styles.btnActive]}
            onPressIn={() => press("turnLeft", true)}
            onPressOut={() => press("turnLeft", false)}
          >
            <Ionicons name="return-up-back" size={24} color="rgba(0,221,255,0.9)" />
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.btn, styles.turnBtn, pressed && styles.btnActive]}
            onPressIn={() => press("turnRight", true)}
            onPressOut={() => press("turnRight", false)}
          >
            <Ionicons name="return-up-forward" size={24} color="rgba(0,221,255,0.9)" />
          </Pressable>
        </View>
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
    justifyContent: "space-between",
    paddingHorizontal: 24,
    alignItems: "flex-end",
  },
  leftCluster: {
    alignItems: "center",
    gap: 2,
  },
  rightCluster: {
    alignItems: "center",
    justifyContent: "flex-end",
  },
  btnRow: {
    flexDirection: "row",
    gap: 2,
  },
  btn: {
    width: 60,
    height: 60,
    backgroundColor: "rgba(0,0,0,0.55)",
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,255,136,0.25)",
  },
  turnBtn: {
    width: 70,
    height: 70,
    borderColor: "rgba(0,221,255,0.25)",
  },
  btnActive: {
    backgroundColor: "rgba(0,255,136,0.15)",
    borderColor: "rgba(0,255,136,0.6)",
  },
  centerBtn: {
    backgroundColor: "rgba(0,0,0,0.3)",
    borderColor: "rgba(0,255,136,0.1)",
  },
});
