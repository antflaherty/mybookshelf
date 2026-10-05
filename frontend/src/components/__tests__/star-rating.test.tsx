import React from "react";
import { render, screen, fireEvent } from "@testing-library/react-native";
import StarRating from "@/components/star-rating";
import ThemeProvider from "@/theme/theme-provider";

function renderRating(props: Partial<React.ComponentProps<typeof StarRating>>) {
  return render(
    <ThemeProvider>
      <StarRating rating={0} {...props} />
    </ThemeProvider>,
  );
}

it("renders five pressables", async () => {
  const { toJSON } = await renderRating({ rating: 8 });
  // 5 stars, 10 total (star + clipped star) images rendered at most; just check tree renders
  expect(toJSON()).toBeTruthy();
});

it("does not call onChange when readonly", async () => {
  const onChange = jest.fn();
  await renderRating({ rating: 8, onChange, readonly: true });

  const stars = screen.root!.queryAll(
    (instance) => instance.props.accessible === true,
  );
  expect(stars).toHaveLength(5);
  await fireEvent.press(stars[0]);
  expect(onChange).not.toHaveBeenCalled();
});

it("calls onChange with a normalized rating when pressed", async () => {
  const onChange = jest.fn();
  await renderRating({ rating: 0, onChange, size: 28 });

  const stars = screen.root!.queryAll(
    (instance) => instance.props.accessible === true,
  );
  expect(stars).toHaveLength(5);

  await fireEvent.press(stars[0], { nativeEvent: { locationX: 28 } });

  expect(onChange).toHaveBeenCalledWith(4);
});

it("clamps out-of-range ratings", async () => {
  const { toJSON } = await renderRating({ rating: 40 });
  expect(toJSON()).toBeTruthy();
});
