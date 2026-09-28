import { useAuth } from "@/auth/auth-context";
import { useShelf } from "@/context/shelf-provider";
import { Book, Bookmark } from "@/lib/definitions";
import { createBook, placeBookmark } from "@/api/apiClient";

export function useBookActions() {
  const { accessToken } = useAuth();
  const { currentlyReading, loadShelves } = useShelf();

  async function addNewBookToShelf(book: Book, shelfId: string) {
    const bookWithId = await createBook(accessToken, book);

    if (shelfId) {
      const placeBookmarkRequest = {
        bookId: bookWithId.id,
        currentPage: 0,
        shelfId: shelfId,
      };
      await placeBookmark(accessToken, placeBookmarkRequest);
      await loadShelves();
    }
  }

  async function startReading(book: Book, bookmark?: Bookmark) {
    let bookId;
    if (!bookmark) {
      const bookWithId = await createBook(accessToken, book);
      bookId = bookWithId.id;
    } else {
      bookId = bookmark.book.id;
    }

    const placeBookmarkRequest = {
      bookId,
      currentPage: 0,
      shelfId: currentlyReading.id,
    };
    await placeBookmark(accessToken, placeBookmarkRequest);

    await loadShelves();
  }

  return { addNewBookToShelf, startReading };
}
