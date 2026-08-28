import ReptileRoomDigitalTwin3D from "./ReptileRoomDigitalTwin3D";
import RoomBlueprintPanel from "../components/reptile-room-3d/RoomBlueprintPanel";

/** The 3D Digital Twin is the canonical room builder and visual source of truth. */
export default function ReptileRoom() {
  return <><RoomBlueprintPanel /><ReptileRoomDigitalTwin3D /></>;
}
