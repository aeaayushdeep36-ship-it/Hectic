"use client";

import {
  createUserWithEmailAndPassword,
  deleteUser,
  fetchSignInMethodsForEmail,
  getAdditionalUserInfo,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useAuth } from "@/components/AuthProvider";
import { HecticLogo } from "@/components/HecticLogo";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  validateMobileNumber,
  validatePasswordMatch,
  validatePersonName,
} from "@/lib/account-validation";
import { validateEmail } from "@/lib/email-validation";
import { createGoogleProvider, getFirebaseAuth, getFirebaseDb } from "@/lib/firebase";

export default function SignInPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Default to creating an account first: users cannot sign in with email/password
  // until an account has been created.
  const [mode, setMode] = useState<"signup" | "signin">("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const checkingGoogleRef = useRef(false);

  useEffect(() => {
    if (!loading && user && !checkingGoogleRef.current) {
      router.replace("/audit");
    }
  }, [loading, user, router]);

  async function handleGoogle() {
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase authentication is not configured.");
      return;
    }
    setBusy(true);
    setError(null);
    setNotice(null);
    checkingGoogleRef.current = true;
    try {
      const cred = await signInWithPopup(auth, createGoogleProvider());
      const info = getAdditionalUserInfo(cred);
      if (info?.isNewUser) {
        try {
          await deleteUser(cred.user);
        } catch {
          await signOut(auth);
        }
        checkingGoogleRef.current = false;
        setError(
          "No account found for this Google email. Please create an account first before signing in with Google.",
        );
        setBusy(false);
        return;
      }
      checkingGoogleRef.current = false;
      router.push("/audit");
    } catch (err) {
      checkingGoogleRef.current = false;
      const msg = err instanceof Error ? err.message : "Google sign-in failed.";
      setError(msg.replace(/^Firebase:\s*/i, ""));
      setBusy(false);
    }
  }

  async function handleEmail(e: FormEvent) {
    e.preventDefault();
    const auth = getFirebaseAuth();
    if (!auth) {
      setError("Firebase authentication is not configured.");
      return;
    }

    if (mode === "signup") {
      const firstCheck = validatePersonName(firstName, "First name");
      if (!firstCheck.ok) {
        setError(firstCheck.reason ?? "Please enter your first name.");
        return;
      }
      const lastCheck = validatePersonName(lastName, "Last name");
      if (!lastCheck.ok) {
        setError(lastCheck.reason ?? "Please enter your last name.");
        return;
      }
      const mobileCheck = validateMobileNumber(mobileNumber);
      if (!mobileCheck.ok) {
        setError(mobileCheck.reason ?? "Please enter a valid mobile number.");
        return;
      }
    }

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setError(emailCheck.reason ?? "Invalid email address.");
      return;
    }

    if (mode === "signup") {
      const passwordCheck = validatePasswordMatch(password, confirmPassword);
      if (!passwordCheck.ok) {
        setError(passwordCheck.reason ?? "Passwords do not match.");
        return;
      }
    }

    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (mode === "signup") {
        const cleanFirst = firstName.trim();
        const cleanLast = lastName.trim();
        const cleanMobile = mobileNumber.trim();
        const fullName = `${cleanFirst} ${cleanLast}`;
        const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
        try {
          await updateProfile(cred.user, { displayName: fullName });
        } catch {
          // Non-blocking profile displayName update
        }
        try {
          const db = getFirebaseDb();
          if (db) {
            const now = Date.now();
            await setDoc(
              doc(db, "users", cred.user.uid),
              {
                uid: cred.user.uid,
                email: email.trim(),
                displayName: fullName,
                firstName: cleanFirst,
                lastName: cleanLast,
                mobileNumber: cleanMobile,
                createdAt: now,
                updatedAt: now,
              },
              { merge: true },
            );
          }
        } catch {
          // Non-blocking Firestore profile write
        }
        try {
          await sendEmailVerification(cred.user);
        } catch {
          // Non-blocking verification email
        }
        router.push("/audit");
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
        router.push("/audit");
      }
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/email-already-in-use") {
        setError("An account with this email already exists. Switch to Sign In and enter your password.");
      } else if (code === "auth/user-not-found") {
        setError("No account found for this email. Please create an account first before signing in.");
      } else if (code === "auth/wrong-password") {
        setError("Incorrect password for this email account. Please check your password and try again.");
      } else if (code === "auth/invalid-credential") {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, email.trim());
          if (methods.length === 0) {
            setError("No account found for this email. Please create an account first before signing in.");
          } else if (!methods.includes("password") && methods.includes("google.com")) {
            setError("This email is registered with Google Sign-In. Please continue with Google.");
          } else {
            setError("Incorrect password for this email account. Please check your password and try again.");
          }
        } catch {
          setError("Incorrect email or password. If you have not registered yet, please create an account first.");
        }
      } else if (code === "auth/weak-password") {
        setError("Password must be at least 6 characters.");
      } else if (code === "auth/too-many-requests") {
        setError("Too many failed attempts. Please wait a moment and try again.");
      } else {
        const msg = err instanceof Error ? err.message : "Authentication failed.";
        setError(msg.replace(/^Firebase:\s*/i, ""));
      }
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--ink-primary)]">
      <header className="h-16 border-b border-[var(--border-hair)] px-8 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 no-underline">
          <HecticLogo size={28} />
          <span className="font-display text-[24px] leading-none text-[var(--ink-primary)]">
            Hectic
          </span>
        </Link>
        <div className="flex items-center gap-4">
          <ThemeToggle />
          <Link
            href="/"
            className="font-mono-tabular text-[12px] text-[var(--ink-secondary)] hover:text-[var(--ink-primary)] no-underline transition-colors"
          >
            ← Back
          </Link>
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-[440px] bg-[var(--bg-surface)] border border-[var(--border-hair)] rounded-none"
        >
          <div className="px-8 pt-8 pb-6 border-b border-[var(--border-hair)]">
            <p className="font-mono-tabular text-[11px] uppercase tracking-[0.12em] text-[var(--ink-muted)] mb-2">
              {mode === "signup" ? "STEP 1 · CREATE ACCOUNT" : "REGISTERED ACCESS"}
            </p>
            <h1 className="font-display text-[32px] leading-[1.08] text-[var(--ink-primary)]">
              {mode === "signup" ? "Create your Hectic account" : "Sign in to Hectic"}
            </h1>
            <p className="mt-2 text-[12px] text-[var(--ink-secondary)]">
              {mode === "signup"
                ? "Create an account with your name, mobile number, permanent email, and password."
                : "Sign in with your registered email and password, or continue with Google."}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 border-b border-[var(--border-hair)]">
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError(null);
              }}
              className={`py-3 font-mono-tabular text-[11px] uppercase tracking-[0.08em] cursor-pointer transition-colors ${
                mode === "signup"
                  ? "bg-[var(--bg-elevated)] text-[var(--accent-text)] border-b border-[var(--accent-graphic)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setError(null);
              }}
              className={`py-3 font-mono-tabular text-[11px] uppercase tracking-[0.08em] cursor-pointer transition-colors border-l border-[var(--border-hair)] ${
                mode === "signin"
                  ? "bg-[var(--bg-elevated)] text-[var(--accent-text)] border-b border-[var(--accent-graphic)]"
                  : "text-[var(--ink-muted)] hover:text-[var(--ink-primary)]"
              }`}
            >
              Sign In
            </button>
          </div>

          <div className="p-8 space-y-6">
            {mode === "signin" && (
              <>
                {/* Multicoloured Google Sign-In Bar (Sign In only, registered accounts only) */}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void handleGoogle()}
                  className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-[#FFFFFF] text-[#0F172A] border border-[var(--border-elevated)] text-[13px] font-medium rounded-[2px] hover:bg-[#F3F4F6] cursor-pointer disabled:opacity-50 transition-colors"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
                    />
                  </svg>
                  <span>Sign in with Google</span>
                </button>

                <div className="flex items-center gap-3">
                  <div className="h-[1px] flex-1 bg-[var(--border-hair)]" />
                  <span className="font-mono-tabular text-[11px] uppercase text-[var(--ink-muted)]">
                    OR EMAIL &amp; PASSWORD
                  </span>
                  <div className="h-[1px] flex-1 bg-[var(--border-hair)]" />
                </div>
              </>
            )}

            <form onSubmit={(e) => void handleEmail(e)} className="space-y-4">
              {mode === "signup" && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="signup-first-name"
                        className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[var(--ink-secondary)] mb-1.5"
                      >
                        First Name
                      </label>
                      <input
                        id="signup-first-name"
                        type="text"
                        required
                        maxLength={80}
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="Ada"
                        className="w-full px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="signup-last-name"
                        className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[var(--ink-secondary)] mb-1.5"
                      >
                        Last Name
                      </label>
                      <input
                        id="signup-last-name"
                        type="text"
                        required
                        maxLength={80}
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Lovelace"
                        className="w-full px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="signup-mobile"
                      className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[var(--ink-secondary)] mb-1.5"
                    >
                      Mobile Number
                    </label>
                    <input
                      id="signup-mobile"
                      type="tel"
                      required
                      maxLength={32}
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      placeholder="+1 555 234 5678"
                      className="w-full px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="signin-email"
                  className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[var(--ink-secondary)] mb-1.5"
                >
                  Permanent Email Address
                </label>
                <input
                  id="signin-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="founder@company.com"
                  className="w-full px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                />
                <p className="mt-1 font-mono-tabular text-[10px] text-[var(--ink-muted)]">
                  Temporary / disposable mail domains are blocked. One password per email account.
                </p>
              </div>

              <div>
                <label
                  htmlFor="signin-password"
                  className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[var(--ink-secondary)] mb-1.5"
                >
                  Password
                </label>
                <input
                  id="signin-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                />
              </div>

              {mode === "signup" && (
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[var(--ink-secondary)] mb-1.5"
                  >
                    Re-enter Password
                  </label>
                  <input
                    id="signup-confirm-password"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full px-3.5 py-2 bg-[var(--bg-canvas)] border border-[var(--border-elevated)] rounded-[2px] text-[13px] text-[var(--ink-primary)] placeholder:text-[var(--ink-muted)] focus:border-[var(--accent-graphic)] focus:outline-none"
                  />
                </div>
              )}

              {error && (
                <div
                  role="alert"
                  className="px-3.5 py-2.5 bg-[var(--status-crimson-bg)] border border-[var(--status-crimson-border)] text-[var(--status-crimson)] font-mono-tabular text-[11px]"
                >
                  {error}
                </div>
              )}

              {notice && (
                <div
                  role="status"
                  className="px-3.5 py-2.5 bg-[var(--status-emerald-bg)] border border-[var(--status-emerald)] text-[var(--status-emerald)] font-mono-tabular text-[11px]"
                >
                  {notice}
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 bg-[var(--cta-bg)] text-[var(--cta-text)] text-[13px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
              >
                {busy
                  ? "Authenticating…"
                  : mode === "signup"
                    ? "Create Account & Continue"
                    : "Sign in with Email"}
              </button>
            </form>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
