import * as THREE from "three";

export type EarthCloudLayer = THREE.Mesh<THREE.SphereGeometry, THREE.ShaderMaterial>;

const CLOUD_VERTEX_SHADER = `
  varying vec2 vUv;
  varying vec3 vNormal;
  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CLOUD_FRAGMENT_SHADER = `
  uniform sampler2D cloudTexture;
  uniform float uTime;
  uniform float uOpacity;
  varying vec2 vUv;
  varying vec3 vNormal;

  void main() {
    vec2 driftUv = vec2(fract(vUv.x - uTime * 0.0022), vUv.y);
    float cloud = texture2D(cloudTexture, driftUv).r;
    float softCloud = smoothstep(0.42, 0.68, cloud);
    float edgeLight = pow(max(dot(normalize(vNormal), vec3(0.2, 0.55, 0.8)), 0.0), 2.2);
    float alpha = softCloud * uOpacity * (0.68 + edgeLight * 0.32);
    if (alpha < 0.012) discard;
    gl_FragColor = vec4(vec3(0.96, 0.98, 1.0), alpha);
  }
`;

function makeCloudTexture(): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Cloud texture canvas could not be created");

  const image = ctx.createImageData(canvas.width, canvas.height);
  const data = image.data;
  const width = canvas.width;
  const height = canvas.height;

  const hash = (x: number, y: number, seed: number): number => {
    const value = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453;
    return value - Math.floor(value);
  };

  const smoothNoise = (x: number, y: number, scale: number, seed: number): number => {
    const fx = x / scale;
    const fy = y / scale;
    const x0 = Math.floor(fx);
    const y0 = Math.floor(fy);
    const tx = fx - x0;
    const ty = fy - y0;
    const sx = tx * tx * (3 - 2 * tx);
    const sy = ty * ty * (3 - 2 * ty);
    const a = hash(x0, y0, seed);
    const b = hash(x0 + 1, y0, seed);
    const c = hash(x0, y0 + 1, seed);
    const d = hash(x0 + 1, y0 + 1, seed);
    return (a + (b - a) * sx) + ((c + (d - c) * sx) - (a + (b - a) * sx)) * sy;
  };

  for (let y = 0; y < height; y += 1) {
    const latitude = Math.abs(y / (height - 1) * 2 - 1);
    const latitudeFade = 1 - Math.pow(latitude, 8) * 0.7;
    for (let x = 0; x < width; x += 1) {
      const n1 = smoothNoise(x, y, 105, 1.3);
      const n2 = smoothNoise(x, y, 52, 8.1);
      const n3 = smoothNoise(x, y, 22, 19.4);
      const value = Math.max(0, Math.min(1, (n1 * 0.58 + n2 * 0.28 + n3 * 0.14) * latitudeFade));
      const index = (y * width + x) * 4;
      const cloud = Math.round(value * 255);
      data[index] = cloud;
      data[index + 1] = cloud;
      data[index + 2] = cloud;
      data[index + 3] = 255;
    }
  }

  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
  return texture;
}

export function createEarthCloudLayer(globeRadius = 100): EarthCloudLayer {
  const geometry = new THREE.SphereGeometry(globeRadius * 1.012, 128, 96);
  const texture = makeCloudTexture();
  const material = new THREE.ShaderMaterial({
    uniforms: {
      cloudTexture: { value: texture },
      uTime: { value: 0 },
      uOpacity: { value: 0.26 },
    },
    vertexShader: CLOUD_VERTEX_SHADER,
    fragmentShader: CLOUD_FRAGMENT_SHADER,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: THREE.FrontSide,
  });
  return new THREE.Mesh(geometry, material);
}

export function updateEarthCloudLayer(layer: EarthCloudLayer, elapsedSeconds: number, weatherEnabled: boolean): void {
  layer.material.uniforms.uTime.value = elapsedSeconds;
  layer.material.uniforms.uOpacity.value = weatherEnabled ? 0.34 : 0.22;
}

export function disposeEarthCloudLayer(layer: EarthCloudLayer): void {
  layer.material.uniforms.cloudTexture.value.dispose();
  layer.geometry.dispose();
  layer.material.dispose();
}
