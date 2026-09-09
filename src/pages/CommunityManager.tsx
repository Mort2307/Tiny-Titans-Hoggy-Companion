import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { publishCommunityDraft } from '../services/communityService';
import { getCommunityCommentReports, removeReportedComment, setCommunityCommentReportStatus, type CommunityCommentReport } from '../services/communityModerationService';
import type { CommunityAudience, CommunityCategory, CommunityPriority, KnownIssueStatus } from '../types/community';
import '../styles/CommunityHub.css';

export default function CommunityManager() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [category, setCategory] = useState<CommunityCategory>('update');
  const [audience, setAudience] = useState<CommunityAudience>('everyone');
  const [priority, setPriority] = useState<CommunityPriority>('normal');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [appVersion, setAppVersion] = useState('');
  const [affectedPlatform, setAffectedPlatform] = useState('');
  const [severity, setSeverity] = useState<'low' | 'medium' | 'high' | 'critical'>('medium');
  const [status, setStatus] = useState<KnownIssueStatus>('Investigating');
  const [workaround, setWorkaround] = useState('');
  const [resolvedVersion, setResolvedVersion] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');
  const [reports, setReports] = useState<CommunityCommentReport[]>([]);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [moderationMessage, setModerationMessage] = useState('');

  async function loadReports() {
    if (!user || profile?.role !== 'admin') return;
    setReportsLoading(true); setModerationMessage('');
    try { setReports(await getCommunityCommentReports('open')); }
    catch (reportError) { setModerationMessage(reportError instanceof Error ? reportError.message : 'Moderation reports could not be loaded.'); }
    finally { setReportsLoading(false); }
  }

  useEffect(() => { if (profile?.role === 'admin' && user) void loadReports(); }, [profile?.role, user]);

  if (profile?.role !== 'admin') return <Navigate to='/' replace />;

  function resetOptionalFields(nextCategory: CommunityCategory) {
    setCategory(nextCategory);
    if (nextCategory !== 'known_issue') { setStatus('Investigating'); setSeverity('medium'); setWorkaround(''); setResolvedVersion(''); }
    if (nextCategory === 'update' || nextCategory === 'tester' || nextCategory === 'release') setAudience((current) => current === 'admin' ? 'everyone' : current);
  }
  async function publish(event: React.FormEvent) {
    event.preventDefault();
    if (!user || !title.trim() || !message.trim()) return;
    setSending(true); setError(''); setDone(false);
    try { await publishCommunityDraft({ category, audience, priority, title: title.trim(), message: message.trim(), appVersion: appVersion.trim() || undefined, affectedVersion: appVersion.trim() || undefined, affectedPlatform: affectedPlatform.trim() || undefined, severity: category === 'known_issue' ? severity : undefined, status: category === 'known_issue' ? status : undefined, workaround: category === 'known_issue' ? workaround.trim() || undefined : undefined, resolvedVersion: category === 'known_issue' ? resolvedVersion.trim() || undefined : undefined, imageUrl: imageUrl.trim() || undefined }, user.uid); setDone(true); setTitle(''); setMessage(''); setAppVersion(''); setAffectedPlatform(''); setWorkaround(''); setResolvedVersion(''); setImageUrl(''); }
    catch (publishError) { setError(publishError instanceof Error ? publishError.message : 'Unable to publish the community update.'); }
    finally { setSending(false); }
  }
  async function moderate(report: CommunityCommentReport, action: 'resolved' | 'dismissed' | 'delete') {
    setModerationMessage('');
    try { if (action === 'delete') { await removeReportedComment(report.postId, report.commentId); await setCommunityCommentReportStatus(report.id, 'resolved'); } else await setCommunityCommentReportStatus(report.id, action); setReports((current) => current.filter((item) => item.id !== report.id)); setModerationMessage(action === 'delete' ? 'Comment removed and report resolved.' : `Report marked ${action}.`); }
    catch (moderationError) { setModerationMessage(moderationError instanceof Error ? moderationError.message : 'Moderation action could not be completed.'); }
  }
  const needsVersion = category === 'known_issue' || category === 'tester' || category === 'release';
  return <section className='community-page'>
    <header className='community-hero'><div className='community-hero-icon'>📢</div><div><p className='community-eyebrow'>CREATOR CENTRE</p><h1>Community Manager</h1><p>Publish official information and keep community discussions safe, useful and reviewable.</p></div></header>
    <form className='community-manager-form' onSubmit={publish}><div className='community-manager-grid'><label>Content type<select value={category} onChange={(e) => resetOptionalFields(e.target.value as CommunityCategory)}><option value='update'>📢 Announcement / Update</option><option value='known_issue'>🐛 Known Issue</option><option value='tester'>🧪 Tester Update</option><option value='release'>📋 Release Note</option></select></label><label>Audience<select value={audience} onChange={(e) => setAudience(e.target.value as CommunityAudience)}><option value='everyone'>Everyone</option><option value='testers'>Testers</option><option value='admin'>Creator/Admin</option></select></label><label>Priority<select value={priority} onChange={(e) => setPriority(e.target.value as CommunityPriority)}><option value='normal'>Normal</option><option value='important'>Important</option><option value='critical'>Critical</option></select></label>{category === 'known_issue' && <label>Status<select value={status} onChange={(e) => setStatus(e.target.value as KnownIssueStatus)}><option>Investigating</option><option>Fixing</option><option>Testing</option><option>Resolved</option></select></label>}{category === 'known_issue' && <label>Severity<select value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}><option value='low'>Low</option><option value='medium'>Medium</option><option value='high'>High</option><option value='critical'>Critical</option></select></label>}</div><label>Title<input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={140} placeholder='e.g. Tiny Titans v1.4.2 — tester build ready' required /></label><label>Message<textarea value={message} onChange={(e) => setMessage(e.target.value)} maxLength={6000} rows={8} placeholder='Write the official update…' required /></label>{needsVersion && <div className='community-manager-grid'><label>App / affected version<input value={appVersion} onChange={(e) => setAppVersion(e.target.value)} placeholder='e.g. 0.9.8' /></label><label>Affected platform<input value={affectedPlatform} onChange={(e) => setAffectedPlatform(e.target.value)} placeholder='e.g. Android / iOS / Web' /></label></div>}{category === 'known_issue' && <><label>Workaround<input value={workaround} onChange={(e) => setWorkaround(e.target.value)} placeholder='Optional workaround users can try' /></label><label>Resolved version<input value={resolvedVersion} onChange={(e) => setResolvedVersion(e.target.value)} placeholder='Fill this when resolved' /></label></>}<label>Optional image URL<input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder='https://…' inputMode='url' /></label>{done && <div className='community-manager-success'>✓ Published successfully. It will now appear in the Community Hub for the selected audience.</div>}{error && <div className='community-manager-error'>{error}</div>}<div className='community-manager-actions'><button type='button' onClick={() => navigate('/community')}>Back to Hub</button><button type='submit' disabled={sending || !title.trim() || !message.trim()}>{sending ? 'Publishing…' : '🚀 Publish to Community Hub'}</button></div></form>
    <section className='community-feedback-card community-admin-card' aria-label='Community moderation queue'><div><span className='community-feedback-icon' aria-hidden='true'>🛡️</span><div><h2>Community moderation queue</h2><p>Reported comments stay in a creator-only review queue. You can dismiss a report or remove the reported comment.</p></div></div><div className='community-manager-actions'><button type='button' onClick={() => void loadReports()} disabled={reportsLoading}>{reportsLoading ? 'Refreshing…' : '↻ Refresh reports'}</button><strong>{reports.length} open report{reports.length === 1 ? '' : 's'}</strong></div>{moderationMessage && <p className='community-manager-success' role='status'>{moderationMessage}</p>}{!reportsLoading && reports.length === 0 && <p className='community-empty'><span>✅</span><strong>No open comment reports.</strong></p>}{reportsLoading && <p className='community-empty'>Loading moderation reports…</p>}{!reportsLoading && reports.length > 0 && <div className='community-manager-form'>{reports.map((report) => <article key={report.id} className='community-post community-post-important'><div className='community-post-top'><span className='community-post-category'>REPORT</span><time>{new Date(report.createdAt).toLocaleString('en-GB')}</time></div><h3>{report.postTitle}</h3><p><strong>{report.commentAuthorName}:</strong> “{report.commentText}”</p><p><strong>Reason:</strong> {report.reason}</p><div className='community-manager-actions'><button type='button' onClick={() => void moderate(report, 'dismissed')}>Dismiss</button>{report.commentExists && <button type='button' onClick={() => void moderate(report, 'delete')}>🗑️ Remove comment</button>}<button type='button' onClick={() => void moderate(report, 'resolved')}>Resolve</button></div></article>)}</div>}</section>
  </section>;
}
