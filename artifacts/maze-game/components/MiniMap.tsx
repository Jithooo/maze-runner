import React from "react";
import { View, StyleSheet } from "react-native";
import Svg, { Rect, Circle, Polygon } from "react-native-svg";
import { MazeGrid, Position, Collectible, CELL_SIZE } from "@/constants/maze";

interface Props {
  maze: MazeGrid;
  playerPos: Position;
  collectibles: Collectible[];
}

const MAP_SIZE = 110;
const VISIBILITY_RADIUS = 4;

export default function MiniMap({ maze, playerPos, collectibles }: Props) {
  const rows = maze.length;
  const cols = maze[0].length;
  const cellPx = MAP_SIZE / Math.max(rows, cols);

  const playerRow = playerPos.y / CELL_SIZE;
  const playerCol = playerPos.x / CELL_SIZE;

  const isVisible = (row: number, col: number) => {
    const dr = row - playerRow;
    const dc = col - playerCol;
    return Math.sqrt(dr * dr + dc * dc) <= VISIBILITY_RADIUS;
  };

  const px = playerCol * cellPx;
  const py = playerRow * cellPx;
  const arrowSize = cellPx * 1.2;
  const angle = playerPos.angle;

  const tx = px + arrowSize * Math.cos(angle);
  const ty = py + arrowSize * Math.sin(angle);
  const lx = px + arrowSize * 0.5 * Math.cos(angle + Math.PI * 0.8);
  const ly = py + arrowSize * 0.5 * Math.sin(angle + Math.PI * 0.8);
  const rx = px + arrowSize * 0.5 * Math.cos(angle - Math.PI * 0.8);
  const ry = py + arrowSize * 0.5 * Math.sin(angle - Math.PI * 0.8);

  return (
    <View style={styles.container}>
      <Svg width={MAP_SIZE} height={MAP_SIZE}>
        {/* Background */}
        <Rect x={0} y={0} width={MAP_SIZE} height={MAP_SIZE} fill="rgba(0,0,0,0.7)" rx={8} />

        {/* Cells */}
        {maze.map((row, ri) =>
          row.map((cell, ci) => {
            if (!isVisible(ri, ci)) return null;
            const x = ci * cellPx;
            const y = ri * cellPx;
            return (
              <Rect
                key={`${ri}-${ci}`}
                x={x}
                y={y}
                width={cellPx}
                height={cellPx}
                fill={cell === 1 ? "#1E3A5F" : "#0D1520"}
                stroke={cell === 1 ? "rgba(0,255,136,0.2)" : "none"}
                strokeWidth={0.5}
              />
            );
          })
        )}

        {/* Collectibles */}
        {collectibles
          .filter((c) => !c.collected && isVisible(c.y / CELL_SIZE, c.x / CELL_SIZE))
          .map((c) => (
            <Circle
              key={c.id}
              cx={(c.x / CELL_SIZE) * cellPx}
              cy={(c.y / CELL_SIZE) * cellPx}
              r={cellPx * 0.3}
              fill="#FFD700"
            />
          ))}

        {/* Player arrow */}
        <Polygon
          points={`${tx},${ty} ${lx},${ly} ${rx},${ry}`}
          fill="#00FF88"
        />
        <Circle cx={px} cy={py} r={cellPx * 0.4} fill="#00FF88" opacity={0.9} />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    right: 16,
    top: 0,
    borderRadius: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0,255,136,0.3)",
  },
});
