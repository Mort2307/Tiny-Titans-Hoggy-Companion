import type { Snake } from "../../types/Snake";

type SnakeContextCardProps = {
  snake: Pick<Snake, "name" | "species" | "sex" | "photo" | "morphs">;
  context?: string;
};

/** Keeps the active animal unmistakable on tracker and record screens. */
export default function SnakeContextCard({ snake, context }: SnakeContextCardProps) {
  const morph = snake.morphs?.length ? snake.morphs.join(", ") : snake.species;

  return (
    <section className="tt-snake-context" aria-label={`Current snake: ${snake.name}`}>
      <div className="tt-snake-context-avatar">
        {snake.photo ? (
          <img src={snake.photo} alt="" />
        ) : (
          <span aria-hidden="true">🐍</span>
        )}
      </div>
      <div className="tt-snake-context-copy">
        {context && <p className="tt-snake-context-kicker">{context}</p>}
        <h2>{snake.name}</h2>
        <p>{morph}{snake.sex ? ` • ${snake.sex}` : ""}</p>
      </div>
    </section>
  );
}
