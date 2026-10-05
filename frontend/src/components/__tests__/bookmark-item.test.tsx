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

it("shows the title and reading progress", async () => {
  await render(
    <ThemeProvider>
      <BookmarkItem bookmark={bookmark} />
    </ThemeProvider>,
  );

  expect(screen.getByText("Dune: 120 / 600")).toBeTruthy();
});
