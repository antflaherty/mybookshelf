import React from "react";
import { render, screen } from "@testing-library/react-native";
import BookmarkList from "@/components/bookmark-list";
import ThemeProvider from "@/theme/theme-provider";
import { Bookmark } from "@/lib/definitions";

function makeBookmark(id: string, title: string, currentPage: number): Bookmark {
  return {
    shelfId: "shelf-1",
    currentPage,
    book: { id, title, author: "Author", pageCount: 300 },
  };
}

it("renders an item per bookmark", async () => {
  await render(
    <ThemeProvider>
      <BookmarkList
        bookmarks={[
          makeBookmark("1", "Dune", 50),
          makeBookmark("2", "Neuromancer", 200),
        ]}
      />
    </ThemeProvider>,
  );

  expect(screen.getByText("Dune: 50 / 300")).toBeTruthy();
  expect(screen.getByText("Neuromancer: 200 / 300")).toBeTruthy();
});

it("renders nothing for an empty list", async () => {
  const { toJSON } = await render(
    <ThemeProvider>
      <BookmarkList bookmarks={[]} />
    </ThemeProvider>,
  );

  expect(screen.queryByText(/\/ 300/)).toBeNull();
  expect(toJSON()).toBeTruthy();
});
