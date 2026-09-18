import LogReading from "@/components/log-reading";
import ReadingProgressList from "@/components/reading-progress-list";
import { getReadingProgress, ReadingProgress } from "@/storage/reading";
import { useFocusEffect } from "expo-router/build/react-navigation";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function Index() {
  const [readingProgressList, setReadingProgressList] = useState<
    ReadingProgress[]
  >([]);

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
    <View style={styles.container}>
      <LogReading onSuccess={loadReadingProgress}></LogReading>
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
