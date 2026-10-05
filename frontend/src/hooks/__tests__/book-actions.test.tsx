import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";
import { useBookActions } from "@/hooks/book-actions";
import { createBook, placeBookmark } from "@/api/apiClient";
import { useShelf } from "@/context/shelf-provider";

const mockLoadShelves = jest.fn().mockResolvedValue(undefined);

jest.mock("@/auth/auth-context", () => ({
  useAuth: () => ({ accessToken: "tok" }),
}));

jest.mock("@/context/shelf-provider", () => ({
  useShelf: jest.fn(),
}));

jest.mock("@/api/apiClient", () => ({
  createBook: jest.fn(),
  placeBookmark: jest.fn().mockResolvedValue(undefined),
}));

const mockedUseShelf = useShelf as jest.Mock;
const mockedCreateBook = createBook as jest.Mock;
const mockedPlaceBookmark = placeBookmark as jest.Mock;

const currentlyReading = {
  id: "cr",
  sortOrder: 1,
  name: "currently reading",
  userId: "u1",
  bookmarks: [],
};

function Probe() {
  const { startReading, addNewBookToShelf } = useBookActions();
  const book = { id: "", title: "Dune", author: "Herbert", pageCount: 600 };
  return (
    <>
      <Text
        testID="start"
        onPress={() => startReading(book)}
      >
        start
      </Text>
      <Text
        testID="add"
        onPress={() => addNewBookToShelf(book, "s9")}
      >
        add
      </Text>
    </>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedUseShelf.mockReturnValue({
    currentlyReading,
    loadShelves: mockLoadShelves,
  });
  mockedCreateBook.mockResolvedValue({ ...{}, id: "new-id" });
});

it("startReading creates the book and places a bookmark on currently reading", async () => {
  await render(<Probe />);

  await fireEvent.press(screen.getByTestId("start"));

  await waitFor(() =>
    expect(mockedCreateBook).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({ title: "Dune" }),
    ),
  );
  await waitFor(() =>
    expect(mockedPlaceBookmark).toHaveBeenCalledWith("tok", {
      bookId: "new-id",
      currentPage: 0,
      shelfId: "cr",
    }),
  );
  expect(mockLoadShelves).toHaveBeenCalled();
});

it("startReading with an existing bookmark skips createBook", async () => {
  function ExistingProbe() {
    const { startReading } = useBookActions();
    return (
      <Text
        testID="start"
        onPress={() =>
          startReading(
            { id: "", title: "Dune", author: "Herbert", pageCount: 600 },
            {
              shelfId: "cr",
              currentPage: 30,
              book: { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
            },
          )
        }
      >
        start
      </Text>
    );
  }

  await render(<ExistingProbe />);

  await fireEvent.press(screen.getByTestId("start"));

  await waitFor(() =>
    expect(mockedPlaceBookmark).toHaveBeenCalledWith("tok", {
      bookId: "b1",
      currentPage: 0,
      shelfId: "cr",
    }),
  );
  expect(mockedCreateBook).not.toHaveBeenCalled();
});

it("addNewBookToShelf creates the book and places a bookmark on the given shelf", async () => {
  await render(<Probe />);

  await fireEvent.press(screen.getByTestId("add"));

  await waitFor(() =>
    expect(mockedPlaceBookmark).toHaveBeenCalledWith("tok", {
      bookId: "new-id",
      currentPage: 0,
      shelfId: "s9",
    }),
  );
});
