import { Book, ReadingProgress } from "@/lib/definitions";

const API_URL = 'http://localhost:8080';
const READING_PROGRESS_ROUTE = '/readingProgress';

export async function getReadingProgress(): Promise<(Book & ReadingProgress)[]> {
    const url = API_URL + READING_PROGRESS_ROUTE;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Response status: ${response.status}`);
    }

    const result = await response.json();

    return result ?? [];
}

export async function logReadingProgress(): Promise<void> {

}