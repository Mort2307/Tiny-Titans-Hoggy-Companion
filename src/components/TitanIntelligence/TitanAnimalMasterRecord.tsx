import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../context/useAuth";
import type { AnimalMasterRecord } from "../../intelligence/v50/animalMasterRecordEngine";
import { getTitanDecisionState, type TitanDecision } from "../../services/titanDecisionStateService";
import { subscribeToTitanIntelligenceUpdates } from "../../services/titanReactiveIntelligenceService";

interface Props { snakeId?: string; snakeName:string; record:AnimalMasterRecord }

export default function TitanAnimalMasterRecord({snakeId,snakeName,record}:Props){
  const { user } = useAuth();
  const [decision,setDecision]=useState<TitanDecision|null>(null);
  useEffect(()=>{
    if(!user)return()=>undefined;
    const refresh=()=>{
      const state=getTitanDecisionState(user.uid);
      const active=state.decisions.filter(item=>item.status==="active");
      const idMatch=snakeId?active.find(item=>item.animalId===snakeId):undefined;
      const nameMatches=active.filter(item=>item.animalName===snakeName);
      setDecision(idMatch??(nameMatches.length===1?nameMatches[0]:null));
    };
    refresh();
    return subscribeToTitanIntelligenceUpdates(refresh,user.uid);
  },[user,snakeId,snakeName]);
  return <section className="titan-feature-panel titan-master-record">
  <div className="titan-master-record__header"><div><p className="titan-feature-kicker">🧠 TITAN MASTER RECORD</p><h2>{snakeName}</h2><p>{record.note}</p></div><div className="titan-master-record__score" aria-label={`${record.coverageScore}% record coverage`}><strong>{record.coverageScore}%</strong><span>record coverage</span></div></div>
  {decision&&<div className="titan-master-record__changes"><h3>⚡ What Titan Intelligence wants you to see next</h3><article className="titan-master-record__signal"><div><strong>{decision.title}</strong><p>{decision.reason}</p><small>Decision score {decision.score}/100 · {Math.round(decision.confidence*100)}% confidence · {decision.domain}</small></div><Link to={decision.destination||"/"}>Open →</Link></article></div>}
  <div className="titan-master-record__confidence"><div><strong>{record.dataConfidence.score}%</strong><span>data confidence · {record.dataConfidence.band}</span></div><p>{record.dataConfidence.explanation}</p></div>
  <div className="titan-master-record__domains">{record.domains.map(domain=><article key={domain.id} className={`titan-master-record__domain titan-master-record__domain--${domain.state}`}><div><strong>{domain.label}</strong><span>{domain.detail}</span></div><b>{domain.count}</b></article>)}</div>
  <div className="titan-master-record__factors">{record.dataConfidence.factors.map(factor=><div key={factor.id}><strong>{factor.score}%</strong><span>{factor.label}</span><small>{factor.explanation}</small></div>)}</div>
  {record.crossDomainSignals.length>0&&<div className="titan-master-record__changes"><h3>🧪 Cross-domain patterns</h3>{record.crossDomainSignals.slice(0,3).map(signal=><article className="titan-master-record__signal" key={signal.id}><div><strong>{signal.title}</strong><p>{signal.summary}</p><small>{Math.round(signal.confidence*100)}% confidence · co-occurrence only · no causal claim</small></div><Link to="/titan-intelligence/feature/15">Why am I seeing this? →</Link></article>)}</div>}
  {record.changes.length>0&&<div className="titan-master-record__changes"><h3>🔎 Something changed</h3>{record.changes.map(change=><article key={change.id}><div><strong>{change.title}</strong><p>{change.detail}</p><small>{Math.round(change.confidence*100)}% confidence · temporal pattern only</small></div><Link to={change.destination}>Review →</Link></article>)}</div>}
  {record.suggestions.length>0&&<div className="titan-master-record__suggestions"><h3>What Tiny Titans sees next</h3>{record.suggestions.map(suggestion=><article key={suggestion.id}><div><strong>{suggestion.title}</strong><p>{suggestion.reason}</p><small>{Math.round(suggestion.confidence*100)}% confidence · record-derived</small></div><Link to={suggestion.destination}>Open →</Link></article>)}</div>}
  {record.latestEvent&&<div className="titan-feature-note"><strong>Latest recorded event:</strong> {record.latestEvent.label} · {new Date(record.latestEvent.date).toLocaleDateString("en-GB")} · {record.latestEvent.type}.</div>}
</section>}
