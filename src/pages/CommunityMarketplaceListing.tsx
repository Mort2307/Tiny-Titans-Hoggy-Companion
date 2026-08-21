import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase/config";
import type { MarketplaceListing } from "../types/communityMarketplace";
import "../styles/CommunityHub.css";

export default function CommunityMarketplaceListing() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [listing, setListing] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (!id) { setError("This marketplace listing could not be identified."); setLoading(false); return () => { active = false; }; }
    void getDoc(doc(db, "communityMarketplace", id)).then((snapshot) => {
      if (!active) return;
      if (!snapshot.exists() || snapshot.data().status !== "active") { setError("This listing is no longer publicly available."); setLoading(false); return; }
      setListing({ id: snapshot.id, ...(snapshot.data() as Omit<MarketplaceListing, "id">) });
      setLoading(false);
    }).catch(() => { if (!active) return; setError("Unable to load this listing right now."); setLoading(false); });
    return () => { active = false; };
  }, [id]);

  if (loading) return <section className="community-page"><div className="community-empty"><span>🏪</span><h2>Loading listing…</h2></div></section>;
  if (error || !listing) return <section className="community-page"><div className="community-empty"><span>🔎</span><h2>Listing unavailable</h2><p>{error || "This listing cannot be displayed."}</p><button type="button" onClick={() => navigate("/community/marketplace")}>Back to Marketplace</button></div></section>;

  return <section className="community-page"><button className="community-back-button" type="button" onClick={() => navigate("/community/marketplace")}>← Marketplace</button><article className="community-form-card community-marketplace-detail"><div className="community-marketplace-detail-media">{listing.imageUrls?.length ? <img src={listing.imageUrls[0]} alt={listing.title} /> : <span>{listing.listingType === "equipment" ? "🛠️" : "🐍"}</span>}</div><div className="community-content-type">{listing.listingType} · {listing.availability || "available"}</div><h1>{listing.title}</h1><p className="community-detail-seller">Listed by <strong>{listing.sellerDisplayName}</strong></p><div className="community-detail-grid"><div><strong>Species</strong><span>{listing.species}</span></div>{listing.morph && <div><strong>Morph / genetics</strong><span>{listing.morph}</span></div>}{listing.sex && <div><strong>Sex</strong><span>{listing.sex}</span></div>}{listing.weightGrams != null && <div><strong>Weight</strong><span>{listing.weightGrams} g</span></div>}{listing.availableFrom && <div><strong>Available from</strong><span>{listing.availableFrom}</span></div>}<div><strong>Price</strong><span>{listing.price == null ? "Price on enquiry" : `£${listing.price.toFixed(2)}`}</span></div></div><div className="community-detail-section"><h2>Description</h2><p>{listing.description}</p></div>{listing.geneticsDisclosure && <div className="community-detail-section"><h2>Genetics disclosure</h2><p>{listing.geneticsDisclosure}</p></div>}{listing.provenanceDisclosure && <div className="community-detail-section"><h2>Provenance</h2><p>{listing.provenanceDisclosure}</p></div>}<div className="community-detail-safety"><strong>🛡️ Community welfare reminder</strong><p>Verify the animal, genetics and seller information independently. Animal welfare comes before the transaction.</p></div><button type="button" onClick={() => navigate(`/conversations?recipient=${encodeURIComponent(listing.sellerId)}`)}>💬 Contact seller</button></article></section>;
}
