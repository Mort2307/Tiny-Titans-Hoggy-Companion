import { useEffect, useRef, useState } from "react";
import "../styles/AnimatedAnimalIcon.css";

type AnimalFrame = {
  id: string;
  label: string;
  src: string;
};

/**
 * Open animal icon set sourced from Game-icons.net / Lorc and stored locally
 * so the PWA does not depend on a third-party request at render time.
 */
export const MY_ANIMAL_ICON_FRAMES: readonly AnimalFrame[] = [
  { id: "snake", label: "Snake", src: "/animal-icons/snake.svg" },
  { id: "lizard", label: "Lizard", src: "/animal-icons/gecko.svg" },
  { id: "crocodilian", label: "Crocodilian", src: "/animal-icons/crocodile.svg" },
  { id: "spider", label: "Spider", src: "/animal-icons/spider.svg" },
  { id: "bird", label: "Bird", src: "/animal-icons/bird.svg" },
  { id: "fish", label: "Fish", src: "/animal-icons/fish.svg" },
  { id: "amphibian", label: "Amphibian", src: "/animal-icons/amphibian.svg" },
  { id: "insect", label: "Insect", src: "/animal-icons/insect.svg" },
  { id: "mammal", label: "Mammal", src: "/animal-icons/mammal.svg" },
  { id: "cephalopod", label: "Cephalopod", src: "/animal-icons/cephalopod.svg" },
  { id: "crustacean", label: "Crustacean", src: "/animal-icons/crustacean.svg" },
  { id: "mollusc", label: "Mollusc", src: "/animal-icons/mollusc.svg" },
  { id: "myriapod", label: "Myriapod", src: "/animal-icons/myriapod.svg" },
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
      style={{ width: size, height: size }}
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
