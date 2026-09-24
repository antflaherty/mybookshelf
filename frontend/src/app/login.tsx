import { useState } from "react";
import { Alert, StyleSheet, Text, TextInput, View } from "react-native";
import { User } from "@/lib/definitions";
import { router } from "expo-router";
import { useTheme } from "@/theme/theme-provider";
import { useAuth } from "@/auth/auth-context";
import ThemedPressable from "@/components/themed-pressable";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { theme } = useTheme();
  const { login } = useAuth();

  async function handleLoginPress() {
    await login({ email, password });
    router.push("/");
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
            backgroundColor: theme.inputBackground,
            color: theme.inputText,
          },
        ]}
        onChangeText={setPassword}
      />
      <ThemedPressable variant="primary" onPress={handleLoginPress}>
        <Text style={{ color: theme.text }}>log in</Text>
      </ThemedPressable>
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
