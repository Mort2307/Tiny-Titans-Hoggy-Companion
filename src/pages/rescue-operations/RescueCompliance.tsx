import {
  useEffect,
  useState
} from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { getMyRescueWorkspace } from "../../services/rescueWorkspaceService";
import { getRescueSetupState } from "../../services/rescueSetupService";
import { GatePage, PageHeader, formatDate } from "../../components/rescue/RescueOperationsShared";

export function RescueCompliance() {
  const { user } = useAuth();
  const [setup, setSetup] = useState<Awaited<ReturnType<typeof getRescueSetupState>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) { setLoading(false); return; }
      try {
        const workspace = await getMyRescueWorkspace();
        if (!workspace.organisation) throw new Error("No Rescue organisation is connected to this account.");
        const state = await getRescueSetupState(workspace.organisation.id);
        if (active) setSetup(state);
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not load Rescue compliance details.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  if (loading) return <GatePage><main className="rescue-page"><section className="rescue-card"><p>Loading Rescue compliance…</p></section></main></GatePage>;
  if (!setup) return <GatePage><main className="rescue-page"><div className="rescue-message rescue-message-error">{message}</div></main></GatePage>;
  const org = setup.organisation;
  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="COMPLIANCE & IDENTITY" title="Organisation compliance" description="See exactly what is stored for your Rescue registration, verification references and public transparency settings." actions={<Link className="rescue-primary-link" to="/rescue/organisation">Edit organisation →</Link>} />
    <section className="rescue-card"><div className="rescue-detail-grid">
      <div><small>Setup</small><strong>{org.setupComplete ? "Complete" : "Incomplete"}</strong></div>
      <div><small>Directory</small><strong>{org.directoryVisible ? "Public" : "Hidden"}</strong></div>
      <div><small>Public registrations</small><strong>{org.registrationsPublic ? "Published" : "Private"}</strong></div>
      <div><small>Completed</small><strong>{formatDate(org.setupCompletedAt)}</strong></div>
    </div></section>
    <section className="rescue-card"><span className="rescue-eyebrow">REGISTERED DETAILS</span><h2>{org.name}</h2><div className="rescue-detail-grid">
      <div><small>Charity registration</small><strong>{org.charityNumber || "Not supplied"}</strong></div>
      <div><small>Company registration</small><strong>{org.companyNumber || "Not supplied"}</strong></div>
      <div><small>Local authority licence</small><strong>{org.localAuthorityLicence || "Not supplied"}</strong></div>
      <div><small>Other permit / registration</small><strong>{org.otherRegistrationNumber || "Not supplied"}</strong></div>
      <div><small>Issuing authority</small><strong>{org.registrationAuthority || "Not supplied"}</strong></div>
      <div><small>Evidence / verification link</small>{org.registrationEvidenceUrl ? <a href={org.registrationEvidenceUrl} target="_blank" rel="noreferrer">Open evidence ↗</a> : <strong>Not supplied</strong>}</div>
    </div>{org.registrationsPublic && <p className="rescue-form-hint">These registration fields are currently configured to be visible on the public profile. TinyTitans records entered information; it does not independently verify a registration number.</p>}{!org.registrationsPublic && <p className="rescue-form-hint">Registration details remain private from the public Rescue profile.</p>}</section>
    <section className="rescue-card"><span className="rescue-eyebrow">PUBLIC CONTACT & LOCATION</span><div className="rescue-detail-grid">
      <div><small>Location</small><strong>{org.locationLabel || "Not supplied"}</strong></div>
      <div><small>Postcode</small><strong>{org.postcode || "Not supplied"}</strong></div>
      <div><small>Region</small><strong>{org.region || "Not supplied"}</strong></div>
      <div><small>Country</small><strong>{org.country || "Not supplied"}</strong></div>
      <div><small>Contact email</small><strong>{org.contactEmail || "Not supplied"}</strong></div>
      <div><small>Telephone</small><strong>{org.phone || "Not supplied"}</strong></div>
      <div><small>Opening / contact times</small><strong>{org.openingHours || "Not supplied"}</strong></div>
      <div><small>Website</small><strong>{org.website || "Not supplied"}</strong></div>
    </div></section>
    <section className="rescue-card"><span className="rescue-eyebrow">PUBLIC PROFILE</span><h2>See exactly what visitors will see</h2><p>Use the preview before sharing your Rescue profile. Public-safe animal profiles and community actions stay separate from your private records.</p><div className="rescue-form-actions"><Link className="rescue-primary-link" to="/rescue/public-preview">Open preview →</Link>{org.directoryVisible && <Link className="rescue-primary-link" to={`/rescue/public/${setup.organisationId}`}>Open live public profile ↗</Link>}</div></section>
  </main></GatePage>;
}
