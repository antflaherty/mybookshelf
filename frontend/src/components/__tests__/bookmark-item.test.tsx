import React from "react";
import { render, screen } from "@testing-library/react-native";
import BookmarkItem from "@/components/bookmark-item";
import ThemeProvider from "@/theme/theme-provider";
import { Bookmark } from "@/lib/definitions";

const bookmark: Bookmark = {
  shelfId: "shelf-1",
  currentPage: 120,
  book: {
    id: "book-1",
    title: "Dune",
    author: "Frank Herbert",
    pageCount: 600,
  },
};

describe("with showProgress true", () => {
  it("shows the title and reading progress", async () => {
    await render(
      <ThemeProvider>
        <BookmarkItem bookmark={bookmark} showProgress />
      </ThemeProvider>,
    );

    expect(screen.getByText("Dune: 120 / 600")).toBeTruthy();
  });
});

describe("with showProgress false", () => {
  it("shows the title only", async () => {
    await render(
      <ThemeProvider>
        <BookmarkItem bookmark={bookmark} showProgress={false} />
      </ThemeProvider>,
    );

    expect(screen.getByText("Dune")).toBeTruthy();
  });
});
