import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import { getRescueOrganisation } from "../services/rescueService";
import { getMyRescueWorkspace } from "../services/rescueWorkspaceService";
import { uploadRescueBrandingImage, type RescueBrandingImageKind } from "../services/rescueBrandingService";
import { updateRescueDirectoryProfile } from "../services/rescueDirectoryService";
import "../styles/rescue.css";
import "../styles/rescue-directory.css";

type BrandingPickerProps = {
  label:string;
  value:string;
  kind:RescueBrandingImageKind;
  organisationId:string;
  disabled:boolean;
  hint:string;
  onChange:(value:string)=>void;
  onError:(message:string)=>void;
};

function BrandingPicker({ label, value, kind, organisationId, disabled, hint, onChange, onError }:BrandingPickerProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);

  async function chooseImage(file:File) {
    setUploading(true);
    onError("");
    try {
      const url = await uploadRescueBrandingImage(organisationId, kind, file);
      onChange(url);
    } catch (error) {
      onError(error instanceof Error ? error.message : "Could not upload that image.");
    } finally {
      setUploading(false);
    }
  }

  return <div className={`rescue-branding-picker rescue-branding-picker-${kind}`}>
    <div className="rescue-branding-field-heading">
      <div><strong>{label}</strong><small>{hint}</small></div>
      {value && <button type="button" className="rescue-secondary-button" onClick={() => onChange("")} disabled={disabled || uploading}>Remove</button>}
    </div>
    {value && <img className="rescue-branding-preview" src={value} alt={`${label} preview`} />}
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      disabled={disabled || uploading}
      onChange={(event) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (file) void chooseImage(file);
      }}
    />
    <button type="button" className="rescue-branding-upload-button" onClick={() => inputRef.current?.click()} disabled={disabled || uploading}>
      <span aria-hidden="true">{uploading ? "⏳" : "＋"}</span>
      <span><strong>{uploading ? "Adding image…" : value ? `Replace ${label.toLowerCase()}` : `Choose ${label.toLowerCase()}`}</strong><small>Choose a JPG, PNG or WebP image from your device.</small></span>
    </button>
    <label className="rescue-branding-url-field">
      <span>Or use a public HTTPS image URL</span>
      <input
        type="url"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="https://…"
        disabled={disabled || uploading}
      />
    </label>
  </div>;
}

export default function RescueDirectoryProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organisationId, setOrganisationId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [locationLabel, setLocationLabel] = useState("");
  const [postcode, setPostcode] = useState("");
  const [region, setRegion] = useState("");
  const [country, setCountry] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [openingHours, setOpeningHours] = useState("");
  const [description, setDescription] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [heroImageUrl, setHeroImageUrl] = useState("");
  const [directoryVisible, setDirectoryVisible] = useState(true);
  const [charityNumber, setCharityNumber] = useState("");
  const [companyNumber, setCompanyNumber] = useState("");
  const [localAuthorityLicence, setLocalAuthorityLicence] = useState("");
  const [otherRegistrationNumber, setOtherRegistrationNumber] = useState("");
  const [registrationAuthority, setRegistrationAuthority] = useState("");
  const [registrationNotes, setRegistrationNotes] = useState("");
  const [registrationEvidenceUrl, setRegistrationEvidenceUrl] = useState("");
  const [registrationsPublic, setRegistrationsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [brandingError, setBrandingError] = useState("");

  useEffect(() => {
    if (!user) return;
    void getMyRescueWorkspace().then(async (result) => {
      const org = result.organisation;
      if (!org || result.role !== "owner") {
        setLoading(false);
        return;
      }
      const fullOrg = await getRescueOrganisation(org.id);
      const data = (fullOrg || org) as unknown as Record<string, unknown>;
      setOrganisationId(org.id);
      setName(String(data.name || org.name || ""));
      setLocationLabel(String(data.locationLabel || ""));
      setPostcode(String(data.postcode || ""));
      setRegion(String(data.region || ""));
      setCountry(String(data.country || "United Kingdom"));
      setWebsite(String(data.website || ""));
      setContactEmail(String(data.contactEmail || ""));
      setOpeningHours(String(data.openingHours || ""));
      setDescription(String(data.directoryDescription || data.publicDescription || ""));
      setLogoUrl(String(data.logoUrl || ""));
      setHeroImageUrl(String(data.heroImageUrl || ""));
      setDirectoryVisible(data.directoryVisible !== false);
      setCharityNumber(String(data.charityNumber || ""));
      setCompanyNumber(String(data.companyNumber || ""));
      setLocalAuthorityLicence(String(data.localAuthorityLicence || ""));
      setOtherRegistrationNumber(String(data.otherRegistrationNumber || ""));
      setRegistrationAuthority(String(data.registrationAuthority || ""));
      setRegistrationNotes(String(data.registrationNotes || ""));
      setRegistrationEvidenceUrl(String(data.registrationEvidenceUrl || ""));
      setRegistrationsPublic(data.registrationsPublic !== false);
      setLoading(false);
    }).catch((error) => {
      setMessage(error instanceof Error ? error.message : "Unable to load your Rescue listing.");
      setLoading(false);
    });
  }, [user]);

  async function save() {
    if (!organisationId) {
      setMessage("Create or activate your Rescue workspace before editing its public profile.");
      return;
    }
    if (!locationLabel.trim()) {
      setMessage("Add a searchable location first.");
      return;
    }
    setSaving(true);
    setMessage("");
    try {
      await updateRescueDirectoryProfile({
        locationLabel,
        postcode,
        region,
        country,
        website,
        contactEmail,
        description,
        logoUrl,
        heroImageUrl,
        directoryVisible,
        charityNumber,
        companyNumber,
        localAuthorityLicence,
        otherRegistrationNumber,
        registrationAuthority,
        registrationNotes,
        registrationEvidenceUrl,
        registrationsPublic,
      });
      setMessage("✅ Organisation, branding and compliance details updated.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update the Rescue public profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!user) return <main className="rescue-page"><section className="rescue-card"><h1>Organisation & Branding</h1><p>Sign in to manage your Rescue organisation profile.</p></section></main>;
  if (loading) return <main className="rescue-page"><section className="rescue-card"><p>Loading Organisation & Branding…</p></section></main>;
  if (!organisationId) return <main className="rescue-page"><section className="rescue-card"><span className="rescue-eyebrow">RESCUE ACCESS</span><h1>Set up your Rescue workspace first</h1><p>This area is only for an approved Rescue organisation owner.</p><Link to="/rescue?manage=1">Open Rescue workspace →</Link></section></main>;

  return <main className="rescue-page">
    <header className="rescue-subhead">
      <div><span className="rescue-eyebrow">ORGANISATION & BRANDING</span><h1>{name || "Rescue organisation"}</h1><p>Manage the public identity, searchable listing and registration details visitors can see.</p></div>
      <div className="rescue-form-actions"><Link to="/rescue?manage=1">← Rescue workspace</Link><Link className="rescue-primary-link" to="/rescue/public-preview">Preview public profile →</Link></div>
    </header>

    {message && <div className="rescue-message" role="status">{message}</div>}
    {brandingError && <div className="rescue-message rescue-message-error" role="alert">{brandingError}</div>}

    <section className="rescue-card">
      <span className="rescue-eyebrow">ORGANISATION DETAILS</span>
      <h2>Public identity</h2>
      <div className="rescue-form-grid">
        <label>Rescue name<input maxLength={120} value={name} onChange={(e) => setName(e.target.value)} placeholder="Registered / public Rescue name" /></label>
        <label>Searchable location<input value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} placeholder="Town / city / area" /></label>
        <label>Postcode<input value={postcode} onChange={(e) => setPostcode(e.target.value)} placeholder="Optional public postcode" /></label>
        <label>Region / county<input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Optional" /></label>
        <label>Country<input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="United Kingdom" /></label>
        <label>Website<input type="url" value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></label>
        <label>Public contact email<input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="contact@yourrescue.org" /></label>
        <label className="rescue-form-grid-span">Opening hours / contact times<textarea maxLength={1000} value={openingHours} onChange={(e) => setOpeningHours(e.target.value)} placeholder="e.g. Enquiries Mon–Fri 09:00–17:00. Visits by appointment." /></label>
        <label className="rescue-form-grid-span">Public description<textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Tell keepers what your Rescue does…" /></label>
      </div>
    </section>

    <section className="rescue-card">
      <span className="rescue-eyebrow">VISUAL IDENTITY</span>
      <h2>Logo & hero image</h2>
      <p className="rescue-form-hint">Upload images directly from your device, or paste a public HTTPS image URL. JPG, PNG and WebP are supported.</p>
      <div className="rescue-branding-grid">
        <BrandingPicker
          label="Logo image"
          kind="logo"
          organisationId={organisationId}
          value={logoUrl}
          onChange={setLogoUrl}
          onError={setBrandingError}
          disabled={saving}
          hint="Square branding shown beside the Rescue name."
        />
        <BrandingPicker
          label="Hero image"
          kind="hero"
          organisationId={organisationId}
          value={heroImageUrl}
          onChange={setHeroImageUrl}
          onError={setBrandingError}
          disabled={saving}
          hint="Wide public image shown at the top of the Rescue profile."
        />
      </div>
    </section>

    <section className="rescue-card">
      <span className="rescue-eyebrow">PUBLIC DIRECTORY</span>
      <h2>Discovery & visitor information</h2>
      <p className="rescue-form-hint">Your public directory listing is separate from private Rescue operational records.</p>
      <label className="rescue-check"><input type="checkbox" checked={directoryVisible} onChange={(e) => setDirectoryVisible(e.target.checked)} disabled={saving}/> Show this Rescue in the public directory</label>
    </section>

    <section className="rescue-card">
      <span className="rescue-eyebrow">OFFICIAL REGISTRATIONS</span>
      <h2>Rescue compliance details</h2>
      <p className="rescue-form-hint">Optional. Add only registrations, licences or permits the organisation actually holds. TinyTitans does not independently verify a number merely because it has been entered here.</p>
      <div className="rescue-form-grid">
        <label>Charity registration number<input value={charityNumber} onChange={(e) => setCharityNumber(e.target.value)} placeholder="Optional" /></label>
        <label>Company registration number<input value={companyNumber} onChange={(e) => setCompanyNumber(e.target.value)} placeholder="Optional" /></label>
        <label>Local authority licence number<input value={localAuthorityLicence} onChange={(e) => setLocalAuthorityLicence(e.target.value)} placeholder="Optional" /></label>
        <label>Other permit / registration number<input value={otherRegistrationNumber} onChange={(e) => setOtherRegistrationNumber(e.target.value)} placeholder="Optional" /></label>
        <label>Issuing authority<input value={registrationAuthority} onChange={(e) => setRegistrationAuthority(e.target.value)} placeholder="Optional" /></label>
        <label>Evidence / verification link<input type="url" value={registrationEvidenceUrl} onChange={(e) => setRegistrationEvidenceUrl(e.target.value)} placeholder="Optional HTTPS URL" /></label>
        <label className="rescue-form-grid-span">Registration notes<textarea value={registrationNotes} onChange={(e) => setRegistrationNotes(e.target.value)} placeholder="Optional issue, expiry or verification context…" /></label>
      </div>
      <label className="rescue-check"><input type="checkbox" checked={registrationsPublic} onChange={(e) => setRegistrationsPublic(e.target.checked)} disabled={saving}/><span><strong>Publish entered registration details</strong><small>Leave this off for registration information that should remain private.</small></span></label>
    </section>

    <div className="rescue-form-actions">
      <button type="button" disabled={saving} onClick={() => void save()}>{saving ? "Saving…" : "Save Organisation & Branding"}</button>
      <button type="button" onClick={() => navigate("/rescue?manage=1")}>Back to Rescue workspace</button>
    </div>
  </main>;
}
