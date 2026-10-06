import * as THREE from 'three';

// Gradient sky dome with a soft sun glow, some puffy clouds, and an environment
// map baked from the same sky so materials pick up matching reflections.

export const SUN_DIR = new THREE.Vector3(0.45, 0.62, 0.35).normalize();

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x2f8fe0) },
      horizon: { value: new THREE.Color(0xbfeaf5) },
      bottom: { value: new THREE.Color(0x7fd3f0) },
      sunDir: { value: SUN_DIR },
      sunColor: { value: new THREE.Color(0xfff2c8) }
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        gl_Position = p.xyww;
      }`,
    fragmentShader: /* glsl */`
      uniform vec3 top, horizon, bottom, sunDir, sunColor;
      varying vec3 vDir;
      void main() {
        float h = vDir.y;
        vec3 col = h > 0.0
          ? mix(horizon, top, pow(smoothstep(0.0, 0.7, h), 0.8))
          : mix(horizon, bottom, smoothstep(0.0, -0.25, h));
        float s = max(dot(vDir, sunDir), 0.0);
        col += sunColor * (pow(s, 600.0) * 2.5 + pow(s, 12.0) * 0.25);
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`
  });
}

export function createSky(scene, renderer, rand) {
  const dome = new THREE.Mesh(new THREE.SphereGeometry(450, 32, 16), skyMaterial());
  dome.renderOrder = -1;
  scene.add(dome);

  // Environment map from the sky alone
  const envScene = new THREE.Scene();
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(10, 32, 16), skyMaterial()));
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromScene(envScene, 0.04).texture;
  pmrem.dispose();
  scene.environment = env;

  // Clouds: clusters of smooth blobs, lit from the sun side
  const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, emissive: 0xbfd8e8, emissiveIntensity: 0.35 });
  const blob = new THREE.IcosahedronGeometry(1, 2);
  const clouds = [];
  for (let i = 0; i < 14; i++) {
    const g = new THREE.Group();
    const n = 4 + Math.floor(rand() * 4);
    for (let j = 0; j < n; j++) {
      const m = new THREE.Mesh(blob, cloudMat);
      const s = 3 + rand() * 4;
      m.scale.set(s * 1.3, s * 0.8, s);
      m.position.set((j - n / 2) * 4 + rand() * 2, rand() * 2 - (Math.abs(j - n / 2) * 0.6), rand() * 3);
      g.add(m);
    }
    g.position.set(-200 + rand() * 400, 45 + rand() * 35, -320 + rand() * 260);
    g.userData.speed = 0.8 + rand() * 1.5;
    scene.add(g);
    clouds.push(g);
  }

  return {
    update(dt, camera) {
      dome.position.copy(camera.position);
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 220) c.position.x = -220;
      }
    }
  };
}
