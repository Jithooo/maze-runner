import React, { useEffect, useRef } from "react";
import { Animated } from "react-native";
import Svg, { Polygon, Defs, LinearGradient, Stop, Path } from "react-native-svg";

interface Props {
  size: number;
  alpha: number;
}

export function GemSprite({ size, alpha }: Props) {
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

  // Gem shape geometry
  const tl = w * 0.28;   // table left x
  const tr = w * 0.72;   // table right x
  const gy = h * 0.40;   // girdle y
  const tip = h;         // tip y

  // Crown facet inner boundary
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
          <LinearGradient id="gBase" x1="0.2" y1="0" x2="0.8" y2="1">
            <Stop offset="0" stopColor="#A0F8FF" stopOpacity="1" />
            <Stop offset="0.45" stopColor="#00C8FF" stopOpacity="1" />
            <Stop offset="1" stopColor="#0055DD" stopOpacity="1" />
          </LinearGradient>
          <LinearGradient id="gTable" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.85" />
            <Stop offset="1" stopColor="#B0F0FF" stopOpacity="0.6" />
          </LinearGradient>
          <LinearGradient id="gPav" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#0080CC" stopOpacity="0.8" />
            <Stop offset="1" stopColor="#003080" stopOpacity="0.9" />
          </LinearGradient>
        </Defs>

        {/* Main body */}
        <Polygon points={outerPoints} fill="url(#gBase)" />

        {/* Left crown */}
        <Polygon points={leftCrown} fill="rgba(0,180,255,0.35)" />
        {/* Right crown */}
        <Polygon points={rightCrown} fill="rgba(100,240,255,0.25)" />

        {/* Left pavilion */}
        <Polygon points={leftPav} fill="url(#gPav)" />
        {/* Center pavilion */}
        <Polygon points={centerPav} fill="rgba(0,60,160,0.7)" />
        {/* Right pavilion */}
        <Polygon points={rightPav} fill="rgba(0,100,200,0.6)" />

        {/* Table (bright top) */}
        <Polygon points={tablePoints} fill="url(#gTable)" />

        {/* Specular highlight */}
        <Polygon
          points={`${tl + (ir - il) * 0.1},${h * 0.04} ${tl + (ir - il) * 0.4},${h * 0.04} ${il + (ir - il) * 0.3},${iy * 0.7}`}
          fill="rgba(255,255,255,0.5)"
        />
      </Svg>
    </Animated.View>
  );
}
