import { useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { APP_VERSION } from "../version";

type Status = "checking" | "ok" | "outdated" | "error";

/** Compara versiones semver simples (MAJOR.MINOR.PATCH). */
function isVersionAtLeast(current: string, minimum: string): boolean {
  const toparts = (v: string) => v.split(".").map((n) => parseInt(n, 10) || 0);
  const [cMaj, cMin, cPat] = toparts(current);
  const [mMaj, mMin, mPat] = toparts(minimum);
  if (cMaj !== mMaj) return cMaj > mMaj;
  if (cMin !== mMin) return cMin > mMin;
  return cPat >= mPat;
}

export function useMinVersion() {
  const [status, setStatus] = useState<Status>("checking");
  const [minVersion, setMinVersion] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const snap = await getDoc(doc(db, "config", "app"));
        if (cancelled) return;

        if (!snap.exists()) {
          // Si el documento no existe aún, dejamos pasar: entorno de desarrollo
          // o primera puesta en marcha sin configurar minVersion todavía.
          setStatus("ok");
          return;
        }

        const min: string = snap.data()?.minVersion ?? "0.0.0";
        setMinVersion(min);
        setStatus(isVersionAtLeast(APP_VERSION, min) ? "ok" : "outdated");
      } catch (e) {
        if (cancelled) return;
        console.error("[useMinVersion] Error leyendo config/app:", e);
        // En caso de error de red dejamos pasar: mejor experiencia degradada
        // que bloquear a todos los usuarios por un problema de conectividad.
        setStatus("error");
      }
    })();

    return () => { cancelled = true; };
  }, []);

  return { status, minVersion };
}
