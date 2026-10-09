import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import SearchBooksScreen from "../(authenticated)/(tabs)/search-books";
import ThemeProvider from "@/theme/theme-provider";
import { searchBooks } from "@/api/apiClient";
import { ApiError } from "@/api/api-error";

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ shelfId: "s1" }),
  useFocusEffect: (cb: () => void) => cb(),
}));

jest.mock("@/auth/auth-context", () => ({
  useAuth: () => ({ accessToken: "tok" }),
}));

jest.mock("@/api/apiClient", () => ({
  searchBooks: jest.fn(),
}));

// Replaces the real FlatList so `onEndReached` can be triggered directly rather than by
// scrolling.
jest.mock("@/components/book-search-result-list", () => {
  // Both are required inside the factory: a jest.mock factory may not close over outer
  // variables.
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- required lazily inside the factory
  const { Text: RNText, View: RNView } = require("react-native");

  return {
    __esModule: true,
    default: ({
      books,
      onEndReached,
    }: {
      books: { id: string; title: string }[];
      onEndReached: () => void;
    }) => (
      <RNView>
        <RNText testID="book-count">{books.length}</RNText>
        {books.map((b) => (
          <RNText key={b.id}>{b.title}</RNText>
        ))}
        <RNText testID="end-reached" onPress={onEndReached}>
          end
        </RNText>
      </RNView>
    ),
  };
});

const mockedSearchBooks = searchBooks as jest.Mock;

async function renderScreen() {
  await render(
    <ThemeProvider>
      <SearchBooksScreen />
    </ThemeProvider>,
  );
}

async function search(term: string) {
  await fireEvent.changeText(screen.getByPlaceholderText("title"), term);
  await fireEvent.press(screen.getByText("search"));
}

beforeEach(() => {
  jest.clearAllMocks();
  // The 502 case deliberately triggers the suppressed-body log in api-error.
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("searches with the entered title and renders results", async () => {
  mockedSearchBooks.mockResolvedValue([
    { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
  ]);

  await renderScreen();
  await search("Dune");

  await waitFor(() =>
    expect(mockedSearchBooks).toHaveBeenCalledWith("tok", "Dune", 6, 1),
  );
  await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy());
});

it("renders nothing when there are no results", async () => {
  mockedSearchBooks.mockResolvedValue([]);

  await renderScreen();
  await search("nope");

  await waitFor(() => expect(mockedSearchBooks).toHaveBeenCalled());
  expect(screen.queryByText("Dune")).toBeNull();
});

it("shows a server message and hides the spinner when a search fails", async () => {
  // 404, so the server's message is surfaced verbatim (5xx messages are suppressed by design).
  mockedSearchBooks.mockRejectedValue(
    ApiError.fromResponse(404, {
      error: { code: "not_found", message: "no books matched" },
    }),
  );

  await renderScreen();
  await search("Dune");

  await waitFor(() => expect(screen.getByText("no books matched")).toBeTruthy());
  expect(screen.queryByTestId("book-count")).toBeNull();
});

it("replaces a 502 message with the generic fallback", async () => {
  mockedSearchBooks.mockRejectedValue(
    ApiError.fromResponse(502, {
      error: { code: "upstream_unavailable", message: "book service unavailable" },
    }),
  );

  await renderScreen();
  await search("Dune");

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
  expect(screen.queryByText("book service unavailable")).toBeNull();
});

it("falls back to a generic message for a non-ApiError search failure", async () => {
  mockedSearchBooks.mockRejectedValue(new TypeError("Network request failed"));

  await renderScreen();
  await search("Dune");

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
});

it("clears the error on the next search", async () => {
  mockedSearchBooks.mockRejectedValueOnce(
    ApiError.fromResponse(404, { error: { code: "not_found", message: "not found" } }),
  );
  mockedSearchBooks.mockResolvedValueOnce([
    { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
  ]);

  await renderScreen();
  await search("Dune");
  await waitFor(() => expect(screen.getByText("not found")).toBeTruthy());

  await fireEvent.press(screen.getByText("search"));

  await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy());
  expect(screen.queryByText("not found")).toBeNull();
});

it("keeps existing results when a pagination request fails", async () => {
  // First page fills the page size, so hasMore becomes true.
  mockedSearchBooks.mockResolvedValueOnce([
    { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
    { id: "b2", title: "Messiah", author: "Herbert", pageCount: 256 },
    { id: "b3", title: "Children", author: "Herbert", pageCount: 240 },
    { id: "b4", title: "Andymion", author: "Herbert", pageCount: 224 },
    { id: "b5", title: "Elenna", author: "Herbert", pageCount: 288 },
    { id: "b6", title: "Heaven", author: "Herbert", pageCount: 320 },
  ]);
  mockedSearchBooks.mockRejectedValueOnce(
    ApiError.fromResponse(500, {
      error: { code: "internal_error", message: "internal server error" },
    }),
  );

  await renderScreen();
  await search("Herbert");
  await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy());

  await fireEvent.press(screen.getByTestId("end-reached"));

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );

  // Page 1 is still on screen.
  expect(screen.getByText("Dune")).toBeTruthy();
  expect(screen.getByText("Messiah")).toBeTruthy();
  expect(screen.getByTestId("book-count").props.children).toBe(6);
});

it("keeps hasMore usable after a failed page load so the user can retry", async () => {
  mockedSearchBooks.mockResolvedValueOnce([
    { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
    { id: "b2", title: "Messiah", author: "Herbert", pageCount: 256 },
    { id: "b3", title: "Children", author: "Herbert", pageCount: 240 },
    { id: "b4", title: "Andymion", author: "Herbert", pageCount: 224 },
    { id: "b5", title: "Elenna", author: "Herbert", pageCount: 288 },
    { id: "b6", title: "Heaven", author: "Herbert", pageCount: 320 },
  ]);
  mockedSearchBooks.mockRejectedValueOnce(new Error("boom"));
  mockedSearchBooks.mockResolvedValueOnce([
    { id: "b7", title: "The Dragonriders", author: "Herbert", pageCount: 300 },
  ]);

  await renderScreen();
  await search("Herbert");
  await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy());

  await fireEvent.press(screen.getByTestId("end-reached"));
  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );

  // hasMore survived the failure, so a second end-reached still requests page 2.
  await fireEvent.press(screen.getByTestId("end-reached"));

  await waitFor(() =>
    expect(screen.getByText("The Dragonriders")).toBeTruthy(),
  );
  expect(mockedSearchBooks).toHaveBeenLastCalledWith("tok", "Herbert", 6, 2);
});
