import { Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useColors } from "@/hooks/useColors";

const API_BASE = process.env.EXPO_PUBLIC_DOMAIN
  ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
  : "/api";

interface UserProfile {
  id: number;
  username: string;
  displayName: string;
  bio: string;
  xp: number;
  level: number;
  streakDays: number;
  watchlistCount: number;
  badges: string[];
}

async function fetchProfile(): Promise<UserProfile> {
  const res = await fetch(`${API_BASE}/users/me`);
  if (!res.ok) throw new Error("Failed to load profile");
  const data = await res.json();
  return {
    ...data,
    displayName: data.username,
    bio: "Cinephile · Level " + data.level + " · " + data.streakDays + " day streak",
    watchlistCount: data.totalWatched || 0,
  };
}

const STAT_ICONS: Record<string, string> = {
  xp: "zap",
  level: "award",
  streak: "flame",
  watchlist: "bookmark",
};

export default function ProfileScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPadding = Platform.OS === "web" ? 67 : insets.top;

  const { data: profile, isLoading, isError } = useQuery<UserProfile>({
    queryKey: ["profile"],
    queryFn: fetchProfile,
    staleTime: 60000,
    retry: 1,
  });

  const xpToNext = profile ? (profile.level + 1) * 100 - profile.xp : 100;
  const xpProgress = profile ? (profile.xp % 100) / 100 : 0;

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: topPadding + 16, paddingBottom: Platform.OS === "web" ? 100 : 90 },
      ]}
    >
      {isLoading ? (
        <ActivityIndicator color="#DC143C" style={{ marginTop: 40 }} />
      ) : isError ? (
        <View style={styles.center}>
          <Feather name="user-x" size={40} color="#333" />
          <Text style={[styles.errorText, { color: colors.mutedForeground }]}>
            Could not load profile
          </Text>
        </View>
      ) : profile ? (
        <>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile.displayName?.charAt(0).toUpperCase() || "C"}
            </Text>
            <View style={[styles.levelBadge, { backgroundColor: "#DC143C" }]}>
              <Text style={styles.levelText}>Lv{profile.level}</Text>
            </View>
          </View>

          <Text style={[styles.displayName, { color: colors.foreground }]}>
            {profile.displayName}
          </Text>
          <Text style={[styles.username, { color: colors.mutedForeground }]}>
            @{profile.username}
          </Text>
          {profile.bio ? (
            <Text style={[styles.bio, { color: colors.mutedForeground }]}>
              {profile.bio}
            </Text>
          ) : null}

          <View style={[styles.xpBar, { backgroundColor: colors.muted }]}>
            <View
              style={[
                styles.xpFill,
                { width: `${xpProgress * 100}%`, backgroundColor: "#DC143C" },
              ]}
            />
          </View>
          <Text style={[styles.xpLabel, { color: colors.mutedForeground }]}>
            {profile.xp} XP · {xpToNext} to Level {profile.level + 1}
          </Text>

          <View style={styles.statsGrid}>
            {[
              { label: "XP", value: profile.xp, icon: "zap", color: "#F59E0B" },
              { label: "Level", value: profile.level, icon: "award", color: "#DC143C" },
              { label: "Streak", value: `${profile.streakDays}d`, icon: "flame", color: "#DC143C" },
              { label: "Saved", value: profile.watchlistCount, icon: "bookmark", color: "#F59E0B" },
            ].map((stat) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Feather name={stat.icon as any} size={20} color={stat.color} />
                <Text style={[styles.statValue, { color: colors.foreground }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>

          {profile.badges && profile.badges.length > 0 && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Badges</Text>
              <View style={styles.badges}>
                {profile.badges.map((badge: string, i: number) => (
                  <View key={i} style={[styles.badgeChip, { backgroundColor: colors.muted }]}>
                    <Text style={[styles.badgeText, { color: colors.foreground }]}>{badge}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.mutedForeground }]}>Settings</Text>
            {[
              { label: "Watchlist", icon: "bookmark" },
              { label: "Notifications", icon: "bell" },
              { label: "Appearance", icon: "moon" },
              { label: "About", icon: "info" },
            ].map((item) => (
              <Pressable
                key={item.label}
                style={[styles.settingsItem, { borderBottomColor: colors.border }]}
              >
                <Feather name={item.icon as any} size={18} color={colors.mutedForeground} />
                <Text style={[styles.settingsLabel, { color: colors.foreground }]}>
                  {item.label}
                </Text>
                <Feather name="chevron-right" size={18} color={colors.mutedForeground} />
              </Pressable>
            ))}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    alignItems: "center",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingTop: 80,
  },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#DC143C",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    position: "relative",
  },
  avatarText: {
    color: "#ffffff",
    fontSize: 36,
    fontFamily: "Inter_700Bold",
  },
  levelBadge: {
    position: "absolute",
    bottom: -4,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelText: {
    color: "#ffffff",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
  displayName: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    textAlign: "center",
  },
  username: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  bio: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
  xpBar: {
    width: "100%",
    height: 4,
    borderRadius: 2,
    marginTop: 16,
    overflow: "hidden",
  },
  xpFill: {
    height: "100%",
    borderRadius: 2,
  },
  xpLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginTop: 6,
    alignSelf: "flex-start",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 20,
    width: "100%",
    justifyContent: "space-between",
  },
  statCard: {
    width: "47%",
    padding: 16,
    borderRadius: 8,
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  section: {
    width: "100%",
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginBottom: 10,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  badgeChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  badgeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  settingsItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  settingsLabel: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  errorText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
