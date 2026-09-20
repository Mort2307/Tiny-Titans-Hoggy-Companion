  else if (["thermometer", "hygrometer", "temp-humidity"].includes(preset.kind)) category = "monitoring";
  else if (["hide", "cork", "branch", "plant", "cleaning-station", "scale"].includes(preset.kind)) category = "enrichment";
  else if (preset.kind === "water-bowl") category = "water";

  const powerConsumer = Boolean(preset.config?.wattage) || ["heating", "lighting"].includes(category);
  return {
    assetId: preset.assetId ?? preset.kind,
    kind: preset.kind as SpatialAssetPreset["kind"],
    category,
    label: preset.label,
    icon: preset.icon,
    width: preset.width,
    depth: preset.depth,
    height: preset.height,
    capabilities: {
      ...(category === "enclosure" ? { container: true } : {}),
      ...(powerConsumer ? { powerConsumer: true } : {}),
      ...(category === "heating" && preset.kind !== "thermostat" ? { heatSource: true } : {}),
      ...(category === "lighting" ? { lightSource: true, ceilingMountable: true } : {}),

      ...(preset.kind === "uvb" ? { uvbSource: true } : {}),
      ...(category === "monitoring" ? { sensor: true } : {}),
      ...(category === "water" ? { waterSource: true } : {}),
      ...(["thermostat", "thermometer", "hygrometer", "temp-humidity", "socket", "smart-plug", "timer", "vent", "window", "door"].includes(preset.kind) ? { wallMountable: true } : {}),

    },
    config: preset.config as SpatialAssetPreset["config"],
    description: preset.description,
  };
};

function presetsFor(mode: SpatialBuilderMode) {
  const all = REPTILE_ROOM_ASSETS.map(toPreset);