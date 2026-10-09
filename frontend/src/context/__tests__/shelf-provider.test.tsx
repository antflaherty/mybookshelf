import React from "react";
import { render, screen, waitFor, act } from "@testing-library/react-native";
import { Text } from "react-native";
import ShelfProvider, { useShelf } from "@/context/shelf-provider";
import { getShelves } from "@/api/apiClient";
import { ApiError } from "@/api/api-error";

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
  const {
    shelves,
    isLoading,
    error,
    loadShelves,
    toBeRead,
    currentlyReading,
    finished,
  } = useShelf();
  return (
    <>
      <Text testID="loading">{isLoading ? "yes" : "no"}</Text>
      <Text testID="error">{error ?? "none"}</Text>
      <Text testID="names">{shelves.map((s) => s.name).join(",")}</Text>
      <Text testID="toBeRead">{toBeRead?.name ?? "missing"}</Text>
      <Text testID="currentlyReading">{currentlyReading?.name ?? "missing"}</Text>
      <Text testID="finished">{finished?.name ?? "missing"}</Text>
      <Text testID="reload" onPress={() => void loadShelves()}>
        reload
      </Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

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

it("does not mutate the array it was given", async () => {
  const loaded = [makeShelf("3", 2, "finished"), makeShelf("1", 0, "to be read")];
  mockedGetShelves.mockResolvedValue(loaded);

  await render(
    <ShelfProvider>
      <Probe />
    </ShelfProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("loading").props.children).toBe("no"),
  );
  expect(loaded.map((s) => s.name)).toEqual(["finished", "to be read"]);
});

it("sets error and clears isLoading when getShelves rejects", async () => {
  // Built through fromResponse, as the client does, so the 5xx suppression is included.
  mockedGetShelves.mockRejectedValue(
    ApiError.fromResponse(500, {
      error: { code: "internal_error", message: "internal server error" },
    }),
  );

  await render(
    <ShelfProvider>
      <Probe />
    </ShelfProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe(
      "something went wrong. please try again.",
    ),
  );
  expect(screen.getByTestId("loading").props.children).toBe("no");
  expect(screen.getByTestId("names").props.children).toBe("");
});

it("surfaces a non-5xx server message verbatim", async () => {
  mockedGetShelves.mockRejectedValue(
    ApiError.fromResponse(404, {
      error: { code: "shelf_not_found", message: "shelf not found" },
    }),
  );

  await render(
    <ShelfProvider>
      <Probe />
    </ShelfProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe("shelf not found"),
  );
});

it("surfaces a non-ApiError rejection as the generic message", async () => {
  mockedGetShelves.mockRejectedValue(new Error("kaboom"));

  await render(
    <ShelfProvider>
      <Probe />
    </ShelfProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe(
      "something went wrong. please try again.",
    ),
  );
  expect(screen.getByTestId("loading").props.children).toBe("no");
});

it("clears a previous error when loadShelves is called again", async () => {
  mockedGetShelves.mockRejectedValueOnce(
    new ApiError("not found", { status: 404, code: "not_found" }),
  );
  mockedGetShelves.mockResolvedValueOnce([
    makeShelf("1", 0, "to be read"),
    makeShelf("2", 1, "currently reading"),
    makeShelf("3", 2, "finished"),
  ]);

  await render(
    <ShelfProvider>
      <Probe />
    </ShelfProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe("not found"),
  );

  await act(async () => {
    screen.getByTestId("reload").props.onPress();
  });

  await waitFor(() =>
    expect(screen.getByTestId("error").props.children).toBe("none"),
  );
  expect(screen.getByTestId("names").props.children).toBe(
    "to be read,currently reading,finished",
  );
});

it("does not crash when the named shelves are absent", async () => {
  mockedGetShelves.mockResolvedValue([
    makeShelf("9", 0, "some other shelf"),
  ]);

  await render(
    <ShelfProvider>
      <Probe />
    </ShelfProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("loading").props.children).toBe("no"),
  );

  expect(screen.getByTestId("names").props.children).toBe("some other shelf");
  expect(screen.getByTestId("toBeRead").props.children).toBe("missing");
  expect(screen.getByTestId("currentlyReading").props.children).toBe("missing");
  expect(screen.getByTestId("finished").props.children).toBe("missing");
  expect(screen.getByTestId("error").props.children).toBe("none");
});

it("does not crash when the shelves are empty", async () => {
  mockedGetShelves.mockResolvedValue([]);

  await render(
    <ShelfProvider>
      <Probe />
    </ShelfProvider>,
  );

  await waitFor(() =>
    expect(screen.getByTestId("loading").props.children).toBe("no"),
  );

  expect(screen.getByTestId("toBeRead").props.children).toBe("missing");
  expect(screen.getByTestId("error").props.children).toBe("none");
});
