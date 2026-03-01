import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "../firebase";

export function useAuthAnonymous() {
  const [authReady, setAuthReady] = useState(false);
  const [authError, setAuthError] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthReady(true);
        setAuthError(false);
      } else {
        signInAnonymously(auth).catch((e) => {
          console.error("[useAuthAnonymous] signInAnonymously failed:", e);
          setAuthError(true);
        });
      }
    });
    return unsub;
  }, []);

  return { authReady, authError };
}
