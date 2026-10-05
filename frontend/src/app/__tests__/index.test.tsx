import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import HomeScreen from "../(authenticated)/(tabs)/index";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { useShelf } from "@/context/shelf-provider";

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
}));

jest.mock("@/context/shelf-provider", () => ({
  useShelf: jest.fn(),
}));

const mockedUseShelf = useShelf as jest.Mock;

const shelf = {
  id: "s1",
  sortOrder: 0,
  name: "currently reading",
  userId: "u1",
  bookmarks: [
    {
      shelfId: "s1",
      currentPage: 5,
      book: { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
    },
  ],
};

async function renderScreen() {
  await render(
    <ThemeProvider>
      <HomeScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => jest.clearAllMocks());

it("shows a loading indicator while shelves load", async () => {
  mockedUseShelf.mockReturnValue({ shelves: [], isLoading: true });

  await renderScreen();

  expect(screen.queryByText("currently reading")).toBeNull();
  expect(screen.queryByText("place bookmark")).toBeNull();
});

it("renders shelves and navigates to a shelf on press", async () => {
  mockedUseShelf.mockReturnValue({ shelves: [shelf], isLoading: false });

  await renderScreen();

  expect(screen.getByText("currently reading")).toBeTruthy();
  expect(screen.getByText("Dune: 5 / 600")).toBeTruthy();

  await fireEvent.press(screen.getByText("currently reading"));

  expect(router.push).toHaveBeenCalledWith({
    pathname: "/shelf/[id]",
    params: { id: "s1" },
  });
});

it("navigates to place-bookmark", async () => {
  mockedUseShelf.mockReturnValue({ shelves: [], isLoading: false });

  await renderScreen();

  await fireEvent.press(screen.getByText("place bookmark"));

  expect(router.push).toHaveBeenCalledWith("/place-bookmark");
});
