import { registerRootComponent } from "expo";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import App from "./App";

// Registrar el BG task antes de montar la app.
// Sin este import, TaskManager.defineTask no se ejecuta y el BG task
// no existe cuando startLocationUpdatesAsync intenta usarlo.
import "./src/background/locationTask";

function Root() {
  return (
    <SafeAreaProvider>
      <App />
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);