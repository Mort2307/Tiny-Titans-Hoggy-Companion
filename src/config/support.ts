// Tiny Titans support destination.
// Set this once the final Ko-fi page is ready.
// Keep the URL public — never put payment secrets in the app.
export const KOFI_SUPPORT_URL = "https://ko-fi.com/REPLACE_WITH_TINY_TITANS";
export const SUPPORT_PLATFORM_NAME = "Ko-fi";

export const isSupportConfigured = () =>
  /^https:\/\/ko-fi\.com\/[A-Za-z0-9_-]+\/?$/.test(KOFI_SUPPORT_URL);
