    });
    queue = queue.concat(scene.nodes.filter((node) => node.parentId === current.id));
  }

  return { ...scene, nodes: [...scene.nodes, ...copies], updatedAt: new Date().toISOString() };
}

function aabb(node: SpatialNode) {
  const footprint = rotatedFootprint(node);
  return {
    l: node.position.x - footprint.width / 2,
    r: node.position.x + footprint.width / 2,
    f: node.position.z - footprint.depth / 2,
    b: node.position.z + footprint.depth / 2,
    bo: node.position.y,
    t: node.position.y + node.dimensions.height,
  };
}

function pointInPolygon(x: number, z: number, points: Array<{ x: number; z: number }>) {
  const EPSILON = 0.0001;
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i) {
    const a = points[i];
    const b = points[j];
    const cross = (x - a.x) * (b.z - a.z) - (z - a.z) * (b.x - a.x);
    const onSegment = Math.abs(cross) <= EPSILON
      && x >= Math.min(a.x, b.x) - EPSILON && x <= Math.max(a.x, b.x) + EPSILON
      && z >= Math.min(a.z, b.z) - EPSILON && z <= Math.max(a.z, b.z) + EPSILON;
    if (onSegment) return true;
    const crosses = a.z > z !== b.z > z && x < ((b.x - a.x) * (z - a.z)) / (b.z - a.z) + a.x;
    if (crosses) inside = !inside;
  }
  return inside;
}

function outsideConfiguredFloorPlan(node: SpatialNode, scene: SpatialHabitatScene) {
  if (node.parentId !== ROOT_CONTAINER_ID || !scene.root.floorPlan || scene.root.floorPlan.length < 3) return false;
  const footprint = rotatedFootprint(node);
  const points = scene.root.floorPlan.map((point) => ({
    x: point.x - scene.root.dimensions.width / 2,