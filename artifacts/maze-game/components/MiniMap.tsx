import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, {
  Rect, Circle, Polygon, Defs, LinearGradient, Stop, Path, G, ClipPath,
} from "react-native-svg";
import { MazeGrid, Position, Collectible, CELL_SIZE } from "@/constants/maze";

interface Props {
  maze: MazeGrid;
  playerPos: Position;
  collectibles: Collectible[];
}

const MAP_SIZE = 130;
const VISIBILITY_RADIUS = 5.5;
const CELL_PX = (MAP_SIZE / (VISIBILITY_RADIUS * 2));
const CENTER = MAP_SIZE / 2;

function gemPoints(cx: number, cy: number, r: number): string {
  const h = r * 1.5;
  return [
    `${cx - r * 0.5},${cy - h * 0.1}`,
    `${cx + r * 0.5},${cy - h * 0.1}`,
    `${cx + r},${cy + h * 0.2}`,
    `${cx + r * 0.6},${cy + h * 0.7}`,
    `${cx},${cy + h}`,
    `${cx - r * 0.6},${cy + h * 0.7}`,
    `${cx - r},${cy + h * 0.2}`,
  ].join(" ");
}

export default function MiniMap({ maze, playerPos, collectibles }: Props) {
  const playerRow = playerPos.y / CELL_SIZE;
  const playerCol = playerPos.x / CELL_SIZE;
  const angle = playerPos.angle;

  const isVisible = (row: number, col: number) => {
    const dr = row - playerRow;
    const dc = col - playerCol;
    return Math.sqrt(dr * dr + dc * dc) <= VISIBILITY_RADIUS;
  };

  const cellX = (col: number) => CENTER + (col - playerCol) * CELL_PX;
  const cellY = (row: number) => CENTER + (row - playerRow) * CELL_PX;

  // FOV cone points
  const fovHalf = Math.PI / 3;
  const fovLen = 4 * CELL_PX;
  const fovL = angle - fovHalf / 2;
  const fovR = angle + fovHalf / 2;
  const fovPoints = `${CENTER},${CENTER} ${CENTER + Math.cos(fovL) * fovLen},${CENTER + Math.sin(fovL) * fovLen} ${CENTER + Math.cos(fovR) * fovLen},${CENTER + Math.sin(fovR) * fovLen}`;

  // Player arrow
  const arrowLen = CELL_PX * 0.9;
  const arrowWing = CELL_PX * 0.55;
  const tx = CENTER + Math.cos(angle) * arrowLen;
  const ty = CENTER + Math.sin(angle) * arrowLen;
  const lx = CENTER + Math.cos(angle + Math.PI * 0.75) * arrowWing;
  const ly = CENTER + Math.sin(angle + Math.PI * 0.75) * arrowWing;
  const rx = CENTER + Math.cos(angle - Math.PI * 0.75) * arrowWing;
  const ry = CENTER + Math.sin(angle - Math.PI * 0.75) * arrowWing;
  const arrowPoints = `${tx},${ty} ${lx},${ly} ${rx},${ry}`;

  return (
    <View style={styles.outer}>
      <Svg width={MAP_SIZE} height={MAP_SIZE}>
        <Defs>
          <LinearGradient id="bgGrad" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#0A1220" stopOpacity="0.92" />
            <Stop offset="1" stopColor="#060D18" stopOpacity="0.95" />
          </LinearGradient>
          <ClipPath id="mapClip">
            <Rect x={0} y={0} width={MAP_SIZE} height={MAP_SIZE} rx={10} />
          </ClipPath>
        </Defs>

        {/* Background */}
        <Rect x={0} y={0} width={MAP_SIZE} height={MAP_SIZE} fill="url(#bgGrad)" rx={10} />

        <G clipPath="url(#mapClip)">
          {/* FOV cone */}
          <Polygon
            points={fovPoints}
            fill="rgba(0,255,136,0.07)"
            stroke="rgba(0,255,136,0.15)"
            strokeWidth={0.5}
          />

          {/* Render visible cells */}
          {maze.map((row, ri) =>
            row.map((cell, ci) => {
              if (!isVisible(ri, ci)) return null;
              const x = cellX(ci);
              const y = cellY(ri);
              if (cell === 1) {
                return (
                  <Rect
                    key={`w-${ri}-${ci}`}
                    x={x}
                    y={y}
                    width={CELL_PX}
                    height={CELL_PX}
                    fill="#1B3B6A"
                    stroke="rgba(0,180,255,0.18)"
                    strokeWidth={0.5}
                  />
                );
              }
              return (
                <Rect
                  key={`f-${ri}-${ci}`}
                  x={x}
                  y={y}
                  width={CELL_PX}
                  height={CELL_PX}
                  fill="rgba(10,20,40,0.6)"
                />
              );
            })
          )}

          {/* Gem markers (only if visible) */}
          {collectibles
            .filter((c) => !c.collected && isVisible(c.y / CELL_SIZE, c.x / CELL_SIZE))
            .map((c) => {
              const cx = CENTER + (c.x / CELL_SIZE - playerCol) * CELL_PX + CELL_PX / 2;
              const cy = CENTER + (c.y / CELL_SIZE - playerRow) * CELL_PX + CELL_PX / 2 - CELL_PX * 0.4;
              const pts = gemPoints(cx, cy, CELL_PX * 0.28);
              return (
                <G key={c.id}>
                  {/* Glow */}
                  <Circle cx={cx} cy={cy + CELL_PX * 0.3} r={CELL_PX * 0.5} fill="rgba(0,200,255,0.12)" />
                  <Polygon points={pts} fill="#00DDFF" opacity={0.95} />
                  {/* Highlight */}
                  <Polygon
                    points={`${cx - CELL_PX * 0.1},${cy - CELL_PX * 0.05} ${cx + CELL_PX * 0.12},${cy - CELL_PX * 0.05} ${cx + CELL_PX * 0.1},${cy + CELL_PX * 0.15}`}
                    fill="rgba(255,255,255,0.5)"
                  />
                </G>
              );
            })}

          {/* Player shadow glow */}
          <Circle cx={CENTER} cy={CENTER} r={CELL_PX * 0.9} fill="rgba(0,255,136,0.1)" />

          {/* Player direction arrow */}
          <Polygon points={arrowPoints} fill="#00FF88" opacity={0.95} />
          <Circle cx={CENTER} cy={CENTER} r={CELL_PX * 0.35} fill="#00FF88" />
          <Circle cx={CENTER} cy={CENTER} r={CELL_PX * 0.18} fill="#0A0E1A" />
        </G>

        {/* Border glow */}
        <Rect
          x={1}
          y={1}
          width={MAP_SIZE - 2}
          height={MAP_SIZE - 2}
          fill="none"
          stroke="rgba(0,255,136,0.35)"
          strokeWidth={1.5}
          rx={9}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    borderRadius: 10,
    overflow: "hidden",
  },
});
