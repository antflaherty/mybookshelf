import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import SearchBooksScreen from "../(authenticated)/(tabs)/search-books";
import ThemeProvider from "@/theme/theme-provider";
import { searchBooks } from "@/api/apiClient";

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

const mockedSearchBooks = searchBooks as jest.Mock;

async function renderScreen() {
  await render(
    <ThemeProvider>
      <SearchBooksScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

it("searches with the entered title and renders results", async () => {
  mockedSearchBooks.mockResolvedValue([
    { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
  ]);

  await renderScreen();

  await fireEvent.changeText(screen.getByPlaceholderText("title"), "Dune");
  await fireEvent.press(screen.getByText("search"));

  await waitFor(() =>
    expect(mockedSearchBooks).toHaveBeenCalledWith("tok", "Dune", 6, 1),
  );
  await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy());
});

it("renders nothing when there are no results", async () => {
  mockedSearchBooks.mockResolvedValue([]);

  await renderScreen();

  await fireEvent.changeText(screen.getByPlaceholderText("title"), "nope");
  await fireEvent.press(screen.getByText("search"));

  await waitFor(() => expect(mockedSearchBooks).toHaveBeenCalled());
  expect(screen.queryByText("Dune")).toBeNull();
});
