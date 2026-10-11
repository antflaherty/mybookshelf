import { View } from "react-native";
import ThemedPressable from "@/components/themed-pressable";

interface BookActionsProps {
  showPlaceBookmark: boolean;
  onPlaceBookmark: () => Promise<void>;
  showAddToShelf: boolean;
  onAddToShelf: () => Promise<void>;
  showStartReading: boolean;
  onStartReading: () => Promise<void>;
  onReviews: () => void;
  shelfName?: string;
}

export default function BookActions(props: BookActionsProps) {
  return (
    <View style={{ flexDirection: "row" }}>
      {props.showPlaceBookmark && (
        <ThemedPressable
          variant="primary"
          text="place bookmark"
          onPress={props.onPlaceBookmark}
        />
      )}
      {props.showAddToShelf && (
        <ThemedPressable
          variant="primary"
          text={`add to ${props.shelfName || "shelf"}`}
          onPress={props.onAddToShelf}
        />
      )}
      {props.showStartReading && (
        <ThemedPressable
          variant={props.showAddToShelf ? "secondary" : "primary"}
          text="start reading"
          onPress={props.onStartReading}
        />
      )}
      <ThemedPressable
        variant={
          props.showPlaceBookmark ||
          props.showAddToShelf ||
          props.showStartReading
            ? "secondary"
            : "primary"
        }
        onPress={props.onReviews}
        text="reviews"
      />
    </View>
  );
}
