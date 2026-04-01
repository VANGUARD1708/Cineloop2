import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  FlatList,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

interface LeaderEntry {
  rank: number;
  userId: number;
  username: string;
  displayName: string;
  xp: number;
  level: number;
  streakDays: number;
}

async function fetchLeaderboard(): Promise<LeaderEntry[]> {
  const res = await fetch(`${API_BASE}/leaderboard`);
  if (!res.ok) throw new Error("Failed");
  return res.json();
}

const MEDALS = ["🥇", "🥈", "🥉"];

export default function LeaderboardScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data, isLoading, isError } = useQuery<LeaderEntry[]>({
    queryKey: ["leaderboard"],
    queryFn: fetchLeaderboard,
    staleTime: 30000,
    retry: 1,
  });

  const renderItem = ({ item, index }: { item: LeaderEntry; index: number }) => {
    const isTop3 = index < 3;
    const isMe = item.userId === 1;

    return (
      <View
        style={[
          styles.row,
          {
            backgroundColor: isMe
              ? "rgba(220,20,60,0.1)"
              : isTop3
              ? "rgba(245,158,11,0.05)"
              : colors.card,
            borderColor: isMe ? "#DC143C" : colors.border,
          },
        ]}
      >
        <View style={styles.rankCol}>
          {isTop3 ? (
            <Text style={styles.medal}>{MEDALS[index]}</Text>
          ) : (
            <Text style={[styles.rank, { color: colors.mutedForeground }]}>
              {item.rank}
            </Text>
          )}
        </View>

        <View style={[styles.avatar, { backgroundColor: isTop3 ? "#DC143C" : colors.secondary }]}>
          <Text style={styles.avatarText}>
            {(item.displayName || item.username).charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={[styles.displayName, { color: colors.foreground }]} numberOfLines={1}>
              {item.displayName || item.username}
            </Text>
            {isMe && (
              <View style={styles.youBadge}>
                <Text style={styles.youText}>YOU</Text>
              </View>
            )}
          </View>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>
            Lv{item.level} · {item.streakDays}d streak
          </Text>
        </View>

        <View style={styles.xpCol}>
          <Feather name="zap" size={12} color="#F59E0B" />
          <Text style={[styles.xpText, { color: "#F59E0B" }]}>{item.xp}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topPadding + 16 }]}>
        <Text style={[styles.title, { color: colors.foreground }]}>Leaderboard</Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Top CineLoop fans this week
        </Text>
      </View>

      {isLoading ? (
        <ActivityIndicator color="#DC143C" style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="bar-chart" size={40} color="#333" />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Could not load leaderboard
          </Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => String(item.userId)}
          renderItem={renderItem}
          contentContainerStyle={[
            styles.list,
            { paddingBottom: Platform.OS === "web" ? 100 : 90 },
          ]}
          ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
          showsVerticalScrollIndicator={false}
          scrollEnabled={!!data && data.length > 0}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
  },
  rankCol: {
    width: 28,
    alignItems: "center",
  },
  rank: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
  },
  medal: {
    fontSize: 20,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  info: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  displayName: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  username: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  youBadge: {
    backgroundColor: "#DC143C",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youText: {
    color: "#ffffff",
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  xpCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  xpText: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
