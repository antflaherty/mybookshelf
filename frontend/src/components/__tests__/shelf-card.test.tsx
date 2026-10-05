import React from "react";
import { render, screen } from "@testing-library/react-native";
import ShelfCard from "@/components/shelf-card";
import ThemeProvider from "@/theme/theme-provider";
import { Shelf } from "@/lib/definitions";

const shelf: Shelf = {
  id: "shelf-1",
  sortOrder: 0,
  name: "Currently Reading",
  userId: "user-1",
  bookmarks: [
    {
      shelfId: "shelf-1",
      currentPage: 10,
      book: { id: "b1", title: "Dune", author: "Herbert", pageCount: 600 },
    },
  ],
};

it("renders the shelf name and its bookmarks", async () => {
  await render(
    <ThemeProvider>
      <ShelfCard shelf={shelf} />
    </ThemeProvider>,
  );

  expect(screen.getByText("Currently Reading")).toBeTruthy();
  expect(screen.getByText("Dune: 10 / 600")).toBeTruthy();
});
