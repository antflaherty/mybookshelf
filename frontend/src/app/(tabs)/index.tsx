import ReadingProgressList from "@/components/reading-progress-list";
import { Book, ReadingProgress } from "@/lib/definitions";
import { getReadingProgress } from "@/api/apiClient";
import { useTheme } from "@/theme/theme-provider";
import { useFocusEffect } from "expo-router/build/react-navigation";
import { useCallback, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import ThemedPressable from "@/components/themed-pressable";
import { router } from "expo-router";

export default function Index() {
  const [readingProgressList, setReadingProgressList] = useState<
    (Book & ReadingProgress)[]
  >([]);

  const { theme } = useTheme();

  async function loadReadingProgress() {
    const data = await getReadingProgress();
    setReadingProgressList(data);
  }

  useFocusEffect(
    useCallback(() => {
      loadReadingProgress();
    }, []),
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ThemedPressable onPress={() => router.push("/log-reading")}>
        <Text style={{ color: theme.text }}>Log Reading</Text>
      </ThemedPressable>
      <ReadingProgressList
        progressList={readingProgressList}
      ></ReadingProgressList>
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
