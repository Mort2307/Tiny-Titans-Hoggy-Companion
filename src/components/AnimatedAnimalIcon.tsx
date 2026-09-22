import { useEffect, useState } from "react";
import TinyTitansIcon from "./TinyTitansIcon";
import "../styles/AnimatedAnimalIcon.css";

type AnimalFrame = {
  id: string;
  label: string;
  src: string;
};

const GAME_ICONS_BASE = "https://game-icons.net/icons/f5b642/transparent/1x1/lorc";

export const MY_ANIMAL_ICON_FRAMES: readonly AnimalFrame[] = [
  { id: "snake", label: "Snake", src: `${GAME_ICONS_BASE}/snake.svg` },
  { id: "gecko", label: "Lizard", src: `${GAME_ICONS_BASE}/gecko.svg` },
  { id: "crocodile", label: "Crocodilian", src: `${GAME_ICONS_BASE}/croc-jaws.svg` },
  { id: "spider", label: "Spider", src: `${GAME_ICONS_BASE}/angular-spider.svg` },
  { id: "bird", label: "Bird", src: `${GAME_ICONS_BASE}/bird-twitter.svg` },
  { id: "fish", label: "Fish", src: `${GAME_ICONS_BASE}/angler-fish.svg` },
  { id: "amphibian", label: "Amphibian", src: `${GAME_ICONS_BASE}/frog.svg` },
  { id: "insect", label: "Insect", src: `${GAME_ICONS_BASE}/beetle-shell.svg` },
  { id: "mammal", label: "Mammal", src: `${GAME_ICONS_BASE}/monkey.svg` },
  { id: "cephalopod", label: "Cephalopod", src: `${GAME_ICONS_BASE}/octopus.svg` },
  { id: "crustacean", label: "Crustacean", src: `${GAME_ICONS_BASE}/crab.svg` },
  { id: "mollusc", label: "Mollusc", src: `${GAME_ICONS_BASE}/snail.svg` },
  { id: "myriapod", label: "Myriapod", src: `${GAME_ICONS_BASE}/centipede.svg` },
] as const;

const CYCLE_MS = 1800;

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
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const preload = MY_ANIMAL_ICON_FRAMES.map((frame) => {
      const image = new Image();
      image.src = frame.src;
      return image;
    });

    return () => {
      preload.forEach((image) => {
        image.src = "";
      });
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setImageFailed(false);
      setIndex((current) => (current + 1) % MY_ANIMAL_ICON_FRAMES.length);
    }, CYCLE_MS);

    return () => window.clearInterval(timer);
  }, []);

  if (imageFailed) {
    return (
      <TinyTitansIcon
        name="animals"
        size={size}
        className={className}
        title={title}
      />
    );
  }

  const frame = MY_ANIMAL_ICON_FRAMES[index];

  return (
    <span
      className={`tt-animated-animal-icon ${className}`.trim()}
      style={{ width: size, height: size }}
      title={title}
      aria-label={title ? frame.label : undefined}
    >
      <img
        key={frame.id}
        src={frame.src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        onError={() => setImageFailed(true)}
      />
    </span>
  );
}
