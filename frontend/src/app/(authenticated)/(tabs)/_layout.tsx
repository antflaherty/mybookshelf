import { router, Tabs } from "expo-router";
import { AntDesign } from "@react-native-vector-icons/ant-design";
import { useTheme } from "@/theme/theme-provider";

export default function TabLayout() {
  const { theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.background,
        },
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.text,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({ size }) => (
            <AntDesign name="home" color={theme.primary} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="place-bookmark"
        options={{
          title: "place bookmark",
          tabBarIcon: ({ size }) => (
            <AntDesign name="book" color={theme.primary} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="search-books"
        options={{
          title: "search",
          tabBarIcon: ({ size }) => (
            <AntDesign name="search" color={theme.primary} size={size} />
          ),
        }}
        listeners={{
          tabPress: () => {
            router.push({
              pathname: "/search-books",
              params: {
                shelfId: "",
              },
            });
          },
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ size }) => (
            <AntDesign name="setting" color={theme.primary} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
