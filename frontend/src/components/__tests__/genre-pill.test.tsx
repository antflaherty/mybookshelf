import React from "react";
import { render, screen } from "@testing-library/react-native";
import GenrePill from "@/components/genre-pill";
import ThemeProvider from "@/theme/theme-provider";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider>{ui}</ThemeProvider>);
}

it("renders the genre name", async () => {
  await renderWithTheme(<GenrePill genre="Sci-Fi" />);
  expect(screen.getByText("Sci-Fi")).toBeTruthy();
});
