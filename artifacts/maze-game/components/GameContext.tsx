import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Collectible,
  MazeGrid,
  Position,
  MAZES,
  getCollectibles,
  getStartPosition,
} from "@/constants/maze";

interface GameState {
  score: number;
  highScore: number;
  level: number;
  lives: number;
  gamePhase: "menu" | "playing" | "levelComplete" | "gameOver" | "victory";
}

interface GameContextType {
  gameState: GameState;
  maze: MazeGrid;
  playerPos: Position;
  collectibles: Collectible[];
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

const HIGH_SCORE_KEY = "maze_high_score";

export function GameProvider({ children }: { children: React.ReactNode }) {
  const [gameState, setGameState] = useState<GameState>({
    score: 0,
    highScore: 0,
    level: 0,
    lives: 3,
    gamePhase: "menu",
  });

  const [maze, setMaze] = useState<MazeGrid>(MAZES[0]);
  const [playerPos, setPlayerPos] = useState<Position>(getStartPosition(MAZES[0]));
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);

  const loadHighScore = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(HIGH_SCORE_KEY);
      if (stored) {
        setGameState((s) => ({ ...s, highScore: parseInt(stored, 10) }));
      }
    } catch {}
  }, []);

  const saveHighScore = useCallback(async (score: number) => {
    try {
      await AsyncStorage.setItem(HIGH_SCORE_KEY, score.toString());
    } catch {}
  }, []);

  React.useEffect(() => {
    loadHighScore();
  }, [loadHighScore]);

  const startGame = useCallback(() => {
    const level = 0;
    const currentMaze = MAZES[level];
    const startPos = getStartPosition(currentMaze);
    const cols = getCollectibles(currentMaze, level);
    setMaze(currentMaze);
    setPlayerPos(startPos);
    setCollectibles(cols);
    setGameState((s) => ({
      ...s,
      score: 0,
      level,
      lives: 3,
      gamePhase: "playing",
    }));
  }, []);

  const nextLevel = useCallback(() => {
    setGameState((prev) => {
      const nextLvl = prev.level + 1;
      if (nextLvl >= MAZES.length) {
        return { ...prev, gamePhase: "victory" };
      }
      const currentMaze = MAZES[nextLvl];
      const startPos = getStartPosition(currentMaze);
      const cols = getCollectibles(currentMaze, nextLvl);
      setMaze(currentMaze);
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
      const newHigh = Math.max(newScore, prev.highScore);
      if (newHigh > prev.highScore) {
        saveHighScore(newHigh);
      }
      return { ...prev, score: newScore, highScore: newHigh };
    });
  }, [saveHighScore]);

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
