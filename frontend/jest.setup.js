process.env.EXPO_PUBLIC_API_URL = "https://api.test";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);
