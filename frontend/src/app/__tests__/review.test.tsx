import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react-native";
import ReviewBookScreen from "../(authenticated)/review/[bookId]";
import ThemeProvider from "@/theme/theme-provider";
import { router } from "expo-router";
import { postReview } from "@/api/apiClient";
import { useBook } from "@/hooks/book";
import { ApiError } from "@/api/api-error";

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
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockGetBookDetails.mockResolvedValue(bookDetails);
  mockedUseBook.mockReturnValue({ getBookDetails: mockGetBookDetails });
  mockedPostReview.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
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

it("shows the server's message and does not navigate when the review fails", async () => {
  mockedPostReview.mockRejectedValueOnce(
    ApiError.fromResponse(400, {
      error: {
        code: "invalid_request",
        message: "invalid request",
        details: { stars: "must be between 0 and 20" },
      },
    }),
  );

  await render(
    <ThemeProvider>
      <ReviewBookScreen />
    </ThemeProvider>,
  );

  await waitFor(() => expect(screen.getByText("submit")).toBeTruthy());
  await fireEvent.press(screen.getByText("submit"));

  await waitFor(() => expect(screen.getByText("invalid request")).toBeTruthy());
  expect(router.push).not.toHaveBeenCalled();
});

it("falls back to a generic message when the review fails with a non-ApiError", async () => {
  mockedPostReview.mockRejectedValueOnce(
    new TypeError("Network request failed"),
  );

  await render(
    <ThemeProvider>
      <ReviewBookScreen />
    </ThemeProvider>,
  );

  await waitFor(() => expect(screen.getByText("submit")).toBeTruthy());
  await fireEvent.press(screen.getByText("submit"));

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
  expect(router.push).not.toHaveBeenCalled();
});

it("navigates home on a retry after a failed submit", async () => {
  mockedPostReview.mockRejectedValueOnce(new Error("boom"));
  mockedPostReview.mockResolvedValueOnce(undefined);

  await render(
    <ThemeProvider>
      <ReviewBookScreen />
    </ThemeProvider>,
  );

  await waitFor(() => expect(screen.getByText("submit")).toBeTruthy());
  await fireEvent.press(screen.getByText("submit"));
  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );

  await fireEvent.press(screen.getByText("submit"));

  await waitFor(() => expect(router.push).toHaveBeenCalledWith("/"));
  expect(
    screen.queryByText("something went wrong. please try again."),
  ).toBeNull();
});

it("shows an error instead of an empty screen when the book fails to load", async () => {
  mockGetBookDetails.mockRejectedValueOnce(
    ApiError.fromResponse(404, {
      error: { code: "book_not_found", message: "book not found" },
    }),
  );

  await render(
    <ThemeProvider>
      <ReviewBookScreen />
    </ThemeProvider>,
  );

  await waitFor(() => expect(screen.getByText("book not found")).toBeTruthy());
  expect(screen.queryByText("submit")).toBeNull();
});

it("clears the loading spinner when the book load fails", async () => {
  mockGetBookDetails.mockRejectedValueOnce(new Error("boom"));

  await render(
    <ThemeProvider>
      <ReviewBookScreen />
    </ThemeProvider>,
  );

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
  expect(screen.queryByTestId("loading-spinner")).toBeNull();
});
