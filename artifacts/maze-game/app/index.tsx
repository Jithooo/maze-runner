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
import ConfettiEffect from "@/components/ConfettiEffect";
import { GemSprite } from "@/components/GemSprite";
import {
  MOVE_SPEED,
  TURN_SPEED,
  isWall,
  Position,
} from "@/constants/maze";
import { THEMES, ThemeKey } from "@/constants/colors";
import { castRays, RaycastResult } from "@/components/Raycaster";

const COLLECT_RADIUS = 0.65;
const HALF_FOV = Math.PI / 3;

export default function GameScreen() {
  const {
    gameState,
    maze,
    playerPos,
    collectibles,
    theme,
    collectItem,
    startGame,
    nextLevel,
    restartGame,
    exitToMenu,
  } = useGame();

  const T = THEMES[theme as ThemeKey];
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const controlState = useRef<ControlState>({ joyX: 0, joyY: 0 });
  const animFrameRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playerPosRef = useRef<Position>(playerPos);
  const [raycast, setRaycast] = useState<RaycastResult>(() =>
    castRays(maze, playerPos.x, playerPos.y, playerPos.angle)
  );
  const [displayPos, setDisplayPos] = useState<Position>(playerPos);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showLevelMsg, setShowLevelMsg] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [scorePopups, setScorePopups] = useState<Array<{ id: number; screenX: number; screenY: number }>>([]);
  const popupIdRef = useRef(0);

  useEffect(() => {
    playerPosRef.current = playerPos;
    setDisplayPos(playerPos);
  }, [playerPos]);

  useEffect(() => {
    if (gameState.gamePhase !== "playing") return;
    if (collectibles.length > 0 && collectibles.every((c) => c.collected)) {
      setShowLevelMsg(true);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.delay(1600),
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start(() => {
        setShowLevelMsg(false);
        nextLevel();
      });
    }
  }, [collectibles, gameState.gamePhase]);

  const spawnScorePopup = useCallback((screenX: number, screenY: number) => {
    const id = ++popupIdRef.current;
    setScorePopups((prev) => [...prev, { id, screenX, screenY }]);
    setTimeout(() => setScorePopups((prev) => prev.filter((p) => p.id !== id)), 1000);
  }, []);

  useEffect(() => {
    if (gameState.gamePhase !== "playing") {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
      return;
    }

    animFrameRef.current = setInterval(() => {
      const ctrl = controlState.current;
      let { x, y, angle } = playerPosRef.current;

      // Analog rotation from joystick X axis
      const joyX = ctrl.joyX;
      const joyY = ctrl.joyY;

      if (Math.abs(joyX) > 0.05) {
        angle += TURN_SPEED * joyX * 2.0;
      }

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const MARGIN = 0.22;

      let nx = x;
      let ny = y;

      // Analog movement from joystick Y axis
      if (Math.abs(joyY) > 0.05) {
        const speed = MOVE_SPEED * Math.abs(joyY) * 2.0;
        if (joyY < 0) {
          nx += cos * speed;
          ny += sin * speed;
        } else {
          nx -= cos * speed;
          ny -= sin * speed;
        }
      }

      if (!isWall(maze, nx + MARGIN, y) && !isWall(maze, nx - MARGIN, y)) x = nx;
      if (!isWall(maze, x, ny + MARGIN) && !isWall(maze, x, ny - MARGIN)) y = ny;

      const newPos: Position = { x, y, angle };
      playerPosRef.current = newPos;

      const rc = castRays(maze, x, y, angle);
      setRaycast(rc);
      setDisplayPos(newPos);

      // Collectible pickup check
      collectibles.forEach((c) => {
        if (c.collected) return;
        const dx = c.x - x;
        const dy = c.y - y;
        if (Math.sqrt(dx * dx + dy * dy) < COLLECT_RADIUS) {
          collectItem(c.id);
          setConfettiTrigger((t) => t + 1);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          spawnScorePopup(width / 2, height * 0.42);
        }
      });
    }, 16);

    return () => {
      if (animFrameRef.current) clearInterval(animFrameRef.current);
    };
  }, [maze, collectibles, gameState.gamePhase, width, height]);

  const handleControlChange = useCallback((state: ControlState) => {
    controlState.current = state;
  }, []);

  if (gameState.gamePhase === "menu") {
    return <MenuScreen onStart={startGame} highScore={gameState.highScore} theme={T} />;
  }

  const topMiniMap = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: T.bg }]}>
      {/* 3D View */}
      <GameViewSimple
        width={width}
        height={height}
        raycast={raycast}
        collectibles={collectibles}
        playerPos={displayPos}
        theme={T}
      />

      {/* HUD */}
      <GameHUD width={width} />

      {/* Mini Map */}
      <View style={{ position: "absolute", right: 16, top: topMiniMap + 80 }}>
        <MiniMap maze={maze} playerPos={displayPos} collectibles={collectibles} />
      </View>

      {/* Score popups */}
      {scorePopups.map((p) => (
        <ScorePopup key={p.id} id={p.id} screenX={p.screenX} screenY={p.screenY} accentColor={T.accent} />
      ))}

      {/* Confetti */}
      <ConfettiEffect trigger={confettiTrigger} originX={width / 2} originY={height * 0.45} />

      {/* Joystick Controls */}
      <Controls onControlChange={handleControlChange} primaryColor={T.primary} />

      {/* Level complete flash */}
      {showLevelMsg && (
        <Animated.View style={[styles.levelFlash, { opacity: fadeAnim, backgroundColor: T.levelFlashBg }]}>
          <Text style={[styles.levelFlashText, { color: T.primary }]}>LEVEL COMPLETE!</Text>
          <Text style={[styles.levelFlashSub, { color: T.accent }]}>
            Level {gameState.level + 1}
          </Text>
        </Animated.View>
      )}

      {/* Theme unlock toast */}
      {gameState.totalGemsEver === 1000 && (
        <View style={[styles.themeToast, { backgroundColor: T.hudBg, borderColor: T.primary }]}>
          <Ionicons name="flame" size={18} color={T.primary} />
          <Text style={[styles.themeToastText, { color: T.primary }]}>FIRE THEME UNLOCKED!</Text>
        </View>
      )}
    </View>
  );
}

function ScorePopup({ screenX, screenY, accentColor }: { id: number; screenX: number; screenY: number; accentColor: string }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const scale = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -60, duration: 900, useNativeDriver: false }),
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.4, duration: 200, useNativeDriver: false }),
        Animated.timing(scale, { toValue: 1, duration: 150, useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.delay(400),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: false }),
      ]),
    ]).start();
  }, []);

  return (
    <Animated.View
      style={[styles.scorePopup, { left: screenX - 40, top: screenY, opacity, transform: [{ translateY }, { scale }] }]}
      pointerEvents="none"
    >
      <Text style={[styles.scorePopupText, { color: accentColor }]}>+100</Text>
    </Animated.View>
  );
}

// 3D raycaster renderer — uses theme colors for walls/sky/floor
function GameViewSimple({ width, height, raycast, collectibles, playerPos, theme }: {
  width: number;
  height: number;
  raycast: RaycastResult;
  collectibles: any[];
  playerPos: Position;
  theme: typeof THEMES["default"];
}) {
  const halfH = height / 2;
  const numRays = raycast.rays.length;
  const sliceW = width / numRays;
  const [wvR, wvG, wvB] = theme.wallV;
  const [whR, whG, whB] = theme.wallH;
  const [fR, fG, fB] = theme.fog;
  const glow = theme.glow;

  return (
    <View style={{ width, height, overflow: "hidden", backgroundColor: theme.bg }}>
      {/* Sky */}
      <View style={{ position: "absolute", left: 0, top: 0, width, height: halfH, backgroundColor: theme.sky }} />
      {/* Floor */}
      <View style={{ position: "absolute", left: 0, top: halfH, width, height: halfH, backgroundColor: theme.floor }} />

      {/* Wall slices */}
      {raycast.rays.map((ray: any, i: number) => {
        const dist = Math.max(0.15, ray.distance);
        const wallH = Math.min(height * 2, (height / dist) * 1.5);
        const top = (height - wallH) / 2;
        const fogT = Math.max(0, Math.min(1, (dist - 2) / 12));
        const bR = ray.wallType === "vertical" ? wvR : whR;
        const bG = ray.wallType === "vertical" ? wvG : whG;
        const bB = ray.wallType === "vertical" ? wvB : whB;
        const r = Math.round(bR + (fR - bR) * fogT);
        const g = Math.round(bG + (fG - bG) * fogT);
        const b = Math.round(bB + (fB - bB) * fogT);
        const glowAlpha = Math.max(0, (1 - dist / 4) * 0.38);
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
                  top: 0, left: 0, right: 0,
                  height: 2,
                  backgroundColor: `rgba(${glow},${glowAlpha})`,
                }}
              />
            )}
          </View>
        );
      })}

      {/* Gem sprites with z-buffer occlusion */}
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
          const halfFov = HALF_FOV / 2;
          if (Math.abs(angleDiff) > halfFov * 1.1) return null;

          const screenX = width / 2 + (angleDiff / halfFov) * (width / 2);
          const rayIdx = Math.max(0, Math.min(numRays - 1, Math.round(screenX / sliceW)));
          const wallDist = raycast.rays[rayIdx]?.distance ?? 0;
          if (wallDist < dist - 0.3) return null;

          const sz = Math.max(14, Math.min(90, (height / dist) * 0.7));
          const alpha = Math.min(1, Math.max(0.3, 1 - dist * 0.06));

          return (
            <View
              key={c.id}
              style={{
                position: "absolute",
                left: screenX - sz / 2,
                top: halfH - sz * 0.55,
                width: sz,
                height: sz,
              }}
            >
              <GemSprite size={sz} alpha={alpha} color={theme.accent} />
            </View>
          );
        })}
    </View>
  );
}

function MenuScreen({ onStart, highScore, theme }: {
  onStart: () => void;
  highScore: number;
  theme: typeof THEMES["default"];
}) {
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
    <View style={[styles.menuContainer, { paddingTop: topPad + 40, backgroundColor: theme.bg }]}>
      <View style={styles.menuContent}>
        <View style={[styles.menuLogo, { borderColor: `rgba(${theme.glow},0.4)`, backgroundColor: `rgba(${theme.glow},0.08)` }]}>
          <Ionicons name="navigate-circle" size={72} color={theme.primary} />
        </View>
        <Text style={[styles.menuTitle, { color: theme.primary }]}>MAZE</Text>
        <Text style={[styles.menuSubtitle, { color: theme.accent }]}>3D EXPLORER</Text>

        {highScore > 0 && (
          <View style={styles.highScoreCard}>
            <Text style={styles.highScoreLabel}>BEST</Text>
            <Text style={styles.highScoreValue}>{highScore.toLocaleString()}</Text>
          </View>
        )}

        <View style={styles.menuInstructions}>
          <View style={styles.instrRow}>
            <Ionicons name="diamond" size={16} color={theme.accent} />
            <Text style={styles.instrText}>Collect all gems to advance</Text>
          </View>
          <View style={styles.instrRow}>
            <Ionicons name="map" size={16} color={theme.accent} />
            <Text style={styles.instrText}>Mini-map shows nearby area</Text>
          </View>
          <View style={styles.instrRow}>
            <Ionicons name="game-controller" size={16} color={theme.primary} />
            <Text style={styles.instrText}>Joystick to move & turn</Text>
          </View>
          <View style={styles.instrRow}>
            <Ionicons name="infinite" size={16} color={theme.primary} />
            <Text style={styles.instrText}>Infinite levels — how far can you go?</Text>
          </View>
        </View>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: theme.primary },
              pressed && styles.startBtnPressed,
            ]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onStart();
            }}
          >
            <Ionicons name="play" size={24} color={theme.bg} />
            <Text style={[styles.startBtnText, { color: theme.bg }]}>START GAME</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  levelFlash: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
  },
  levelFlashText: {
    fontSize: 36,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  levelFlashSub: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
    marginTop: 8,
  },
  scorePopup: {
    position: "absolute",
    width: 80,
    alignItems: "center",
  },
  scorePopupText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  themeToast: {
    position: "absolute",
    top: 120,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
  },
  themeToastText: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  menuContainer: {
    flex: 1,
    alignItems: "center",
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
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  menuTitle: {
    fontSize: 56,
    fontFamily: "Inter_700Bold",
    letterSpacing: 10,
  },
  menuSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
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
    letterSpacing: 2,
  },
});
