import { Tabs } from "expo-router";
import { AntDesign } from '@react-native-vector-icons/ant-design';


export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({size}) => (
            <AntDesign name='home' size={size}/>
          ),
        }}
        
      />
      <Tabs.Screen
        name="log-reading"
        options={{
          title: "Log Reading",
          tabBarIcon: ({size}) => (
            <AntDesign name='book' size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
