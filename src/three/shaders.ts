import * as THREE from 'three';

const liquidVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  uniform float uTime;
  uniform float uRipple;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec3 pos = position;

    if (pos.y > 0.4) {
      float dist = distance(vUv, vec2(0.5, 0.5));
      float wave = sin(dist * 26.0 - uTime * 14.0) * exp(-dist * 4.5) * uRipple * 0.08;
      pos.y += wave;
    }

    vPosition = pos;
    vec4 worldPos = modelMatrix * vec4(pos, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const liquidFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec3 vWorldPosition;
  uniform vec3 uBaseColor;
  uniform vec3 uTargetColor;
  uniform float uColorMix;
  uniform float uOpacity;

  void main() {
    vec3 col = mix(uBaseColor, uTargetColor, clamp(uColorMix, 0.0, 1.0));
    vec3 viewDir = normalize(cameraPosition - vWorldPosition);
    float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.0);
    col += fresnel * 0.25 * vec3(1.0);
    float verticalGradient = smoothstep(-0.6, 0.6, vPosition.y);
    col = mix(col * 0.85, col, verticalGradient * 0.4 + 0.6);
    gl_FragColor = vec4(col, uOpacity);
  }
`;

export function createLiquidShaderMaterial(
  initialColorHex: string,
  targetColorHex: string
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: liquidVertexShader,
    fragmentShader: liquidFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uRipple: { value: 0 },
      uBaseColor: { value: new THREE.Color(initialColorHex) },
      uTargetColor: { value: new THREE.Color(targetColorHex) },
      uColorMix: { value: 0.0 },
      uOpacity: { value: 0.88 },
    },
    transparent: true,
    side: THREE.DoubleSide,
  });
}

const paperVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const paperFragmentShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vWorldPosition;
  uniform vec3 uFromColor;
  uniform vec3 uToColor;
  uniform float uProgress;

  float rand(vec2 co) {
    return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
  }

  void main() {
    float grain = (rand(vUv * 120.0) - 0.5) * 0.08;
    float wetFront = clamp(uProgress * 0.65, 0.0, 0.65);
    float edgeSoftness = 0.06;
    float wetMask = smoothstep(wetFront + edgeSoftness, wetFront - edgeSoftness, vUv.y);
    float edgeHighlight = smoothstep(0.05, 0.0, abs(vUv.y - wetFront)) * step(0.02, uProgress) * 0.22;

    vec3 base = uFromColor + vec3(grain);
    vec3 wetTarget = uToColor + vec3(grain);
    vec3 finalColor = mix(base, wetTarget, wetMask);
    finalColor -= edgeHighlight;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

export function createPaperShaderMaterial(
  fromColorHex: string,
  toColorHex: string
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: paperVertexShader,
    fragmentShader: paperFragmentShader,
    uniforms: {
      uFromColor: { value: new THREE.Color(fromColorHex) },
      uToColor: { value: new THREE.Color(toColorHex) },
      uProgress: { value: 0.0 },
    },
    side: THREE.DoubleSide,
  });
}
