import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { insforge } from "../lib/insforge";
import { getProfile, upsertProfile } from "../lib/api";
import {
  clearAuthSession,
  hasAuthorizationHeader,
  restoreAuthSession,
  saveAuthSession,
} from "../lib/authSession";

const AuthContext = createContext(null);

const extractUser = (data) => {
  if (data?.user?.id) return data.user;
  if (data?.id) return data;
  return null;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    setLoading(true);
    restoreAuthSession();
    const { data } = await insforge.auth.getCurrentUser();
    const currentUser = extractUser(data);
    setUser(currentUser);

    if (currentUser?.id) {
      let currentProfile = await getProfile(currentUser.id);
      if (!currentProfile && currentUser.email) {
        await upsertProfile(currentUser);
        currentProfile = await getProfile(currentUser.id);
      }
      setProfile(currentProfile);
    } else {
      setProfile(null);
      clearAuthSession();
    }

    setLoading(false);
    return currentUser;
  };

  useEffect(() => {
    refreshUser().catch(() => setLoading(false));
  }, []);

  const signUp = async ({ email, password, name }) => {
    const { data, error } = await insforge.auth.signUp({
      email,
      password,
      name,
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw new Error(error.message);
    saveAuthSession(data);
    const signedUpUser = extractUser(data);
    if (signedUpUser?.id) {
      await upsertProfile({ ...signedUpUser, email, name });
    }
    await refreshUser();
    return data;
  };

  const login = async ({ email, password }) => {
    const { data, error } = await insforge.auth.signInWithPassword({ email, password });
    if (error) throw new Error(error.message);
    if (!saveAuthSession(data) || !hasAuthorizationHeader()) {
      throw new Error("Login succeeded, but no JWT was returned for protected requests.");
    }
    return refreshUser();
  };

  const logout = async () => {
    await insforge.auth.signOut();
    clearAuthSession();
    setUser(null);
    setProfile(null);
  };

  const value = useMemo(
    () => ({ user, profile, loading, signUp, login, logout, refreshUser, setProfile }),
    [user, profile, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
