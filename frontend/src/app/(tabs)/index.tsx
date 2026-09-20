import ReadingProgressList from "@/components/reading-progress-list";
import { Book, ReadingProgress } from "@/lib/definitions";
import { getReadingProgress } from "@/api/apiClient";
import { useTheme } from "@/app/theme";
import { useFocusEffect } from "expo-router/build/react-navigation";
import { Link } from "expo-router";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

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
      <Link
        style={{ backgroundColor: theme.primary, color: theme.text }}
        href="/log-reading"
      >
        Log Reading
      </Link>
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
