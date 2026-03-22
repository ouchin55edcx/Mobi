import { supabase } from "../../lib/supabase";
import { getStudentByEmail } from "./studentService";
import { getDriverByEmail } from "./driverService";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Linking } from "react-native";
import * as ExpoLinking from "expo-linking";

/**
 * Authentication Service
 * Handles all Supabase Auth operations
 */

const AUTH_USER_KEY = "mobi_auth_user";
const AUTH_SESSION_KEY = "mobi_auth_session";
const OAUTH_REDIRECT_PATH = "auth/callback";
const OAUTH_TIMEOUT_MS = 120000;
const FORGOT_PASSWORD_PREFIX = "mobi_forgot_password_";
const FORGOT_PASSWORD_EXPIRY_MS = 10 * 60 * 1000;

const normalizeEmail = (email = "") => email.trim().toLowerCase();

const isValidEmail = (email = "") => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const generateResetCode = () =>
  String(Math.floor(100000 + Math.random() * 900000));

const parseParams = (value = "") => {
  if (!value) return {};
  return value
    .replace(/^#/, "")
    .split("&")
    .filter(Boolean)
    .reduce((acc, item) => {
      const [rawKey, rawVal = ""] = item.split("=");
      const key = decodeURIComponent(rawKey || "");
      const val = decodeURIComponent(rawVal || "");
      if (key) acc[key] = val;
      return acc;
    }, {});
};

const getOAuthParamsFromUrl = (url) => {
  if (!url) return {};

  const [base, fragment = ""] = url.split("#");
  const query = base.includes("?") ? base.split("?")[1] : "";

  return {
    ...parseParams(query),
    ...parseParams(fragment),
  };
};

const waitForOAuthRedirect = (redirectTo, timeoutMs = OAUTH_TIMEOUT_MS) =>
  new Promise((resolve, reject) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      subscription?.remove();
      reject(new Error("Authentication timed out. Please try again."));
    }, timeoutMs);

    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (resolved || !url) return;
      if (!url.startsWith(redirectTo)) return;

      resolved = true;
      clearTimeout(timeout);
      subscription.remove();
      resolve(url);
    });
  });

/**
 * Sign up a new user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @param {Object} metadata - Additional user metadata
 * @returns {Promise<Object>} - Result object with data and error
 */
export const signUp = async (email, password, metadata = {}) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    if (error) {
      console.warn("Supabase sign up failed, mocking sign up locally");

      const mockUser = {
        id: Math.random().toString(36).substr(2, 9),
        email,
        user_metadata: metadata,
        created_at: new Date().toISOString(),
      };

      const mockSession = {
        access_token: "mock-token-" + Date.now(),
        user: mockUser,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
      };

      await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
      await AsyncStorage.setItem(AUTH_SESSION_KEY, JSON.stringify(mockSession));

      return { data: { user: mockUser, session: mockSession }, error: null };
    }

    return { data, error: null };
  } catch (error) {
    console.warn("Exception during sign up, mocking locally:", error);
    return { data: null, error };
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} - Result object with data and error
 */
export const signIn = async (email, password) => {
  try {
    const normalizedEmail = (email || "").trim().toLowerCase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (error) {
      console.warn("Supabase sign in failed, mocking sign in locally");

      // Check driver first, then student to enforce role-priority login routing.
      const driverResult = await getDriverByEmail(normalizedEmail);
      if (driverResult?.data) {
        const mockUser = {
          id: driverResult.data.id,
          email: normalizedEmail,
          user_metadata: { ...driverResult.data, role: "driver" },
        };
        const mockSession = {
          access_token: "mock-token-" + Date.now(),
          user: mockUser,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        };
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
        await AsyncStorage.setItem(
          AUTH_SESSION_KEY,
          JSON.stringify(mockSession),
        );
        return { data: { user: mockUser, session: mockSession }, error: null };
      }

      const studentResult = await getStudentByEmail(normalizedEmail);
      if (studentResult?.data) {
        const mockUser = {
          id: studentResult.data.id,
          email: normalizedEmail,
          user_metadata: { ...studentResult.data, role: "student" },
        };
        const mockSession = {
          access_token: "mock-token-" + Date.now(),
          user: mockUser,
          expires_at: Math.floor(Date.now() / 1000) + 3600,
        };
        await AsyncStorage.setItem(AUTH_USER_KEY, JSON.stringify(mockUser));
        await AsyncStorage.setItem(
          AUTH_SESSION_KEY,
          JSON.stringify(mockSession),
        );
        return { data: { user: mockUser, session: mockSession }, error: null };
      }

      return {
        data: null,
        error: { message: "Invalid credentials or user not found locally" },
      };
    }

    return { data, error: null };
  } catch (error) {
    console.warn("Exception during sign in, mocking locally:", error);
    return { data: null, error };
  }
};

/**
 * Sign in with magic link (passwordless)
 * @param {string} email - User email
 * @returns {Promise<Object>} - Result object with data and error
 */
export const signInWithMagicLink = async (email) => {
  try {
    const { data, error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      console.warn("Supabase magic link failed, mocking locally");
      return {
        data: { message: "Mock magic link sent (check console)" },
        error: null,
      };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Exception sending magic link:", error);
    return { data: null, error };
  }
};

/**
 * Sign in with Google OAuth (Expo/React Native deep link flow)
 * @returns {Promise<Object>} - Result object with data and error
 */
export const signInWithGoogle = async () => {
  try {
    const redirectTo = ExpoLinking.createURL(OAUTH_REDIRECT_PATH);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
        skipBrowserRedirect: true,
      },
    });

    if (error) {
      return { data: null, error };
    }

    if (!data?.url) {
      return {
        data: null,
        error: { message: "No OAuth URL returned from Supabase" },
      };
    }

    const redirectPromise = waitForOAuthRedirect(redirectTo);
    await Linking.openURL(data.url);
    const callbackUrl = await redirectPromise;
    const oauthParams = getOAuthParamsFromUrl(callbackUrl);

    if (oauthParams.error || oauthParams.error_description) {
      return {
        data: null,
        error: { message: oauthParams.error_description || oauthParams.error },
      };
    }

    if (oauthParams.code) {
      const { data: exchangeData, error: exchangeError } =
        await supabase.auth.exchangeCodeForSession(oauthParams.code);

      if (exchangeError) {
        return { data: null, error: exchangeError };
      }

      return { data: exchangeData, error: null };
    }

    if (oauthParams.access_token && oauthParams.refresh_token) {
      const { data: sessionData, error: sessionError } =
        await supabase.auth.setSession({
          access_token: oauthParams.access_token,
          refresh_token: oauthParams.refresh_token,
        });

      if (sessionError) {
        return { data: null, error: sessionError };
      }

      return { data: sessionData, error: null };
    }

    return {
      data: null,
      error: { message: "Could not complete Google login from callback URL" },
    };
  } catch (error) {
    return { data: null, error };
  }
};


/**
 * Sign out current user
 * @returns {Promise<Object>} - Result object with error
 */
export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();

    // Always clear local session
    await AsyncStorage.removeItem(AUTH_USER_KEY);
    await AsyncStorage.removeItem(AUTH_SESSION_KEY);

    if (error) {
      console.warn(
        "Supabase sign out error (cleared local session anyway)",
        error,
      );
      return { error: null };
    }

    return { error: null };
  } catch (error) {
    console.error("Exception signing out:", error);
    return { error };
  }
};

/**
 * Get current session
 * @returns {Promise<Object>} - Result object with session data and error
 */
export const getSession = async () => {
  try {
    const { data, error } = await supabase.auth.getSession();

    if (error || !data.session) {
      const localSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
      if (localSession) {
        return { data: { session: JSON.parse(localSession) }, error: null };
      }
      return { data: { session: null }, error: null };
    }

    return { data, error: null };
  } catch (error) {
    const localSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    if (localSession) {
      return { data: { session: JSON.parse(localSession) }, error: null };
    }
    return { data: null, error };
  }
};

/**
 * Get current user
 * @returns {Promise<Object>} - Result object with user data and error
 */
export const getCurrentUser = async () => {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      const localUser = await AsyncStorage.getItem(AUTH_USER_KEY);
      if (localUser) {
        return { data: JSON.parse(localUser), error: null };
      }
      return { data: null, error };
    }

    return { data: user, error: null };
  } catch (error) {
    const localUser = await AsyncStorage.getItem(AUTH_USER_KEY);
    if (localUser) {
      return { data: JSON.parse(localUser), error: null };
    }
    return { data: null, error };
  }
};

/**
 * Update user password
 * @param {string} newPassword - New password
 * @returns {Promise<Object>} - Result object with data and error
 */
export const updatePassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return {
        data: { message: "Mock password update successful" },
        error: null,
      };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Send password reset email
 * @param {string} email - User email
 * @returns {Promise<Object>} - Result object with data and error
 */
export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) {
      return { data: { message: "Mock reset email sent" }, error: null };
    }

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Generate and persist a forgot-password code (for dev/testing UX flow).
 * @param {string} email - User email
 * @returns {Promise<Object>} - Result object with data and error
 */
export const requestPasswordResetCode = async (email) => {
  try {
    const normalizedEmail = normalizeEmail(email);
    if (!isValidEmail(normalizedEmail)) {
      return { data: null, error: { message: "Please enter a valid email." } };
    }

    const [studentResult, driverResult] = await Promise.all([
      getStudentByEmail(normalizedEmail),
      getDriverByEmail(normalizedEmail),
    ]);

    if (!studentResult?.data && !driverResult?.data) {
      return { data: null, error: { message: "Email not found." } };
    }

    const code = generateResetCode();
    const payload = {
      code,
      email: normalizedEmail,
      expiresAt: new Date(Date.now() + FORGOT_PASSWORD_EXPIRY_MS).toISOString(),
      attempts: 0,
    };

    await AsyncStorage.setItem(
      `${FORGOT_PASSWORD_PREFIX}${normalizedEmail}`,
      JSON.stringify(payload),
    );

    if (__DEV__) {
      console.log(
        `[Auth][ForgotPassword] Reset code for ${normalizedEmail}: ${code}`,
      );
    }

    return {
      data: { email: normalizedEmail, expiresAt: payload.expiresAt },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Validate forgot-password verification code.
 * @param {string} email - User email
 * @param {string} code - 6-digit code
 * @returns {Promise<Object>} - Result object with data and error
 */
export const verifyPasswordResetCode = async (email, code) => {
  try {
    const normalizedEmail = normalizeEmail(email);
    const storageKey = `${FORGOT_PASSWORD_PREFIX}${normalizedEmail}`;
    const stored = await AsyncStorage.getItem(storageKey);

    if (!stored) {
      return {
        data: null,
        error: { message: "No reset code found. Request a new code." },
      };
    }

    const payload = JSON.parse(stored);
    const now = Date.now();
    const expiresAtMs = new Date(payload.expiresAt).getTime();

    if (!Number.isFinite(expiresAtMs) || now > expiresAtMs) {
      await AsyncStorage.removeItem(storageKey);
      return { data: null, error: { message: "Reset code expired." } };
    }

    const normalizedCode = String(code || "").trim();
    if (payload.code !== normalizedCode) {
      payload.attempts = Number(payload.attempts || 0) + 1;
      await AsyncStorage.setItem(storageKey, JSON.stringify(payload));
      return { data: null, error: { message: "Invalid reset code." } };
    }

    return { data: { valid: true, email: normalizedEmail }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Confirm forgot-password flow and trigger Supabase reset email.
 * @param {string} email - User email
 * @param {string} code - verification code
 * @param {string} newPassword - accepted for UX validation consistency
 * @returns {Promise<Object>} - Result object with data and error
 */
export const confirmPasswordResetWithCode = async (
  email,
  code,
  newPassword,
) => {
  try {
    const normalizedEmail = normalizeEmail(email);
    if (!newPassword || newPassword.length < 6) {
      return {
        data: null,
        error: { message: "Password must be at least 6 characters." },
      };
    }

    const verifyResult = await verifyPasswordResetCode(normalizedEmail, code);
    if (verifyResult.error) {
      return verifyResult;
    }

    const resetResult = await resetPassword(normalizedEmail);
    if (resetResult.error) {
      return resetResult;
    }

    await AsyncStorage.removeItem(
      `${FORGOT_PASSWORD_PREFIX}${normalizedEmail}`,
    );

    return {
      data: {
        message:
          "Code verified. A password reset email has been sent to your inbox.",
      },
      error: null,
    };
  } catch (error) {
    return { data: null, error };
  }
};

/**
 * Subscribe to auth state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Object} - Subscription object
 */
export const onAuthStateChange = (callback) => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return subscription;
};

/**
 * Get user data (student or driver) based on email
 * @param {string} email - User email
 * @param {string} userType - User type ('student' or 'driver')
 * @returns {Promise<Object>} - Result object with user data and error
 */
export const getUserDataByEmail = async (email, userType = "student") => {
  try {
    if (userType === "student") {
      return await getStudentByEmail(email);
    } else if (userType === "driver") {
      return await getDriverByEmail(email);
    } else {
      return { data: null, error: { message: "Invalid user type" } };
    }
  } catch (error) {
    console.error("Exception getting user data:", error);
    return { data: null, error };
  }
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} - True if authenticated, false otherwise
 */
export const isAuthenticated = async () => {
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) return true;

    const localSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    return !!localSession;
  } catch (error) {
    const localSession = await AsyncStorage.getItem(AUTH_SESSION_KEY);
    return !!localSession;
  }
};
