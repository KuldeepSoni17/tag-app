import "react-native-gesture-handler";
import { useEffect } from "react";
import { NavigationContainer, DefaultTheme } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { PhoneScreen } from "./src/screens/PhoneScreen";
import { OtpScreen } from "./src/screens/OtpScreen";
import { RegisterScreen } from "./src/screens/RegisterScreen";
import { HomeScreen } from "./src/screens/HomeScreen";
import { useAuthStore } from "./src/store/authStore";
import type { AuthStackParamList } from "./src/types/navigation";

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator();

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
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Phone" component={PhoneScreen} />
      <AuthStack.Screen name="Otp" component={OtpScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
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
