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
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isIosSafari() {
  return isIos() && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios/i.test(navigator.userAgent);
}

function isAndroid() {
  return /android/i.test(navigator.userAgent);
}

function isEdge() {
  return /edg|edgios|edga/i.test(navigator.userAgent);
}

function isFirefox() {
  return /firefox|fxios/i.test(navigator.userAgent);
}

function isSamsungInternet() {
  return /samsungbrowser/i.test(navigator.userAgent);
}

function isChromium() {
  return /chrome|crios|edg|edgios/i.test(navigator.userAgent) && !/firefox|fxios|opr/i.test(navigator.userAgent);
}

function browserHelpText() {
  if (isIosSafari()) {
    return <>On iPhone or iPad: tap <strong>Share</strong> → <strong>Add to Home Screen</strong> → <strong>Add</strong>. Tiny Titans Reptile Companion will then appear on your Home Screen and open as its own app.</>;
  }

  if (isIos()) {
    return <>On iPhone or iPad: tap your browser's <strong>Share</strong> button → <strong>Add to Home Screen</strong> → <strong>Add</strong>. If you cannot see it, scroll down in the Share menu and select <strong>Edit Actions</strong> to add it.</>;
  }

  if (isAndroid() && isSamsungInternet()) {
    return <>Samsung Internet: tap the browser menu <strong>☰</strong> → <strong>Add page to</strong> → <strong>Home screen</strong> → <strong>Add</strong>. If Samsung offers <strong>Install app</strong>, you can use that instead.</>;
  }

  if (isAndroid() && isFirefox()) {
    return <>Firefox on Android: tap the browser menu <strong>⋮</strong> → <strong>Add to Home screen</strong> → confirm <strong>Add</strong>. If Firefox offers an install option for Tiny Titans Reptile Companion, use that instead.</>;
  }

  if (isAndroid() && isChromium()) {
    return <>Android: tap the browser menu <strong>⋮</strong> → choose <strong>Install app</strong> or <strong>Add to Home screen</strong> → confirm. Browser wording varies slightly, but the installed app is Tiny Titans Reptile Companion.</>;
  }

  if (isEdge()) {
    return <>Microsoft Edge: open the <strong>⋯</strong> menu → <strong>Apps</strong> → <strong>Install Tiny Titans Reptile Companion</strong> (or <strong>Install this site as an app</strong>).</>;
  }

  if (isFirefox()) {
    return <>Firefox on desktop does not always provide the web-app install prompt. For a desktop shortcut, use your browser's <strong>Bookmarks/Shortcuts</strong> option, or open Tiny Titans Reptile Companion in a Chromium-based browser such as Edge or Chrome for full PWA installation.</>;
  }

  return <>Open your browser's menu and look for <strong>Install app</strong>, <strong>Install Tiny Titans Reptile Companion</strong>, or <strong>Add to Home Screen</strong>. Browser wording varies slightly, but the option is normally inside the main menu or Share menu.</>;
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

  return <section className="pwa-install-card" aria-label="Install Tiny Titans Reptile Companion">
    <div className="pwa-install-icon">🐍</div>
    <div className="pwa-install-copy">
      <p className="section-eyebrow">TINY TITANS REPTILE COMPANION</p>
      <h3>Install Tiny Titans Reptile Companion</h3>
      <p>Install Tiny Titans Reptile Companion for quick access, its own app window and automatic updates.</p>
      {browserHelp && <div className="pwa-install-help" role="status">
        <strong>📲 How to add Tiny Titans Reptile Companion to your device</strong>
        <p>{browserHelpText()}</p>
      </div>}
    </div>
    <button type="button" className="pwa-install-button" onClick={() => void install()}>
      📲 Install Tiny Titans Reptile Companion
    </button>
  </section>;
}
