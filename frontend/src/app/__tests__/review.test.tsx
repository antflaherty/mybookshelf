import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import ReviewBookScreen from "../(authenticated)/review/[bookId]";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { postReview } from "@/api/apiClient";
import { useBook } from "@/hooks/book";

const mockGetBookDetails = jest.fn();

jest.mock("expo-router", () => ({
  router: { push: jest.fn() },
  useLocalSearchParams: () => ({ bookId: "b1" }),
}));

jest.mock("@/auth/auth-context", () => ({
  useAuth: () => ({ accessToken: "tok" }),
}));

jest.mock("@/api/apiClient", () => ({
  postReview: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/hooks/book", () => ({
  useBook: jest.fn(),
}));

const mockedUseBook = useBook as jest.Mock;
const mockedPostReview = postReview as jest.Mock;

const bookDetails = {
  id: "b1",
  blurb: "spice",
  genres: ["sci-fi"],
  book: { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
};

beforeEach(() => {
  jest.clearAllMocks();
  mockGetBookDetails.mockResolvedValue(bookDetails);
  mockedUseBook.mockReturnValue({ getBookDetails: mockGetBookDetails });
});

it("loads and displays the book details", async () => {
  await render(
    <ThemeProvider>
      <ReviewBookScreen />
    </ThemeProvider>,
  );

  await waitFor(() =>
    expect(mockGetBookDetails).toHaveBeenCalledWith("b1"),
  );
  await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy());
});

it("submits a review and navigates home", async () => {
  await render(
    <ThemeProvider>
      <ReviewBookScreen />
    </ThemeProvider>,
  );

  await waitFor(() => expect(screen.getByText("submit")).toBeTruthy());

  await fireEvent.changeText(
    screen.getByPlaceholderText("write a review..."),
    "great",
  );
  await fireEvent.press(screen.getByText("submit"));

  await waitFor(() =>
    expect(mockedPostReview).toHaveBeenCalledWith(
      "tok",
      expect.objectContaining({ bookId: "b1", comment: "great", stars: 0 }),
    ),
  );
  expect(router.push).toHaveBeenCalledWith("/");
});
