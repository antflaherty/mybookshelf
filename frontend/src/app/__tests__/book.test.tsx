import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import BookScreen from "../(authenticated)/book/[id]";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { useShelf } from "@/context/shelf-provider";
import { useBook } from "@/hooks/book";
import { useBookActions } from "@/hooks/book-actions";

const mockAddNewBookToShelf = jest.fn();
const mockStartReading = jest.fn().mockResolvedValue(undefined);
const mockGetBookDetails = jest.fn();

let mockSearchParams: Record<string, string> = { id: "b1" };
let mockFocusEffectRan = false;

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
  useFocusEffect: (cb: () => void) => {
    if (!mockFocusEffectRan) {
      mockFocusEffectRan = true;
      cb();
    }
  },
}));

jest.mock("@/context/shelf-provider", () => ({
  useShelf: jest.fn(),
}));

jest.mock("@/hooks/book", () => ({
  useBook: jest.fn(),
}));

jest.mock("@/hooks/book-actions", () => ({
  useBookActions: jest.fn(),
}));

const mockedUseShelf = useShelf as jest.Mock;
const mockedUseBook = useBook as jest.Mock;
const mockedUseBookActions = useBookActions as jest.Mock;

function makeShelf(id: string, name: string, bookmarks: unknown[] = []) {
  return { id, sortOrder: 0, name, userId: "u1", bookmarks };
}

const details = {
  id: "b1",
  blurb: "a classic",
  genres: ["sci-fi", "adventure"],
  book: { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockFocusEffectRan = false;
  mockSearchParams = { id: "b1" };
  mockGetBookDetails.mockResolvedValue(details);
  mockedUseBook.mockReturnValue({ getBookDetails: mockGetBookDetails });
  mockedUseBookActions.mockReturnValue({
    addNewBookToShelf: mockAddNewBookToShelf,
    startReading: mockStartReading,
  });
});

async function renderScreen() {
  await render(
    <ThemeProvider>
      <BookScreen />
    </ThemeProvider>,
  );
}

it("loads and displays book details", async () => {
  mockedUseShelf.mockReturnValue({
    shelves: [],
    toBeRead: makeShelf("tbr", "to be read"),
    finished: makeShelf("fin", "finished"),
  });

  await renderScreen();

  await waitFor(() => expect(mockGetBookDetails).toHaveBeenCalledWith("b1"));
  await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy());
  expect(screen.getByText(/a classic/)).toBeTruthy();
  expect(screen.getByText("sci-fi")).toBeTruthy();
  expect(screen.getByText("adventure")).toBeTruthy();
});

it("shows add-to-shelf and start-reading actions for a new book", async () => {
  mockedUseShelf.mockReturnValue({
    shelves: [],
    toBeRead: makeShelf("tbr", "to be read"),
    finished: makeShelf("fin", "finished"),
  });

  await renderScreen();

  await waitFor(() => expect(screen.getByText("add to shelf")).toBeTruthy());
  expect(screen.getByText("start reading")).toBeTruthy();
  expect(screen.queryByText("place bookmark")).toBeNull();
});

it("adds the book to a shelf and navigates home when a shelfId is given", async () => {
  mockSearchParams = { id: "b1", shelfId: "s1" };
  mockedUseShelf.mockReturnValue({
    shelves: [makeShelf("s1", "to be read")],
    toBeRead: makeShelf("s1", "to be read"),
    finished: makeShelf("fin", "finished"),
  });

  await renderScreen();

  await waitFor(() => expect(screen.getByText("add to to be read")).toBeTruthy());
  await fireEvent.press(screen.getByText("add to to be read"));

  expect(mockAddNewBookToShelf).toHaveBeenCalledWith(
    { ...details.book, pageCount: 600 },
    "s1",
  );
  expect(router.push).toHaveBeenCalledWith("/");
});

it("navigates to select-shelf when no shelfId is given", async () => {
  mockedUseShelf.mockReturnValue({
    shelves: [],
    toBeRead: makeShelf("tbr", "to be read"),
    finished: makeShelf("fin", "finished"),
  });

  await renderScreen();

  await waitFor(() => expect(screen.getByText("add to shelf")).toBeTruthy());
  await fireEvent.press(screen.getByText("add to shelf"));

  expect(router.push).toHaveBeenCalledWith({
    pathname: "/select-shelf",
    params: { bookId: "b1", currentPage: 0 },
  });
});

it("shows place-bookmark and hides add-to-shelf when the book has a bookmark", async () => {
  const bookmark = {
    shelfId: "cr",
    currentPage: 42,
    book: details.book,
  };
  mockSearchParams = { id: "b1", shelfId: "cr" };
  mockedUseShelf.mockReturnValue({
    shelves: [makeShelf("cr", "currently reading", [bookmark])],
    toBeRead: makeShelf("tbr", "to be read"),
    finished: makeShelf("fin", "finished"),
  });

  await renderScreen();

  await waitFor(() => expect(screen.getByText("place bookmark")).toBeTruthy());
  expect(screen.queryByText("add to shelf")).toBeNull();
  expect(screen.queryByText("start reading")).toBeNull();
});

it("places a bookmark from the bookmark's current page", async () => {
  const bookmark = {
    shelfId: "cr",
    currentPage: 42,
    book: details.book,
  };
  mockSearchParams = { id: "b1", shelfId: "cr" };
  mockedUseShelf.mockReturnValue({
    shelves: [makeShelf("cr", "currently reading", [bookmark])],
    toBeRead: makeShelf("tbr", "to be read"),
    finished: makeShelf("fin", "finished"),
  });

  await renderScreen();

  await waitFor(() => expect(screen.getByText("place bookmark")).toBeTruthy());
  await fireEvent.press(screen.getByText("place bookmark"));

  expect(router.push).toHaveBeenCalledWith({
    pathname: "/place-bookmark",
    params: { bookId: "b1", currentPage: "42" },
  });
});

it("start reading uses the existing bookmark and navigates to place-bookmark", async () => {
  const bookmark = {
    shelfId: "tbr",
    currentPage: 0,
    book: details.book,
  };
  mockSearchParams = { id: "b1", shelfId: "tbr" };
  mockedUseShelf.mockReturnValue({
    shelves: [makeShelf("tbr", "to be read", [bookmark])],
    toBeRead: makeShelf("tbr", "to be read", [bookmark]),
    finished: makeShelf("fin", "finished"),
  });

  await renderScreen();

  await waitFor(() => expect(screen.getByText("start reading")).toBeTruthy());
  await fireEvent.press(screen.getByText("start reading"));

  await waitFor(() =>
    expect(mockStartReading).toHaveBeenCalledWith(
      { ...details.book, pageCount: 600 },
      bookmark,
    ),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/place-bookmark",
    params: { bookId: "b1", currentPage: "0" },
  });
});

it("links to the reviews screen", async () => {
  mockedUseShelf.mockReturnValue({
    shelves: [],
    toBeRead: makeShelf("tbr", "to be read"),
    finished: makeShelf("fin", "finished"),
  });

  await renderScreen();

  await waitFor(() => expect(screen.getByText("reviews")).toBeTruthy());
  await fireEvent.press(screen.getByText("reviews"));

  expect(router.push).toHaveBeenCalledWith({
    pathname: "/reviews/[bookId]",
    params: { bookId: "b1" },
  });
});
