"use client";

import {
  EmailAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  updatePassword,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { KeyRound, LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { AuthBar } from "@/components/AuthBar";
import { useAuth } from "@/components/AuthProvider";
import { createGoogleProvider, getFirebaseDb } from "@/lib/firebase";

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [linkedPasswordNow, setLinkedPasswordNow] = useState(false);
  const [profileExtra, setProfileExtra] = useState<{
    firstName?: string | null;
    lastName?: string | null;
    mobileNumber?: string | null;
  } | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/signin");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    const db = getFirebaseDb();
    if (!db) return;
    let active = true;
    void getDoc(doc(db, "users", user.uid))
      .then((snap) => {
        if (!active || !snap.exists()) return;
        const data = snap.data() as {
          firstName?: string | null;
          lastName?: string | null;
          mobileNumber?: string | null;
        };
        setProfileExtra({
          firstName: data.firstName ?? null,
          lastName: data.lastName ?? null,
          mobileNumber: data.mobileNumber ?? null,
        });
      })
      .catch(() => {
        // Non-blocking profile metadata fetch
      });
    return () => {
      active = false;
    };
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#07080A] text-[#F5F6F8]">
        <p className="font-mono-tabular text-[12px] text-[#7D8CA3]">
          LOADING PROFILE…
        </p>
      </div>
    );
  }

  const displayName = user.displayName || user.email?.split("@")[0] || "Account";
  const initials = displayName.slice(0, 2).toUpperCase();
  const hasPasswordProvider =
    linkedPasswordNow || user.providerData.some((p) => p.providerId === "password");
  const provider = hasPasswordProvider
    ? user.providerData.some((p) => p.providerId === "google.com")
      ? "Google OAuth + Password"
      : "Email & Password"
    : user.providerData[0]?.providerId === "google.com"
      ? "Google OAuth"
      : "Authenticated";

  async function handleSetPasswordForOAuth(e: FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    setPwError(null);
    setPwSuccess(null);

    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("Passwords do not match.");
      return;
    }

    setPwBusy(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, newPassword);
      try {
        await linkWithCredential(user, credential);
      } catch (linkErr) {
        const linkCode = (linkErr as { code?: string })?.code ?? "";
        if (linkCode === "auth/requires-recent-login") {
          await reauthenticateWithPopup(user, createGoogleProvider());
          await linkWithCredential(user, credential);
        } else {
          throw linkErr;
        }
      }
      await user.reload();
      setLinkedPasswordNow(true);
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess("Password set! You can now sign in with email & password or change it here.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not set password.";
      setPwError(msg.replace(/^Firebase:\s*/i, ""));
    } finally {
      setPwBusy(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    if (!user || !user.email) return;
    setPwError(null);
    setPwSuccess(null);

    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match.");
      return;
    }

    setPwBusy(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
      await updatePassword(user, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwSuccess("Password updated successfully.");
    } catch (err) {
      const code = (err as { code?: string })?.code ?? "";
      if (code === "auth/wrong-password" || code === "auth/invalid-credential") {
        setPwError("Current password is incorrect.");
      } else {
        const msg = err instanceof Error ? err.message : "Could not update password.";
        setPwError(msg.replace(/^Firebase:\s*/i, ""));
      }
    } finally {
      setPwBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#07080A] text-[#F5F6F8]">
      <header className="h-16 border-b border-[#1E222A] px-8 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3 no-underline">
            <span className="flex h-7 w-7 items-center justify-center bg-[#D4AF6A] text-[#07080A] rounded-none">
              <span className="font-display text-[19px] leading-none font-medium">H</span>
            </span>
            <span className="font-display text-[24px] leading-none text-[#F5F6F8]">
              Hectic
            </span>
          </Link>
          <Link
            href="/audit"
            className="font-mono-tabular text-[12px] text-[#D4AF6A] hover:text-[#F5F6F8] no-underline transition-colors"
          >
            My Audits
          </Link>
          <Link
            href="/workspaces/clean"
            className="font-mono-tabular text-[12px] text-[#9CA3AF] hover:text-[#F5F6F8] no-underline transition-colors"
          >
            Sample Demo
          </Link>
        </div>
        <AuthBar />
      </header>

      <main className="flex-1 mx-auto w-full max-w-[760px] px-6 py-14 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#0E1014] border border-[#1E222A] rounded-none"
        >
          {/* Identity Header */}
          <div className="p-8 border-b border-[#1E222A] flex flex-wrap items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={displayName}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 object-cover rounded-[2px] border border-[#262B35]"
                />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center bg-[#D4AF6A] text-[#07080A] font-display text-[26px] rounded-[2px]">
                  {initials}
                </span>
              )}
              <div>
                <p className="font-mono-tabular text-[11px] uppercase tracking-[0.1em] text-[#7D8CA3]">
                  USER PROFILE
                </p>
                <h1 className="mt-1 font-display text-[32px] leading-[1.08] text-[#F5F6F8]">
                  {displayName}
                </h1>
                {user.email && (
                  <p className="mt-1 font-mono-tabular text-[12px] text-[#9CA3AF]">
                    {user.email}
                  </p>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={async () => {
                await signOut();
                router.push("/");
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2A1215] border border-[#4C1D24] text-[#EF4444] text-[12px] font-medium rounded-[2px] hover:bg-[#3A181C] cursor-pointer transition-colors"
            >
              <LogOut size={14} />
              Sign out
            </button>
          </div>

          {/* Account Ledger */}
          <dl className="divide-y divide-[#1E222A] text-[13px]">
            {profileExtra?.firstName && (
              <div className="px-8 py-4 flex items-center justify-between gap-4">
                <dt className="text-[#9CA3AF]">First Name</dt>
                <dd className="text-[#F5F6F8]">{profileExtra.firstName}</dd>
              </div>
            )}
            {profileExtra?.lastName && (
              <div className="px-8 py-4 flex items-center justify-between gap-4">
                <dt className="text-[#9CA3AF]">Last Name</dt>
                <dd className="text-[#F5F6F8]">{profileExtra.lastName}</dd>
              </div>
            )}
            {profileExtra?.mobileNumber && (
              <div className="px-8 py-4 flex items-center justify-between gap-4">
                <dt className="text-[#9CA3AF]">Mobile Number</dt>
                <dd className="font-mono-tabular text-[#F5F6F8]">{profileExtra.mobileNumber}</dd>
              </div>
            )}
            <div className="px-8 py-4 flex items-center justify-between gap-4">
              <dt className="text-[#9CA3AF]">Provider</dt>
              <dd className="font-mono-tabular text-[#F5F6F8]">{provider}</dd>
            </div>
            <div className="px-8 py-4 flex items-center justify-between gap-4">
              <dt className="text-[#9CA3AF]">Email Verification</dt>
              <dd
                className={`font-mono-tabular ${
                  user.emailVerified ? "text-[#10B981]" : "text-[#F59E0B]"
                }`}
              >
                {user.emailVerified ? "VERIFIED" : "UNVERIFIED"}
              </dd>
            </div>
            <div className="px-8 py-4 flex items-center justify-between gap-4">
              <dt className="text-[#9CA3AF]">User ID (UID)</dt>
              <dd className="font-mono-tabular text-[#9CA3AF] truncate max-w-[320px]">
                {user.uid}
              </dd>
            </div>
            <div className="px-8 py-4 flex items-center justify-between gap-4">
              <dt className="text-[#9CA3AF]">Account Created</dt>
              <dd className="font-mono-tabular text-[#9CA3AF]">
                {user.metadata.creationTime ?? "—"}
              </dd>
            </div>
            <div className="px-8 py-4 flex items-center justify-between gap-4">
              <dt className="text-[#9CA3AF]">Last Sign-In</dt>
              <dd className="font-mono-tabular text-[#9CA3AF]">
                {user.metadata.lastSignInTime ?? "—"}
              </dd>
            </div>
          </dl>
        </motion.div>

        {/* Change Password Section */}
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, delay: 0.05, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#0E1014] border border-[#1E222A] rounded-none"
        >
          <div className="px-8 py-5 border-b border-[#1E222A] flex items-center gap-2.5">
            <KeyRound size={15} className="text-[#D4AF6A]" />
            <h2 className="font-mono-tabular text-[11px] uppercase tracking-[0.1em] text-[#F5F6F8]">
              CHANGE PASSWORD
            </h2>
          </div>

          {hasPasswordProvider ? (
            <form onSubmit={(e) => void handleChangePassword(e)} className="p-8 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label
                    htmlFor="current-password"
                    className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[#9CA3AF] mb-1.5"
                  >
                    Current Password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2 bg-[#07080A] border border-[#262B35] rounded-[2px] text-[13px] text-[#F5F6F8] focus:border-[#D4AF6A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="new-password"
                    className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[#9CA3AF] mb-1.5"
                  >
                    New Password
                  </label>
                  <input
                    id="new-password"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    className="w-full px-3.5 py-2 bg-[#07080A] border border-[#262B35] rounded-[2px] text-[13px] text-[#F5F6F8] focus:border-[#D4AF6A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirm-password"
                    className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[#9CA3AF] mb-1.5"
                  >
                    Confirm New
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2 bg-[#07080A] border border-[#262B35] rounded-[2px] text-[13px] text-[#F5F6F8] focus:border-[#D4AF6A] focus:outline-none"
                  />
                </div>
              </div>

              {pwError && (
                <div
                  role="alert"
                  className="px-3.5 py-2.5 bg-[#2A1215] border border-[#4C1D24] text-[#EF4444] font-mono-tabular text-[11px]"
                >
                  {pwError}
                </div>
              )}

              {pwSuccess && (
                <div
                  role="status"
                  className="px-3.5 py-2.5 bg-[#0F1D19] border border-[#183D31] text-[#10B981] font-mono-tabular text-[11px]"
                >
                  {pwSuccess}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="px-5 py-2 bg-[#D4AF6A] text-[#07080A] text-[12px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
                >
                  {pwBusy ? "Updating…" : "Update Password"}
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={(e) => void handleSetPasswordForOAuth(e)} className="p-8 space-y-4">
              <p className="text-[13px] text-[#9CA3AF]">
                This account was created with Google OAuth. Set an account password below to also
                sign in with your email and password.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="oauth-new-password"
                    className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[#9CA3AF] mb-1.5"
                  >
                    New Password
                  </label>
                  <input
                    id="oauth-new-password"
                    type="password"
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Min. 6 chars"
                    className="w-full px-3.5 py-2 bg-[#07080A] border border-[#262B35] rounded-[2px] text-[13px] text-[#F5F6F8] focus:border-[#D4AF6A] focus:outline-none"
                  />
                </div>
                <div>
                  <label
                    htmlFor="oauth-confirm-password"
                    className="block font-mono-tabular text-[11px] uppercase tracking-[0.06em] text-[#9CA3AF] mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="oauth-confirm-password"
                    type="password"
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full px-3.5 py-2 bg-[#07080A] border border-[#262B35] rounded-[2px] text-[13px] text-[#F5F6F8] focus:border-[#D4AF6A] focus:outline-none"
                  />
                </div>
              </div>

              {pwError && (
                <div
                  role="alert"
                  className="px-3.5 py-2.5 bg-[#2A1215] border border-[#4C1D24] text-[#EF4444] font-mono-tabular text-[11px]"
                >
                  {pwError}
                </div>
              )}

              {pwSuccess && (
                <div
                  role="status"
                  className="px-3.5 py-2.5 bg-[#0F1D19] border border-[#183D31] text-[#10B981] font-mono-tabular text-[11px]"
                >
                  {pwSuccess}
                </div>
              )}

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={pwBusy}
                  className="px-5 py-2 bg-[#D4AF6A] text-[#07080A] text-[12px] font-medium rounded-[2px] hover:opacity-90 cursor-pointer disabled:opacity-50 transition-opacity"
                >
                  {pwBusy ? "Saving…" : "Set Account Password"}
                </button>
              </div>
            </form>
          )}
        </motion.section>
      </main>
    </div>
  );
}
