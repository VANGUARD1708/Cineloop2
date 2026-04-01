import { Feather } from "@expo/vector-icons";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  ViewToken,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type { Category } from "@/components/CategoryTabs";
import CategoryTabs from "@/components/CategoryTabs";
import FeedCard from "@/components/FeedCard";
import SkeletonCard from "@/components/SkeletonCard";
import XPBadge from "@/components/XPBadge";
import { useColors } from "@/hooks/useColors";
import { useTmdbFeed } from "@/hooks/useTmdbFeed";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

export default function FeedScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [category, setCategory] = useState<Category>("foryou");
  const [activeIndex, setActiveIndex] = useState(0);
  const { data, isLoading, isError, refetch } = useTmdbFeed(category);

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    []
  );

  const viewConfigRef = useRef({
    itemVisiblePercentThreshold: 60,
  });

  const headerHeight = 50 + (Platform.OS === "web" ? 67 : insets.top);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          {
            paddingTop: Platform.OS === "web" ? 67 : insets.top,
            backgroundColor: "rgba(0,0,0,0.85)",
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text style={styles.logo}>CINE<Text style={[styles.logo, { color: "#DC143C" }]}>LOOP</Text></Text>
          <XPBadge xp={340} streak={12} level={7} />
          <Pressable style={styles.searchBtn}>
            <Feather name="search" size={22} color="#ffffff" />
          </Pressable>
        </View>
        <CategoryTabs active={category} onChange={setCategory} />
      </View>

      {isLoading ? (
        <View style={[styles.feedContainer, { paddingTop: headerHeight }]}>
          {[0, 1].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </View>
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Feather name="wifi-off" size={48} color="#666" />
          <Text style={styles.errorText}>Could not load feed</Text>
          <Pressable style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Try Again</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <FeedCard item={item} isActive={index === activeIndex} />
          )}
          pagingEnabled
          snapToAlignment="start"
          decelerationRate="fast"
          showsVerticalScrollIndicator={false}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewConfigRef.current}
          contentContainerStyle={{ paddingTop: headerHeight }}
          style={{ marginTop: -headerHeight }}
          scrollEnabled={!!data && data.length > 0}
          ListEmptyComponent={
            <View style={styles.errorContainer}>
              <Feather name="film" size={48} color="#333" />
              <Text style={styles.errorText}>No content available</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingBottom: 4,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 10,
  },
  logo: {
    color: "#ffffff",
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    flex: 1,
  },
  searchBtn: {
    padding: 4,
  },
  feedContainer: {
    flex: 1,
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    height: SCREEN_HEIGHT,
  },
  errorText: {
    color: "#666",
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  retryBtn: {
    backgroundColor: "#DC143C",
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 4,
  },
  retryText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
