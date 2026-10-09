import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import PlaceBookmarkScreen from "../(authenticated)/(tabs)/place-bookmark";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { placeBookmark } from "@/api/apiClient";
import { useShelf } from "@/context/shelf-provider";
import { ApiError } from "@/api/api-error";

const mockLoadShelves = jest.fn().mockResolvedValue(undefined);

let mockSearchParams: Record<string, string> = {};

jest.mock("expo-router", () => ({
  router: { push: jest.fn(), back: jest.fn() },
  useLocalSearchParams: () => mockSearchParams,
}));

jest.mock("@/auth/auth-context", () => ({
  useAuth: () => ({ accessToken: "tok" }),
}));

jest.mock("@/api/apiClient", () => ({
  placeBookmark: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/context/shelf-provider", () => ({
  useShelf: jest.fn(),
}));

jest.mock("react-native-element-dropdown", () => ({
  Dropdown: () => null,
}));

const mockedUseShelf = useShelf as jest.Mock;
const mockedPlaceBookmark = placeBookmark as jest.Mock;

const book = { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 };

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockSearchParams = { bookId: "b1", currentPage: "100" };
  mockedUseShelf.mockReturnValue({
    currentlyReading: {
      id: "cr",
      sortOrder: 1,
      name: "currently reading",
      userId: "u1",
      bookmarks: [{ shelfId: "cr", currentPage: 100, book }],
    },
    finished: {
      id: "fin",
      sortOrder: 2,
      name: "finished",
      userId: "u1",
      bookmarks: [],
    },
    loadShelves: mockLoadShelves,
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

async function renderScreen() {
  await render(
    <ThemeProvider>
      <PlaceBookmarkScreen />
    </ThemeProvider>,
  );
}

it("places the bookmark and navigates back", async () => {
  await renderScreen();

  await fireEvent.press(screen.getByText("place bookmark"));

  await waitFor(() =>
    expect(mockedPlaceBookmark).toHaveBeenCalledWith("tok", {
      bookId: "b1",
      currentPage: 100,
      shelfId: "cr",
    }),
  );
  expect(router.back).toHaveBeenCalled();
});

it("moves the book to finished when the current page equals the page count", async () => {
  mockSearchParams = { bookId: "b1", currentPage: "600" };

  await renderScreen();

  await fireEvent.press(screen.getByText("place bookmark"));

  await waitFor(() =>
    expect(mockedPlaceBookmark).toHaveBeenCalledWith("tok", {
      bookId: "b1",
      currentPage: 600,
      shelfId: "fin",
    }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/review/[bookId]",
    params: { bookId: "b1" },
  });
});

it("marks the book completed and navigates to review", async () => {
  await renderScreen();

  await fireEvent.press(screen.getByText("book completed"));

  await waitFor(() =>
    expect(mockedPlaceBookmark).toHaveBeenCalledWith("tok", {
      bookId: "b1",
      currentPage: 600,
      shelfId: "fin",
    }),
  );
  expect(router.push).toHaveBeenCalledWith({
    pathname: "/review/[bookId]",
    params: { bookId: "b1" },
  });
});

it("shows the ApiError message when placing the bookmark fails", async () => {
  mockedPlaceBookmark.mockRejectedValueOnce(
    ApiError.fromResponse(404, {
      error: { code: "shelf_not_found", message: "shelf not found" },
    }),
  );

  await renderScreen();

  await fireEvent.press(screen.getByText("place bookmark"));

  await waitFor(() => expect(screen.getByText("shelf not found")).toBeTruthy());
  // The whole point of the new Error branch: an ApiError used to be swallowed entirely.
  expect(router.back).not.toHaveBeenCalled();
});

it("shows a generic message when placing the bookmark fails with a non-ApiError", async () => {
  mockedPlaceBookmark.mockRejectedValueOnce(new TypeError("Network request failed"));

  await renderScreen();

  await fireEvent.press(screen.getByText("place bookmark"));

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
  expect(router.back).not.toHaveBeenCalled();
});

it("shows the error when marking a book completed fails and does not navigate", async () => {
  mockedPlaceBookmark.mockRejectedValueOnce(
    ApiError.fromResponse(404, {
      error: { code: "book_not_found", message: "book not found" },
    }),
  );

  await renderScreen();

  await fireEvent.press(screen.getByText("book completed"));

  await waitFor(() => expect(screen.getByText("book not found")).toBeTruthy());
  expect(router.push).not.toHaveBeenCalled();
});

it("shows a field error, not a crash, when the completed book is not on the shelf", async () => {
  // The selected book is not among currentlyReading's bookmarks.
  mockedUseShelf.mockReturnValue({
    currentlyReading: {
      id: "cr",
      sortOrder: 1,
      name: "currently reading",
      userId: "u1",
      bookmarks: [],
    },
    finished: {
      id: "fin",
      sortOrder: 2,
      name: "finished",
      userId: "u1",
      bookmarks: [],
    },
    loadShelves: mockLoadShelves,
  });

  await renderScreen();

  // Previously this threw a bare Error("book not found on shelf") into the void.
  await fireEvent.press(screen.getByText("book completed"));

  await waitFor(() =>
    expect(screen.getByText("book not found on shelf")).toBeTruthy(),
  );
  expect(mockedPlaceBookmark).not.toHaveBeenCalled();
  expect(router.push).not.toHaveBeenCalled();
});

it("shows a field error when there is no book selected", async () => {
  mockSearchParams = {};

  await renderScreen();

  await fireEvent.press(screen.getByText("book completed"));

  await waitFor(() => expect(screen.getByText("choose a book")).toBeTruthy());
  expect(mockedPlaceBookmark).not.toHaveBeenCalled();
});

it("shows a field error when the finished shelf is unavailable", async () => {
  mockedUseShelf.mockReturnValue({
    currentlyReading: {
      id: "cr",
      sortOrder: 1,
      name: "currently reading",
      userId: "u1",
      bookmarks: [{ shelfId: "cr", currentPage: 100, book }],
    },
    finished: undefined,
    loadShelves: mockLoadShelves,
  });

  await renderScreen();

  await fireEvent.press(screen.getByText("book completed"));

  await waitFor(() =>
    expect(screen.getByText("finished shelf not available")).toBeTruthy(),
  );
  expect(mockedPlaceBookmark).not.toHaveBeenCalled();
});

it("keeps the bookmark on currently reading when the finished shelf is unavailable", async () => {
  mockedUseShelf.mockReturnValue({
    currentlyReading: {
      id: "cr",
      sortOrder: 1,
      name: "currently reading",
      userId: "u1",
      bookmarks: [{ shelfId: "cr", currentPage: 100, book }],
    },
    finished: undefined,
    loadShelves: mockLoadShelves,
  });

  await renderScreen();

  await fireEvent.press(screen.getByText("place bookmark"));

  await waitFor(() =>
    expect(mockedPlaceBookmark).toHaveBeenCalledWith("tok", {
      bookId: "b1",
      currentPage: 100,
      shelfId: "cr",
    }),
  );
  expect(router.back).toHaveBeenCalled();
});
