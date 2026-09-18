import AsyncStorage from "@react-native-async-storage/async-storage";

export interface ReadingProgress {
  title: string;
  pageCount: number;
  currentPage: number;
}

const READING_PROGRESS_KEY = "READING_PROGRESS_KEY";

export async function getReadingProgress(): Promise<ReadingProgress[]> {
  const data = await AsyncStorage.getItem(READING_PROGRESS_KEY);
  return data ? JSON.parse(data) : [];
}

export async function logReadingProgress(
  progress: ReadingProgress,
): Promise<void> {
  const allProgress = await getReadingProgress();
  const existingProgressForTitle = allProgress.find(
    ({ title }) => progress.title === title,
  );
  if (existingProgressForTitle) {
    existingProgressForTitle.currentPage = progress.currentPage;
  } else {
    allProgress.push(progress);
  }

  await AsyncStorage.setItem(READING_PROGRESS_KEY, JSON.stringify(allProgress));
}
