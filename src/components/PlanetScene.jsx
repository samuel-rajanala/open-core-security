import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

const BASE = "https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2";

export default function PlanetScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    let disposed = false;
    let frame = 0;
    let renderer;
    let draco;
    let resize;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    try {
      const canvas = canvasRef.current;
      if (!canvas) return undefined;

      // Start the renderer immediately. The procedural globe remains visible
      // even if the optional remote model, texture, or decoder cannot load.
      renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.outputEncoding = THREE.sRGBEncoding;

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(40, window.innerWidth / window.innerHeight, 0.1, 200);
      camera.position.set(0, 0, 8);
      scene.add(new THREE.AmbientLight(0xffffff, 1.8));
      const sun = new THREE.DirectionalLight(0xffffff, 1.4);
      sun.position.set(-4, 3, 5);
      scene.add(sun);

      const world = new THREE.Group();
      scene.add(world);
      const globeGroup = new THREE.Group();
      globeGroup.rotation.z = 0.37;
      world.add(globeGroup);

      const radius = 1.7;
      // The Earth map is applied directly to the sphere as an equirectangular
      // texture, so continents and oceans sit on the globe surface itself.
      const earthMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        shininess: 18,
        specular: new THREE.Color(0x243b58)
      });
      const fallback = new THREE.Mesh(
        new THREE.SphereGeometry(radius, 128, 96),
        earthMaterial
      );
      globeGroup.add(fallback);

      new THREE.TextureLoader().load(
        "https://threejs.org/examples/textures/planets/earth_atmos_2048.jpg",
        texture => {
          if (disposed) { texture.dispose(); return; }
          texture.encoding = THREE.sRGBEncoding;
          texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
          earthMaterial.map = texture;
          earthMaterial.color.set(0xffffff);
          earthMaterial.needsUpdate = true;
        },
        undefined,
        error => console.warn("Earth surface texture could not load; showing the blue fallback globe.", error)
      );
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(radius * 1.13, 48, 48),
        new THREE.MeshBasicMaterial({ color: 0x3a6cff, transparent: true, opacity: 0.13, side: THREE.BackSide })
      );
      globeGroup.add(halo);

      // The sphere's own Earth texture is authoritative. Do not overlay the
      // optional GLB model: its separate materials were hiding the surface map.

      const starGeo = new THREE.BufferGeometry();
      const starPos = [];
      for (let i = 0; i < 1400; i++) {
        const u = Math.random() * 2 - 1;
        const angle = Math.random() * Math.PI * 2;
        const distance = 55 + Math.random() * 35;
        const ring = Math.sqrt(1 - u * u);
        starPos.push(distance * ring * Math.cos(angle), distance * u, distance * ring * Math.sin(angle));
      }
      starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
      const stars = new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xcfe0ff, size: 0.12, transparent: true, opacity: 0.75, sizeAttenuation: true })
      );
      scene.add(stars);

      const moteGeo = new THREE.BufferGeometry();
      const motePos = [];
      for (let i = 0; i < 280; i++) {
        motePos.push((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 12, (Math.random() - 0.5) * 8);
      }
      moteGeo.setAttribute("position", new THREE.Float32BufferAttribute(motePos, 3));
      scene.add(new THREE.Points(
        moteGeo,
        new THREE.PointsMaterial({ color: 0x9fc4ff, size: 0.035, transparent: true, opacity: 0.5 })
      ));

      const stops = (progress, values) => {
        for (let i = 1; i < values.length; i++) {
          if (progress <= values[i][0]) {
            const [p0, v0] = values[i - 1];
            const [p1, v1] = values[i];
            let t = (progress - p0) / (p1 - p0);
            t = t * t * (3 - 2 * t);
            return v0 + (v1 - v0) * t;
          }
        }
        return values[values.length - 1][1];
      };

      const sx = [[0, 0.65], [0.32, -2.5], [0.64, 2.7], [1, 0.35]];
      const sy = [[0, 0.05], [0.32, 0.55], [0.64, 0.45], [1, 0.15]];
      const ss = [[0, 0.98], [0.32, 0.88], [0.64, 0.82], [1, 0.94]];
      let last = performance.now();
      let spin = 0;
      let currentX = 0.65;
      let currentY = 0.05;
      let currentS = 0.98;

      resize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
      };
      window.addEventListener("resize", resize);

      const tick = now => {
        if (disposed) return;
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        const maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        const progress = reduced ? 0 : Math.min(1, window.scrollY / maxScroll);
        const side = Math.max(0.5, Math.min(1, window.innerWidth / 1200));
        const damping = Math.min(1, dt * 3.2);
        currentX += (stops(progress, sx) * side - currentX) * damping;
        currentY += (stops(progress, sy) - currentY) * damping;
        currentS += (stops(progress, ss) - currentS) * damping;
        spin += dt * 0.03;
        world.position.set(currentX, currentY, 0);
        world.scale.setScalar(currentS);
        globeGroup.rotation.y = 2.07 + spin + progress * Math.PI * 1.6;
        stars.rotation.y += reduced ? 0 : dt * 0.002;
        renderer.render(scene, camera);
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    } catch (error) {
      console.warn("Planet scene unavailable; retaining CSS space backdrop.", error);
    }

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      if (resize) window.removeEventListener("resize", resize);
      draco?.dispose();
      renderer?.dispose();
    };
  }, []);

  return <canvas ref={canvasRef} className="planet-canvas" aria-hidden="true" />;
}
