"use client";

import { onAuthStateChanged, signOut as fbSignOut, type User } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { createContext, useContext, useEffect, useState } from "react";
import { getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

interface AuthContextValue {
  readonly user: User | null;
  readonly loading: boolean;
  readonly signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signOut: async () => {},
});

async function syncUserProfile(user: User): Promise<void> {
  const db = getFirebaseDb();
  if (!db) return;
  try {
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const now = Date.now();
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: user.uid,
        email: user.email ?? "",
        displayName: user.displayName ?? user.email?.split("@")[0] ?? "Founder",
        photoURL: user.photoURL ?? null,
        providerId: user.providerData[0]?.providerId ?? "password",
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await setDoc(
        ref,
        {
          email: user.email ?? "",
          displayName: user.displayName ?? user.email?.split("@")[0] ?? "Founder",
          photoURL: user.photoURL ?? null,
          updatedAt: now,
        },
        { merge: true },
      );
    }
  } catch {
    // Non-blocking profile sync
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) {
      setLoading(false);
      return;
    }
    const unsub = onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
      if (nextUser) void syncUserProfile(nextUser);
    });
    return unsub;
  }, []);

  async function signOut() {
    const auth = getFirebaseAuth();
    if (auth) await fbSignOut(auth);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
