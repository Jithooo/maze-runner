import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import Svg, { Polygon, Defs, LinearGradient, Stop } from "react-native-svg";

interface Props {
  size: number;
  alpha: number;
  color?: string; // base accent color e.g. "#00DDFF" or "#FF00AA"
}

// Parse a hex color into r,g,b
function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length === 6) {
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  return [0, 200, 255];
}

function lighten([r, g, b]: [number, number, number], amt: number): string {
  return `rgb(${Math.min(255, Math.round(r + (255 - r) * amt))},${Math.min(255, Math.round(g + (255 - g) * amt))},${Math.min(255, Math.round(b + (255 - b) * amt))})`;
}

function darken([r, g, b]: [number, number, number], amt: number): string {
  return `rgb(${Math.round(r * (1 - amt))},${Math.round(g * (1 - amt))},${Math.round(b * (1 - amt))})`;
}

export function GemSprite({ size, alpha, color = "#00DDFF" }: Props) {
  const w = size;
  const h = size;
  const bobAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(bobAnim, { toValue: 1, duration: 900, useNativeDriver: false }),
        Animated.timing(bobAnim, { toValue: 0, duration: 900, useNativeDriver: false }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  const translateY = bobAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -size * 0.08],
  });

  const rgb = hexToRgb(color);
  const light = lighten(rgb, 0.55);
  const mid = color;
  const dark = darken(rgb, 0.55);
  const shadow = darken(rgb, 0.75);
  const highlight = lighten(rgb, 0.82);
  const crownL = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},0.35)`;
  const crownR = lighten(rgb, 0.3);

  // Gem shape geometry
  const tl = w * 0.28;
  const tr = w * 0.72;
  const gy = h * 0.40;
  const tip = h;
  const il = w * 0.36;
  const ir = w * 0.64;
  const iy = h * 0.28;

  const outerPoints = `${tl},0 ${tr},0 ${w},${gy} ${w * 0.7},${tip * 0.75} ${w * 0.5},${tip} ${w * 0.3},${tip * 0.75} 0,${gy}`;
  const tablePoints = `${tl},0 ${tr},0 ${ir},${iy} ${il},${iy}`;
  const leftCrown   = `${tl},0 0,${gy} ${w * 0.28},${gy * 0.65} ${il},${iy}`;
  const rightCrown  = `${tr},0 ${w},${gy} ${w * 0.72},${gy * 0.65} ${ir},${iy}`;
  const leftPav     = `0,${gy} ${w * 0.35},${gy} ${w * 0.3},${tip * 0.75} ${w * 0.5},${tip}`;
  const centerPav   = `${w * 0.35},${gy} ${w * 0.65},${gy} ${w * 0.7},${tip * 0.75} ${w * 0.3},${tip * 0.75}`;
  const rightPav    = `${w},${gy} ${w * 0.65},${gy} ${w * 0.5},${tip} ${w * 0.7},${tip * 0.75}`;

  return (
    <Animated.View style={{ transform: [{ translateY }], opacity: alpha }}>
      <Svg width={w} height={h}>
        <Defs>
          <LinearGradient id={`gBase_${color}`} x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor={light} stopOpacity="1" />
            <Stop offset="0.45" stopColor={mid} stopOpacity="1" />
            <Stop offset="1" stopColor={dark} stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id={`gTable_${color}`} x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="1" stopColor={light} stopOpacity="0.6" />
          </LinearGradient>
          <LinearGradient id={`gPav_${color}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={mid} stopOpacity="0.8" />
            <Stop offset="1" stopColor={shadow} stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        <Polygon points={outerPoints} fill={`url(#gBase_${color})`} />
        <Polygon points={leftCrown} fill={crownL} />
        <Polygon points={rightCrown} fill={`${crownR}44`} />
        <Polygon points={leftPav} fill={`url(#gPav_${color})`} />
        <Polygon points={centerPav} fill={shadow} />
        <Polygon points={rightPav} fill={dark} />
        <Polygon points={tablePoints} fill={`url(#gTable_${color})`} />
        <Polygon
          points={`${tl + (ir - il) * 0.1},${h * 0.04} ${tl + (ir - il) * 0.4},${h * 0.04} ${il + (ir - il) * 0.3},${iy * 0.7}`}
          fill={highlight}
          fillOpacity="0.5"
        />
      </Svg>
    </Animated.View>
  );
}
