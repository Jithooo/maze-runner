import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, useWindowDimensions } from "react-native";

const COLORS = ["#FFD700", "#00FF88", "#00DDFF", "#FF6B6B", "#FF9500", "#BF5FFF", "#FFFFFF"];
const PARTICLE_COUNT = 40;

interface Particle {
  id: number;
  x: Animated.Value;
  y: Animated.Value;
  opacity: Animated.Value;
  rotate: Animated.Value;
  scale: Animated.Value;
  color: string;
  shape: "square" | "circle" | "rect";
}

interface Props {
  trigger: number; // increment to fire
  originX?: number;
  originY?: number;
}

function createParticle(id: number, ox: number, oy: number): Particle {
  return {
    id,
    x: new Animated.Value(ox),
    y: new Animated.Value(oy),
    opacity: new Animated.Value(1),
    rotate: new Animated.Value(0),
    scale: new Animated.Value(1),
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    shape: (["square", "circle", "rect"] as const)[Math.floor(Math.random() * 3)],
  };
}

export default function ConfettiEffect({ trigger, originX, originY }: Props) {
  const { width, height } = useWindowDimensions();
  const ox = originX ?? width / 2;
  const oy = originY ?? height * 0.45;
  const particlesRef = useRef<Particle[]>([]);
  const [, forceUpdate] = React.useState(0);

  useEffect(() => {
    if (trigger === 0) return;

    const particles: Particle[] = Array.from({ length: PARTICLE_COUNT }, (_, i) =>
      createParticle(i, ox, oy)
    );
    particlesRef.current = particles;
    forceUpdate((n) => n + 1);

    const anims = particles.map((p) => {
      const angle = (Math.random() * Math.PI * 2);
      const speed = 80 + Math.random() * 140;
      const tx = ox + Math.cos(angle) * speed;
      const ty = oy + Math.sin(angle) * speed - 60 - Math.random() * 80;
      const duration = 700 + Math.random() * 500;

      return Animated.parallel([
        Animated.timing(p.x, { toValue: tx, duration, useNativeDriver: false }),
        Animated.timing(p.y, { toValue: ty + 100, duration: duration + 200, useNativeDriver: false }),
        Animated.timing(p.opacity, { toValue: 0, duration, delay: duration * 0.4, useNativeDriver: false }),
        Animated.timing(p.rotate, { toValue: 4, duration, useNativeDriver: false }),
        Animated.timing(p.scale, { toValue: 0.3, duration, useNativeDriver: false }),
      ]);
    });

    Animated.parallel(anims).start(() => {
      particlesRef.current = [];
      forceUpdate((n) => n + 1);
    });
  }, [trigger]);

  if (particlesRef.current.length === 0) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particlesRef.current.map((p) => {
        const rotate = p.rotate.interpolate({ inputRange: [0, 4], outputRange: ["0deg", "720deg"] });
        const size = p.shape === "rect" ? { width: 6, height: 12 } : { width: 9, height: 9 };
        const borderRadius = p.shape === "circle" ? 4.5 : p.shape === "square" ? 2 : 1;
        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              size,
              {
                backgroundColor: p.color,
                borderRadius,
                left: p.x,
                top: p.y,
                opacity: p.opacity,
                transform: [{ rotate }, { scale: p.scale }],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
  },
});
