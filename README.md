# 🎺 Sigue la Charanga

Aplicación móvil en **React Native (Expo)** para seguir en tiempo real la ubicación de una charanga durante fiestas y eventos. Un dispositivo actúa como **emisor** (acompaña a la charanga) y el resto como **receptores**, que visualizan su posición en el mapa en tiempo real.

Diseñada para funcionar de forma fiable durante eventos de hasta 4 horas, con emisión en segundo plano, tolerancia a fallos de red, y protección frente a condiciones de carrera en el GPS.

---

## ✨ Características

- 🎺 **Modo Emisor** — emite la ubicación GPS en tiempo real, incluso con la pantalla bloqueada
- 🗺️ **Modo Receptor** — visualiza la posición de la charanga y su rastro en el mapa
- 🧭 **Buscar eventos cercanos** — detecta eventos activos en un radio de 3 km usando geohash
- 🔍 **Buscar por nombre** — conéctate a un evento concreto escribiendo su nombre exacto
- ⏸️ **Pausar / reanudar** — el emisor puede pausar la emisión sin finalizar el evento
- 🎯 **Seguimiento automático del mapa** — el mapa sigue al marcador de la charanga, con botón para recentrar si el usuario lo ha movido manualmente
- 🔒 **Control de versión mínima** — versiones obsoletas se bloquean con pantalla de actualización, configurable en tiempo real desde Firestore
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
4. Acepta los permisos de ubicación — si aceptas *"Ubicación siempre"*, la app emitirá aunque la pantalla esté bloqueada. **Evita "Solo una vez"**: ese permiso expira al salir de la app y bloqueará la creación del evento en la siguiente sesión
5. Usa **⏸ Pausar emisión** / **▶ Reanudar emisión** para controlar la emisión sin finalizar el evento
6. Cuando termines, pulsa **🏁 Finalizar evento**

### Modo Receptor
1. Selecciona la pestaña **Receptor**
2. Escribe el nombre exacto del evento y pulsa **Conectar**, o usa **🧭 Buscar eventos cercanos** para ver los activos en un radio de 3 km
3. Si hay varios eventos con el mismo nombre, aparecerá una lista para elegir. Solo se muestran eventos activos (`live` o `paused`) — los finalizados se filtran aunque hubiera un resultado en caché
4. Una vez conectado, verás la posición de la charanga en el mapa y el rastro del recorrido
5. El mapa sigue automáticamente al marcador. Si lo mueves manualmente, aparece el botón **🎯 Recentrar** para volver a centrarlo
6. El punto azul indica tu propia posición
7. Para dejar de seguir, pulsa **✋ Dejar de seguir**

---

## 📁 Estructura del proyecto

```
├── App.tsx                        # Componente raíz: orquesta hooks y renderiza los paneles
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
│   ├── components/
│   │   ├── AboutModal.tsx         # Modal de información y créditos
│   │   ├── EmitterPanel.tsx       # Panel de crear / pausar / finalizar evento
│   │   ├── EventMap.tsx           # Mapa con marcador, polyline y botón recentrar
│   │   ├── ReceiverPanel.tsx      # Panel de búsqueda y seguimiento de evento
│   │   └── UpdateRequired.tsx     # Pantalla de bloqueo por versión obsoleta
│   ├── hooks/
│   │   ├── useAuthAnonymous.ts    # Login anónimo + estado authReady
│   │   ├── useEventPositions.ts   # Listener del historial de posiciones (últimos 300 pts)
│   │   ├── useEventSubscription.ts# Listener en tiempo real del documento de evento
│   │   ├── useEmitter.ts          # Lógica completa de creación y emisión
│   │   ├── useLocationPermission.ts  # Gestión de permisos FG/BG con caché
│   │   ├── useMinVersion.ts       # Comprueba versión mínima requerida contra Firestore
│   │   ├── useNearbyEvents.ts     # Búsqueda por geohash en radio de 3 km
│   │   └── useReceiver.ts         # Búsqueda por nombre y seguimiento de evento
│   └── location/
│       └── savePositionPoint.ts   # Lógica compartida BG/FG: throttle, filtros y escritura GPS
```

---

## 🔒 Seguridad

El proyecto incluye `firestore.rules` con las siguientes protecciones:

- **Leer** `config/app`: cualquiera (incluido no autenticado) — necesario para la comprobación de versión mínima antes del login
- **Escribir** `config/app`: bloqueado desde el cliente — solo desde la consola de Firebase
- **Leer** eventos y posiciones: cualquier usuario autenticado (anónimo incluido)
- **Crear** evento: usuario autenticado, con `ownerUid` igual a su propio UID
- **Actualizar / borrar** evento: solo el propietario del evento
- **Escribir** posiciones: solo el propietario del evento padre
- **Modificar o borrar** posiciones: bloqueado desde el cliente

Para aplicar las rules, copia el contenido de `firestore.rules` en **Firebase Console → Firestore → Rules**.

> El `ownerUid` se asigna automáticamente al crear el evento usando el UID del usuario anónimo. Esto garantiza que cada evento solo puede ser modificado desde el dispositivo que lo creó.

---

## 🔄 Control de versión mínima

La app comprueba al arrancar si su versión es suficiente leyendo el documento `config/app` de Firestore. Si no lo es, muestra una pantalla de bloqueo con un enlace a las stores.

### Configurar la versión mínima

Crea o edita el documento en **Firebase Console → Firestore → config → app**:

```
Campo: minVersion (string)
Valor: "1.3.0"   ← versión más antigua permitida
```

Para bloquear versiones antiguas en caso de un bug crítico, basta con subir ese valor desde la consola — sin publicar nada. El efecto es inmediato para todos los usuarios.

**Comportamiento por casos:**

| Situación | Resultado |
|---|---|
| `APP_VERSION >= minVersion` | App funciona con normalidad |
| `APP_VERSION < minVersion` | Pantalla de bloqueo con enlace a la store |
| Documento `config/app` no existe | Se deja pasar (entorno de desarrollo sin configurar) |
| Error de red al leer `config/app` | Se deja pasar (mejor experiencia degradada que bloquear por conectividad) |

> Recuerda actualizar las URLs de las stores en `src/components/UpdateRequired.tsx` antes de publicar la app.

---

## ⚙️ Detalles técnicos

### Throttle de escrituras GPS

La cadencia está optimizada para minimizar escrituras manteniendo precisión tanto a pie como en vehículo:

| Parámetro | Valor | Descripción |
|---|---|---|
| `timeInterval` | 10s | Frecuencia de muestreo del GPS |
| `MIN_MS` | 15s | Cadencia mínima entre puntos del historial |
| `MIN_KM` | 10m | Desplazamiento mínimo para guardar punto |
| `MAX_ACCURACY_M` | 50m | Precisión mínima aceptable para el historial |
| `MAX_SPEED_KMH` | 200 km/h | Velocidad máxima considerada real — descarta saltos GPS erróneos |

Resultado: **~4 escrituras/min** máximo por evento activo (frente a ~12 sin throttle).

### Emisión en segundo plano

- Usa `expo-task-manager` con `foregroundService` en Android (notificación persistente)
- Fallback automático a foreground watch si el permiso de background es denegado
- **`emitSessionId`**: ID único por sesión generado al hacer Start. El BG task compara el sessionId al inicio y al final de cada callback — si cambió (Stop+Start rápido), descarta el write
- **`sessionStartedAt`**: timestamp de inicio de sesión. El BG task descarta localizaciones con timestamp anterior al inicio, evitando que el SO entregue puntos en caché de una sesión anterior
- Ambos mecanismos juntos hacen el sistema **a prueba de condiciones de carrera**
- **`currentIdRef` en `useEventSubscription`**: snapshots en vuelo de suscripciones anteriores son descartados si el eventId ya no coincide con el activo

### Polyline e historial de posiciones

- El listener carga los **últimos 300 puntos** para pintar el rastro visual (~75 min a cadencia de 15s)
- La query usa `orderBy("ts", "desc") + limit(300)` para obtener siempre los puntos más recientes. Los puntos se re-ordenan a ascendente en cliente para dibujar la polyline cronológicamente. **No cambiar el `orderBy` a `asc`**: con `limit`, eso devolvería los puntos más antiguos en lugar de los más recientes, rompiendo el rastro visible de forma silenciosa
- El **historial completo** se conserva en Firestore sin límite — disponible para consulta futura

### Seguimiento del mapa

- El mapa usa `initialRegion` (no `region`) para no competir con los gestos del usuario
- Cada vez que llega una nueva posición, `animateToRegion` centra el mapa suavemente — salvo que el usuario lo haya movido manualmente
- `onRegionChangeComplete` detecta gestos del usuario y activa el botón **🎯 Recentrar**, que vuelve a centrar el mapa y reactiva el seguimiento automático

### Reintento de autenticación

- Si Firebase Auth falla al arrancar (sin red), el modo Emisor muestra el botón **🔄 Reintentar conexión** en lugar de quedar bloqueado indefinidamente
- El reintento es manual: el usuario pulsa el botón cuando recupera la conexión

### Android — builds de producción

- `StatusBar` explícito con `translucent={false}` para garantizar visibilidad de la barra de estado nativa
- Altura del modal calculada con `useWindowDimensions` para scroll correcto en todos los dispositivos y versiones de Android

### Compatibilidad con tema oscuro

- Todos los estilos de texto tienen `color: "#111"` explícito para evitar que hereden el color del tema del sistema
- Sin esto, en dispositivos con tema oscuro activado el texto blanco sería invisible sobre el fondo blanco de la app

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
