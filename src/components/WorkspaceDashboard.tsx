import { Link } from "react-router-dom";
import type { WorkspaceProductId } from "../config/workspaceProducts";
import "../styles/workspaceDashboard.css";

type DashboardItem = { eyebrow: string; title: string; text: string; path: string; action?: string };

const DATA: Record<Exclude<WorkspaceProductId, "personal" | "rescue">, { title: string; intro: string; stats: Array<[string,string]>; items: DashboardItem[] }> = {
  titan_pro: {
    title: "Titan Command",
    intro: "A serious keeper workspace built around deeper animal records, intelligence, genetics and breeding.",
    stats: [["Animals","Open register"],["Intelligence","Open insights"],["Breeding","Open planner"],["Records","Open records"]],
    items: [
      { eyebrow:"ANIMAL INTELLIGENCE",title:"Animal Master Records",text:"Bring weight, feeding, shed, health and behaviour into one contextual animal view.",path:"/snakes",action:"Open animals" },
      { eyebrow:"GENETICS",title:"Authoritative genetics",text:"Work with species-aware genetics, bounded outcomes and evidence-gated combinations.",path:"/calculator",action:"Open calculator" },
      { eyebrow:"BREEDING",title:"Breeding command",text:"Plan pairings, readiness, cycles and production from one connected workspace.",path:"/breeding",action:"Open breeding" },
      { eyebrow:"INTELLIGENCE",title:"Titan Intelligence",text:"Review proactive decisions, cross-domain signals and animal-specific context.",path:"/titan-intelligence",action:"Open intelligence" },
    ],
  },
  titan_seller: {
    title: "Seller Command",
    intro: "A selling workspace connecting animal records, listings, conversations and customer-facing workflows.",
    stats: [["Animals","Register"],["Listings","Marketplace"],["Messages","Conversations"],["Seller tools","Workspace"]],
    items: [
      { eyebrow:"ANIMAL REGISTER",title:"Animals ready to sell",text:"Keep the authoritative animal record underneath every listing.",path:"/snakes",action:"Open animals" },
      { eyebrow:"LISTINGS",title:"Marketplace",text:"Create and manage customer-facing listings without leaving TinyTitans.",path:"/marketplace",action:"Open marketplace" },
      { eyebrow:"CUSTOMERS",title:"Messages & enquiries",text:"Continue conversations around animals, listings and submissions.",path:"/conversations",action:"Open messages" },
      { eyebrow:"SELLER TOOLS",title:"Seller workspace",text:"Use the paid seller workflow for listing and customer operations.",path:"/paid/marketplace",action:"Open seller tools" },
    ],
  },
  business_starter: {
    title: "Business Command",
    intro: "A focused business workspace for small animal-keeping businesses and breeding operations.",
    stats: [["Animals","Register"],["Marketplace","Listings"],["Breeding","Production"],["Public page","Branding"]],
    items: [
      { eyebrow:"OPERATIONS",title:"Business animal register",text:"Connect animal records to the wider business workflow.",path:"/snakes",action:"Open animals" },
      { eyebrow:"COMMERCIAL",title:"Marketplace",text:"Keep listings and customer-facing information connected to the source animal.",path:"/marketplace",action:"Open listings" },
      { eyebrow:"BREEDING",title:"Production workspace",text:"Keep breeding plans and production records alongside your organisation.",path:"/breeding",action:"Open breeding" },
      { eyebrow:"BRANDING",title:"Public business page",text:"Present your business identity, hours, credentials and contact details.",path:"/account/partner-landing",action:"Open public page" },
    ],
  },
  business_plus: {
    title: "Business Plus Operations",
    intro: "A shared operations workspace for established teams, reporting and repeatable workflows.",
    stats: [["Animals","Register"],["Team","Organisation"],["Reports","Operations"],["Branding","Public page"]],
    items: [
      { eyebrow:"OPERATIONS",title:"Organisation animal register",text:"One source of truth for the animals underpinning your business.",path:"/snakes",action:"Open animals" },
      { eyebrow:"TEAM",title:"Organisation access",text:"Keep staff roles and workspace membership separate from personal accounts.",path:"/account/partner-landing",action:"Manage organisation" },
      { eyebrow:"REPORTING",title:"Business reporting",text:"Track operational information connected to your existing TinyTitans records.",path:"/paid/business-reporting",action:"Open reports" },
      { eyebrow:"PUBLIC PRESENCE",title:"Customer landing page",text:"Give customers a professional business-facing experience.",path:"/account/partner-landing",action:"Open page" },
    ],
  },
  business_advanced: {
    title: "Business Advanced Command",
    intro: "The professional operating layer for animal-keeping businesses that need intelligence, controls and connected workflows.",
    stats: [["Intelligence","Open insights"],["Reports","Operations"],["API & tools","Developer"],["Organisation","Control"]],
    items: [
      { eyebrow:"INTELLIGENCE",title:"Organisation intelligence",text:"Use advanced TinyTitans intelligence with the business context in view.",path:"/titan-intelligence",action:"Open intelligence" },
      { eyebrow:"REPORTING",title:"Advanced reporting",text:"Keep business reporting connected to animals and organisation operations.",path:"/paid/business-reporting",action:"Open reports" },
      { eyebrow:"TOOLS",title:"API & tools",text:"Use the advanced paid workspace surfaces available to the organisation.",path:"/paid",action:"Open tools" },
      { eyebrow:"ORGANISATION",title:"Organisation control",text:"Manage the public-facing identity and organisation workspace settings.",path:"/account/partner-landing",action:"Open organisation" },
    ],
  },
};

export default function WorkspaceDashboard({ productId }: { productId: Exclude<WorkspaceProductId, "personal" | "rescue"> }) {
  const data = DATA[productId];
  return <main className={"workspace-dashboard workspace-dashboard--" + productId}>
    <section className="workspace-dashboard__hero"><div><span className="workspace-dashboard__eyebrow">WORKSPACE HOME</span><h1>{data.title}</h1><p>{data.intro}</p></div><Link className="workspace-dashboard__primary" to="/plans">Workspace plan →</Link></section>
    <section className="workspace-dashboard__stats">{data.stats.map(([label,action])=><Link to={label==="Animals"?"/snakes":label==="Intelligence"?"/titan-intelligence":label==="Breeding"?"/breeding":label==="Records"?"/weights":label==="Listings"?"/marketplace":label==="Messages"?"/conversations":label==="Seller tools"?"/paid/marketplace":label==="Team"?"/account/partner-landing":label==="Reports"?"/paid/business-reporting":label==="Public page"?"/account/partner-landing":"/paid"} key={label}><small>{label}</small><strong>{action}</strong><span>Open →</span></Link>)}</section>
    <section className="workspace-dashboard__grid">{data.items.map((item)=><article key={item.title}><span>{item.eyebrow}</span><h2>{item.title}</h2><p>{item.text}</p><Link to={item.path}>{item.action || "Open →"}</Link></article>)}</section>
    <section className="workspace-dashboard__intelligence"><div><span>SHARED TINY TITANS INTELLIGENCE</span><h2>Your workspace stays connected to the wider TinyTitans intelligence ecosystem.</h2><p>Workspace-specific context stays separate from private records while eligible, consented signals can contribute to Creator-governed intelligence.</p></div><Link to="/account/intelligence">Intelligence &amp; privacy →</Link></section>
  </main>;
}
