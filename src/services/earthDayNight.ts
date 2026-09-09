import * as THREE from "three";

// NASA Blue Marble / Three Globe assets. The day texture is the richer Blue Marble
// surface used by the Three Globe examples; the supporting topology and water masks
// let the custom shader add subtle terrain relief and ocean specular response.
export const EARTH_DAY_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-blue-marble.jpg";
export const EARTH_NIGHT_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-night.jpg";
export const EARTH_BUMP_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-topology.png";
export const EARTH_WATER_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/earth-water.png";
export const EARTH_STAR_TEXTURE_URL = "https://cdn.jsdelivr.net/npm/three-globe/example/img/night-sky.png";

export const EARTH_DAY_NIGHT_VERTEX_SHADER = `
  varying vec3 vWorldNormal;
  varying vec2 vUv;
  void main() {
    vWorldNormal = normalize(mat3(modelMatrix) * normal);
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const EARTH_DAY_NIGHT_FRAGMENT_SHADER = `
  uniform sampler2D dayTexture;
  uniform sampler2D nightTexture;
  uniform sampler2D topologyTexture;
  uniform sampler2D waterTexture;
  uniform vec3 sunDirection;
  varying vec3 vWorldNormal;
  varying vec2 vUv;

  void main() {
    vec4 dayColor = texture2D(dayTexture, vUv);
    vec4 nightColor = texture2D(nightTexture, vUv);
    float terrain = texture2D(topologyTexture, vUv).r;
    float water = texture2D(waterTexture, vUv).r;

    float intensity = dot(normalize(vWorldNormal), normalize(sunDirection));
    float dayFactor = smoothstep(-0.16, 0.14, intensity);
    float twilightFactor = smoothstep(-0.32, 0.02, intensity);

    // Preserve the rich Blue Marble colour in daylight while gently lifting
    // terrain facing the light so the surface reads as three-dimensional.
    float relief = 0.9 + terrain * 0.16;
    vec3 litDay = dayColor.rgb * relief;

    // A narrow, soft terminator gives the Earth a more photographic transition
    // between day, twilight and night rather than a hard shader cutoff.
    vec3 twilightColor = mix(nightColor.rgb, litDay, twilightFactor);
    vec3 finalColor = mix(twilightColor, litDay, dayFactor);

    // Ocean surfaces pick up a restrained blue-white sun glint on the illuminated
    // side without washing out land or night lights.
    float oceanMask = smoothstep(0.35, 0.65, water);
    float sunGlint = pow(max(intensity, 0.0), 7.0) * oceanMask * 0.16;
    finalColor += vec3(0.10, 0.17, 0.24) * sunGlint;

    // Keep night lights crisp while allowing a trace of twilight colour at the edge.
    finalColor += nightColor.rgb * (1.0 - twilightFactor) * 0.015;

    gl_FragColor = vec4(clamp(finalColor, 0.0, 1.0), 1.0);
  }
`;

export type EarthDayNightMaterial = THREE.ShaderMaterial & {
  uniforms: {
    dayTexture: { value: THREE.Texture };
    nightTexture: { value: THREE.Texture };
    topologyTexture: { value: THREE.Texture };
    waterTexture: { value: THREE.Texture };
    sunDirection: { value: THREE.Vector3 };
  };
};

export function getSolarCoordinates(date: Date): { lat: number; lng: number } {
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 1);
  const dayOfYear = Math.floor((date.getTime() - yearStart) / 86400000) + 1;
  const utcMinutes = date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const gamma = (2 * Math.PI / 365) * (dayOfYear - 1 + (utcMinutes - 720) / 1440);
  const equationOfTime = 229.18 * (0.000075 + 0.001868 * Math.cos(gamma) - 0.032077 * Math.sin(gamma) - 0.014615 * Math.cos(2 * gamma) - 0.040849 * Math.sin(2 * gamma));
  const declination = 0.006918 - 0.399912 * Math.cos(gamma) + 0.070257 * Math.sin(gamma) - 0.006758 * Math.cos(2 * gamma) + 0.000907 * Math.sin(2 * gamma) - 0.002697 * Math.cos(3 * gamma) + 0.00148 * Math.sin(3 * gamma);
  return {
    lat: declination * 180 / Math.PI,
    lng: (720 - utcMinutes - equationOfTime) / 4,
  };
}

export function geoToSunDirection(lat: number, lng: number): THREE.Vector3 {
  const latRad = lat * Math.PI / 180;
  const lngRad = lng * Math.PI / 180;
  // Match three-globe's geographic Cartesian convention: x = cos(lat)cos(lng),
  // y = sin(lat), z = cos(lat)sin(lng). This keeps the solar terminator aligned
  // with the same latitude/longitude coordinates used by globe markers and POV.
  return new THREE.Vector3(Math.cos(latRad) * Math.cos(lngRad), Math.sin(latRad), Math.cos(latRad) * Math.sin(lngRad)).normalize();
}

export function updateEarthSun(material: EarthDayNightMaterial, date = new Date()): void {
  const solar = getSolarCoordinates(date);
  material.uniforms.sunDirection.value.copy(geoToSunDirection(solar.lat, solar.lng));
}

export async function loadEarthDayNightMaterial(): Promise<EarthDayNightMaterial> {
  const loader = new THREE.TextureLoader();
  const [dayTexture, nightTexture, topologyTexture, waterTexture] = await Promise.all([
    loader.loadAsync(EARTH_DAY_TEXTURE_URL),
    loader.loadAsync(EARTH_NIGHT_TEXTURE_URL),
    loader.loadAsync(EARTH_BUMP_TEXTURE_URL),
    loader.loadAsync(EARTH_WATER_TEXTURE_URL),
  ]);

  dayTexture.colorSpace = THREE.SRGBColorSpace;
  nightTexture.colorSpace = THREE.SRGBColorSpace;
  topologyTexture.colorSpace = THREE.NoColorSpace;
  waterTexture.colorSpace = THREE.NoColorSpace;

  for (const texture of [dayTexture, nightTexture, topologyTexture, waterTexture]) {
    texture.anisotropy = 4;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
  }

  return new THREE.ShaderMaterial({
    uniforms: {
      dayTexture: { value: dayTexture },
      nightTexture: { value: nightTexture },
      topologyTexture: { value: topologyTexture },
      waterTexture: { value: waterTexture },
      sunDirection: { value: geoToSunDirection(0, 0) },
    },
    vertexShader: EARTH_DAY_NIGHT_VERTEX_SHADER,
    fragmentShader: EARTH_DAY_NIGHT_FRAGMENT_SHADER,
    side: THREE.FrontSide,
  }) as EarthDayNightMaterial;
}
