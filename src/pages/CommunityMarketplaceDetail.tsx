import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { MarketplaceListing } from "../types/communityMarketplace";
import { getActiveMarketplaceListing } from "../services/communityMarketplaceDetailService";
import "../styles/CommunityHub.css";

export default function CommunityMarketplaceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<MarketplaceListing | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { let mounted = true; if (!id) { setLoading(false); return; } void getActiveMarketplaceListing(id).then((value) => { if (mounted) setItem(value); }).finally(() => { if (mounted) setLoading(false); }); return () => { mounted = false; }; }, [id]);
  if (loading) return <section className="community-page"><div className="community-empty"><span>🏪</span><h2>Loading listing…</h2></div></section>;
  if (!item) return <section className="community-page"><div className="community-empty"><span>🥚</span><h2>Listing unavailable</h2><p>This listing may have sold, been withdrawn, or is awaiting moderation.</p><button type="button" onClick={() => navigate("/community/marketplace")}>Back to Marketplace</button></div></section>;
  return <section className="community-page"><button type="button" className="community-back-button" onClick={() => navigate("/community/marketplace")}>← Marketplace</button><article className="community-detail-card">{item.imageUrls.length > 0 && <img className="community-detail-image" src={item.imageUrls[0]} alt="" />}{item.listingType && <span className="community-content-type">🏪 {item.listingType}</span>}<h1>{item.title}</h1><p className="community-detail-byline">Listed by {item.sellerDisplayName}</p><p className="community-detail-summary">{item.species}{item.morph ? ` · ${item.morph}` : ""}{item.sex && ` · ${item.sex}`}</p><div className="community-detail-body"><p>{item.description}</p>{item.geneticsDisclosure && <><h2>Genetics disclosure</h2><p>{item.geneticsDisclosure}</p></>}{item.provenanceDisclosure && <><h2>Provenance</h2><p>{item.provenanceDisclosure}</p></>}{item.weightGrams != null && <p><strong>Recorded weight:</strong> {item.weightGrams}g</p>}{item.availableFrom && <p><strong>Available from:</strong> {item.availableFrom}</p>}</div><div className="community-detail-actions"><strong>{item.price != null ? `${item.currency ?? "GBP"} ${item.price.toFixed(2)}` : "Price on enquiry"}</strong><button type="button" onClick={() => navigate(`/conversations?recipient=${encodeURIComponent(item.sellerId)}&listing=${encodeURIComponent(item.id)}`)}>Message seller →</button></div><p className="community-form-hint">Tiny Titans does not verify private transactions. Check welfare, genetics, provenance and seller information carefully before making arrangements.</p></article></section>;
}
