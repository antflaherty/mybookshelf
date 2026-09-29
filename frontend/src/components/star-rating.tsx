import { Pressable, StyleSheet, View } from "react-native";
import { AntDesign } from "@react-native-vector-icons/ant-design";
import { useTheme } from "@/theme/theme-provider";

interface StarRatingProps {
  rating: number;
  onChange?: (rating: number) => void;
  size?: number;
  readonly?: boolean;
}

const MAX_RATING = 20;
const UNITS_PER_STAR = 4;
const STAR_COUNT = 5;

export default function StarRating({
  rating,
  onChange,
  size = 28,
  readonly = false,
}: StarRatingProps) {
  const { theme } = useTheme();

  const normalizedRating = Math.min(
    MAX_RATING,
    Math.max(0, Math.round(rating)),
  );

  function handlePress(starIndex: number, locationX: number) {
    if (readonly || !onChange) {
      return;
    }

    const quarter = Math.min(4, Math.max(1, Math.ceil((locationX / size) * 4)));

    const newRating = starIndex * UNITS_PER_STAR + quarter;

    onChange(newRating);
  }

  return (
    <View style={styles.container}>
      {Array.from({ length: STAR_COUNT }, (_, starIndex) => {
        const starRating = starIndex * UNITS_PER_STAR;

        const fillUnits = Math.min(
          UNITS_PER_STAR,
          Math.max(0, normalizedRating - starRating),
        );

        const fillAmount = fillUnits / UNITS_PER_STAR;

        return (
          <Pressable
            key={starIndex}
            disabled={readonly || !onChange}
            onPress={(event) =>
              handlePress(starIndex, event.nativeEvent.locationX)
            }
            style={{
              width: size,
              height: size,
            }}
          >
            <AntDesign
              name="star"
              size={size}
              color={theme.starEmpty}
              style={styles.absolute}
            />

            {fillAmount > 0 && (
              <View
                style={[
                  styles.clip,
                  {
                    width: size * fillAmount,
                    height: size,
                  },
                ]}
              >
                <AntDesign name="star" size={size} color={theme.starFilled} />
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 4,
  },
  absolute: {
    position: "absolute",
  },
  clip: {
    position: "absolute",
    overflow: "hidden",
  },
});
