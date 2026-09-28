import { View } from "react-native";
import ThemedPressable from "@/components/themed-pressable";

interface BookActionsProps {
  showPlaceBookmark: boolean;
  onPlaceBookmark: () => Promise<void>;
  showAddToShelf: boolean;
  onAddToShelf: () => Promise<void>;
  showStartReading: boolean;
  onStartReading: () => Promise<void>;
  shelfName?: string;
}

export default function BookActions(props: BookActionsProps) {
  return (
    <View>
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
    </View>
  );
}
