import * as THREE from "three";
import { useEffect, useState } from "react";

export const WOOD_COLOURS = {
  dark: "#41291d",
  medium: "#6a4328",
  light: "#895c34",
  metal: "#667078",
} as const;

export function useWoodTexture(colour: string) {
  const [texture, setTexture] = useState<THREE.CanvasTexture | null>(null);
  useEffect(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.fillStyle = colour;
    context.fillRect(0, 0, canvas.width, canvas.height);
    for (let index = 0; index < 180; index += 1) {
      const y = (index / 180) * canvas.height;
      context.beginPath();
      context.strokeStyle = `rgba(25,15,9,${0.06 + (index % 7) * 0.01})`;
      context.lineWidth = 1 + (index % 4) * 0.4;
      context.moveTo(-30, y);
      context.bezierCurveTo(220, y - 24, 500, y + 20, 1050, y - 10);
      context.stroke();
    }
    const next = new THREE.CanvasTexture(canvas);
    next.colorSpace = THREE.SRGBColorSpace;
    next.wrapS = THREE.RepeatWrapping;
    next.wrapT = THREE.RepeatWrapping;
    next.repeat.set(1.7, 1);
    next.anisotropy = 8;
    setTexture(next);
    return () => next.dispose();
  }, [colour]);
  return texture;
}

export function WoodMaterial({ colour }: { colour: string }) {
  const texture = useWoodTexture(colour);
  return <meshStandardMaterial color={colour} map={texture ?? undefined} roughness={0.66} metalness={0.02} />;
}

export function PanelMaterial({ style, colour }: { style: string; colour?: string }) {
  if (style === "front-opening") return <WoodMaterial colour={colour ?? WOOD_COLOURS.dark} />;
  if (style === "pvc" || style === "quarantine") {
    return <meshStandardMaterial color={style === "quarantine" ? "#d7dcde" : "#e5e7e3"} roughness={0.62} metalness={0.05} />;
  }
  return <meshStandardMaterial color="#697279" roughness={0.25} metalness={0.72} />;
}
