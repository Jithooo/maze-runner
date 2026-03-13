import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useGame } from "./GameContext";
import Colors from "@/constants/colors";

interface Props {
  width: number;
}

export default function GameHUD({ width }: Props) {
  const { gameState, collectibles } = useGame();
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
      {/* Top row */}
      <View style={styles.topRow}>
        {/* Score */}
        <View style={styles.hudCard}>
          <Text style={styles.hudLabel}>SCORE</Text>
          <Animated.Text style={[styles.hudValue, styles.scoreText, { transform: [{ scale: scoreAnim }] }]}>
            {gameState.score.toLocaleString()}
          </Animated.Text>
        </View>

        {/* Level */}
        <View style={[styles.hudCard, styles.centerCard]}>
          <Text style={styles.hudLabel}>LEVEL</Text>
          <Text style={[styles.hudValue, styles.levelText]}>{gameState.level + 1}</Text>
        </View>

        {/* Gems */}
        <View style={styles.hudCard}>
          <Text style={styles.hudLabel}>GEMS</Text>
          <View style={styles.gemRow}>
            <Ionicons name="diamond" size={14} color={Colors.light.gold} />
            <Text style={[styles.hudValue, styles.gemText]}> {remaining}</Text>
          </View>
        </View>
      </View>

      {/* Crosshair */}
      <View style={styles.crosshairContainer} pointerEvents="none">
        <View style={styles.crosshairH} />
        <View style={styles.crosshairV} />
        <View style={styles.crosshairDot} />
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
    backgroundColor: "rgba(0,0,0,0.65)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,255,136,0.25)",
    minWidth: 80,
  },
  centerCard: {
    borderColor: "rgba(0,221,255,0.3)",
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
  scoreText: {
    color: "#00FF88",
    fontSize: 16,
  },
  levelText: {
    color: "#00DDFF",
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
    backgroundColor: "rgba(0,255,136,0.7)",
  },
  crosshairV: {
    position: "absolute",
    width: 1.5,
    height: 20,
    backgroundColor: "rgba(0,255,136,0.7)",
  },
  crosshairDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#00FF88",
  },
});
