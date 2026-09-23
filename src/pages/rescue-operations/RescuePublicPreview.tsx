import {
  useEffect,
  useState
} from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import { listRescueAnimals } from "../../services/rescueService";
import { getMyRescueWorkspace } from "../../services/rescueWorkspaceService";
import { getRescueSetupState } from "../../services/rescueSetupService";
import type { RescueAnimal } from "../../types/rescue";
import TinyTitansIcon from "../../components/TinyTitansIcon";
import { GatePage, PageHeader, STATUS_LABELS } from "../../components/rescue/RescueOperationsShared";

export function RescuePublicPreview() {
  const { user } = useAuth();
  const [setup, setSetup] = useState<Awaited<ReturnType<typeof getRescueSetupState>> | null>(null);
  const [animals, setAnimals] = useState<RescueAnimal[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  useEffect(() => {
    let active = true;
    async function load() {
      if (!user) { setLoading(false); return; }
      try {
        const workspace = await getMyRescueWorkspace();
        if (!workspace.organisation) throw new Error("No Rescue organisation is connected to this account.");
        const [state, animalRows] = await Promise.all([getRescueSetupState(workspace.organisation.id), listRescueAnimals(workspace.organisation.id)]);
        if (active) { setSetup(state); setAnimals(animalRows); }
      } catch (error) {
        if (active) setMessage(error instanceof Error ? error.message : "Could not build the Rescue preview.");
      } finally { if (active) setLoading(false); }
    }
    void load();
    return () => { active = false; };
  }, [user]);

  if (loading) return <GatePage><main className="rescue-page"><section className="rescue-card"><p>Building public preview…</p></section></main></GatePage>;
  if (!setup) return <GatePage><main className="rescue-page"><div className="rescue-message rescue-message-error">{message}</div></main></GatePage>;
  const org = setup.organisation;
  const publicAnimals = animals.filter((animal) => animal.publicPreview && animal.status !== "deceased" && animal.status !== "transferred");
  return <GatePage><main className="rescue-page">
    <PageHeader eyebrow="PUBLIC PROFILE PREVIEW" title="Your public Rescue profile" description="This is a management preview of the information visitors can see. Private care records, staff information and internal notes are excluded." actions={<Link className="rescue-primary-link" to="/rescue/organisation">Edit profile →</Link>} />
    {org.heroImageUrl && <div className="rescue-public-hero-image"><img src={org.heroImageUrl} alt="" /></div>}
    <header className="rescue-public-hero rescue-card">{org.logoUrl ? <img src={org.logoUrl} alt="" className="rescue-public-logo" /> : <span className="rescue-public-logo rescue-public-logo-fallback"><TinyTitansIcon name="health" size={34}/></span>}<div><span className="rescue-eyebrow">PUBLIC RESCUE PROFILE</span><h2>{org.name}</h2><p>{org.locationLabel}{org.region ? ` · ${org.region}` : ""}{org.country ? ` · ${org.country}` : ""}</p></div></header>
    <section className="rescue-card"><span className="rescue-eyebrow">ABOUT</span><h2>About this Rescue</h2><p>{org.directoryDescription || "No public description yet."}</p></section>
    {(org.contactEmail || org.phone || org.postcode || org.openingHours) && <section className="rescue-card"><span className="rescue-eyebrow">CONTACT</span><div className="rescue-public-contact-grid">{org.contactEmail && <div><small>Email</small><strong>{org.contactEmail}</strong></div>}{org.phone && <div><small>Telephone</small><strong>{org.phone}</strong></div>}{org.postcode && <div><small>Postcode</small><strong>{org.postcode}</strong></div>}{org.openingHours && <div className="rescue-public-contact-span"><small>Opening / contact times</small><p>{org.openingHours}</p></div>}</div></section>}
    {org.registrationsPublic && (org.charityNumber || org.companyNumber || org.localAuthorityLicence || org.otherRegistrationNumber || org.registrationAuthority) && <section className="rescue-card"><span className="rescue-eyebrow">REGISTRATION</span><h2>Public registration details</h2><div className="rescue-public-contact-grid">{org.charityNumber && <div><small>Charity number</small><strong>{org.charityNumber}</strong></div>}{org.companyNumber && <div><small>Company number</small><strong>{org.companyNumber}</strong></div>}{org.localAuthorityLicence && <div><small>Local authority licence</small><strong>{org.localAuthorityLicence}</strong></div>}{org.otherRegistrationNumber && <div><small>Other registration</small><strong>{org.otherRegistrationNumber}</strong></div>}{org.registrationAuthority && <div><small>Issuing authority</small><strong>{org.registrationAuthority}</strong></div>}</div><p className="rescue-form-hint">These are entered by the Rescue and are not independently verified by TinyTitans.</p></section>}
    <section className="rescue-card"><div className="rescue-panel-heading"><div><span className="rescue-eyebrow">FEATURED ANIMALS</span><h2>Public-safe animal profiles</h2></div><span>{publicAnimals.length}</span></div><div className="rescue-animal-list">{publicAnimals.map((animal)=><article className="rescue-animal-row" key={animal.id}><span>🐍</span><span><strong>{animal.name || "Rescue animal"}</strong><small>{animal.speciesCommonName || "Species pending"} · {animal.sex || "Unknown"}</small>{animal.publicSummary && <small>{animal.publicSummary}</small>}</span><span>{STATUS_LABELS[animal.status]}</span></article>)}{!publicAnimals.length && <div className="rescue-empty"><strong>No public animal profiles</strong><span>Enable a public-safe preview on individual animal records to feature them here.</span></div>}</div></section>
    <section className="rescue-card"><div className="rescue-form-actions"><Link className="rescue-primary-link" to="/rescue/organisation">Back to organisation editor →</Link>{org.directoryVisible && <Link className="rescue-primary-link" to={`/rescue/public/${setup.organisationId}`}>Open live profile ↗</Link>}</div></section>
  </main></GatePage>;
}
