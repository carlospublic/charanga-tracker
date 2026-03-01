import "dotenv/config";

export default {
  expo: {
    name: "Charanga Tracker",
    slug: "charanga-tracker",
    version: "1.2.3",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "light",
    newArchEnabled: false,
    plugins: [
      "expo-location",
      "expo-task-manager"
    ],
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#FF3FA4"
    },
    ios: {
      supportsTablet: true,
      infoPlist: {
        UIBackgroundModes: ["location"],
        NSLocationWhenInUseUsageDescription:
          "Necesitamos tu ubicación para mostrar la posición de la charanga en el mapa mientras usas la app.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Necesitamos tu ubicación también en segundo plano para seguir emitiendo la posición de la charanga aunque bloquees el móvil.",
      },
    },
    android: {
      package: "com.carlos.charangatracker",
      versionCode: 3,
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#FF3FA4",
      },
      permissions: [
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.FOREGROUND_SERVICE",
        "android.permission.FOREGROUND_SERVICE_LOCATION",
      ],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    extra: {
      firebaseApiKey: process.env.FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.FIREBASE_APP_ID,
      easProjectId: process.env.EAS_PROJECT_ID,
      eas: {
        projectId: process.env.EAS_PROJECT_ID,
      },
    },
  },
};
