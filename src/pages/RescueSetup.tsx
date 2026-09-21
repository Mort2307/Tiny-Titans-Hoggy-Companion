import PaidTierGate from "../components/PaidTierGate";
import TinyTitansIcon from "../components/TinyTitansIcon";
import { RescueBrandingPicker } from "../components/rescue/RescueBrandingPicker";
import { useRescueSetup } from "../hooks/useRescueSetup";
import "../styles/rescue.css";
import "../styles/rescue-community.css";

export default function RescueSetup() {
  const {
    form, setField, organisationId, loading, saving, error, brandingError,
    setBrandingError, submit,
  } = useRescueSetup();

  if (loading) return <PaidTierGate entitlement="rescue_workspace"><main className="rescue-page"><section className="rescue-card"><p>Preparing your Rescue setup…</p></section></main></PaidTierGate>;

  return <PaidTierGate entitlement="rescue_workspace"><main className="rescue-page">
    <header className="rescue-enhanced-hero">
      <div><span className="rescue-eyebrow">FIRST-TIME RESCUE SETUP</span><h1><TinyTitansIcon name="reptile" size={35}/> Set up your Rescue</h1><p>Before entering the operational workspace, give your Rescue a clear public identity. This is the information potential adopters, foster applicants and visitors can see.</p></div>
      <div className="rescue-public-setup-badge"><strong>Required</strong><span>Public profile setup</span></div>
    </header>
    {error && <div className="rescue-message rescue-message-error" role="alert">{error}</div>}
    {brandingError && <div className="rescue-message rescue-message-error" role="alert">{brandingError}</div>}
    <form className="rescue-setup-form" onSubmit={submit}>
      <section className="rescue-card"><span className="rescue-eyebrow">PUBLIC IDENTITY</span><h2>Tell people who you are</h2><p className="rescue-form-hint">Everything in this section is intended for the public Rescue profile. Do not enter private staff notes, medical details or personal information here.</p><div className="rescue-form-grid">
        <label>Rescue name*<input required maxLength={120} value={form.name} onChange={(event)=>setField("name",event.target.value)} placeholder="Registered / public Rescue name" disabled={saving}/></label>
        <label className="rescue-form-grid-span">Public description*<textarea required minLength={20} maxLength={3000} value={form.directoryDescription} onChange={(event)=>setField("directoryDescription",event.target.value)} placeholder="What the Rescue does, the animals you help and what visitors should know…" disabled={saving}/></label>
        <RescueBrandingPicker label="Logo image" kind="logo" organisationId={organisationId} value={form.logoUrl} onChange={(value)=>setField("logoUrl",value)} onError={setBrandingError} disabled={saving} hint="Square branding image shown beside your Rescue name." />
        <RescueBrandingPicker label="Hero image" kind="hero" organisationId={organisationId} value={form.heroImageUrl} onChange={(value)=>setField("heroImageUrl",value)} onError={setBrandingError} disabled={saving} hint="Wide public image used at the top of your Rescue profile." />
        <label>Website<input type="url" value={form.website} onChange={(event)=>setField("website",event.target.value)} placeholder="https://your-rescue.example" disabled={saving}/></label>
        <label>Public contact email*<input required type="email" value={form.contactEmail} onChange={(event)=>setField("contactEmail",event.target.value)} placeholder="contact@yourrescue.org" disabled={saving}/></label>
        <label>Public telephone<input value={form.phone} onChange={(event)=>setField("phone",event.target.value)} placeholder="Optional public number" disabled={saving}/></label>
      </div></section>

      <section className="rescue-card"><span className="rescue-eyebrow">PUBLIC LOCATION & ACCESS</span><h2>Help visitors find and understand your service</h2><p className="rescue-form-hint">Use the location you are happy to publish. A town / area is enough; do not enter a private home address unless the Rescue intentionally operates from that publicly advertised address.</p><div className="rescue-form-grid">
        <label>Town / area*<input required maxLength={160} value={form.locationLabel} onChange={(event)=>setField("locationLabel",event.target.value)} placeholder="e.g. Peterborough" disabled={saving}/></label>
        <label>Postcode<input maxLength={30} value={form.postcode} onChange={(event)=>setField("postcode",event.target.value)} placeholder="Optional public postcode" disabled={saving}/></label>
        <label>Region / county / state*<input required maxLength={120} value={form.region} onChange={(event)=>setField("region",event.target.value)} placeholder="e.g. Cambridgeshire" disabled={saving}/></label>
        <label>Country*<input required maxLength={120} value={form.country} onChange={(event)=>setField("country",event.target.value)} placeholder="e.g. United Kingdom" disabled={saving}/></label>
        <label className="rescue-form-grid-span">Opening hours / contact times<textarea maxLength={1000} value={form.openingHours} onChange={(event)=>setField("openingHours",event.target.value)} placeholder="e.g. Enquiries answered Mon–Fri 09:00–17:00. Visits by appointment." disabled={saving}/></label>
      </div></section>

      <section className="rescue-card"><span className="rescue-eyebrow">REGISTRATION & TRANSPARENCY</span><h2>Show the credentials visitors may need</h2><p className="rescue-form-hint">These fields are stored with the Rescue profile. They are only displayed publicly when you explicitly enable public registration details.</p><div className="rescue-form-grid">
        <label>Charity number<input maxLength={120} value={form.charityNumber} onChange={(event)=>setField("charityNumber",event.target.value)} placeholder="Optional" disabled={saving}/></label>
        <label>Company number<input maxLength={120} value={form.companyNumber} onChange={(event)=>setField("companyNumber",event.target.value)} placeholder="Optional" disabled={saving}/></label>
        <label>Local authority licence<input maxLength={120} value={form.localAuthorityLicence} onChange={(event)=>setField("localAuthorityLicence",event.target.value)} placeholder="Optional" disabled={saving}/></label>
        <label>Registration authority<input maxLength={160} value={form.registrationAuthority} onChange={(event)=>setField("registrationAuthority",event.target.value)} placeholder="Optional" disabled={saving}/></label>
        <label>Other registration / licence<input maxLength={120} value={form.otherRegistrationNumber} onChange={(event)=>setField("otherRegistrationNumber",event.target.value)} placeholder="Optional" disabled={saving}/></label>
      </div><label className="rescue-check"><input type="checkbox" checked={form.registrationsPublic} onChange={(event)=>setField("registrationsPublic",event.target.checked)} disabled={saving}/><span><strong>Publish these registration details on my public Rescue profile</strong><small>Leave this off when a number is for internal use only.</small></span></label></section>

      <section className="rescue-card rescue-security-panel"><span className="rescue-eyebrow">PUBLIC / PRIVATE BOUNDARY</span><h2>What stays inside the Rescue workspace?</h2><div className="rescue-security-grid"><div><strong>Public</strong><span>Rescue identity, public description, branding images, contact details, public location, opening/contact times, chosen registration details and public animal profiles.</span></div><div><strong>Private</strong><span>Staff records, medical information, internal notes, private documents, foster placement details, operational history and other restricted Rescue records.</span></div></div><label className="rescue-check"><input type="checkbox" checked={form.directoryVisible} onChange={(event)=>setField("directoryVisible",event.target.checked)} disabled={saving}/><span><strong>Publish my Rescue profile</strong><small>This must remain enabled to complete first-time setup. You can manage public profile visibility later.</small></span></label></section>

      <section className="rescue-card rescue-setup-submit"><div><span className="rescue-eyebrow">READY TO ENTER</span><h2>Save your Rescue identity</h2><p>Your public profile is kept separate from the operational Rescue records. Saving this form unlocks the Rescue workspace.</p></div><button type="submit" disabled={saving}>{saving ? "Saving Rescue profile…" : "Save & enter Rescue workspace →"}</button></section>
    </form>
  </main></PaidTierGate>;
}

}
