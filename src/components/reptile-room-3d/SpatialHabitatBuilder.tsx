    description: preset.description,
  };
};

function presetsFor(mode: SpatialBuilderMode) {
  const all = REPTILE_ROOM_ASSETS.map(toPreset);