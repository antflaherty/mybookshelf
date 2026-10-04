import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import { useTheme } from "@/theme/theme-provider";
import { register } from "@/api/apiClient";
import ThemedPressable from "@/components/themed-pressable";

export default function RegisterScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hasMatchingPasswords, setHasMatchingPasswords] = useState(true);

  const { theme } = useTheme();

  async function handleSubmitPress() {
    const passwordsMatch = password === confirmPassword;
    setHasMatchingPasswords(passwordsMatch);

    if (passwordsMatch) {
      await register({ email, password });
      setEmail("");
      setPassword("");
      router.push("/login");
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={{ color: theme.text }}>email</Text>
      <TextInput
        placeholder="email"
        value={email}
        style={[
          styles.input,
          {
            backgroundColor: theme.inputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setEmail}
      />
      <Text style={{ color: theme.text }}>password</Text>
      <TextInput
        secureTextEntry
        placeholder="password"
        value={password}
        style={[
          styles.input,
          {
            backgroundColor: hasMatchingPasswords
              ? theme.inputBackground
              : theme.errorInputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setPassword}
      />
      <Text style={{ color: theme.text }}>confirm password</Text>
      <TextInput
        secureTextEntry
        placeholder="confirm password"
        value={confirmPassword}
        style={[
          styles.input,
          {
            backgroundColor: hasMatchingPasswords
              ? theme.inputBackground
              : theme.errorInputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setConfirmPassword}
      />
      {!hasMatchingPasswords && (
        <Text style={{ color: theme.errorText }}>passwords do not match</Text>
      )}
      <ThemedPressable
        variant="primary"
        text="submit"
        onPress={handleSubmitPress}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  input: {
    margin: 16,
    height: 50,
    width: 150,
    borderRadius: 22,
    paddingHorizontal: 8,
  },
});
