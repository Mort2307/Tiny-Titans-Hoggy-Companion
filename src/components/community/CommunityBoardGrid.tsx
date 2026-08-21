import { useNavigate } from "react-router-dom";
import { COMMUNITY_BOARDS, type CommunityBoardKey } from "../../types/communityEcosystem";

type Props = { activeBoard: CommunityBoardKey | "all"; onSelect: (board: CommunityBoardKey | "all") => void };

export default function CommunityBoardGrid({ activeBoard, onSelect }: Props) {
  const navigate = useNavigate();
  const openBoard = (board: CommunityBoardKey | "all") => {
    onSelect(board);
    navigate(board === "all" ? "/community/boards" : `/community/boards?board=${board}`);
  };
  return <section className="community-boards">
    <div className="community-subheading"><div><span className="community-eyebrow">EXPLORE</span><h2>Community Boards</h2><p>Choose a space and open the full board, or browse everything together.</p></div><button type="button" className={activeBoard === "all" ? "active" : ""} onClick={() => openBoard("all")}>All activity →</button></div>
    <div className="community-board-grid">{COMMUNITY_BOARDS.map((board) => <button key={board.key} type="button" className={`community-board-card ${activeBoard === board.key ? "active" : ""}`} onClick={() => openBoard(board.key)}><span>{board.icon}</span><div><strong>{board.title}</strong><small>{board.description}</small><em>Open board →</em></div></button>)}</div>
  </section>;
}
