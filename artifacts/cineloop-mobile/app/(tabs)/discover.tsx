import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Image } from "expo-image";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 3;
const TMDB_IMG = "https://image.tmdb.org/t/p/w342";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

interface TmdbItem {
  id: number;
  title?: string;
  name?: string;
  poster_path: string | null;
  vote_average: number;
  media_type?: string;
}

async function searchTmdb(q: string): Promise<TmdbItem[]> {
  if (!q.trim()) return [];
  const res = await fetch(`${API_BASE}/tmdb/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) throw new Error("search failed");
  const data = await res.json();
  return data.results || [];
}

async function fetchTrending(): Promise<TmdbItem[]> {
  const res = await fetch(`${API_BASE}/tmdb/trending/all`);
  if (!res.ok) throw new Error("trending failed");
  const data = await res.json();
  return data.results || [];
}

const GENRES = ["Action", "Drama", "Comedy", "Thriller", "Sci-Fi", "Horror", "Romance", "Animation"];

export default function DiscoverScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("");

  const { data: trending, isLoading } = useQuery<TmdbItem[]>({
    queryKey: ["trending-all"],
    queryFn: fetchTrending,
    staleTime: 5 * 60 * 1000,
  });

  const { data: results, isFetching } = useQuery<TmdbItem[]>({
    queryKey: ["search", query],
    queryFn: () => searchTmdb(query),
    enabled: query.trim().length > 1,
    staleTime: 30000,
  });

  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View
        style={[
          styles.header,
          { paddingTop: topPadding + 12, backgroundColor: colors.background },
        ]}
      >
        <Text style={styles.title}>Discover</Text>
        <View style={[styles.searchBar, { backgroundColor: colors.muted, borderColor: colors.border }]}>
          <Feather name="search" size={16} color={colors.mutedForeground} />
          <TextInput
            style={[styles.searchInput, { color: colors.foreground }]}
            placeholder="Search movies, shows..."
            placeholderTextColor={colors.mutedForeground}
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")}>
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </Pressable>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: Platform.OS === "web" ? 100 : 90 }]}
        showsVerticalScrollIndicator={false}
      >
        {!query.trim() ? (
          <>
            <Text style={[styles.section, { color: colors.mutedForeground }]}>Browse Genres</Text>
            <View style={styles.genres}>
              {GENRES.map((genre) => (
                <Pressable
                  key={genre}
                  style={[styles.genreChip, { backgroundColor: colors.muted, borderColor: colors.border }]}
                >
                  <Text style={[styles.genreText, { color: colors.foreground }]}>{genre}</Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.section, { color: colors.mutedForeground }]}>Trending Now</Text>
            {isLoading ? (
              <ActivityIndicator color="#DC143C" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={trending?.slice(0, 18)}
                keyExtractor={(item) => String(item.id)}
                numColumns={3}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.gridItem}>
                    {item.poster_path ? (
                      <Image
                        source={{ uri: `${TMDB_IMG}${item.poster_path}` }}
                        style={styles.gridThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.gridThumb, { backgroundColor: colors.secondary }]} />
                    )}
                    <Text style={[styles.gridTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {item.title || item.name}
                    </Text>
                  </View>
                )}
                columnWrapperStyle={styles.gridRow}
              />
            )}
          </>
        ) : (
          <>
            {isFetching && <ActivityIndicator color="#DC143C" style={{ marginTop: 20 }} />}
            {results && results.length === 0 && !isFetching && (
              <View style={styles.emptyState}>
                <Feather name="search" size={40} color="#333" />
                <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                  No results for "{query}"
                </Text>
              </View>
            )}
            {results && results.length > 0 && (
              <FlatList
                data={results}
                keyExtractor={(item) => String(item.id)}
                numColumns={3}
                scrollEnabled={false}
                renderItem={({ item }) => (
                  <View style={styles.gridItem}>
                    {item.poster_path ? (
                      <Image
                        source={{ uri: `${TMDB_IMG}${item.poster_path}` }}
                        style={styles.gridThumb}
                        contentFit="cover"
                      />
                    ) : (
                      <View style={[styles.gridThumb, { backgroundColor: colors.secondary }]} />
                    )}
                    <Text style={[styles.gridTitle, { color: colors.foreground }]} numberOfLines={1}>
                      {item.title || item.name}
                    </Text>
                    {item.vote_average ? (
                      <Text style={styles.gridRating}>{item.vote_average.toFixed(1)}</Text>
                    ) : null}
                  </View>
                )}
                columnWrapperStyle={styles.gridRow}
              />
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  title: {
    color: "#ffffff",
    fontSize: 26,
    fontFamily: "Inter_700Bold",
    marginBottom: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  section: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginTop: 16,
    marginBottom: 10,
  },
  genres: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  genreChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  genreText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  gridRow: {
    justifyContent: "flex-start",
    gap: 8,
    marginBottom: 8,
  },
  gridItem: {
    width: CARD_WIDTH,
  },
  gridThumb: {
    width: CARD_WIDTH,
    height: CARD_WIDTH * 1.5,
    borderRadius: 6,
    backgroundColor: "#111",
  },
  gridTitle: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 4,
  },
  gridRating: {
    color: "#F59E0B",
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  emptyState: {
    alignItems: "center",
    gap: 12,
    paddingTop: 60,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    textAlign: "center",
  },
});
