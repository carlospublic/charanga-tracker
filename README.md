# 🎺 Charanga Tracker

Aplicación móvil en **React Native (Expo)** para seguir en tiempo real la ubicación de una charanga durante fiestas y eventos. Un dispositivo actúa como **emisor** (acompaña a la charanga) y el resto como **receptores**, que visualizan su posición en el mapa en tiempo real.

Diseñada para funcionar de forma fiable durante eventos de hasta 4 horas, con emisión en segundo plano, tolerancia a fallos de red, y protección frente a condiciones de carrera en el GPS.

---

## ✨ Características

- 🎺 **Modo Emisor** — emite la ubicación GPS en tiempo real, incluso con la pantalla bloqueada
- 🗺️ **Modo Receptor** — visualiza la posición de la charanga y su rastro en el mapa
- 🧭 **Buscar eventos cercanos** — detecta eventos activos en un radio de 3 km usando geohash
- 🔍 **Buscar por nombre** — conéctate a un evento concreto escribiendo su nombre exacto
- ⏸️ **Pausar / reanudar** — el emisor puede pausar la emisión sin finalizar el evento
- 🔥 **Firebase Firestore** — sincronización en tiempo real entre dispositivos
- 🔐 **Autenticación anónima** — sin registro, acceso inmediato al abrir la app
- 🛡️ **Firestore Security Rules** — solo el propietario puede modificar su evento
- ⚡ **Optimizado para eventos largos** — soporta hasta 4 horas de emisión continua
- 🔋 **Bajo consumo** — cadencia optimizada para minimizar escrituras y batería

---

## 📱 Tecnologías

| Tecnología | Versión | Uso |
|---|---|---|
| React Native | 0.81.5 | Framework principal |
| Expo | ~54.0.33 | Plataforma de desarrollo y build |
| Firebase Firestore | ^12.9.0 | Base de datos en tiempo real |
| Firebase Auth | ^12.9.0 | Autenticación anónima |
| react-native-maps | 1.20.1 | Mapa interactivo con polyline |
| expo-location | ~19.0.8 | GPS en primer y segundo plano |
| expo-task-manager | ~14.0.9 | Tarea de ubicación en segundo plano |
| expo-status-bar | ~3.0.9 | Barra de estado nativa en Android |
| expo-constants | — | Acceso a variables de entorno en runtime |
| expo-device | ~8.0.10 | Información del dispositivo emisor |
| geofire-common | ^6.0.0 | Consultas geoespaciales por radio |
| react-native-safe-area-context | ~5.6.0 | Adaptación a notch e insets |
| @react-native-async-storage/async-storage | ^2.2.0 | Persistencia local de estado de emisión |
| dotenv | dev | Carga de variables de entorno en desarrollo |

---

## 🚀 Instalación

```bash
# Clona el repositorio
git clone <repo-url>
cd charanga-tracker

# Instala dependencias
npm install

# Crea el archivo de variables de entorno (ver sección siguiente)
cp .env.example .env
# Edita .env y rellena los valores

# Inicia el servidor de desarrollo
npx expo start
```

Escanea el QR con **Expo Go** (Android/iOS) para probar en dispositivo físico.

---

## 🔑 Variables de entorno

Las claves de Firebase y Google Maps **no se incluyen en el repositorio**. Están en el archivo `.env` (ignorado por git).

### Configuración inicial

```bash
cp .env.example .env
```

Edita `.env` y rellena todos los valores:

```
# Firebase — Firebase Console → Configuración del proyecto → Tus apps
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=

# Google Maps — Google Cloud Console → APIs y servicios → Credenciales
GOOGLE_MAPS_API_KEY=

# Expo EAS — expo.dev → tu proyecto → Project ID
EAS_PROJECT_ID=
```

### Cómo funciona

`app.config.js` carga `.env` via `dotenv` al arrancar Metro y pasa los valores como `extra` a la app. `src/firebase.ts` los lee en runtime via `expo-constants`. Este mecanismo funciona en Expo Go, en builds de EAS y en producción.

### Variables en EAS (builds en la nube)

El archivo `.env` es local y los servidores de EAS no tienen acceso a él. Antes de hacer el primer build hay que subir las variables a EAS:

```bash
eas secret:push --scope project --env-file .env
```

Verifica que se subieron correctamente:

```bash
eas secret:list
```

> Si cambias alguna variable en `.env`, repite `eas secret:push` y lanza un nuevo build — las variables se inyectan en tiempo de compilación, el build anterior no se actualiza.

> **Nunca subas `.env` al repositorio.** El `.gitignore` ya lo excluye. Usa `.env.example` como plantilla para nuevos colaboradores. La API Key de Maps debe estar restringida en Google Cloud Console por package name (`com.carlos.charangatracker`) y SHA-1 del keystore — obtenlo con `eas credentials`.

---

## 🛠️ Uso

### Modo Emisor
1. Selecciona la pestaña **Emisor**
2. Escribe un nombre para el evento (p. ej. `Charanga San Mateo`)
3. Pulsa **🎺 Crear evento (y emitir)**
4. Acepta los permisos de ubicación — si aceptas *"Ubicación siempre"*, la app emitirá aunque la pantalla esté bloqueada
5. Usa **⏸ Pausar emisión** / **▶ Reanudar emisión** para controlar la emisión sin finalizar el evento
6. Cuando termines, pulsa **🏁 Finalizar evento**

### Modo Receptor
1. Selecciona la pestaña **Receptor**
2. Escribe el nombre exacto del evento y pulsa **Conectar**, o usa **🧭 Buscar eventos cercanos** para ver los activos en un radio de 3 km
3. Si hay varios eventos con el mismo nombre, aparecerá una lista para elegir
4. Una vez conectado, verás la posición de la charanga en el mapa y el rastro del recorrido
5. El punto azul indica tu propia posición
6. Para dejar de seguir, pulsa **✋ Dejar de seguir**

---

## 📁 Estructura del proyecto

```
├── App.tsx                        # Componente principal, UI y navegación de modos
├── index.tsx                      # Punto de entrada
├── app.config.js                  # Configuración Expo — lee variables de entorno
├── eas.json                       # Perfiles de build (development, preview, production)
├── firestore.rules                # Security Rules de Firestore
├── .env                           # Claves privadas — NO subir a git
├── .env.example                   # Plantilla de variables — sí en git
├── src/
│   ├── version.ts                 # Fuente de verdad única para la versión de la app
│   ├── firebase.ts                # Inicialización Firebase (lee claves desde app.config)
│   ├── background/
│   │   ├── constants.ts           # Claves AsyncStorage y nombre de tarea BG
│   │   ├── emissionStore.ts       # Estado persistente de emisión (eventId, sessionId, sessionStartedAt)
│   │   └── locationTask.ts        # Tarea GPS en segundo plano con validación de sesión
│   ├── hooks/
│   │   ├── useAuthAnonymous.ts    # Login anónimo + estado authReady
│   │   ├── useLocationPermission.ts  # Gestión de permisos FG/BG con caché
│   │   ├── useEventSubscription.ts   # Listener en tiempo real del documento de evento
│   │   ├── useEmitter.ts             # Lógica completa de creación y emisión
│   │   ├── useReceiver.ts            # Búsqueda por nombre y seguimiento de evento
│   │   ├── useNearbyEvents.ts        # Búsqueda por geohash en radio de 3 km
│   │   └── useEventPositions.ts      # Listener del historial de posiciones (últimos 300 pts)
│   └── location/
│       └── savePositionPoint.ts   # Lógica compartida BG/FG: throttle, filtros y escritura GPS
```

---

## 🔒 Seguridad

El proyecto incluye `firestore.rules` con las siguientes protecciones:

- **Leer** eventos y posiciones: cualquier usuario autenticado (anónimo incluido)
- **Crear** evento: usuario autenticado, con `ownerUid` igual a su propio UID
- **Actualizar / borrar** evento: solo el propietario del evento
- **Escribir** posiciones: solo el propietario del evento padre
- **Modificar o borrar** posiciones: bloqueado desde el cliente

Para aplicar las rules, copia el contenido de `firestore.rules` en **Firebase Console → Firestore → Rules**.

> El `ownerUid` se asigna automáticamente al crear el evento usando el UID del usuario anónimo. Esto garantiza que cada evento solo puede ser modificado desde el dispositivo que lo creó.

---

## ⚙️ Detalles técnicos

### Throttle de escrituras GPS

La cadencia está ajustada para el ritmo de una charanga a pie (~4-5 km/h):

| Parámetro | Valor | Descripción |
|---|---|---|
| `timeInterval` | 10s | Frecuencia de muestreo del GPS |
| `MIN_MS` | 15s | Cadencia mínima entre puntos del historial |
| `MIN_KM` | 10m | Desplazamiento mínimo para guardar punto |
| `MAX_ACCURACY_M` | 50m | Precisión mínima aceptable para el historial |
| `JUMP_KM` | 200m | Umbral anti-salto (en menos de 5s) |

Resultado: **~4 escrituras/min** máximo por evento activo (frente a ~12 sin throttle).

### Emisión en segundo plano

- Usa `expo-task-manager` con `foregroundService` en Android (notificación persistente)
- Fallback automático a foreground watch si el permiso de background es denegado
- **`emitSessionId`**: ID único por sesión generado al hacer Start. El BG task compara el sessionId al inicio y al final de cada callback — si cambió (Stop+Start rápido), descarta el write
- **`sessionStartedAt`**: timestamp de inicio de sesión. El BG task descarta localizaciones con timestamp anterior al inicio, evitando que el SO entregue puntos en caché de una sesión anterior
- Ambos mecanismos juntos hacen el sistema **a prueba de condiciones de carrera**

### Polyline y historial

- El listener carga los **últimos 300 puntos** para pintar el rastro visual (~75 min a cadencia de 15s)
- El **historial completo** se conserva en Firestore sin límite — disponible para consulta futura
- Los puntos se ordenan por `ts` ascendente en cliente para dibujar la polyline correctamente

### Android — builds de producción

- `StatusBar` explícito con `translucent={false}` para garantizar visibilidad de la barra de estado nativa
- Altura del modal calculada con `useWindowDimensions` para scroll correcto en todos los dispositivos y versiones de Android

### Costes Firestore estimados

| Escenario | Writes/hora | Plan Spark (gratuito) |
|---|---|---|
| 1 evento activo | ~240 | ✅ Muy por debajo del límite |
| 10 eventos simultáneos | ~2.400 | ✅ Dentro del límite diario |
| Límite plan Spark | — | 20.000 writes/día |

---

## 🔧 Scripts disponibles

```bash
npm start              # Servidor de desarrollo Expo
npm run android        # Abrir en emulador Android
npm run ios            # Abrir en simulador iOS (solo macOS)

eas build --profile development --platform android   # Build de desarrollo
eas build --profile preview --platform android       # APK para testers
eas build --profile production --platform android    # AAB para Google Play
```

---

## 👥 Créditos

Idea y desarrollo: **Jesús y Carlos**  
Contacto: carlos.public@gmail.com
