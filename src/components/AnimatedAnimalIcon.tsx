import { useEffect, useRef, useState, type CSSProperties } from "react";
import "../styles/AnimatedAnimalIcon.css";

type AnimalFrame = {
  id: string;
  label: string;
  src: string;
  hue: number;
  saturation: number;
};

/**
 * Open animal icon set sourced from Game-icons.net / Lorc and stored locally
 * so the PWA does not depend on a third-party request at render time.
 */
export const MY_ANIMAL_ICON_FRAMES: readonly AnimalFrame[] = [
  { id: "snake", label: "Snake", src: "/animal-icons/snake.svg", hue: 0, saturation: 1.08 },
  { id: "lizard", label: "Lizard", src: "/animal-icons/gecko.svg", hue: 72, saturation: 1.12 },
  { id: "crocodilian", label: "Crocodilian", src: "/animal-icons/crocodile.svg", hue: 145, saturation: 1.1 },
  { id: "spider", label: "Spider", src: "/animal-icons/spider.svg", hue: 238, saturation: 1.16 },
  { id: "bird", label: "Bird", src: "/animal-icons/bird.svg", hue: 300, saturation: 1.12 },
  { id: "fish", label: "Fish", src: "/animal-icons/fish.svg", hue: 184, saturation: 1.16 },
  { id: "amphibian", label: "Amphibian", src: "/animal-icons/amphibian.svg", hue: 112, saturation: 1.12 },
  { id: "insect", label: "Insect", src: "/animal-icons/insect.svg", hue: 42, saturation: 1.14 },
  { id: "mammal", label: "Mammal", src: "/animal-icons/mammal.svg", hue: 268, saturation: 1.1 },
  { id: "cephalopod", label: "Cephalopod", src: "/animal-icons/cephalopod.svg", hue: 205, saturation: 1.14 },
  { id: "crustacean", label: "Crustacean", src: "/animal-icons/crustacean.svg", hue: 18, saturation: 1.12 },
  { id: "mollusc", label: "Mollusc", src: "/animal-icons/mollusc.svg", hue: 330, saturation: 1.1 },
  { id: "myriapod", label: "Myriapod", src: "/animal-icons/myriapod.svg", hue: 92, saturation: 1.14 },
] as const;

const HOLD_MS = 1650;
const TRANSITION_MS = 550;

type Props = {
  size?: number;
  className?: string;
  title?: string;
};

export default function AnimatedAnimalIcon({
  size = 25,
  className = "",
  title,
}: Props) {
  const [index, setIndex] = useState(0);
  const [transitioning, setTransitioning] = useState(false);
  const indexRef = useRef(0);

  useEffect(() => {
    const images = MY_ANIMAL_ICON_FRAMES.map((frame) => {
      const image = new Image();
      image.src = frame.src;
      return image;
    });

    let cancelled = false;
    let holdTimer: number | undefined;
    let transitionTimer: number | undefined;

    const advance = () => {
      if (cancelled) return;

      const nextIndex = (indexRef.current + 1) % MY_ANIMAL_ICON_FRAMES.length;
      setTransitioning(true);

      transitionTimer = window.setTimeout(() => {
        if (cancelled) return;
        indexRef.current = nextIndex;
        setIndex(nextIndex);
        setTransitioning(false);
        holdTimer = window.setTimeout(advance, HOLD_MS);
      }, TRANSITION_MS);
    };

    holdTimer = window.setTimeout(advance, HOLD_MS);

    return () => {
      cancelled = true;
      if (holdTimer !== undefined) window.clearTimeout(holdTimer);
      if (transitionTimer !== undefined) window.clearTimeout(transitionTimer);
      images.forEach((image) => {
        image.onload = null;
        image.onerror = null;
      });
    };
  }, []);

  const current = MY_ANIMAL_ICON_FRAMES[index];
  const next = MY_ANIMAL_ICON_FRAMES[(index + 1) % MY_ANIMAL_ICON_FRAMES.length];

  return (
    <span
      className={`tt-animated-animal-icon${transitioning ? " is-transitioning" : ""} ${className}`.trim()}
      style={{ width: size, height: size, "--tt-animal-hue": `${current.hue}deg`, "--tt-animal-saturation": current.saturation } as CSSProperties}
      title={title}
      aria-label={title ? current.label : undefined}
      role={title ? "img" : undefined}
    >
      <img
        className="tt-animated-animal-icon__frame tt-animated-animal-icon__current"
        src={current.src}
        alt=""
        width={size}
        height={size}
        draggable={false}
      />
      {transitioning && (
        <img
          className="tt-animated-animal-icon__frame tt-animated-animal-icon__next"
          style={{ "--tt-animal-hue": `${next.hue}deg`, "--tt-animal-saturation": next.saturation } as CSSProperties}
          src={next.src}
          alt=""
          width={size}
          height={size}
          draggable={false}
        />
      )}
    </span>
  );
}
