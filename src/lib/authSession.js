import { insforge } from "./insforge";

const ACCESS_TOKEN_KEY = "collabcode.insforge.accessToken";
const REFRESH_TOKEN_KEY = "collabcode.insforge.refreshToken";

export const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);

export const saveAuthSession = (authResponse) => {
  const accessToken = authResponse?.accessToken;
  const refreshToken = authResponse?.refreshToken;

  if (!accessToken) {
    return false;
  }

  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    insforge.getHttpClient().setRefreshToken(refreshToken);
  }

  insforge.setAccessToken(accessToken);
  return true;
};

export const restoreAuthSession = () => {
  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

  if (!accessToken) {
    return false;
  }

  insforge.setAccessToken(accessToken);
  if (refreshToken) {
    insforge.getHttpClient().setRefreshToken(refreshToken);
  }

  return true;
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  insforge.setAccessToken(null);
  insforge.getHttpClient().setRefreshToken(null);
};

export const hasAuthorizationHeader = () => {
  const authorization = insforge.getHttpClient().getHeaders().Authorization;
  return Boolean(authorization?.startsWith("Bearer "));
};
