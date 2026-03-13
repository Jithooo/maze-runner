export const CELL_SIZE = 2;
export const WALL_HEIGHT = 2;
export const MOVE_SPEED = 0.08;
export const TURN_SPEED = 0.04;
export const FOV = Math.PI / 3;
export const NUM_RAYS = 120;
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

export function getCollectibles(maze: MazeGrid, level: number): Collectible[] {
  const positions: { x: number; y: number }[] = [];
  for (let row = 0; row < maze.length; row++) {
    for (let col = 0; col < maze[row].length; col++) {
      if (maze[row][col] === 0 && !(row === 1 && col === 1)) {
        if ((row + col) % 3 === (level % 3)) {
          positions.push({ x: col * CELL_SIZE + CELL_SIZE / 2, y: row * CELL_SIZE + CELL_SIZE / 2 });
        }
      }
    }
  }
  const selected = positions.sort(() => Math.random() - 0.5).slice(0, 8);
  return selected.map((pos, i) => ({
    ...pos,
    collected: false,
    id: `c_${level}_${i}`,
  }));
}

export function getStartPosition(maze: MazeGrid): Position {
  return {
    x: 1 * CELL_SIZE + CELL_SIZE / 2,
    y: 1 * CELL_SIZE + CELL_SIZE / 2,
    angle: 0,
  };
}

export function isWall(maze: MazeGrid, x: number, y: number): boolean {
  const col = Math.floor(x / CELL_SIZE);
  const row = Math.floor(y / CELL_SIZE);
  if (row < 0 || row >= maze.length || col < 0 || col >= maze[0].length) return true;
  return maze[row][col] === 1;
}
