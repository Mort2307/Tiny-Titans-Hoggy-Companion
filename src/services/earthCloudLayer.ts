import * as THREE from "three";

export type EarthCloudLayer = THREE.Group & {
  userData: {
    elapsedSeconds: number;
    primary: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>;
    wisps: THREE.Mesh<THREE.SphereGeometry, THREE.MeshPhongMaterial>;
    cloudTexture: THREE.Texture;
  };
};

const CLOUDS_IMG_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/clouds/clouds.png";

function configureCloudTexture(texture: THREE.Texture): void {
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 4;
  texture.generateMipmaps = true;
}

export async function createEarthCloudLayer(globeRadius = 100): Promise<EarthCloudLayer> {
  const texture = await new THREE.TextureLoader().loadAsync(CLOUDS_IMG_URL);
  configureCloudTexture(texture);

  const group = new THREE.Group() as EarthCloudLayer;
  const primaryMaterial = new THREE.MeshPhongMaterial({
    map: texture,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
    shininess: 8,
    side: THREE.FrontSide,
  });
  const wispMaterial = new THREE.MeshPhongMaterial({
    map: texture,
    transparent: true,
    opacity: 0.11,
    depthWrite: false,
    shininess: 5,
    side: THREE.FrontSide,
  });

  const primary = new THREE.Mesh(
    new THREE.SphereGeometry(globeRadius * 1.014, 192, 128),
    primaryMaterial,
  );
  const wisps = new THREE.Mesh(
    new THREE.SphereGeometry(globeRadius * 1.021, 160, 112),
    wispMaterial,
  );

  primary.rotation.y = THREE.MathUtils.degToRad(12);
  wisps.rotation.y = THREE.MathUtils.degToRad(-31);
  group.add(primary, wisps);
  group.userData = { elapsedSeconds: 0, primary, wisps, cloudTexture: texture };
  return group;
}

export function updateEarthCloudLayer(layer: EarthCloudLayer, elapsedSeconds: number, weatherEnabled: boolean): void {
  const { primary, wisps } = layer.userData;
  layer.userData.elapsedSeconds = elapsedSeconds;

  // The weather switch controls the cloud layer itself. With Weather OFF the
  // atmospheric cloud geometry is removed by the caller rather than merely dimmed.
  // The two shells drift at slightly different rates to avoid a single flat texture
  // looking like a rotating sticker on the planet.
  primary.rotation.y = THREE.MathUtils.degToRad(12) + elapsedSeconds * 0.00034;
  wisps.rotation.y = THREE.MathUtils.degToRad(-31) - elapsedSeconds * 0.00021;

  const primaryOpacity = weatherEnabled ? 0.34 : 0;
  const wispyOpacity = weatherEnabled ? 0.1 : 0;
  primary.material.opacity = THREE.MathUtils.lerp(primary.material.opacity, primaryOpacity, 0.08);
  wisps.material.opacity = THREE.MathUtils.lerp(wisps.material.opacity, wispyOpacity, 0.08);
}

export function disposeEarthCloudLayer(layer: EarthCloudLayer): void {
  layer.userData.cloudTexture.dispose();
  layer.userData.primary.geometry.dispose();
  layer.userData.primary.material.dispose();
  layer.userData.wisps.geometry.dispose();
  layer.userData.wisps.material.dispose();
  layer.clear();
}
