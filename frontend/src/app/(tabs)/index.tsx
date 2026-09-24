import BookmarkList from "@/components/reading-progress-list";
import { useTheme } from "@/theme/theme-provider";
import { StyleSheet, Text, View } from "react-native";
import ThemedPressable from "@/components/themed-pressable";
import { router } from "expo-router";
import { useShelf } from "@/context/shelf-provider";

export default function Index() {
  const { theme } = useTheme();

  const { shelves } = useShelf();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedPressable onPress={() => router.push("/place-bookmark")}>
        <Text style={{ color: theme.text }}>place bookmark</Text>
      </ThemedPressable>
      <BookmarkList bookmarks={shelves[0]?.bookmarks || []}></BookmarkList>
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
