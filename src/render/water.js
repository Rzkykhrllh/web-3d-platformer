import * as THREE from 'three';

// Animated sea: standard material (so it gets lighting, fog and reflections)
// with waves added in the vertex shader and sparkly highlights in the fragment shader.

export function createWater(scene, { size = 600, segments = 160, y = -2.3 } = {}) {
  const geo = new THREE.PlaneGeometry(size, size, segments, segments);
  geo.rotateX(-Math.PI / 2);
  const uniforms = { uTime: { value: 0 } };
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1aa6c4,
    roughness: 0.12,
    metalness: 0.0,
    transparent: true,
    opacity: 0.92
  });

  mat.onBeforeCompile = shader => {
    shader.uniforms.uTime = uniforms.uTime;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', /* glsl */`
        #include <common>
        uniform float uTime;
        varying vec3 vWorld;
        // Sum of a few directional waves; returns height and slope
        vec3 wave(vec2 p) {
          float h = 0.0; vec2 d = vec2(0.0);
          vec4 w[3];
          w[0] = vec4(normalize(vec2(1.0, 0.3)), 0.18, 0.9);
          w[1] = vec4(normalize(vec2(-0.4, 1.0)), 0.27, 1.3);
          w[2] = vec4(normalize(vec2(0.7, -0.8)), 0.55, 1.9);
          float amp[3]; amp[0] = 0.32; amp[1] = 0.18; amp[2] = 0.07;
          for (int i = 0; i < 3; i++) {
            float ph = dot(w[i].xy, p) * w[i].z + uTime * w[i].w;
            h += sin(ph) * amp[i];
            d += w[i].xy * w[i].z * cos(ph) * amp[i];
          }
          return vec3(h, d);
        }`)
      .replace('#include <beginnormal_vertex>', /* glsl */`
        vec3 wv = wave(position.xz);
        vec3 objectNormal = normalize(vec3(-wv.y, 1.0, -wv.z));
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`)
      .replace('#include <begin_vertex>', /* glsl */`
        vec3 transformed = vec3(position);
        transformed.y += wv.x;
        vWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', /* glsl */`
        #include <common>
        uniform float uTime;
        varying vec3 vWorld;
        float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vnoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
        }`)
      .replace('#include <color_fragment>', /* glsl */`
        #include <color_fragment>
        vec2 q = vWorld.xz * 0.35;
        float n = vnoise(q + uTime * 0.25) * 0.6 + vnoise(q * 2.3 - uTime * 0.35) * 0.4;
        // Cell-like caustic bands and a few bright glints on wave crests
        float bands = smoothstep(0.62, 0.7, n) * 0.35;
        float crest = smoothstep(0.15, 0.32, vWorld.y + 2.3);
        diffuseColor.rgb = mix(diffuseColor.rgb * 0.75, diffuseColor.rgb * 1.15, n);
        diffuseColor.rgb += vec3(0.75, 0.95, 1.0) * (bands + crest * 0.25);`);
  };

  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = y;
  mesh.receiveShadow = true;
  scene.add(mesh);

  return { mesh, update(dt) { uniforms.uTime.value += dt; } };
}
