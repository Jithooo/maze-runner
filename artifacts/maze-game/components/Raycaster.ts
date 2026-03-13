import { CELL_SIZE, FOV, MAX_DEPTH, NUM_RAYS, MazeGrid, isWall } from "@/constants/maze";

export interface RayHit {
  distance: number;
  wallType: "horizontal" | "vertical";
  textureX: number;
  hit: boolean;
}

export interface RaycastResult {
  rays: RayHit[];
}

export function castRays(
  maze: MazeGrid,
  playerX: number,
  playerY: number,
  playerAngle: number
): RaycastResult {
  const rays: RayHit[] = [];
  const halfFov = FOV / 2;
  const angleStep = FOV / NUM_RAYS;

  for (let i = 0; i < NUM_RAYS; i++) {
    const rayAngle = playerAngle - halfFov + i * angleStep;
    const ray = castSingleRay(maze, playerX, playerY, rayAngle);
    rays.push(ray);
  }

  return { rays };
}

function castSingleRay(
  maze: MazeGrid,
  startX: number,
  startY: number,
  angle: number
): RayHit {
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  let horizontalDist = Infinity;
  let verticalDist = Infinity;
  let hTextureX = 0;
  let vTextureX = 0;

  // Horizontal intersections
  {
    const stepY = sinA > 0 ? CELL_SIZE : -CELL_SIZE;
    const firstY = sinA > 0
      ? Math.ceil(startY / CELL_SIZE) * CELL_SIZE
      : Math.floor(startY / CELL_SIZE) * CELL_SIZE;
    const firstX = startX + (firstY - startY) * (cosA / sinA);
    const stepX = stepY * (cosA / sinA);

    let x = firstX;
    let y = firstY;
    for (let d = 0; d < MAX_DEPTH; d++) {
      const checkY = sinA > 0 ? y : y - 0.01;
      if (isWall(maze, x, checkY)) {
        const dx = x - startX;
        const dy = y - startY;
        horizontalDist = Math.sqrt(dx * dx + dy * dy);
        hTextureX = (x % CELL_SIZE) / CELL_SIZE;
        break;
      }
      x += stepX;
      y += stepY;
    }
  }

  // Vertical intersections
  {
    const stepX = cosA > 0 ? CELL_SIZE : -CELL_SIZE;
    const firstX = cosA > 0
      ? Math.ceil(startX / CELL_SIZE) * CELL_SIZE
      : Math.floor(startX / CELL_SIZE) * CELL_SIZE;
    const firstY = startY + (firstX - startX) * (sinA / cosA);
    const stepY = stepX * (sinA / cosA);

    let x = firstX;
    let y = firstY;
    for (let d = 0; d < MAX_DEPTH; d++) {
      const checkX = cosA > 0 ? x : x - 0.01;
      if (isWall(maze, checkX, y)) {
        const dx = x - startX;
        const dy = y - startY;
        verticalDist = Math.sqrt(dx * dx + dy * dy);
        vTextureX = (y % CELL_SIZE) / CELL_SIZE;
        break;
      }
      x += stepX;
      y += stepY;
    }
  }

  if (horizontalDist < verticalDist) {
    return {
      distance: horizontalDist,
      wallType: "horizontal",
      textureX: hTextureX,
      hit: horizontalDist < Infinity,
    };
  } else {
    return {
      distance: verticalDist,
      wallType: "vertical",
      textureX: vTextureX,
      hit: verticalDist < Infinity,
    };
  }
}
