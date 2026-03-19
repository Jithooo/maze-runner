import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Collectible,
  MazeGrid,
  Position,
  getCollectibles,
  getStartPosition,
  getMazeForLevel,
} from "@/constants/maze";
import { ThemeKey, getThemeForScore } from "@/constants/colors";

export type ThemeVariant = ThemeKey;

const MAX_SCORE = 10000;

interface GameState {
  score: number;
  highScore: number;
  level: number;
  totalGemsEver: number;
  gamePhase: "menu" | "playing" | "levelComplete" | "gameOver" | "victory";
  themeChangedAt: number; // score milestone of most recent theme change (for toast)
}

interface GameContextType {
  gameState: GameState;
  maze: MazeGrid;
  playerPos: Position;
  collectibles: Collectible[];
  theme: ThemeVariant;
  setPlayerPos: (pos: Position) => void;
  collectItem: (id: string) => void;
  startGame: () => void;
  nextLevel: () => void;
  restartGame: () => void;
  exitToMenu: () => void;
}

const GameContext = createContext<GameContextType | null>(null);

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error("useGame must be used within GameProvider");
  return ctx;
}

const HIGH_SCORE_KEY = "maze_high_score_v2";
const TOTAL_GEMS_KEY = "maze_total_gems";

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: 0,
    level: 0,
    totalGemsEver: 0,
    gamePhase: "menu",
    themeChangedAt: -1,
  });

  const initialMaze = getMazeForLevel(0);
  const [maze, setMaze] = useState<MazeGrid>(initialMaze);
  const [playerPos, setPlayerPos] = useState<Position>(getStartPosition(initialMaze));
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);

  // Derive theme from current score (changes every 1000 pts)
  const theme: ThemeVariant = getThemeForScore(gameState.score);

  const loadPersisted = useCallback(async () => {
    try {
      const [hs, tg] = await Promise.all([
        AsyncStorage.getItem(HIGH_SCORE_KEY),
        AsyncStorage.getItem(TOTAL_GEMS_KEY),
      ]);
      setGameState((s) => ({
        ...s,
        highScore: hs ? parseInt(hs, 10) : 0,
        totalGemsEver: tg ? parseInt(tg, 10) : 0,
      }));
    } catch {}
  }, []);

  const savePersisted = useCallback(async (highScore: number, totalGems: number) => {
    try {
      await AsyncStorage.multiSet([
        [HIGH_SCORE_KEY, highScore.toString()],
        [TOTAL_GEMS_KEY, totalGems.toString()],
      ]);
    } catch {}
  }, []);

  React.useEffect(() => {
    loadPersisted();
  }, [loadPersisted]);

  // Guard against scoring the same gem twice (stale-closure protection)
  const scoredRef = useRef<Set<string>>(new Set());

  const startGame = useCallback(() => {
    scoredRef.current = new Set();
    const m = getMazeForLevel(0);
    const startPos = getStartPosition(m);
    const cols = getCollectibles(m, 0);
    setMaze(m);
    setPlayerPos(startPos);
    setCollectibles(cols);
    setGameState((s) => ({ ...s, score: 0, level: 0, gamePhase: "playing", themeChangedAt: -1 }));
  }, []);

  const nextLevel = useCallback(() => {
    scoredRef.current = new Set();
    setGameState((prev) => {
      const nextLvl = prev.level + 1;
      const m = getMazeForLevel(nextLvl);
      const startPos = getStartPosition(m);
      const cols = getCollectibles(m, nextLvl);
      setMaze(m);
      setPlayerPos(startPos);
      setCollectibles(cols);
      return { ...prev, level: nextLvl, gamePhase: "playing" };
    });
  }, []);

  const collectItem = useCallback((id: string) => {
    if (scoredRef.current.has(id)) return;
    scoredRef.current.add(id);

    setCollectibles((prev) => {
      const gem = prev.find((c) => c.id === id);
      if (!gem || gem.collected) return prev;
      return prev.map((c) => (c.id === id ? { ...c, collected: true } : c));
    });

    setGameState((prev) => {
      const newScore = prev.score + 100;
      const newTotal = prev.totalGemsEver + 1;
      const newHigh = Math.max(newScore, prev.highScore);
      savePersisted(newHigh, newTotal);

      // Check if we just crossed a 1000-point theme boundary
      const prevMilestone = Math.floor(prev.score / 1000);
      const newMilestone = Math.floor(newScore / 1000);
      const didThemeChange = newMilestone > prevMilestone;

      // Win condition: score hits MAX_SCORE
      if (newScore >= MAX_SCORE) {
        return {
          ...prev,
          score: newScore,
          highScore: newHigh,
          totalGemsEver: newTotal,
          gamePhase: "victory",
          themeChangedAt: didThemeChange ? newScore : prev.themeChangedAt,
        };
      }

      return {
        ...prev,
        score: newScore,
        highScore: newHigh,
        totalGemsEver: newTotal,
        themeChangedAt: didThemeChange ? newScore : prev.themeChangedAt,
      };
    });
  }, [savePersisted]);

  const restartGame = useCallback(() => {
    startGame();
  }, [startGame]);

  const exitToMenu = useCallback(() => {
    setGameState((s) => ({ ...s, gamePhase: "menu" }));
  }, []);

  return (
    <GameContext.Provider
      value={{
        gameState,
        maze,
        playerPos,
        collectibles,
        theme,
        setPlayerPos,
        collectItem,
        startGame,
        nextLevel,
        restartGame,
        exitToMenu,
      }}
    >
      {children}
    </GameContext.Provider>
  );
}
