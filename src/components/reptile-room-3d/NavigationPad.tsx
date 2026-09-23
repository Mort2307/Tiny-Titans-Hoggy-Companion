import type { CSSProperties, PointerEvent as ReactPointerEvent } from "react";
import { ROOM_NAVIGATION_SPACING_CM } from "./RoomNavigation3D";
import type { RoomNavigationNode } from "./RoomNavigation3D";

function NavigationPad({ nodes, activeNode, onMove }: { nodes: RoomNavigationNode[]; activeNode: RoomNavigationNode; onMove: (node: RoomNavigationNode) => void }) {
  const findNode = (dx: number, dz: number) => nodes.find((node) => node.xCm === activeNode.xCm + dx && node.zCm === activeNode.zCm + dz) ?? activeNode;
  const buttonStyle: CSSProperties = { width: 34, height: 30, padding: 0, display: "grid", placeItems: "center", borderRadius: 8, border: "1px solid rgba(255,255,255,.14)", background: "rgba(13,17,20,.88)", color: "#f4f7f8", fontSize: 16, fontWeight: 800, cursor: "pointer", backdropFilter: "blur(8px)", boxShadow: "0 5px 16px rgba(0,0,0,.22)" };
  const stop = (event: ReactPointerEvent<HTMLButtonElement>) => event.stopPropagation();
  return <div className="rr3d-navigation-pad"><div className="rr3d-control-kicker">CAMERA</div><div className="rr3d-navigation-grid"><div aria-hidden="true" /><button type="button" aria-label="Move camera forward" title="Forward" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(0, -ROOM_NAVIGATION_SPACING_CM))}>↑</button><div aria-hidden="true" /><button type="button" aria-label="Move camera left" title="Left" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(-ROOM_NAVIGATION_SPACING_CM, 0))}>←</button><button type="button" aria-label="Move camera backward" title="Backward" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(0, ROOM_NAVIGATION_SPACING_CM))}>↓</button><button type="button" aria-label="Move camera right" title="Right" style={buttonStyle} onPointerDown={stop} onClick={() => onMove(findNode(ROOM_NAVIGATION_SPACING_CM, 0))}>→</button></div></div>;
}

export default NavigationPad;
