import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PaidTierGate from "../components/PaidTierGate";
import UniversalSpeciesPicker from "../components/UniversalSpeciesPicker";
import type { UniversalSpeciesRecord } from "../data/species/universalSpeciesTypes";
import { getPaidMarketplaceListings, upsertPaidMarketplaceListing, removePaidMarketplaceListing } from "../services/paidMarketplaceService";
import "../styles/PaidFeatureWorkspace.css";

type Listing = Record<string, unknown> & { id: string };

export default function PaidMarketplaceFeature() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("animal");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("GBP");
  const [description, setDescription] = useState("");
  const [selectedSpecies, setSelectedSpecies] = useState<UniversalSpeciesRecord | null>(null);
  const [status, setStatus] = useState("draft");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function refresh() {
    setLoading(true);
    try { const result = await getPaidMarketplaceListings(); setListings(result.listings as Listing[]); setMessage(""); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to load marketplace listings."); } finally { setLoading(false); }
  }
  useEffect(() => { void refresh(); }, []);
  async function createListing() {
    setMessage("");
    try { await upsertPaidMarketplaceListing({ title, category, price: Number(price), currency, description, status, speciesId: selectedSpecies?.id || "", animalGroup: selectedSpecies?.className || "", speciesCommonName: selectedSpecies?.commonNames[0] || "", scientificName: selectedSpecies?.acceptedScientificName || "" }); setTitle(""); setPrice(""); setDescription(""); setSelectedSpecies(null); setMessage("Listing saved."); await refresh(); } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to save listing."); }
  }

  return <PaidTierGate entitlement="marketplace_seller"><section className="paid-workspace-page"><header className="paid-feature-header"><div className="paid-feature-heading"><span className="paid-feature-icon-large" aria-hidden="true">🛒</span><div><span className="paid-workspace-kicker">Titan Seller · Business</span><h1>Marketplace Seller Tools</h1><p>Create, stage, activate and retire your own marketplace listings. Currency is stored with each listing so later display conversion can remain separate from the seller's source price.</p></div></div><Link className="paid-back-link" to="/paid">← Paid Feature Centre</Link></header><div className="paid-feature-content"><div className="paid-form-grid"><label><span>Listing title</span><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Example: Arctic Conda female"/></label><label><span>Category</span><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="animal, equipment, service…"/></label><div className="paid-form-grid-span"><UniversalSpeciesPicker value={selectedSpecies?.id || ""} onChange={setSelectedSpecies} label="Universal species (optional but recommended)" placeholder="Link this listing to a canonical species…" /></div><label><span>Price</span><input type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)}/></label><label><span>Currency</span><input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase().slice(0, 8))}/></label><label><span>Status</span><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="sold">Sold</option><option value="archived">Archived</option></select></label><label><span>Description</span><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What buyers should know."/></label></div><button className="paid-primary-action" type="button" onClick={() => void createListing()} disabled={!title || !price}>Save listing</button><p className="paid-status-text" aria-live="polite">{message}</p><div className="paid-list" style={{ marginTop: 16 }}>{loading ? <p>Loading listings…</p> : listings.length === 0 ? <div className="paid-info-panel"><h2>No listings yet</h2><p>Draft your first listing above. Nothing is published until you deliberately choose Active.</p></div> : listings.map((listing) => <div key={listing.id}><span><strong>{String(listing.title)}</strong><small>{String(listing.category)}{listing.speciesCommonName ? ` · ${String(listing.speciesCommonName)}` : ""} · {String(listing.price)} {String(listing.currency)} · {String(listing.status)}</small></span><button type="button" onClick={async () => { await removePaidMarketplaceListing(listing.id); await refresh(); }}>Delete</button></div>)}</div></div></section></PaidTierGate>;
}
