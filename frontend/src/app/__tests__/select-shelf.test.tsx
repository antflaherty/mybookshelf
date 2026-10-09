import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import SelectShelfScreen from "../(authenticated)/select-shelf";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { placeBookmark } from "@/api/apiClient";
import { useShelf } from "@/context/shelf-provider";
import { ApiError } from "@/api/api-error";

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
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockedPlaceBookmark.mockResolvedValue(undefined);
  mockLoadShelves.mockResolvedValue(undefined);
  mockedUseShelf.mockReturnValue({ shelves, loadShelves: mockLoadShelves });
});

afterEach(() => {
  jest.restoreAllMocks();
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

it("does not navigate when placeBookmark rejects", async () => {
  mockedPlaceBookmark.mockRejectedValueOnce(
    ApiError.fromResponse(404, {
      error: { code: "shelf_not_found", message: "shelf not found" },
    }),
  );

  await render(
    <ThemeProvider>
      <SelectShelfScreen />
    </ThemeProvider>,
  );

  await fireEvent.press(screen.getByText("finished"));

  await waitFor(() => expect(screen.getByText("shelf not found")).toBeTruthy());
  expect(router.push).not.toHaveBeenCalled();
});

it("does not navigate when the shelf reload fails after a successful save", async () => {
  mockedPlaceBookmark.mockResolvedValueOnce(undefined);
  mockLoadShelves.mockRejectedValueOnce(new Error("boom"));

  await render(
    <ThemeProvider>
      <SelectShelfScreen />
    </ThemeProvider>,
  );

  await fireEvent.press(screen.getByText("finished"));

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
  expect(router.push).not.toHaveBeenCalled();
});

it("falls back to a generic message for a non-ApiError rejection", async () => {
  mockedPlaceBookmark.mockRejectedValueOnce(
    new TypeError("Network request failed"),
  );

  await render(
    <ThemeProvider>
      <SelectShelfScreen />
    </ThemeProvider>,
  );

  await fireEvent.press(screen.getByText("finished"));

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
});

it("shares one error across the shelf buttons and clears it on retry", async () => {
  mockedPlaceBookmark.mockRejectedValueOnce(new Error("boom"));
  mockedPlaceBookmark.mockResolvedValueOnce(undefined);

  await render(
    <ThemeProvider>
      <SelectShelfScreen />
    </ThemeProvider>,
  );

  await fireEvent.press(screen.getByText("finished"));
  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );

  // Pressing a different shelf retries rather than failing silently.
  await fireEvent.press(screen.getByText("to be read"));

  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
  expect(
    screen.queryByText("something went wrong. please try again."),
  ).toBeNull();
});
