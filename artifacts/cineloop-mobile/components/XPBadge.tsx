import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useColors } from "@/hooks/useColors";

interface XPBadgeProps {
  xp: number;
  streak: number;
  level: number;
}

export default function XPBadge({ xp, streak, level }: XPBadgeProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      <View style={[styles.badge, { backgroundColor: "rgba(245,158,11,0.15)", borderColor: "#F59E0B" }]}>
        <Feather name="zap" size={12} color="#F59E0B" />
        <Text style={[styles.text, { color: "#F59E0B" }]}>{xp} XP</Text>
      </View>
      <View style={[styles.badge, { backgroundColor: "rgba(220,20,60,0.15)", borderColor: "#DC143C" }]}>
        <Feather name="flame" size={12} color="#DC143C" />
        <Text style={[styles.text, { color: "#DC143C" }]}>{streak}d</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 6,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
