import { Book, ReadingProgress } from "@/lib/definitions";

const API_URL = "http://localhost:8080";
const BOOKS_ROUTE = "/books";
const READING_PROGRESS_ROUTE = "/readingProgress";

export async function getReadingProgress(): Promise<
  (Book & ReadingProgress)[]
> {
  const url = API_URL + READING_PROGRESS_ROUTE;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function getBooks(): Promise<Book[]> {
  const url = API_URL + BOOKS_ROUTE;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Response status: ${response.status}`);
  }

  const result = await response.json();
  return result ?? [];
}

export async function logReadingProgress(
  readingProgress: ReadingProgress,
): Promise<void> {
  const url = `${API_URL}${READING_PROGRESS_ROUTE}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(readingProgress),
  });

  if (!response.ok) {
    console.error(await response.text())
    throw new Error(`HTTP error! Status: ${response.status}`);
  }
}
