import React, { useEffect, useRef } from "react";
import { Animated, Dimensions, StyleSheet, View } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function SkeletonCard() {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(shimmer, {
          toValue: 0,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const opacity = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  return (
    <View style={styles.card}>
      <Animated.View style={[styles.image, { opacity }]} />
      <View style={styles.bottomInfo}>
        <Animated.View style={[styles.badge, { opacity }]} />
        <Animated.View style={[styles.title, { opacity }]} />
        <Animated.View style={[styles.subtitle, { opacity }]} />
        <Animated.View style={[styles.desc, { opacity }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    backgroundColor: "#0a0a0a",
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#1a1a1a",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 90,
    left: 20,
    right: 80,
    gap: 10,
  },
  badge: {
    width: 60,
    height: 18,
    borderRadius: 3,
    backgroundColor: "#333",
  },
  title: {
    width: "80%",
    height: 26,
    borderRadius: 4,
    backgroundColor: "#333",
  },
  subtitle: {
    width: 60,
    height: 14,
    borderRadius: 3,
    backgroundColor: "#2a2a2a",
  },
  desc: {
    width: "90%",
    height: 40,
    borderRadius: 4,
    backgroundColor: "#2a2a2a",
  },
});
