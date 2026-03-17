import React, { createContext, useContext, useState, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Collectible,
  MazeGrid,
  Position,
  getCollectibles,
  getStartPosition,
  getMazeForLevel,
} from "@/constants/maze";

export type ThemeVariant = "default" | "fire";

interface GameState {
  score: number;
  highScore: number;
  level: number;
  totalGemsEver: number;
  gamePhase: "menu" | "playing" | "levelComplete" | "gameOver" | "victory";
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
  });

  const initialMaze = getMazeForLevel(0);
  const [maze, setMaze] = useState<MazeGrid>(initialMaze);
  const [playerPos, setPlayerPos] = useState<Position>(getStartPosition(initialMaze));
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);

  // Derived theme based on total gems
  const theme: ThemeVariant = gameState.totalGemsEver >= 1000 ? "fire" : "default";

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

  const startLevel = useCallback((level: number, prevScore: number, prevHigh: number, prevTotal: number) => {
    const m = getMazeForLevel(level);
    const startPos = getStartPosition(m);
    const cols = getCollectibles(m, level);
    setMaze(m);
    setPlayerPos(startPos);
    setCollectibles(cols);
    setGameState((s) => ({
      ...s,
      score: prevScore,
      highScore: prevHigh,
      totalGemsEver: prevTotal,
      level,
      gamePhase: "playing",
    }));
  }, []);

  const startGame = useCallback(() => {
    setGameState((s) => {
      const m = getMazeForLevel(0);
      const startPos = getStartPosition(m);
      const cols = getCollectibles(m, 0);
      setMaze(m);
      setPlayerPos(startPos);
      setCollectibles(cols);
      return { ...s, score: 0, level: 0, gamePhase: "playing" };
    });
  }, []);

  const nextLevel = useCallback(() => {
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
    setCollectibles((prev) =>
      prev.map((c) => (c.id === id ? { ...c, collected: true } : c))
    );
    setGameState((prev) => {
      const newScore = prev.score + 100;
      const newTotal = prev.totalGemsEver + 1;
      const newHigh = Math.max(newScore, prev.highScore);
      savePersisted(newHigh, newTotal);
      return { ...prev, score: newScore, highScore: newHigh, totalGemsEver: newTotal };
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
