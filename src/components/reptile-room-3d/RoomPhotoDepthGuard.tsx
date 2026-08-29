import { useEffect } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";

/**
 * Keeps vivarium-face photographs behaving like physical surfaces.
 * Older RoomObject3D versions used depthTest=false so a photo could paint
 * over the entire scene from behind a wall. This guard hardens any tagged
 * vivarium photo mesh at runtime without altering unrelated materials.
 */
export function RoomPhotoDepthGuard() {
  const { scene } = useThree();

  useEffect(() => {
    const refresh = () => {
      scene.traverse((node) => {
        if (!node.userData?.vivariumFaceImage) return;
        const mesh = node as THREE.Mesh;
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => {
          if (!material || !(material instanceof THREE.Material)) return;
          material.depthTest = true;
          material.depthWrite = false;
          material.side = THREE.FrontSide;
          material.transparent = false;
          material.needsUpdate = true;
        });
      });
    };

    refresh();
    const frame = requestAnimationFrame(refresh);
    return () => cancelAnimationFrame(frame);
  }, [scene]);

  return null;
}
