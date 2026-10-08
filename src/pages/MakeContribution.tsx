import { Link } from "react-router-dom";
import BackHomeButton from "../components/BackHomeButton";
import "../styles/make-contribution.css";
import TinyTitansIcon, { type TinyTitansIconName } from "../components/TinyTitansIcon";

const choices: Array<{ icon: TinyTitansIconName; title: string; text: string; to: string }> = [
  { icon: "animals", title: "Submit a Species", text: "Submit taxonomy, ecology, husbandry, feeding, breeding, evidence and species imagery for Creator review. Nothing is published automatically.", to: "/submit-species" },
  { icon: "morph", title: "Morph Library", text: "Submit a morph name, evidence or image for Creator review and help keep the genetics library accurate.", to: "/morph-library" },
  { icon: "animals", title: "Behaviour Observatory", text: "Share a real behaviour observation, photo or video with context so other keepers can learn from it.", to: "/behaviour-observatory?submit=1" },
  { icon: "handbook", title: "Keeper Behaviour Handbook", text: "Explore the teaching library first, then contribute observations that could strengthen future guidance.", to: "/keeper-handbook" },
  { icon: "info", title: "Feedback & ideas", text: "Suggest improvements, new features or better ways Tiny Titans can serve keepers.", to: "/feedback" },
  { icon: "testing", title: "Report a bug", text: "Tell us what broke, where it happened and what you expected so it can be investigated.", to: "/report-bug" },
  { icon: "community", title: "Community", text: "Share or explore wider community content and future contribution opportunities.", to: "/community" },
];

export default function MakeContribution() {
  return <main className="page-container make-contribution-page"><BackHomeButton /><header className="make-contribution-hero"><span>TINY TITANS · COMMUNITY</span><h1><TinyTitansIcon name="community" size={28} /> Make a Contribution</h1><p>Choose what you want to add to Tiny Titans. Anything intentionally published for other users to see counts as a Global Contribution; private keeper records stay private unless you separately opt into the Intelligence system.</p></header><section className="make-contribution-grid">{choices.map((choice) => <Link key={choice.to} className="make-contribution-card" to={choice.to}><span className="make-contribution-icon" aria-hidden="true"><TinyTitansIcon name={choice.icon} size={24} /></span><div><h2>{choice.title}</h2><p>{choice.text}</p><strong>Open contribution <TinyTitansIcon name="forward" size={13} /></strong></div></Link>)}</section><section className="make-contribution-note"><strong>How Global Contributions work</strong><p>A Global Contribution is content deliberately made visible to the Tiny Titans community. Attribution is a separate choice: credited profile, name, social handle or anonymous. Anonymous public contributions still count in the global total.</p></section></main>;
}
