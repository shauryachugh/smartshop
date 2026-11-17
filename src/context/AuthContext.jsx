import React, { createContext, useContext, useState, useEffect } from 'react';
import { authService } from '../services/authService';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load active session and subscribe to auth changes
  useEffect(() => {
    let mounted = true;

    async function initAuth() {
      try {
        const initialSession = await authService.getSession();
        if (mounted && initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          const userProfile = await authService.getProfile(initialSession.user.id);
          if (mounted) setProfile(userProfile);
        }
      } catch (err) {
        console.warn('Auth initialization check:', err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    initAuth();

    // Listen to Supabase auth events (SIGNED_IN, SIGNED_OUT, TOKEN_REFRESHED)
    const { data: { subscription } } = authService.onAuthStateChange(
      async (event, currentSession) => {
        if (!mounted) return;

        setSession(currentSession);
        const currentUser = currentSession?.user || null;
        setUser(currentUser);

        if (currentUser) {
          const p = await authService.getProfile(currentUser.id);
          if (mounted) setProfile(p);
        } else {
          setProfile(null);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  const signUp = async (credentials) => {
    return await authService.signUp(credentials);
  };

  const signIn = async (credentials) => {
    return await authService.signIn(credentials);
  };

  const signOut = async () => {
    const res = await authService.signOut();
    setUser(null);
    setProfile(null);
    setSession(null);
    return res;
  };

  const resetPassword = async (email) => {
    return await authService.resetPasswordForEmail(email);
  };

  const updateProfile = async (updates) => {
    if (!user) return { success: false, error: 'No authenticated user' };
    const res = await authService.updateProfile(user.id, updates);
    if (res.success && res.data) {
      setProfile(res.data);
    }
    return res;
  };

  const value = {
    user,
    profile,
    session,
    loading,
    isAuthenticated: Boolean(user),
    signUp,
    signIn,
    signOut,
    resetPassword,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
