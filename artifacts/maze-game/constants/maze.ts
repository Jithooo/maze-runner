export const CELL_SIZE = 2;
export const WALL_HEIGHT = 2;
export const MOVE_SPEED = 0.07;
export const TURN_SPEED = 0.035;
export const FOV = Math.PI / 3;
export const NUM_RAYS = 80;
export const MAX_DEPTH = 20;

export type MazeCell = 0 | 1;
export type MazeGrid = MazeCell[][];

export interface Position {
  x: number;
  y: number;
  angle: number;
}

export interface Collectible {
  x: number;
  y: number;
  collected: boolean;
  id: string;
}

// ─── Static starter mazes ───────────────────────────────────────────────────

export const MAZES: MazeGrid[] = [
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,1,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,0,1,1,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,1,0,1],
    [1,1,1,0,1,0,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,1,0,0,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,1,0,0,0,0,0,1],
    [1,1,1,0,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,0,1,1,1,0,1,0,1,1,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
  [
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,0,1,1,1,0,1,0,1,1,1,1,1,0,1],
    [1,0,1,0,1,0,0,0,1,0,0,0,1,0,1],
    [1,0,1,0,1,1,1,1,1,0,1,0,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,1,1,1,1,0,1,1,1,1,1,0,1],
    [1,0,0,0,0,0,1,0,0,0,0,0,0,0,1],
    [1,1,1,0,1,0,1,0,1,1,1,0,1,1,1],
    [1,0,0,0,1,0,0,0,1,0,0,0,0,0,1],
    [1,0,1,1,1,1,1,1,1,0,1,1,1,0,1],
    [1,0,1,0,0,0,0,0,0,0,1,0,0,0,1],
    [1,0,1,0,1,1,1,1,1,1,1,0,1,0,1],
    [1,0,0,0,0,0,0,0,0,0,0,0,1,0,1],
    [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
  ],
];

// ─── Procedural maze generator (recursive backtracker) ──────────────────────

function seededRand(seed: number) {
  let s = (seed + 1) * 1664525 + 1013904223;
  return () => {
    s = Math.imul(s, 1664525) + 1013904223;
    return ((s >>> 0) / 0x100000000);
  };
}

export function generateMaze(width: number = 15, height: number = 15, seed: number = 0): MazeGrid {
  const w = width % 2 === 0 ? width + 1 : width;
  const h = height % 2 === 0 ? height + 1 : height;
  const rand = seededRand(seed);

  const grid: MazeGrid = Array.from({ length: h }, () =>
    Array.from({ length: w }, () => 1 as MazeCell)
  );

  const visited = new Set<number>();
  const key = (r: number, c: number) => r * w + c;

  const carve = (row: number, col: number) => {
    visited.add(key(row, col));
    grid[row][col] = 0;

    const dirs = [[0, 2], [0, -2], [2, 0], [-2, 0]];
    // Fisher-Yates shuffle with seeded rand
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]];
    }

    for (const [dr, dc] of dirs) {
      const nr = row + dr;
      const nc = col + dc;
      if (nr > 0 && nr < h - 1 && nc > 0 && nc < w - 1 && !visited.has(key(nr, nc))) {
        grid[row + dr / 2][col + dc / 2] = 0;
        carve(nr, nc);
      }
    }
  };

  carve(1, 1);
  return grid;
}

export function getMazeForLevel(level: number): MazeGrid {
  if (level < MAZES.length) return MAZES[level];
  // Generate a new random maze for every level beyond the static ones
  // Grow size slightly every 5 levels
  const extra = level - MAZES.length;
  const size = 15 + (Math.floor(extra / 5) * 2);
  const clampedSize = Math.min(25, size); // cap at 25x25
  return generateMaze(clampedSize, clampedSize, level * 7919);
}

// ─── Collectibles ───────────────────────────────────────────────────────────

export function getCollectibles(maze: MazeGrid, level: number): Collectible[] {
  const rand = seededRand(level + 42);
  const positions: { x: number; y: number }[] = [];
  for (let row = 1; row < maze.length - 1; row++) {
    for (let col = 1; col < maze[row].length - 1; col++) {
      if (maze[row][col] === 0 && !(row === 1 && col === 1)) {
        positions.push({ x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 });
      }
    }
  }
  // Seeded shuffle
  for (let i = positions.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [positions[i], positions[j]] = [positions[j], positions[i]];
  }
  const count = Math.min(8 + Math.floor(level / 3), 14);
  return positions.slice(0, count).map((pos, i) => ({
    ...pos,
    collected: false,
    id: `c_${level}_${i}`,
  }));
}

export function getStartPosition(maze: MazeGrid): Position {
  return {
    x: 1 * CELL_SIZE + CELL_SIZE / 2,
    y: 1 * CELL_SIZE + CELL_SIZE / 2,
    angle: 0.2,
  };
}

export function isWall(maze: MazeGrid, x: number, y: number): boolean {
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return true;
  return maze[row][col] === 1;
}
