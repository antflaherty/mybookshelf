import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import PlaceBookmarkScreen from "../(authenticated)/(tabs)/place-bookmark";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { placeBookmark } from "@/api/apiClient";
import { useShelf } from "@/context/shelf-provider";

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
