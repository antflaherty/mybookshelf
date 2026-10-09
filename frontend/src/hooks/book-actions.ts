import { useAuth } from "@/auth/auth-context";
import { useShelf } from "@/context/shelf-provider";
import { Book, Bookmark } from "@/lib/definitions";
import { createBook, placeBookmark } from "@/api/apiClient";
import { ApiError } from "@/api/api-error";

export function useBookActions() {
  const { accessToken } = useAuth();
  const { currentlyReading, loadShelves } = useShelf();

  // NOT transactional. A failure part-way through leaves a partial write behind: `createBook`
  // can succeed while `placeBookmark` or `loadShelves` fails, so the book exists with no
  // bookmark, or with a bookmark the shelf list has not picked up yet. Rolling that back is out
  // of scope for this work; the callers (6.3) surface the error instead of navigating as if it
  // worked. Making this atomic is a backend concern.
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
    if (!currentlyReading) {
      // Shelves failed to load, or the user has no "currently reading" shelf. Bail out rather
      // than place a bookmark against `undefined.id`.
      throw new ApiError("your shelves could not be loaded", {
        status: 0,
        code: "shelf_not_found",
      });
    }

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
