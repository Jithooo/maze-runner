import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  useWindowDimensions,
  Pressable,
  Animated,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useGame } from "@/components/GameContext";
import GameHUD from "@/components/GameHUD";
import Controls, { ControlState } from "@/components/Controls";
import MiniMap from "@/components/MiniMap";
import {
  CELL_SIZE,
  MOVE_SPEED,
  TURN_SPEED,
  isWall,
  Position,
} from "@/constants/maze";
import { castRays } from "@/components/Raycaster";
import Colors from "@/constants/colors";

const COLLECT_RADIUS = 0.6;

export default function GameScreen() {
  const { gameState, maze, playerPos, setPlayerPos, collectibles, collectItem, startGame, nextLevel, restartGame, exitToMenu } = useGame();
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const controlState = useRef<ControlState>({
    forward: false, backward: false, left: false, right: false, turnLeft: false, turnRight: false,
  });
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerPosRef = useRef<Position>(playerPos);
  const [raycast, setRaycast] = useState(() => castRays(maze, playerPos.x, playerPos.y, playerPos.angle));
  const [displayPos, setDisplayPos] = useState(playerPos);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showLevelMsg, setShowLevelMsg] = useState(false);

  useEffect(() => {
    playerPosRef.current = playerPos;
    setDisplayPos(playerPos);
  }, [playerPos]);

  // Check if all collected → level complete
  useEffect(() => {
    if (gameState.gamePhase !== "playing") return;
    if (collectibles.length > 0 && collectibles.every((c) => c.collected)) {
      setShowLevelMsg(true);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.delay(1500),
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start(() => {
        setShowLevelMsg(false);
        nextLevel();
      });
    }
  }, [collectibles, gameState.gamePhase]);

  useEffect(() => {
    if (gameState.gamePhase !== "playing") {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
      return;
    }

    animFrameRef.current = setInterval(() => {
      const ctrl = controlState.current;
      let { x, y, angle } = playerPosRef.current;

      if (ctrl.turnLeft) angle -= TURN_SPEED;
      if (ctrl.turnRight) angle += TURN_SPEED;

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const MARGIN = 0.25;

      let nx = x;
      let ny = y;

      if (ctrl.forward) { nx += cos * MOVE_SPEED; ny += sin * MOVE_SPEED; }
      if (ctrl.backward) { nx -= cos * MOVE_SPEED; ny -= sin * MOVE_SPEED; }
      if (ctrl.left) { nx += sin * MOVE_SPEED; ny -= cos * MOVE_SPEED; }
      if (ctrl.right) { nx -= sin * MOVE_SPEED; ny += cos * MOVE_SPEED; }

      if (!isWall(maze, nx + MARGIN, y) && !isWall(maze, nx - MARGIN, y)) x = nx;
      if (!isWall(maze, x, ny + MARGIN) && !isWall(maze, x, ny - MARGIN)) y = ny;

      const newPos: Position = { x, y, angle };
      playerPosRef.current = newPos;

      const rc = castRays(maze, x, y, angle);
      setRaycast(rc);
      setDisplayPos(newPos);

      // Check collectible pickup
      collectibles.forEach((c) => {
        if (c.collected) return;
        const dx = c.x - x;
        const dy = c.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < COLLECT_RADIUS) {
          collectItem(c.id);
          if (Platform.OS !== "web") {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
        }
      });
    }, 16);

    return () => {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
    };
  }, [maze, collectibles, gameState.gamePhase]);

  const handleControlChange = useCallback((state: ControlState) => {
    controlState.current = state;
  }, []);

  if (gameState.gamePhase === "menu") {
    return <MenuScreen onStart={startGame} highScore={gameState.highScore} />;
  }

  if (gameState.gamePhase === "victory") {
    return <VictoryScreen score={gameState.score} highScore={gameState.highScore} onRestart={restartGame} onMenu={exitToMenu} />;
  }

  const topMiniMap = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={styles.container}>
      {/* 3D View — WebGL-free raycaster */}
      <GameViewSimple width={width} height={height} raycast={raycast} collectibles={collectibles} playerPos={displayPos} />

      {/* HUD */}
      <GameHUD width={width} />

      {/* Mini Map — offset below HUD top */}
      <View style={{ position: "absolute", right: 16, top: topMiniMap + 80 }}>
        <MiniMap maze={maze} playerPos={displayPos} collectibles={collectibles} />
      </View>

      {/* Controls */}
      <Controls onControlChange={handleControlChange} />

      {/* Level complete flash */}
      {showLevelMsg && (
        <Animated.View style={[styles.levelFlash, { opacity: fadeAnim }]}>
          <Text style={styles.levelFlashText}>LEVEL COMPLETE!</Text>
          <Text style={styles.levelFlashSub}>+{collectibles.length * 100} pts</Text>
        </Animated.View>
      )}
    </View>
  );
}

// Pure View-based raycaster renderer (no Canvas/Skia dependency)
function GameViewSimple({ width, height, raycast, collectibles, playerPos }: any) {
  const halfH = height / 2;
  const numRays = raycast.rays.length;
  const sliceW = width / numRays;

  return (
    <View style={{ width, height, overflow: "hidden", backgroundColor: "#0A0E1A" }}>
      {/* Sky gradient */}
      <View style={{ position: "absolute", left: 0, top: 0, width, height: halfH, backgroundColor: "#080C14" }} />
      {/* Floor gradient */}
      <View style={{ position: "absolute", left: 0, top: halfH, width, height: halfH, backgroundColor: "#0D1520" }} />

      {/* Wall slices */}
      {raycast.rays.map((ray: any, i: number) => {
        const dist = Math.max(0.15, ray.distance);
        const wallH = Math.min(height * 2, (height / dist) * 1.5);
        const top = (height - wallH) / 2;
        const fogT = Math.max(0, Math.min(1, (dist - 2) / 12));
        const baseR = ray.wallType === "vertical" ? 30 : 22;
        const baseG = ray.wallType === "vertical" ? 58 : 45;
        const baseB = ray.wallType === "vertical" ? 95 : 74;
        const r = Math.round(baseR + (10 - baseR) * fogT);
        const g = Math.round(baseG + (14 - baseG) * fogT);
        const b = Math.round(baseB + (26 - baseB) * fogT);
        const glowAlpha = Math.max(0, (1 - dist / 4) * 0.4);

        return (
          <View
            key={i}
            style={{
              position: "absolute",
              left: i * sliceW,
              top,
              width: sliceW + 1,
              height: wallH,
              backgroundColor: `rgb(${r},${g},${b})`,
            }}
          >
            {glowAlpha > 0.05 && (
              <View
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 2,
                  backgroundColor: `rgba(0,255,136,${glowAlpha})`,
                }}
              />
            )}
          </View>
        );
      })}

      {/* Collectible sprites */}
      {collectibles
        .filter((c: any) => !c.collected)
        .map((c: any) => {
          const dx = c.x - playerPos.x;
          const dy = c.y - playerPos.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 10 || dist < 0.3) return null;
          const spriteAngle = Math.atan2(dy, dx);
          let angleDiff = spriteAngle - playerPos.angle;
          while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
          while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
          const halfFov = Math.PI / 6;
          if (Math.abs(angleDiff) > halfFov * 1.1) return null;
          const screenX = width / 2 + (angleDiff / halfFov) * (width / 2);
          const sz = Math.max(6, Math.min(70, (height / dist) * 0.65));
          const alpha = Math.min(1, 0.95 - dist * 0.04);
          return (
            <View
              key={c.id}
              style={{
                position: "absolute",
                left: screenX - sz / 2,
                top: halfH - sz / 2,
                width: sz,
                height: sz,
                borderRadius: sz / 2,
                backgroundColor: `rgba(255,215,0,${alpha})`,
                shadowColor: "#FFD700",
                shadowOpacity: 0.8,
                shadowRadius: 6,
              }}
            />
          );
        })}
    </View>
  );
}

function MenuScreen({ onStart, highScore }: { onStart: () => void; highScore: number }) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 900, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={[styles.menuContainer, { paddingTop: topPad + 40 }]}>
      {/* Background grid lines */}
      <View style={styles.menuBg} />

      <View style={styles.menuContent}>
        <View style={styles.menuLogo}>
          <Ionicons name="navigate-circle" size={72} color="#00FF88" />
        </View>
        <Text style={styles.menuTitle}>MAZE</Text>
        <Text style={styles.menuSubtitle}>3D EXPLORER</Text>

        {highScore > 0 && (
          <View style={styles.highScoreCard}>
            <Text style={styles.highScoreLabel}>BEST</Text>
            <Text style={styles.highScoreValue}>{highScore.toLocaleString()}</Text>
          </View>
        )}

        <View style={styles.menuInstructions}>
          <View style={styles.instrRow}>
            <Ionicons name="diamond" size={16} color="#FFD700" />
            <Text style={styles.instrText}>Collect all gems to advance</Text>
          </View>
          <View style={styles.instrRow}>
            <Ionicons name="map" size={16} color="#00DDFF" />
            <Text style={styles.instrText}>Mini-map shows nearby area</Text>
          </View>
          <View style={styles.instrRow}>
            <Ionicons name="game-controller" size={16} color="#00FF88" />
            <Text style={styles.instrText}>Use D-pad to move & turn</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onStart();
            }}
          >
            <Ionicons name="play" size={24} color="#0A0E1A" />
            <Text style={styles.startBtnText}>START GAME</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function VictoryScreen({ score, highScore, onRestart, onMenu }: { score: number; highScore: number; onRestart: () => void; onMenu: () => void }) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const spinAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, { toValue: 1, duration: 3000, useNativeDriver: false })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={[styles.menuContainer, { paddingTop: topPad + 60 }]}>
      <View style={styles.menuContent}>
        <Animated.View style={{ transform: [{ rotate: spin }] }}>
          <Ionicons name="trophy" size={80} color="#FFD700" />
        </Animated.View>
        <Text style={[styles.menuTitle, { color: "#FFD700" }]}>VICTORY!</Text>
        <Text style={styles.menuSubtitle}>ALL LEVELS CLEARED</Text>

        <View style={styles.scoreDisplay}>
          <Text style={styles.scoreDisplayLabel}>FINAL SCORE</Text>
          <Text style={styles.scoreDisplayValue}>{score.toLocaleString()}</Text>
          {score >= highScore && score > 0 && (
            <View style={styles.newHighBadge}>
              <Text style={styles.newHighText}>NEW BEST!</Text>
            </View>
          )}
        </View>

        <Pressable
          style={({ pressed }) => [styles.startBtn, pressed && styles.startBtnPressed]}
          onPress={onRestart}
        >
          <Ionicons name="refresh" size={22} color="#0A0E1A" />
          <Text style={styles.startBtnText}>PLAY AGAIN</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.menuBtn, pressed && styles.menuBtnPressed]}
          onPress={onMenu}
        >
          <Text style={styles.menuBtnText}>MAIN MENU</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0E1A",
  },
  levelFlash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  levelFlashText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    color: "#00FF88",
    letterSpacing: 4,
  },
  levelFlashSub: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    color: "#FFD700",
    marginTop: 8,
  },
  menuContainer: {
    flex: 1,
    backgroundColor: "#0A0E1A",
    alignItems: "center",
  },
  menuBg: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
  },
  menuContent: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 32,
  },
  menuLogo: {
    width: 120,
    height: 120,
    borderRadius: 30,
    backgroundColor: "rgba(0,255,136,0.1)",
    borderWidth: 2,
    borderColor: "rgba(0,255,136,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    color: "#00FF88",
    letterSpacing: 10,
  },
  menuSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#00DDFF",
    letterSpacing: 6,
    marginTop: -16,
  },
  highScoreCard: {
    backgroundColor: "rgba(255,215,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,215,0,0.3)",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 10,
    alignItems: "center",
  },
  highScoreLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,215,0,0.7)",
    letterSpacing: 3,
  },
  highScoreValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  menuInstructions: {
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    alignSelf: "stretch",
  },
  instrRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  instrText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.75)",
  },
  startBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#00FF88",
    paddingHorizontal: 48,
    paddingVertical: 18,
    borderRadius: 50,
  },
  startBtnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.97 }],
  },
  startBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: "#0A0E1A",
    letterSpacing: 2,
  },
  menuBtn: {
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  menuBtnPressed: {
    opacity: 0.7,
  },
  menuBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.7)",
    letterSpacing: 2,
  },
  scoreDisplay: {
    alignItems: "center",
    gap: 4,
  },
  scoreDisplayLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 3,
  },
  scoreDisplayValue: {
    fontSize: 48,
    fontFamily: "Inter_700Bold",
    color: "#FFD700",
  },
  newHighBadge: {
    backgroundColor: "#00FF88",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  newHighText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    color: "#0A0E1A",
    letterSpacing: 2,
  },
});
