import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import ErrorMessage from "@/components/error-message";
import ThemeProvider from "@/theme/theme-provider";
import { THEMES } from "@/theme/themes";

async function renderComponent(ui: React.ReactElement) {
  await render(<ThemeProvider>{ui}</ThemeProvider>);
}

it("renders the message in the theme's error colour", async () => {
  await renderComponent(<ErrorMessage message="book not found" />);

  const text = screen.getByText("book not found");
  expect(text).toBeTruthy();
  expect(text.props.style).toEqual(
    expect.arrayContaining([expect.objectContaining({ color: THEMES.forest.errorText })]),
  );
});

it("does not render a retry button without onRetry", async () => {
  await renderComponent(<ErrorMessage message="something went wrong" />);

  expect(screen.queryByText("try again")).toBeNull();
});

it("renders a retry button when onRetry is given", async () => {
  await renderComponent(<ErrorMessage message="not found" onRetry={() => {}} />);

  expect(screen.getByText("try again")).toBeTruthy();
});

it("calls onRetry when the retry button is pressed", async () => {
  const onRetry = jest.fn();

  await renderComponent(<ErrorMessage message="not found" onRetry={onRetry} />);

  await fireEvent.press(screen.getByText("try again"));

  expect(onRetry).toHaveBeenCalledTimes(1);
});

it("renders a network error message verbatim", async () => {
  await renderComponent(
    <ErrorMessage message="could not reach the server. check your connection." />,
  );

  expect(
    screen.getByText("could not reach the server. check your connection."),
  ).toBeTruthy();
});
