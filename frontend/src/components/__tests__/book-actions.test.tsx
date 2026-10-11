import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import BookActions from "@/components/book-actions";
import ThemeProvider from "@/theme/theme-provider";
import { THEMES } from "@/theme/themes";

const theme = THEMES.forest;

const noop = () => Promise.resolve();

type Props = React.ComponentProps<typeof BookActions>;

function renderActions(overrides: Partial<Props> = {}) {
  const props: Props = {
    showPlaceBookmark: false,
    showAddToShelf: false,
    showStartReading: false,
    onPlaceBookmark: noop,
    onAddToShelf: noop,
    onStartReading: noop,
    onReviews: jest.fn(),
    ...overrides,
  };
  return render(
    <ThemeProvider>
      <BookActions {...props} />
    </ThemeProvider>,
  );
}

// `ThemedPressable` renders its label inside the pressable, so the pressable is the
// label's parent. The variant is only visible as the resolved background colour.
function variantOf(label: string) {
  const style = StyleSheet.flatten(screen.getByText(label).parent!.props.style);
  return style.backgroundColor === theme.primary ? "primary" : "secondary";
}

it("renders the reviews button alongside the other actions", async () => {
  await renderActions({
    showPlaceBookmark: true,
    showAddToShelf: true,
    showStartReading: true,
  });

  expect(screen.getByText("place bookmark")).toBeTruthy();
  expect(screen.getByText("add to shelf")).toBeTruthy();
  expect(screen.getByText("start reading")).toBeTruthy();
  expect(screen.getByText("reviews")).toBeTruthy();
});

it("calls onReviews when the reviews button is pressed", async () => {
  const onReviews = jest.fn();

  await renderActions({ onReviews });

  await fireEvent.press(screen.getByText("reviews"));

  expect(onReviews).toHaveBeenCalledTimes(1);
});

it("always renders reviews, even when every other action is hidden", async () => {
  await renderActions();

  expect(screen.getByText("reviews")).toBeTruthy();
  expect(screen.queryByText("place bookmark")).toBeNull();
  expect(screen.queryByText("add to shelf")).toBeNull();
  expect(screen.queryByText("start reading")).toBeNull();
});

it("promotes reviews to primary when it is the only action", async () => {
  await renderActions();

  expect(variantOf("reviews")).toBe("primary");
});

it.each([
  ["place bookmark", { showPlaceBookmark: true }],
  ["add to shelf", { showAddToShelf: true }],
  ["start reading", { showStartReading: true }],
] as [string, Partial<Props>][])(
  "renders reviews as secondary alongside %s",
  async (_label, overrides) => {
    await renderActions(overrides);

    expect(variantOf("reviews")).toBe("secondary");
  },
);

it("lays the actions out in a row", async () => {
  await renderActions({ showAddToShelf: true });

  // The reviews button used to be a sibling of this component, stacked under the actions.
  // They now share one row container.
  const container = screen.getByText("reviews").parent!.parent!;
  expect(StyleSheet.flatten(container.props.style)).toMatchObject({
    flexDirection: "row",
  });
  expect(screen.getByText("add to shelf").parent!.parent).toBe(container);
});

it("names the shelf in the add-to-shelf label", async () => {
  await renderActions({ showAddToShelf: true, shelfName: "to be read" });

  expect(screen.getByText("add to to be read")).toBeTruthy();
});

it("wires each action to its own handler", async () => {
  const handlers = {
    onPlaceBookmark: jest.fn().mockResolvedValue(undefined),
    onAddToShelf: jest.fn().mockResolvedValue(undefined),
    onStartReading: jest.fn().mockResolvedValue(undefined),
    onReviews: jest.fn(),
  };

  await renderActions({
    showPlaceBookmark: true,
    showAddToShelf: true,
    showStartReading: true,
    ...handlers,
  });

  await fireEvent.press(screen.getByText("place bookmark"));
  await fireEvent.press(screen.getByText("add to shelf"));
  await fireEvent.press(screen.getByText("start reading"));
  await fireEvent.press(screen.getByText("reviews"));

  expect(handlers.onPlaceBookmark).toHaveBeenCalledTimes(1);
  expect(handlers.onAddToShelf).toHaveBeenCalledTimes(1);
  expect(handlers.onStartReading).toHaveBeenCalledTimes(1);
  expect(handlers.onReviews).toHaveBeenCalledTimes(1);
});
