import LogReading from "@/components/log-reading";
import ReadingProgressList from "@/components/reading-progress-list";
import { Book, ReadingProgress } from "@/lib/definitions";
import { getBooks, getReadingProgress } from "@/api/apiClient";
import { useFocusEffect } from "expo-router/build/react-navigation";
import { useCallback, useState } from "react";
import { StyleSheet, View } from "react-native";

export default function Index() {
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [readingProgressList, setReadingProgressList] = useState<
    (Book & ReadingProgress)[]
  >([]);

  async function loadAllBooks() {
    const data = await getBooks();
    setAllBooks(data);
  }

  async function loadReadingProgress() {
    const data = await getReadingProgress();
    setReadingProgressList(data);
  }

  useFocusEffect(
    useCallback(() => {
      loadAllBooks();
      loadReadingProgress();
    }, []),
  );

  return (
    <View style={styles.container}>
      <LogReading onSuccess={loadReadingProgress} books={allBooks}></LogReading>
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
