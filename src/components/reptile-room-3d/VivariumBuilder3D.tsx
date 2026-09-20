    return () => { active = false; };
  }, [slot.id, slot.photoUrl, user]);
  const selectedAsset = twin.assets.find((asset) => asset.id === selectedId) ?? null;
  const selectedPreset = selectedAsset ? getRoomAssetPreset(selectedAsset.assetId) : undefined;

  useEffect(() => {
    const handler = (event: BeforeUnloadEvent) => {
      if (!dirty) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const requestClose = () => {
    if (dirty && !window.confirm("You have unsaved vivarium changes. Close without saving?")) return;
    onClose();
  };

  const patchChecklist = <K extends keyof VivariumDigitalTwin["checklist"]>(key: K, value: VivariumDigitalTwin["checklist"][K]) => { setDirty(true); setTwin((current) => ({ ...current, checklist: { ...current.checklist, [key]: value } })); };

  const addProp = (asset: (typeof REPTILE_ROOM_ASSETS)[number]) => {
    const preset = asset;
    const i = twin.assets.length;
    const next: VivariumTwinAsset = {
      id: newId(),
      assetId: preset.assetId ?? preset.kind,
      label: preset.label,
      category: categoryForAsset(preset),
      placement: preset.intelligenceRole === "lighting" ? "ceiling" : ["thermostat", "sensor"].includes(preset.intelligenceRole ?? "") ? "wall" : "floor",
      x: clamp(-0.2 + (i % 5) * 0.1, -0.42, 0.42),
      y: preset.intelligenceRole === "lighting" ? Math.max(0.03, (slot.height ?? 40) / 100 - 0.12) : 0.03,
      z: clamp(-0.15 + (Math.floor(i / 5) % 4) * 0.1, -0.38, 0.38),
      rotationY: 0,
      lockedToVivarium: true,
      config: preset.config ? { ...preset.config } : {},
    };
    setDirty(true);
    setTwin((current) => ({ ...current, assets: [...current.assets, next] }));
    setSelectedId(next.id);
    setMessage(`${preset.label} added to this vivarium.`);
  };

  const mutateSelected = (dx: number, dy: number, dz: number) => {
    if (!selectedAsset) return;
    setDirty(true);
    setTwin((current) => ({
      ...current,
      assets: current.assets.map((asset) => asset.id === selectedAsset.id ? { ...asset, x: clamp(asset.x + dx, -0.46, 0.46), y: Math.max(0.01, asset.y + dy), z: clamp(asset.z + dz, -0.46, 0.46) } : asset),
    }));
  };

  const rotateSelected = (degrees: number) => {
    if (!selectedAsset) return;
    setDirty(true);
    setTwin((current) => ({ ...current, assets: current.assets.map((asset) => asset.id === selectedAsset.id ? { ...asset, rotationY: (asset.rotationY ?? 0) + degrees * Math.PI / 180 } : asset) }));
  };

  const removeSelected = () => {
    if (!selectedAsset) return;
    setDirty(true);
    setTwin((current) => ({ ...current, assets: current.assets.filter((asset) => asset.id !== selectedAsset.id) }));
    setSelectedId(null);
    setMessage(`${selectedAsset.label} removed.`);
  };

  const loadExisting = async () => {
    if (!user) return;
    setLoading(true);
    setMessage("");
    try {
      const loaded = await loadVivariumTwin(user.uid, slot.id);
      setTwin({ ...cloneTwin(loaded), photoUrl: loaded.photoUrl ?? slot.photoUrl ?? "" });
      setDirty(false);
      setMessage("Vivarium twin loaded.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to load vivarium twin.");