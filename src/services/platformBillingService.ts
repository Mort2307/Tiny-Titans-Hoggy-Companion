type DigitalGoodsWindow = Window & {
  getDigitalGoodsService?: (storeId: string) => Promise<unknown>;
};

export async function isGooglePlayBillingAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const candidate = (window as DigitalGoodsWindow).getDigitalGoodsService;
  if (typeof candidate !== "function") return false;
  try {
    await candidate("https://play.google.com/billing");
    return true;
  } catch {
    return false;
  }
}
