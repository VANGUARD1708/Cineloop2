import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useColors } from "@/hooks/useColors";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const CARD_HEIGHT = SCREEN_HEIGHT;

export interface FeedItem {
  id: string;
  title: string;
  overview: string;
  poster_path: string | null;
  backdrop_path: string | null;
  media_type: "movie" | "tv";
  vote_average: number;
  genre_ids: number[];
  release_date?: string;
  first_air_date?: string;
}

interface FeedCardProps {
  item: FeedItem;
  isActive: boolean;
}

const TMDB_IMG = "https://image.tmdb.org/t/p/w780";

export default function FeedCard({ item, isActive }: FeedCardProps) {
  const colors = useColors();
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [likeCount, setLikeCount] = useState(
    Math.floor(Math.random() * 9000) + 1000
  );
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartAnim = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);

  const imageUrl = item.backdrop_path
    ? `${TMDB_IMG}${item.backdrop_path}`
    : item.poster_path
    ? `${TMDB_IMG}${item.poster_path}`
    : null;

  const handleDoubleTap = () => {
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleLike();
      Animated.sequence([
        Animated.timing(heartAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.delay(500),
        Animated.timing(heartAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    }
    lastTap.current = now;
  };

  const handleLike = () => {
    if (!liked) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setLikeCount((c) => c + 1);
    } else {
      setLikeCount((c) => c - 1);
    }
    setLiked((prev) => !prev);
  };

  const handleBookmark = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setBookmarked((prev) => !prev);
  };

  const handleActionPress = (action: () => void) => {
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 80,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 80,
        useNativeDriver: true,
      }),
    ]).start();
    action();
  };

  const rating = item.vote_average ? item.vote_average.toFixed(1) : "?";
  const year = (item.release_date || item.first_air_date || "").slice(0, 4);
  const typeLabel = item.media_type === "tv" ? "SERIES" : "MOVIE";

  return (
    <Pressable
      style={[styles.card, { height: CARD_HEIGHT }]}
      onPress={handleDoubleTap}
    >
      {imageUrl ? (
        <Image
          source={{ uri: imageUrl }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: colors.secondary },
          ]}
        />
      )}

      <View style={styles.gradient} />

      <Animated.View
        style={[
          styles.heartOverlay,
          {
            opacity: heartAnim,
            transform: [
              {
                scale: heartAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1.3],
                }),
              },
            ],
          },
        ]}
      >
        <Feather name="heart" size={80} color="#DC143C" />
      </Animated.View>

      <View style={styles.rightActions}>
        <Pressable
          style={styles.actionBtn}
          onPress={() => handleActionPress(handleLike)}
        >
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Feather
              name="heart"
              size={28}
              color={liked ? "#DC143C" : "#ffffff"}
            />
          </Animated.View>
          <Text style={styles.actionCount}>{formatCount(likeCount)}</Text>
        </Pressable>

        <Pressable
          style={styles.actionBtn}
          onPress={() => handleActionPress(handleBookmark)}
        >
          <Feather
            name="bookmark"
            size={28}
            color={bookmarked ? "#F59E0B" : "#ffffff"}
          />
          <Text style={styles.actionCount}>Save</Text>
        </Pressable>

        <Pressable style={styles.actionBtn}>
          <Feather name="share-2" size={28} color="#ffffff" />
          <Text style={styles.actionCount}>Share</Text>
        </Pressable>

        <View style={styles.ratingBadge}>
          <Feather name="star" size={14} color="#F59E0B" />
          <Text style={styles.ratingText}>{rating}</Text>
        </View>
      </View>

      <View style={styles.bottomInfo}>
        <View style={styles.typeBadge}>
          <Text style={styles.typeText}>{typeLabel}</Text>
        </View>
        <Text style={styles.title} numberOfLines={2}>
          {item.title}
        </Text>
        {year ? <Text style={styles.year}>{year}</Text> : null}
        <Text style={styles.overview} numberOfLines={3}>
          {item.overview}
        </Text>

        <Pressable style={styles.watchBtn}>
          <Feather name="play" size={16} color="#000000" />
          <Text style={styles.watchBtnText}>Watch Now</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

function formatCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

const styles = StyleSheet.create({
  card: {
    width: SCREEN_WIDTH,
    backgroundColor: "#000",
  },
  gradient: {
    ...StyleSheet.absoluteFillObject,
    background: undefined,
    backgroundColor: "transparent",
    // gradient via layers
  },
  heartOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginLeft: -40,
    marginTop: -40,
    zIndex: 10,
    pointerEvents: "none",
  },
  rightActions: {
    position: "absolute",
    right: 16,
    bottom: 160,
    alignItems: "center",
    gap: 20,
  },
  actionBtn: {
    alignItems: "center",
    gap: 4,
  },
  actionCount: {
    color: "#ffffff",
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  ratingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  ratingText: {
    color: "#F59E0B",
    fontSize: 13,
    fontFamily: "Inter_700Bold",
  },
  bottomInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 80,
    padding: 20,
    paddingBottom: Platform.OS === "web" ? 100 : 90,
    gap: 8,
    backgroundColor: "transparent",
  },
  typeBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#DC143C",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 3,
  },
  typeText: {
    color: "#ffffff",
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  title: {
    color: "#ffffff",
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    lineHeight: 28,
    textShadowColor: "rgba(0,0,0,0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  year: {
    color: "#999999",
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  overview: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#DC143C",
    alignSelf: "flex-start",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 4,
    marginTop: 4,
  },
  watchBtnText: {
    color: "#000000",
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
});
