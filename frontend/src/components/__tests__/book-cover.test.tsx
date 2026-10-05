import React from "react";
import { render, screen } from "@testing-library/react-native";
import BookCover from "@/components/book-cover";
import ThemeProvider from "@/theme/theme-provider";
import { Image } from "react-native";

beforeEach(() => {
  jest.spyOn(Image, "getSize").mockImplementation((uri, success) => {
    success(400, 600);
  });
});

afterEach(() => jest.restoreAllMocks());

it("renders a fallback when there is no uri", async () => {
  await render(
    <ThemeProvider>
      <BookCover />
    </ThemeProvider>,
  );

  expect(screen.getByText("cover not found")).toBeTruthy();
});

it("renders an image when a uri is provided", async () => {
  await render(
    <ThemeProvider>
      <BookCover uri="https://example.com/cover.jpg" />
    </ThemeProvider>,
  );

  expect(screen.queryByText("cover not found")).toBeNull();
});

it("renders a fallback when the image fails to load", async () => {
  jest.spyOn(Image, "getSize").mockImplementation((uri, success, error) => {
    error?.(new Error("boom"));
  });
  jest.spyOn(console, "error").mockImplementation(() => {});

  await render(
    <ThemeProvider>
      <BookCover uri="https://example.com/broken.jpg" />
    </ThemeProvider>,
  );

  expect(screen.getByText("cover not found")).toBeTruthy();
});
