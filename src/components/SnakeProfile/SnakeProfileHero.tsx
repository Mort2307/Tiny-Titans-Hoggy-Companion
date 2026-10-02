import { useEffect, useState } from "react";
import type { Snake } from "../../types/Snake";
import { useUnits } from "../../context/UnitContextValue";
import TinyTitansIcon from "../TinyTitansIcon";

type Props = { snake: Snake; morphText: string; hetText: string; ageText: string; keeperTimeText: string; };

export default function SnakeProfileHero({ snake, morphText, hetText, ageText, keeperTimeText }: Props) {
  const { formatWeight } = useUnits();
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = (snake.photo || snake.imageUrl || snake.photoUrl || "").trim();

  useEffect(() => {
    setImageFailed(false);
  }, [photoUrl]);

  return <>
    <h1 className="snake-profile-heading"><TinyTitansIcon name="reptile" size={28} /> {snake.name}</h1>
    <section className="snake-profile-hero" aria-label={snake.name + " profile summary"}>
      <div className="snake-profile-photo">
        {photoUrl && !imageFailed
          ? <img src={photoUrl} alt={snake.name + " profile"} decoding="async" onError={() => setImageFailed(true)} />
          : <div className="snake-profile-placeholder" aria-label="No snake photo"><TinyTitansIcon name="reptile" size={78} /></div>}
      </div>
      <div className="snake-profile-identity">
        <p className="snake-profile-identity-kicker">Tiny Titans Snake Profile</p>
        <h2>{snake.name}</h2>
        <p className="snake-profile-identity-subtitle">{snake.species} · {snake.sex}{snake.nickname ? " · “" + snake.nickname + "”" : ""}</p>
        <div className="snake-profile-badges" aria-label="Key snake details">
          <span className="snake-profile-badge"><strong>Weight</strong>{snake.weight != null ? formatWeight(snake.weight) : "—"}</span>
          <span className="snake-profile-badge"><strong>Age</strong>{ageText}</span>
          <span className="snake-profile-badge"><strong>Time with keeper</strong>{keeperTimeText}</span>
          <span className="snake-profile-badge"><strong>Feeds</strong>{snake.feedingHistory?.length ?? 0}</span>
          <span className="snake-profile-badge"><strong>Sheds</strong>{snake.shedHistory?.length ?? 0}</span>
        </div>
        <p className="snake-profile-genetics-line"><strong>Genetics:</strong> {morphText}</p>
        <p className="snake-profile-genetics-line"><strong>Hets:</strong> {hetText}</p>
      </div>
    </section>
  </>;
}
