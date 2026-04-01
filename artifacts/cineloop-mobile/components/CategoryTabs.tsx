import React from "react";
import {
  Animated,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

export type Category = "foryou" | "trending" | "movies" | "series" | "anime";

const CATEGORIES: { id: Category; label: string }[] = [
  { id: "foryou", label: "For You" },
  { id: "trending", label: "Trending" },
  { id: "movies", label: "Movies" },
  { id: "series", label: "Series" },
  { id: "anime", label: "Anime" },
];

interface CategoryTabsProps {
  active: Category;
  onChange: (cat: Category) => void;
}

export default function CategoryTabs({ active, onChange }: CategoryTabsProps) {
  const colors = useColors();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {CATEGORIES.map((cat) => {
        const isActive = cat.id === active;
        return (
          <Pressable
            key={cat.id}
            onPress={() => onChange(cat.id)}
            style={[
              styles.tab,
              isActive && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
            ]}
          >
            <Text
              style={[
                styles.label,
                { color: isActive ? colors.foreground : colors.mutedForeground },
                isActive && { fontFamily: "Inter_700Bold" },
              ]}
            >
              {cat.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 4,
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
