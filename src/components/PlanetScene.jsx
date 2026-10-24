import { useEffect, useRef } from "react";

const BASE = "https://api.getlayers.ai/storage/v1/object/public/public/assets/ascend-d9857ad1f2";

export default function PlanetScene() {
  const canvasRef = useRef(null);
  useEffect(() => {
    let disposed = false, frame = 0, renderer, cleanup = () => {};
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    (async () => {
      try {
        const THREE = await import("https://unpkg.com/three@0.143.0/build/three.module.js");
        const { GLTFLoader } = await import("https://esm.sh/three@0.143.0/examples/jsm/loaders/GLTFLoader.js?bundle");
        const { DRACOLoader } = await import("https://esm.sh/three@0.143.0/examples/jsm/loaders/DRACOLoader.js?bundle");
        if (disposed) return;
        const canvas = canvasRef.current;
        renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.7));
        renderer.setSize(innerWidth, innerHeight);
        renderer.outputEncoding = THREE.sRGBEncoding;
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, .1, 200);
        camera.position.set(0, 0, 8);
        scene.add(new THREE.AmbientLight(0xffffff, 1.8));
        const sun = new THREE.DirectionalLight(0xffffff, 1.4); sun.position.set(-4, 3, 5); scene.add(sun);
        const world = new THREE.Group(); scene.add(world);
        const globeGroup = new THREE.Group(); globeGroup.rotation.z = .37; world.add(globeGroup);
        const radius = 1.95;
        const fallback = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 64), new THREE.MeshPhongMaterial({ color: 0x173e72, shininess: 12, specular: 0x315e8d }));
        globeGroup.add(fallback);
        const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.13, 48, 48), new THREE.MeshBasicMaterial({ color: 0x3a6cff, transparent: true, opacity: .13, side: THREE.BackSide }));
        globeGroup.add(halo);
        const cloudTexture = await new THREE.TextureLoader().loadAsync(BASE + "/planet-clouds.png").catch(() => null);
        if (cloudTexture && !disposed) {
          cloudTexture.wrapS = cloudTexture.wrapT = THREE.RepeatWrapping; cloudTexture.repeat.set(5, 5);
          const clouds = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.018, 64, 64), new THREE.MeshStandardMaterial({ map: cloudTexture, transparent: true, opacity: .28, depthWrite: false }));
          globeGroup.add(clouds);
        }
        const draco = new DRACOLoader(); draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.5/");
        const loader = new GLTFLoader(); loader.setDRACOLoader(draco);
        loader.load(BASE + "/planet.glb", gltf => {
          if (disposed) return;
          const root = gltf.scene;
          let mesh = null; root.traverse(o => { if (!mesh && o.isMesh) mesh = o; });
          if (mesh) {
            mesh.geometry.computeBoundingSphere();
            const r = mesh.geometry.boundingSphere.radius || 1;
            root.scale.setScalar(radius / r);
            root.traverse(o => { if (o.isMesh) { o.material = o.material.clone(); o.material.metalness = 0; o.material.roughness = 1; } });
            globeGroup.remove(fallback); globeGroup.add(root);
          }
        }, undefined, () => {});
        const starGeo = new THREE.BufferGeometry(), starPos = [];
        for (let i = 0; i < 1400; i++) {
          const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 55 + Math.random() * 35;
          const s = Math.sqrt(1 - u * u); starPos.push(r * s * Math.cos(a), r * u, r * s * Math.sin(a));
        }
        starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPos, 3));
        const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xcfe0ff, size: .12, transparent: true, opacity: .75, sizeAttenuation: true }));
        scene.add(stars);
        const moteGeo = new THREE.BufferGeometry(), motePos = [];
        for (let i = 0; i < 280; i++) motePos.push((Math.random() - .5) * 18, (Math.random() - .5) * 12, (Math.random() - .5) * 8);
        moteGeo.setAttribute("position", new THREE.Float32BufferAttribute(motePos, 3));
        scene.add(new THREE.Points(moteGeo, new THREE.PointsMaterial({ color: 0x9fc4ff, size: .035, transparent: true, opacity: .5 })));
        const stops = (p, arr) => { for (let i = 1; i < arr.length; i++) if (p <= arr[i][0]) { const [p0,v0]=arr[i-1], [p1,v1]=arr[i]; let t=(p-p0)/(p1-p0); t=t*t*(3-2*t); return v0+(v1-v0)*t; } return arr.at(-1)[1]; };
        const sx=[[0,0],[.32,-3.1],[.64,3.2],[1,0]], sy=[[0,.05],[.32,.55],[.64,.45],[1,.15]], ss=[[0,1.18],[.32,1],[.64,.92],[1,1.12]];
        let last = performance.now(), spin = 0, currentX=0, currentY=-4.5, currentS=2.15;
        const resize = () => { camera.aspect=innerWidth/innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth,innerHeight); };
        window.addEventListener("resize", resize);
        const tick = now => {
          if (disposed) return;
          const dt = Math.min((now-last)/1000,.05); last=now;
          const maxScroll = Math.max(1, document.documentElement.scrollHeight-innerHeight);
          const p = reduced ? 0 : Math.min(1,scrollY/maxScroll);
          const side = Math.max(.5,Math.min(1,innerWidth/1200));
          const damp = Math.min(1,dt*3.2);
          currentX += (stops(p,sx)*side-currentX)*damp;
          currentY += (stops(p,sy)-currentY)*damp;
          currentS += (stops(p,ss)-currentS)*damp;
          spin += dt*.03;
          world.position.set(currentX,currentY,0);
          world.scale.setScalar(currentS);
          globeGroup.rotation.y=2.07+spin+p*Math.PI*1.6;
          stars.rotation.y += reduced ? 0 : dt*.002;
          renderer.render(scene,camera);
          frame=requestAnimationFrame(tick);
        };
        frame=requestAnimationFrame(tick);
        cleanup=()=>{cancelAnimationFrame(frame);window.removeEventListener("resize",resize);renderer?.dispose();draco.dispose();};
      } catch (error) { console.warn("Planet scene unavailable; retaining CSS space backdrop.", error); }
    })();
    return () => { disposed=true; cleanup(); cancelAnimationFrame(frame); };
  }, []);
  return <canvas ref={canvasRef} className="planet-canvas" aria-hidden="true" />;
}
