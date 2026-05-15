import { Platform } from "react-native";
import { useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createStackNavigator } from "@react-navigation/stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PhoneScreen } from "./src/screens/PhoneScreen";
import { OtpScreen } from "./src/screens/OtpScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { useAuthStore } from "./src/store/authStore";
import type { AuthStackParamList } from "./src/types/navigation";

/** Native-only: gesture handler breaks some web builds if imported unconditionally. */
if (Platform.OS !== "web") {
  require("react-native-gesture-handler");
}

const screenOptions = { headerShown: false } as const;

const AuthStack =
  Platform.OS === "web"
    ? createStackNavigator<AuthStackParamList>()
    : createNativeStackNavigator<AuthStackParamList>();
const MainStack =
  Platform.OS === "web" ? createStackNavigator() : createNativeStackNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: "#0a0a0a",
    card: "#0a0a0a",
    text: "#fff",
    border: "#27272a",
    primary: "#22c55e",
  },
};

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={screenOptions}>
      <AuthStack.Screen name="Phone" component={PhoneScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={screenOptions}>
      <MainStack.Screen name="Home" component={HomeScreen} />
    </MainStack.Navigator>
  );
}

const TOKEN_KEY = "tagapp_token";

export default function App() {
  const token = useAuthStore((s) => s.token);
  const setToken = useAuthStore((s) => s.setToken);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(TOKEN_KEY);
      if (stored) setToken(stored);
    })();
  }, [setToken]);

  useEffect(() => {
    (async () => {
      if (token) await AsyncStorage.setItem(TOKEN_KEY, token);
      else await AsyncStorage.removeItem(TOKEN_KEY);
    })();
  }, [token]);

  return (
    <NavigationContainer theme={navTheme}>
      {token ? <MainNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
