import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import SelectShelfScreen from "../(authenticated)/select-shelf";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { placeBookmark } from "@/api/apiClient";
import { useShelf } from "@/context/shelf-provider";

const mockLoadShelves = jest.fn().mockResolvedValue(undefined);

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({ bookId: "b1", currentPage: "42" }),
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

const mockedUseShelf = useShelf as jest.Mock;
const mockedPlaceBookmark = placeBookmark as jest.Mock;

const shelves = [
  {
    id: "s1",
    sortOrder: 0,
    name: "to be read",
    userId: "u1",
    bookmarks: [],
  },
  {
    id: "s2",
    sortOrder: 1,
    name: "finished",
    userId: "u1",
    bookmarks: [],
  },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseShelf.mockReturnValue({ shelves, loadShelves: mockLoadShelves });
});

it("renders each shelf", async () => {
  await render(
    <ThemeProvider>
      <SelectShelfScreen />
    </ThemeProvider>,
  );

  expect(screen.getByText("to be read")).toBeTruthy();
  expect(screen.getByText("finished")).toBeTruthy();
});

it("places a bookmark on the selected shelf and navigates home", async () => {
  await render(
    <ThemeProvider>
      <SelectShelfScreen />
    </ThemeProvider>,
  );

  await fireEvent.press(screen.getByText("finished"));

  await waitFor(() =>
    expect(mockedPlaceBookmark).toHaveBeenCalledWith("tok", {
      bookId: "b1",
      currentPage: 42,
      shelfId: "s2",
    }),
  );
  expect(mockLoadShelves).toHaveBeenCalled();
  expect(router.push).toHaveBeenCalledWith("/");
});
