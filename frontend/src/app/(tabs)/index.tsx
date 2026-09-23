import BookmarkList from "@/components/reading-progress-list";
import { Book, Bookmark } from "@/lib/definitions";
import { getBookmark } from "@/api/apiClient";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import { useFocusEffect } from "expo-router/build/react-navigation";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ThemedPressable from "@/components/themed-pressable";
import { router } from "expo-router";

export default function Index() {
  const [bookmarkList, setBookmarkList] = useState<(Book & Bookmark)[]>([]);

  const { theme } = useTheme();

  const { accessToken } = useAuth();

  async function loadBookmark() {
    const data = await getBookmark(accessToken);
    setBookmarkList(data);
  }

  useFocusEffect(
    useCallback(() => {
      loadBookmark();
    }, []),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedPressable onPress={() => router.push("/log-reading")}>
        <Text style={{ color: theme.text }}>Log Reading</Text>
      </ThemedPressable>
      <BookmarkList progressList={bookmarkList}></BookmarkList>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
