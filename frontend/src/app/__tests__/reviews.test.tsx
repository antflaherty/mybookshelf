import React from "react";
import { render, screen, waitFor } from "@testing-library/react-native";
import ReviewsScreen from "../(authenticated)/reviews/[bookId]";
import ThemeProvider from "@/theme/theme-provider";
import { getReviews } from "@/api/apiClient";
import { useBook } from "@/hooks/book";
import { ApiError } from "@/api/api-error";

const mockGetBookDetails = jest.fn();

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ bookId: "b1" }),
}));

jest.mock("@/auth/auth-context", () => ({
  useAuth: () => ({ accessToken: "tok" }),
}));

jest.mock("@/api/apiClient", () => ({
  getReviews: jest.fn(),
}));

jest.mock("@/hooks/book", () => ({
  useBook: jest.fn(),
}));

const mockedUseBook = useBook as jest.Mock;
const mockedGetReviews = getReviews as jest.Mock;

const bookDetails = {
  id: "b1",
  blurb: "spice",
  genres: ["sci-fi"],
  book: { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
};

const aReview = {
  bookId: "b1",
  stars: 16,
  comment: "great",
  createdTimestamp: "2026-10-01T00:00:00Z",
  lastEditedTimestamp: "2026-10-01T00:00:00Z",
  userId: "u1",
};

async function renderScreen() {
  await render(
    <ThemeProvider>
      <ReviewsScreen />
    </ThemeProvider>,
  );
}

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(console, "error").mockImplementation(() => {});
  mockGetBookDetails.mockResolvedValue(bookDetails);
  mockedUseBook.mockReturnValue({ getBookDetails: mockGetBookDetails });
  mockedGetReviews.mockResolvedValue([aReview]);
});

afterEach(() => {
  jest.restoreAllMocks();
});

it("loads and displays the reviews", async () => {
  await renderScreen();

  await waitFor(() => expect(screen.getByText("Dune")).toBeTruthy());
  expect(screen.getByText("great")).toBeTruthy();
});

it("shows an empty state when there are no reviews", async () => {
  mockedGetReviews.mockResolvedValue([]);

  await renderScreen();

  await waitFor(() => expect(screen.getByText("no reviews yet.")).toBeTruthy());
});

it("shows the error when getReviews rejects", async () => {
  mockedGetReviews.mockRejectedValue(
    ApiError.fromResponse(404, {
      error: { code: "not_found", message: "reviews not found" },
    }),
  );

  await renderScreen();

  await waitFor(() => expect(screen.getByText("reviews not found")).toBeTruthy());
  // Still shows the book header, since getBookDetails succeeded.
  expect(screen.getByText("Dune")).toBeTruthy();
});

it("falls back to a generic message when getReviews rejects with a non-ApiError", async () => {
  mockedGetReviews.mockRejectedValue(new TypeError("Network request failed"));

  await renderScreen();

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
});

it("keeps the reviews visible when only getBookDetails fails", async () => {
  mockGetBookDetails.mockRejectedValue(
    ApiError.fromResponse(502, {
      error: { code: "upstream_unavailable", message: "book service unavailable" },
    }),
  );

  await renderScreen();

  await waitFor(() => expect(screen.getByText("great")).toBeTruthy());
  expect(screen.queryByText("Dune")).toBeNull();
});

it("handles a null reviews body as an empty list", async () => {
  mockedGetReviews.mockResolvedValue(null);

  await renderScreen();

  await waitFor(() => expect(screen.getByText("no reviews yet.")).toBeTruthy());
});

it("clears the spinner when both requests fail", async () => {
  mockedGetReviews.mockRejectedValue(new Error("boom"));
  mockGetBookDetails.mockRejectedValue(new Error("boom"));

  await renderScreen();

  await waitFor(() =>
    expect(
      screen.getByText("something went wrong. please try again."),
    ).toBeTruthy(),
  );
});
