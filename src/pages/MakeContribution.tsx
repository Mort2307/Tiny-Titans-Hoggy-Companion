import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/make-contribution.css";

const choices = [
  { icon: "🧬", title: "Morph Library", text: "Submit a morph name, evidence or image for Creator review and help keep the genetics library accurate.", to: "/morph-library" },
  { icon: "🐍", title: "Behaviour Observatory", text: "Share a real behaviour observation, photo or video with context so other keepers can learn from it.", to: "/behaviour-observatory?submit=1" },
  { icon: "📖", title: "Keeper Behaviour Handbook", text: "Explore the teaching library first, then contribute observations that could strengthen future guidance.", to: "/keeper-handbook" },
  { icon: "💡", title: "Feedback & ideas", text: "Suggest improvements, new features or better ways Tiny Titans can serve keepers.", to: "/feedback" },
  { icon: "🐛", title: "Report a bug", text: "Tell us what broke, where it happened and what you expected so it can be investigated.", to: "/report-bug" },
  { icon: "🌍", title: "Community", text: "Share or explore wider community content and future contribution opportunities.", to: "/community" },
];

export default function MakeContribution() {
  return <main className="page-container make-contribution-page"><BackHomeButton /><header className="make-contribution-hero"><span>TINY TITANS · COMMUNITY</span><h1>🌍 Make a Contribution</h1><p>Choose what you want to add to Tiny Titans. Anything intentionally published for other users to see counts as a Global Contribution; private keeper records stay private unless you separately opt into the Intelligence system.</p></header><section className="make-contribution-grid">{choices.map((choice) => <Link key={choice.to} className="make-contribution-card" to={choice.to}><span className="make-contribution-icon" aria-hidden="true">{choice.icon}</span><div><h2>{choice.title}</h2><p>{choice.text}</p><strong>Open contribution →</strong></div></Link>)}</section><section className="make-contribution-note"><strong>How Global Contributions work</strong><p>A Global Contribution is content deliberately made visible to the Tiny Titans community. Attribution is a separate choice: credited profile, name, social handle or anonymous. Anonymous public contributions still count in the global total.</p></section></main>;
}
