import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./GameContext";
import { THEMES } from "@/constants/colors";

interface Props {
  width: number;
}

export default function GameHUD({ width }: Props) {
  const { gameState, collectibles, theme } = useGame();
  const T = THEMES[theme];
  const insets = useSafeAreaInsets();
  const collected = collectibles.filter((c) => c.collected).length;
  const total = collectibles.length;
  const remaining = total - collected;
  const scoreAnim = useRef(new Animated.Value(1)).current;
  const prevScore = useRef(gameState.score);

  useEffect(() => {
    if (gameState.score !== prevScore.current) {
      prevScore.current = gameState.score;
      Animated.sequence([
        Animated.timing(scoreAnim, { toValue: 1.3, duration: 100, useNativeDriver: false }),
        Animated.timing(scoreAnim, { toValue: 1, duration: 200, useNativeDriver: false }),
      ]).start();
    }
  }, [gameState.score]);

  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { paddingTop: topPad + 8 }]} pointerEvents="none">
      <View style={styles.topRow}>
        {/* Score */}
        <View style={[styles.hudCard, { backgroundColor: T.hudBg, borderColor: T.hudBorder }]}>
          <Text style={styles.hudLabel}>SCORE</Text>
          <Animated.Text style={[styles.hudValue, { color: T.primary, transform: [{ scale: scoreAnim }] }]}>
            {gameState.score.toLocaleString()}
          </Animated.Text>
        </View>

        {/* Level */}
        <View style={[styles.hudCard, { backgroundColor: T.hudBg, borderColor: `rgba(${T.glow},0.25)` }]}>
          <Text style={styles.hudLabel}>LEVEL</Text>
          <Text style={[styles.hudValue, { color: T.accent }]}>{gameState.level + 1}</Text>
        </View>

        {/* Gems */}
        <View style={[styles.hudCard, { backgroundColor: T.hudBg, borderColor: T.hudBorder }]}>
          <Text style={styles.hudLabel}>GEMS</Text>
          <View style={styles.gemRow}>
            <Ionicons name="diamond" size={14} color="#FFD700" />
            <Text style={[styles.hudValue, styles.gemText]}> {remaining}</Text>
          </View>
        </View>
      </View>

      {/* Crosshair */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        <View style={[styles.crosshairH, { backgroundColor: `rgba(${T.glow},0.65)` }]} />
        <View style={[styles.crosshairV, { backgroundColor: `rgba(${T.glow},0.65)` }]} />
        <View style={[styles.crosshairDot, { backgroundColor: T.primary }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
  },
  topRow: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    alignSelf: "stretch",
    justifyContent: "space-between",
  },
  hudCard: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    minWidth: 80,
  },
  hudLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 1.5,
  },
  hudValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: "#FFFFFF",
  },
  gemText: {
    color: "#FFD700",
    fontSize: 16,
  },
  gemRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  crosshairContainer: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -15 }, { translateY: -15 }],
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  crosshairH: {
    position: "absolute",
    width: 20,
    height: 1.5,
  },
  crosshairV: {
    position: "absolute",
    width: 1.5,
    height: 20,
  },
  crosshairDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});
