import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { getAuth } from "firebase/auth";
import { useAuth } from "../context/AuthContext";
import app from "../firebase/config";
import { KOFI_SUPPORT_URL, SUPPORT_PLATFORM_NAME, isSupportConfigured } from "../config/support";
import "../styles/MyAccount.css";

function MyAccount() {
  const navigate = useNavigate(); const { user, profile } = useAuth(); const auth = getAuth(app);
  async function handleLogout() { try { await signOut(auth); navigate("/login", { replace: true }); } catch (error) { console.error("Tiny Titans: logout failed", error); } }
  if (!user) return null;
  const profileType = profile?.profileType === "educator" ? "Educator" : profile?.profileType === "learner" ? "Learner" : profile?.profileType === "professional" ? "Professional" : profile?.profileType === "creator" ? "Creator" : "Keeper";
  const learningLevel = profile?.learningLevel === "explorer" ? "Explorer" : profile?.learningLevel === "learner" ? "Learner" : profile?.learningLevel === "student" ? "Student" : "Adult";
  const experience = profile?.experienceLevel === "pro" ? "Advanced" : profile?.experienceLevel === "intermediate" ? "Intermediate" : "Beginner";
  const supportConfigured = isSupportConfigured();
  const privacyPreferences = profile?.dataCollectionPreferences;
  const locationEnabled = Boolean(privacyPreferences?.approximateLocation);
  const analyticsEnabled = Boolean(privacyPreferences?.analytics);
  const updatesEnabled = Boolean(privacyPreferences?.productUpdates);
  function handleSupport() { if (supportConfigured) window.open(KOFI_SUPPORT_URL, "_blank", "noopener,noreferrer"); }
  return <section className="my-account-page"><div className="my-account-card">
    <div className="my-account-header"><div className="my-account-avatar">🐍</div><div><h1>My Account</h1><p>Your Tiny Titans profile, progress and account controls.</p></div></div>
    <div className="account-section"><h2>Profile</h2><div className="account-detail"><span>Display name</span><strong>{profile?.displayName || user.displayName || "Not set"}</strong></div><div className="account-detail"><span>Email</span><strong>{user.email || "Not available"}</strong></div><div className="account-detail"><span>Profile</span><strong>{profileType}</strong></div><div className="account-detail"><span>Learning layer</span><strong>{learningLevel}</strong></div><div className="account-detail"><span>Experience</span><strong>{experience}</strong></div><button type="button" className="account-button" onClick={() => navigate("/account/profile")}>✏️ Edit Profile</button></div>
    <div className="account-section"><h2>Your Progress</h2><button type="button" className="account-button account-button--highlight" onClick={() => navigate("/learn/achievements")}>🏆 Achievements &amp; Badges<span className="account-button-subtext">View your keeper milestones, category progress and Titans Challenge achievements.</span></button></div>
    <div className="account-section"><h2>Tiny Titans</h2><div className="account-interests">{profile?.interests?.map((interest) => <span key={interest} className="interest-badge">{interest === "breeder-seller" ? "Breeder & Seller" : interest.charAt(0).toUpperCase() + interest.slice(1)}</span>)}</div></div>
    {profile?.profileType === "educator" && <div className="account-section"><h2>Education</h2><button type="button" className="account-button" onClick={() => navigate("/educator")}>🧑‍🏫 Educator Centre</button></div>}
    <div className="account-section"><h2>Community &amp; Support</h2><button type="button" className="account-button" onClick={() => navigate("/report-issue")}>🐛 Report a Bug<span className="account-button-subtext">Report a reproducible problem so the Creator QA system can investigate it.</span></button><button type="button" className="account-button" onClick={() => navigate("/feedback")}>💡 Send Feedback<span className="account-button-subtext">Ideas, suggestions and general feedback are kept separate from bug reports.</span></button><button type="button" className="account-button" onClick={() => navigate("/founder")}>👑 Become a Founder</button><button type="button" className="account-button" onClick={handleSupport} disabled={!supportConfigured}>☕ Support Tiny Titans on {SUPPORT_PLATFORM_NAME}{!supportConfigured ? " (link coming soon)" : ""}</button>{profile?.role === "admin" && <button type="button" className="account-button" onClick={() => navigate("/creator")}>🛠️ Creator / Admin Centre</button>}</div>
    <div className="account-section"><h2>🔐 Data &amp; Privacy</h2><div className="account-detail"><span>Community location</span><strong>{locationEnabled ? "Enabled" : "Not enabled"}</strong></div><div className="account-detail"><span>Anonymous analytics</span><strong>{analyticsEnabled ? "Enabled" : "Not enabled"}</strong></div><div className="account-detail"><span>Product updates</span><strong>{updatesEnabled ? "Enabled" : "Not enabled"}</strong></div><p className="account-button-subtext">These optional permissions are separate from the core Tiny Titans features. You can change or withdraw them at any time.</p><button type="button" className="account-button account-button--highlight" onClick={() => navigate("/account/data-privacy")}>🔐 Manage Data Collection Permissions<span className="account-button-subtext">Choose whether Tiny Titans may use your optional community location, anonymous analytics and product-update preferences.</span></button></div>
    <div className="account-section"><h2>Account</h2><button type="button" className="account-button" onClick={() => navigate("/account/settings")}>⚙️ Settings</button><button type="button" className="account-button" onClick={() => navigate("/account/personalise")}>✏️ Personalise Experience</button><button type="button" className="account-button" onClick={() => navigate("/account/security")}>🔐 Security</button><button type="button" className="account-button logout-button" onClick={handleLogout}>🚪 Log Out</button></div>
  </div></section>;
}
export default MyAccount;
