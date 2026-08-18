import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const INSTALLED_KEY = "tiny-titans:pwa-installed";

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches ||
    ("standalone" in navigator && Boolean((navigator as Navigator & { standalone?: boolean }).standalone));
}

function isIosSafari() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) &&
    /safari/i.test(navigator.userAgent) &&
    !/crios|fxios|edgios/i.test(navigator.userAgent);
}

function isChromiumDesktop() {
  return /chrome|edg/i.test(navigator.userAgent) && !/android|iphone|ipad|ipod/i.test(navigator.userAgent);
}

export default function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [iosHelp, setIosHelp] = useState(false);
  const [browserHelp, setBrowserHelp] = useState(false);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(INSTALLED_KEY) === "true") {
      setInstalled(true);
      return;
    }

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
      setBrowserHelp(false);
    };

    const onInstalled = () => {
      localStorage.setItem(INSTALLED_KEY, "true");
      setInstalled(true);
      setInstallPrompt(null);
      setIosHelp(false);
      setBrowserHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    if (isIosSafari()) setIosHelp(true);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installPrompt) {
      if (isIosSafari()) {
        setIosHelp(true);
      } else if (isChromiumDesktop()) {
        setBrowserHelp(true);
      } else {
        setBrowserHelp(true);
      }
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "true");
      setInstalled(true);
    }

    setInstallPrompt(null);
  };

  const buttonLabel = installPrompt
    ? "📲 Download Tiny Titans"
    : isIosSafari()
      ? "📱 Add to Home Screen"
      : "📲 Show Download Help";

  return <section className="pwa-install-card" aria-label="Download Tiny Titans">
    <div className="pwa-install-icon">🐍</div>
    <div className="pwa-install-copy">
      <p className="section-eyebrow">TINY TITANS APP</p>
      <h3>Download Tiny Titans</h3>
      <p>Install Tiny Titans on your device for quick access, its own app window and automatic updates.</p>
      {iosHelp && !installPrompt && <p className="pwa-install-help">On iPhone or iPad: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>. This installs Tiny Titans as an app.</p>}
      {browserHelp && !installPrompt && <p className="pwa-install-help">Your browser has not offered the download prompt yet. Open the browser menu <strong>⋮</strong> and choose <strong>Install Tiny Titans</strong> or <strong>Install app</strong>. This installs the app rather than creating an ordinary bookmark.</p>}
    </div>
    <button type="button" className="pwa-install-button" onClick={() => void install()}>{buttonLabel}</button>
  </section>;
}
