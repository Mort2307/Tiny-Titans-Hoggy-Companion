import TinyTitansIcon from "../components/TinyTitansIcon";
import NotificationSettingsPanel from "../components/NotificationSettingsPanel";
import { useSettings } from "../hooks/useSettings";
import type { TinyTitansIconName } from "../types/tinyTitansIcon";
import "../styles/settingsWorkspace.css";

type HubCardProps = {
  icon: TinyTitansIconName;
  eyebrow: string;
  title: string;
  description: string;
  action: string;
  onClick: () => void;
};

function HubCard({
  icon,
  eyebrow,
  title,
  description,
  action,
  onClick,
}: HubCardProps) {
  return (
    <section className="tt-settings-card">
      <div className="tt-settings-card-icon" aria-hidden="true">
        <TinyTitansIcon name={icon} size={24} />
      </div>

      <div>
        <p className="tt-settings-eyebrow">{eyebrow}</p>
        <h2>{title}</h2>
        <p className="tt-settings-muted">{description}</p>
      </div>

      <button
        className="tt-settings-link"
        type="button"
        onClick={onClick}
      >
        {action}
        <TinyTitansIcon name="forward" size={16} />
      </button>
    </section>
  );
}

export default function Settings() {
  const {
    profile,
    navigate,
    units,
    saving,
    saved,
    saveUnits,
  } = useSettings();

  return (
    <main className="tt-settings-page">
      <section className="tt-settings-hero">
        <p className="tt-settings-eyebrow">My Account · Control centre</p>

        <h1>
          <TinyTitansIcon name="account" size={28} />
          Settings
        </h1>

        <p className="tt-settings-hero-copy">
          Everything that controls how Tiny Titans behaves, displays information
          and keeps you on top of your keeper routine.
        </p>

        <nav className="tt-settings-jump" aria-label="Settings sections">
          <a href="#notifications">
            <TinyTitansIcon name="reminders" size={16} />
            Notifications
          </a>
          <a href="#display">
            <TinyTitansIcon name="info" size={16} />
            Display
          </a>
          <a href="#keeper-tools">
            <TinyTitansIcon name="reptile" size={16} />
            Keeper tools
          </a>
          <a href="#integrations">
            <TinyTitansIcon name="link" size={16} />
            Integrations
          </a>
          <a href="#account">
            <TinyTitansIcon name="lock" size={16} />
            Account
          </a>
        </nav>
      </section>

      <section id="notifications" className="tt-settings-feature">
        <div className="tt-settings-feature-head">
          <div>
            <p className="tt-settings-eyebrow">Priority control</p>
            <h2>
              <TinyTitansIcon name="reminders" size={22} />
              Notifications
            </h2>
            <p className="tt-settings-muted">
              Turn device delivery on, then choose exactly which reminder
              streams you want.
            </p>
          </div>
          <span className="tt-settings-live">LIVE</span>
        </div>

        <NotificationSettingsPanel />
      </section>

      <section id="display" className="tt-settings-section">
        <div className="tt-settings-section-head">
          <div>
            <p className="tt-settings-eyebrow">Display & preferences</p>
            <h2>
              <TinyTitansIcon name="info" size={22} />
              How Tiny Titans presents your records
            </h2>
          </div>
        </div>

        <section className="tt-settings-card tt-settings-units">
          <div className="tt-settings-card-icon" aria-hidden="true">
            <TinyTitansIcon name="weight" size={24} />
          </div>

          <div>
            <p className="tt-settings-eyebrow">Measurement system</p>
            <h2>Choose your keeper units</h2>
            <p className="tt-settings-muted">
              Your stored records remain canonical; this only changes how
              measurements are displayed.
            </p>

            <div className="tt-settings-unit-grid">
              <button
                className={units === "metric" ? "selected" : ""}
                type="button"
                onClick={() => void saveUnits("metric")}
                disabled={saving}
              >
                <strong>Metric</strong>
                <span>g · kg · cm · °C</span>
              </button>

              <button
                className={units === "imperial" ? "selected" : ""}
                type="button"
                onClick={() => void saveUnits("imperial")}
                disabled={saving}
              >
                <strong>Imperial</strong>
                <span>oz · lb · in · °F</span>
              </button>
            </div>

            {saved && (
              <p className="tt-settings-saved">
                <TinyTitansIcon name="check" size={16} />
                Display preference saved.
              </p>
            )}
          </div>
        </section>
      </section>

      <section id="keeper-tools" className="tt-settings-section">
        <div className="tt-settings-section-head">
          <div>
            <p className="tt-settings-eyebrow">Keeper tools</p>
            <h2>
              <TinyTitansIcon name="reptile" size={22} />
              Your routine, grouped properly
            </h2>
          </div>
        </div>

        <div className="tt-settings-grid">
          <HubCard
            icon="feeding"
            eyebrow="Feeding"
            title="Feeding preparation"
            description="Manage recurring preparation plans and feeding-day preparation tasks."
            action="Open preparation"
            onClick={() => navigate("/feeding/preparation")}
          />

          <HubCard
            icon="reminders"
            eyebrow="Reminders"
            title="Reminder Hub"
            description="Create and manage independent recurring reminders for your animals."
            action="Open Reminder Hub"
            onClick={() => navigate("/reminders")}
          />

          <HubCard
            icon="academy"
            eyebrow="Learning"
            title="Personalisation"
            description="Adjust learning and challenge difficulty without changing your underlying keeper data."
            action="Open personalisation"
            onClick={() => navigate("/account/personalise")}
          />

          <HubCard
            icon="enclosure"
            eyebrow="Enclosures"
            title="Enclosure Intelligence"
            description="Review species-aware enclosure conditions, care context and habitat guidance."
            action="Open enclosure tools"
            onClick={() => navigate("/enclosure-intelligence")}
          />
        </div>
      </section>

      <section id="integrations" className="tt-settings-section">
        <div className="tt-settings-section-head">
          <div>
            <p className="tt-settings-eyebrow">Connected tools</p>
            <h2>
              <TinyTitansIcon name="link" size={22} />
              Integrations
            </h2>
          </div>
        </div>

        <div className="tt-settings-grid">
          <HubCard
            icon="link"
            eyebrow="Free integrations"
            title="Integration Hub"
            description="Connect Home Assistant, MQTT, ESPHome, Node-RED, keeper devices and calendar exports through Tiny Titans' zero-cost integration platform."
            action="Open Integration Hub"
            onClick={() => navigate("/account/integrations")}
          />

          <HubCard
            icon="titan"
            eyebrow="Titan Pro"
            title="Tiny Titans Companion"
            description="Connect ChatGPT to your Tiny Titans records for conversational logging, history lookups and secure keeper actions."
            action="Open ChatGPT Companion"
            onClick={() => navigate("/account/integrations/chatgpt")}
          />
        </div>
      </section>

      <section id="account" className="tt-settings-section">
        <div className="tt-settings-section-head">
          <div>
            <p className="tt-settings-eyebrow">Account & data</p>
            <h2>
              <TinyTitansIcon name="lock" size={22} />
              Account controls
            </h2>
          </div>
        </div>

        <div className="tt-settings-grid">
          <HubCard
            icon="account"
            eyebrow="Account"
            title={profile?.displayName || "My Account"}
            description="Review your profile, family, privacy and community controls."
            action="Open account"
            onClick={() => navigate("/account")}
          />

          <HubCard
            icon="lock"
            eyebrow="Security"
            title="Security"
            description="Manage authentication-sensitive account controls and permanent deletion."
            action="Open security"
            onClick={() => navigate("/account/security")}
          />

          <HubCard
            icon="community"
            eyebrow="Privacy"
            title="Data & Privacy"
            description="Control optional analytics, location, product updates and Titan Intelligence contribution."
            action="Open privacy controls"
            onClick={() => navigate("/account/data-privacy")}
          />
        </div>
      </section>
    </main>
  );
}
