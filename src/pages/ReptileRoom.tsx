import ReptileRoomDigitalTwin3D from "./ReptileRoomDigitalTwin3D";

/**
 * Reptile Room is intentionally 3D-first.
 *
 * The Digital Twin is the primary room builder and visual source of truth.
 * The underlying room/spatial services remain shared infrastructure for
 * persistence, dimensions, placement, snapping, and future intelligence.
 */
export default function ReptileRoom() {
  return <ReptileRoomDigitalTwin3D />;
}
