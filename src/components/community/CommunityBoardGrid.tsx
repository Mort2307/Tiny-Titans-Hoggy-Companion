import { COMMUNITY_BOARDS, type CommunityBoardKey } from "../../types/communityEcosystem";

type Props = { activeBoard: CommunityBoardKey | "all"; onSelect: (board: CommunityBoardKey | "all") => void };

export default function CommunityBoardGrid({ activeBoard, onSelect }: Props) {
  return <section className="community-boards">
    <div className="community-subheading"><div><span className="community-eyebrow">EXPLORE</span><h2>Community Boards</h2><p>Choose a space, or let Tiny Titans keep the feed broad.</p></div><button type="button" className={activeBoard === "all" ? "active" : ""} onClick={() => onSelect("all")}>All activity</button></div>
    <div className="community-board-grid">{COMMUNITY_BOARDS.map((board) => <button key={board.key} type="button" className={`community-board-card ${activeBoard === board.key ? "active" : ""}`} onClick={() => onSelect(board.key)}><span>{board.icon}</span><div><strong>{board.title}</strong><small>{board.description}</small></div></button>)}</div>
  </section>;
}
