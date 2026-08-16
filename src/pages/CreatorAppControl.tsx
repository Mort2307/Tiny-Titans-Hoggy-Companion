import { Link } from "react-router-dom";
import "../styles/CreatorTools.css";

type Control = { to: string; icon: string; title: string; description: string };
const controls: Control[] = [
  { to: "/morph-library", icon: "🧬", title: "Morph & Genetics", description: "Open the live morph/genetics area and review the current database and calculator behaviour." },
  { to: "/knowledge-base", icon: "📚", title: "Knowledge Base", description: "Open the knowledge system for content review and live verification." },
  { to: "/challenge", icon: "🏆", title: "Titans Challenge", description: "Review the live learning and achievement experience." },
  { to: "/community", icon: "🌍", title: "Community", description: "Review the community experience and moderation surface." },
  { to: "/creator/moderation", icon: "🛡️", title: "Moderation & Reports", description: "Manage issue reports, morph submissions and legacy applications." },
  { to: "/creator/wall-of-titans", icon: "🐍", title: "Wall of Titans", description: "Manage every public supporter identity, link and Wall record." },
  { to: "/creator/community", icon: "🗺️", title: "Community Globe", description: "Inspect consenting community locations and drill into geographic groups." },
  { to: "/creator/admin", icon: "👥", title: "Admin Management", description: "Grant or remove everyday administrator access." },
  { to: "/become-a-titan", icon: "💚", title: "Titan Support", description: "Review the public supporter experience and Stripe entry point." },
];

export default function CreatorAppControl() {
  return <main className="creator-admin-page"><header className="creator-admin-header"><div><span className="creator-admin-kicker">PRIVATE CREATOR CENTRE</span><h1>⚙️ App Control</h1><p>A single full-screen command board for the live Tiny Titans app. Each area opens as a proper page rather than expanding underneath this screen.</p></div><Link className="creator-global-card" to="/creator">← Creator Hub</Link></header><section className="creator-admin-section"><div className="creator-global-grid">{controls.map((control) => <Link className="creator-global-card creator-hub-navigation-card" key={control.to} to={control.to}><span>{control.icon}</span><label>{control.title}</label><small>{control.description}</small><b>Open full screen →</b></Link>)}</div></section><section className="creator-admin-section"><div className="creator-section-heading"><div><span className="creator-admin-kicker">CREATOR PRINCIPLE</span><h2>One control centre, no hidden traps</h2><p>Security-sensitive changes stay server-authorised. Runtime app content should only be edited through a dedicated editor backed by Firestore/Cloud Functions; this board deliberately never pretends that opening a public page is the same thing as editing source code.</p></div></div></section></main>;
}
