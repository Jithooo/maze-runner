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
import { THEMES, ThemeKey, getThemeForScore } from "@/constants/colors";
import { castRays, RaycastResult } from "@/components/Raycaster";

const COLLECT_RADIUS = 1.0; // generous — wider than any wall-blocked approach angle
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
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const playerPosRef = useRef<Position>(playerPos);

  // Keep a ref to collectibles so the game-loop closure never goes stale
  const collectiblesRef = useRef(collectibles);
  useEffect(() => { collectiblesRef.current = collectibles; }, [collectibles]);

  // Prevent double-collection across stale ticks (reset every level)
  const pendingCollectRef = useRef<Set<string>>(new Set());
  useEffect(() => { pendingCollectRef.current = new Set(); }, [gameState.level]);

  // Batch raycast + displayPos into ONE state → one re-render per frame instead of two
  const [view, setView] = useState<{ raycast: RaycastResult; pos: Position }>(() => ({
    raycast: castRays(maze, playerPos.x, playerPos.y, playerPos.angle),
    pos: playerPos,
  }));
  const raycast = view.raycast;
  const displayPos = view.pos;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [showLevelMsg, setShowLevelMsg] = useState(false);
  const [confettiTrigger, setConfettiTrigger] = useState(0);
  const [scorePopups, setScorePopups] = useState<Array<{ id: number; screenX: number; screenY: number }>>([]);
  const popupIdRef = useRef(0);

  useEffect(() => {
    playerPosRef.current = playerPos;
    setView((v) => ({ ...v, pos: playerPos }));
  }, [playerPos]);

  // Level-complete detection — advances every 1000 score points
  const levelThresholdRef = useRef(0);
  const levelAnimatingRef = useRef(false);

  // Reset threshold when a new game starts
  useEffect(() => {
    if (gameState.score === 0 && gameState.level === 0) {
      levelThresholdRef.current = 0;
      levelAnimatingRef.current = false;
    }
  }, [gameState.score, gameState.level]);

  useEffect(() => {
    if (gameState.gamePhase !== "playing") return;
    if (levelAnimatingRef.current) return;

    const milestone = Math.floor(gameState.score / 1000) * 1000;
    if (milestone > 0 && milestone > levelThresholdRef.current) {
      levelThresholdRef.current = milestone;
      levelAnimatingRef.current = true;
      setShowLevelMsg(true);
      Animated.sequence([
        Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: false }),
        Animated.delay(1200),
        Animated.timing(fadeAnim, { toValue: 0, duration: 400, useNativeDriver: false }),
      ]).start(() => {
        setShowLevelMsg(false);
        levelAnimatingRef.current = false;
        nextLevel();
      });
    }
  }, [gameState.score, gameState.gamePhase]);

  const spawnScorePopup = useCallback((screenX: number, screenY: number) => {
    const id = ++popupIdRef.current;
    setScorePopups((prev) => [...prev, { id, screenX, screenY }]);
    setTimeout(() => setScorePopups((prev) => prev.filter((p) => p.id !== id)), 1000);
  }, []);

  // Game loop — requestAnimationFrame with delta-time (frame-rate independent)
  useEffect(() => {
    if (gameState.gamePhase !== "playing") {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      return;
    }

    let alive = true;

    const tick = (timestamp: number) => {
      if (!alive) return;

      // Delta-time capped at 50ms to prevent huge jumps on tab-resume
      const dt = Math.min(timestamp - (lastTimeRef.current || timestamp), 50);
      lastTimeRef.current = timestamp;
      const scale = dt / 16; // normalise to 60fps baseline

      const ctrl = controlState.current;
      let { x, y, angle } = playerPosRef.current;

      const joyX = ctrl.joyX;
      const joyY = ctrl.joyY;

      // Rotation — analog, scaled by delta-time
      if (Math.abs(joyX) > 0.05) {
        angle += TURN_SPEED * joyX * scale;
      }

      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const MARGIN = 0.16;

      // Movement — analog, scaled by delta-time
      if (Math.abs(joyY) > 0.05) {
        const speed = MOVE_SPEED * Math.abs(joyY) * scale;
        const dirSign = joyY < 0 ? 1 : -1;
        const dx = cos * speed * dirSign;
        const dy = sin * speed * dirSign;

        const nx = x + dx;
        const ny = y + dy;

        // 4-corner bounding-box collision — checks all corners for each axis independently.
        // This gives proper wall-sliding: blocked on X? still slide on Y, and vice versa.
        const M = MARGIN;
        const canX = !isWall(maze, nx + M, y + M) && !isWall(maze, nx + M, y - M) &&
                     !isWall(maze, nx - M, y + M) && !isWall(maze, nx - M, y - M);
        const canY = !isWall(maze, x + M, ny + M) && !isWall(maze, x + M, ny - M) &&
                     !isWall(maze, x - M, ny + M) && !isWall(maze, x - M, ny - M);

        if (canX) x = nx;
        if (canY) y = ny;
      }

      const newPos: Position = { x, y, angle };
      playerPosRef.current = newPos;

      const rc = castRays(maze, x, y, angle);
      // Single batched state update → single React re-render per frame
      setView({ raycast: rc, pos: newPos });

      // Collectible pickup — read via ref to avoid stale closures
      collectiblesRef.current.forEach((c) => {
        if (c.collected || pendingCollectRef.current.has(c.id)) return;
        const ddx = c.x - x;
        const ddy = c.y - y;
        if (Math.sqrt(ddx * ddx + ddy * ddy) < COLLECT_RADIUS) {
          pendingCollectRef.current.add(c.id);
          collectItem(c.id);
          setConfettiTrigger((t) => t + 1);
          if (Platform.OS !== "web") {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          }
          spawnScorePopup(width / 2, height * 0.42);
        }
      });

      animFrameRef.current = requestAnimationFrame(tick);
    };

    lastTimeRef.current = 0;
    animFrameRef.current = requestAnimationFrame(tick);

    return () => {
      alive = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  // collectibles intentionally omitted — read via collectiblesRef
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maze, gameState.gamePhase, width, height]);

  const handleControlChange = useCallback((state: ControlState) => {
    controlState.current = state;
  }, []);

  if (gameState.gamePhase === "menu") {
    return <MenuScreen onStart={startGame} highScore={gameState.highScore} theme={T} />;
  }

  if (gameState.gamePhase === "victory") {
    return <VictoryScreen score={gameState.score} highScore={gameState.highScore} onRestart={restartGame} theme={T} />;
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

      {/* Theme change toast — fires each time score crosses a 1000 boundary */}
      {gameState.themeChangedAt > 0 && gameState.score === gameState.themeChangedAt && (
        <ThemeChangeToast score={gameState.score} theme={T} />
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
type AnyTheme = typeof THEMES[ThemeKey];

function GameViewSimple({ width, height, raycast, collectibles, playerPos, theme }: {
  width: number;
  height: number;
  raycast: RaycastResult;
  collectibles: any[];
  playerPos: Position;
  theme: AnyTheme;
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
  theme: AnyTheme;
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

function VictoryScreen({ score, highScore, onRestart, theme }: {
  score: number;
  highScore: number;
  onRestart: () => void;
  theme: AnyTheme;
}) {
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 700, useNativeDriver: false }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={[styles.menuContainer, { paddingTop: topPad + 24, backgroundColor: theme.bg }]}>
      <View style={styles.menuContent}>
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <View style={[styles.menuLogo, { borderColor: `rgba(${theme.glow},0.5)`, backgroundColor: `rgba(${theme.glow},0.1)` }]}>
            <Ionicons name="trophy" size={72} color={theme.primary} />
          </View>
        </Animated.View>
        <Text style={[styles.menuTitle, { color: theme.primary, fontSize: 44 }]}>YOU WIN!</Text>
        <Text style={[styles.menuSubtitle, { color: theme.accent }]}>10,000 SCORE REACHED</Text>

        <View style={[styles.highScoreCard, { borderColor: `rgba(${theme.glow},0.4)`, backgroundColor: `rgba(${theme.glow},0.08)` }]}>
          <Text style={[styles.highScoreLabel, { color: theme.accent }]}>FINAL SCORE</Text>
          <Text style={[styles.highScoreValue, { color: theme.primary }]}>{score.toLocaleString()}</Text>
        </View>

        {highScore >= score && (
          <View style={styles.highScoreCard}>
            <Text style={styles.highScoreLabel}>ALL TIME BEST</Text>
            <Text style={styles.highScoreValue}>{highScore.toLocaleString()}</Text>
          </View>
        )}

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            style={({ pressed }) => [
              styles.startBtn,
              { backgroundColor: theme.primary },
              pressed && styles.startBtnPressed,
            ]}
            onPress={() => {
              if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              onRestart();
            }}
          >
            <Ionicons name="refresh" size={24} color={theme.bg} />
            <Text style={[styles.startBtnText, { color: theme.bg }]}>PLAY AGAIN</Text>
          </Pressable>
        </Animated.View>
      </View>
    </View>
  );
}

function ThemeChangeToast({ score, theme }: { score: number; theme: AnyTheme }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const themeNames = Object.keys(THEMES);
  const idx = Math.min(Math.floor(score / 1000), themeNames.length - 1);
  const themeName = themeNames[idx].toUpperCase();

  useEffect(() => {
    Animated.sequence([
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: false }),
      Animated.delay(2200),
      Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: false }),
    ]).start();
  }, [score]);

  return (
    <Animated.View
      style={[styles.themeToast, { opacity, backgroundColor: theme.hudBg, borderColor: theme.primary }]}
      pointerEvents="none"
    >
      <Ionicons name="color-palette" size={18} color={theme.primary} />
      <Text style={[styles.themeToastText, { color: theme.primary }]}>
        {themeName} THEME — {Math.floor(score / 1000) * 1000} PTS
      </Text>
    </Animated.View>
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
