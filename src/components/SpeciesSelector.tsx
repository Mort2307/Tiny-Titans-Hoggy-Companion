import { INITIAL_SNAKE_SPECIES } from "../data/species/speciesRegistry";

const sortedSpecies = [...INITIAL_SNAKE_SPECIES].sort((a, b) => {
  const aName = a.commonNames[0] ?? a.acceptedScientificName;
  const bName = b.commonNames[0] ?? b.acceptedScientificName;
  return aName.localeCompare(bName);
});

type SpeciesSelectorProps = {
  id: string;
  value: string;
  onChange: (speciesId: string) => void;
  label?: string;
  className?: string;
  disabled?: boolean;
};

export default function SpeciesSelector({
  id,
  value,
  onChange,
  label = "Species",
  className,
  disabled = false,
}: SpeciesSelectorProps) {
  return (
    <label className={className} htmlFor={id}>
      <span>{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>
        {sortedSpecies.map((species) => (
          <option key={species.id} value={species.id}>
            {species.commonNames[0] ?? species.acceptedScientificName} — {species.acceptedScientificName}
          </option>
        ))}
      </select>
    </label>
  );
}
