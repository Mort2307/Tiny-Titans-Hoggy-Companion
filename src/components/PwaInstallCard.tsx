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

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function isIosSafari() {
  return isIos() && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function isChromium() {
  return /chrome|crios|edg|edgios/i.test(navigator.userAgent) && !/firefox|fxios|opr/i.test(navigator.userAgent);
}

function browserHelpText() {
  if (isIosSafari()) {
    return <>On iPhone or iPad: tap <strong>Share</strong> → <strong>Add to Home Screen</strong>. Tiny Titans will open as its own app.</>;
  }
  if (isIos()) {
    return <>On this browser: open the browser's <strong>Share</strong> or menu option and choose <strong>Add to Home Screen</strong>. Tiny Titans will open as its own app.</>;
  }
  if (isAndroid() && isChromium()) {
    return <>Open your browser menu <strong>⋮</strong> and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.</>;
  }
  if (isChromium()) {
    return <>Open your browser menu <strong>⋮</strong> and choose <strong>Install Tiny Titans</strong> or <strong>Install app</strong>.</>;
  }
  return <>Open your browser's menu and look for <strong>Install app</strong>, <strong>Install Tiny Titans</strong>, or <strong>Add to Home Screen</strong>.</>;
}

export default function PwaInstallCard() {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
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
      setBrowserHelp(false);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const install = async () => {
    if (!installPrompt) {
      setBrowserHelp(true);
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

  return <section className="pwa-install-card" aria-label="Install Tiny Titans">
    <div className="pwa-install-icon">🐍</div>
    <div className="pwa-install-copy">
      <p className="section-eyebrow">TINY TITANS APP</p>
      <h3>Install Tiny Titans</h3>
      <p>Install Tiny Titans for quick access, its own app window and automatic updates.</p>
      {browserHelp && <p className="pwa-install-help">{browserHelpText()}</p>}
    </div>
    <button type="button" className="pwa-install-button" onClick={() => void install()}>
      📲 Install Tiny Titans
    </button>
  </section>;
}
