import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import ShelfProvider, { useShelf } from "@/context/shelf-provider";
import { getShelves } from "@/api/apiClient";

jest.mock("@/api/apiClient", () => ({
  getShelves: jest.fn(),
}));

jest.mock("@/auth/auth-context", () => ({
  useAuth: () => ({ accessToken: "tok" }),
}));

const mockedGetShelves = getShelves as jest.Mock;

function makeShelf(id: string, sortOrder: number, name: string) {
  return { id, sortOrder, name, userId: "u1", bookmarks: [] };
}

function Probe() {
  const { shelves, isLoading, toBeRead, currentlyReading, finished } =
    useShelf();
  return (
    <>
      <Text testID="loading">{isLoading ? "yes" : "no"}</Text>
      <Text testID="names">{shelves.map((s) => s.name).join(",")}</Text>
      <Text testID="toBeRead">{toBeRead?.name}</Text>
      <Text testID="currentlyReading">{currentlyReading?.name}</Text>
      <Text testID="finished">{finished?.name}</Text>
    </>
  );
}

beforeEach(() => jest.clearAllMocks());

it("loads shelves sorted by sortOrder and exposes named shelves", async () => {
  mockedGetShelves.mockResolvedValue([
    makeShelf("3", 2, "finished"),
    makeShelf("1", 0, "to be read"),
    makeShelf("2", 1, "currently reading"),
  ]);

  await render(
    <ShelfProvider>
      <Probe />
    </ShelfProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("loading").props.children).toBe("no"),
  );
  expect(screen.getByTestId("names").props.children).toBe(
    "to be read,currently reading,finished",
  );
  expect(screen.getByTestId("toBeRead").props.children).toBe("to be read");
  expect(screen.getByTestId("finished").props.children).toBe("finished");
});
