import { useEffect, useState } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth } from "../firebase";

export function useAuthAnonymous() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        setAuthReady(true);
      } else {
        signInAnonymously(auth).catch(console.error);
      }
    });
    return unsub;
  }, []);

  return { authReady };
}
