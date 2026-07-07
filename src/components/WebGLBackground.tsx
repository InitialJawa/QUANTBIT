import { useEffect, useRef } from "react";
import * as THREE from "three";

const VERTEX = `
uniform float uTime;
uniform float uBreath;
uniform vec2 uMouse;
varying float vDist;

void main() {
  vec3 pos = position;
  float wave = sin(pos.x * 0.02 + pos.y * 0.015 + uTime * 0.15) * 4.0 * uBreath;
  float wave2 = cos(pos.y * 0.025 + pos.z * 0.01 + uTime * 0.1) * 3.0 * uBreath;
  pos.z += wave * 0.5;
  pos.x += wave2 * 0.3;
  pos.x += uMouse.x * 8.0;
  pos.y += uMouse.y * 6.0;
  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  vDist = length(mvPos.xyz);
  gl_Position = projectionMatrix * mvPos;
}
`;

const FRAGMENT = `
uniform vec3 uColor;
uniform float uOpacity;
varying float vDist;

void main() {
  float alpha = uOpacity * (0.3 + 0.7 * smoothstep(200.0, 20.0, vDist));
  gl_FragColor = vec4(uColor, alpha);
}
`;

export function WebGLBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const prefersReduced = useRef(false);

  useEffect(() => {
    prefersReduced.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced.current) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.set(0, 0, 120);
    camera.lookAt(0, 0, 0);

    const color = new THREE.Color("#9FD8BD");

    const segments = 60;
    const spacing = 3.5;
    const half = (segments * spacing) / 2;

    const positions: number[] = [];
    const indices: number[] = [];

    for (let i = 0; i <= segments; i++) {
      const p = -half + i * spacing;
      for (let j = 0; j <= segments; j++) {
        const q = -half + j * spacing;
        positions.push(p, q, 0);
      }
    }

    for (let i = 0; i < segments; i++) {
      for (let j = 0; j < segments; j++) {
        const idx = i * (segments + 1) + j;
        indices.push(idx, idx + 1);
        indices.push(idx, idx + segments + 1);
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    geometry.setIndex(indices);

    const uniforms = {
      uTime: { value: 0 },
      uBreath: { value: 1 },
      uMouse: { value: new THREE.Vector2(0, 0) },
      uColor: { value: color },
      uOpacity: { value: 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.LineSegments(geometry, material);
    scene.add(mesh);

    let mouseTarget = { x: 0, y: 0 };
    let mouseCurrent = { x: 0, y: 0 };

    const onMouse = (e: MouseEvent | { clientX: number; clientY: number }) => {
      mouseTarget.x = (e.clientX / window.innerWidth - 0.5) * 2;
      mouseTarget.y = -(e.clientY / window.innerHeight - 0.5) * 2;
    };

    const onTouch = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onMouse({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
      }
    };

    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchmove", onTouch);

    const onResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", onResize);

    // Fade in
    let startTime = performance.now();
    const fadeDuration = 2000;

    const clock = new THREE.Clock();

    function animate() {
      const elapsed = clock.getElapsedTime();
      const fadeElapsed = performance.now() - startTime;
      const fadeProgress = Math.min(fadeElapsed / fadeDuration, 1);

      uniforms.uTime.value = elapsed;
      uniforms.uBreath.value = 0.5 + 0.5 * Math.sin(elapsed * 0.3);
      uniforms.uOpacity.value = fadeProgress * 0.5;

      mouseCurrent.x += (mouseTarget.x - mouseCurrent.x) * 0.03;
      mouseCurrent.y += (mouseTarget.y - mouseCurrent.y) * 0.03;
      uniforms.uMouse.value.set(mouseCurrent.x * 0.08, mouseCurrent.y * 0.06);

      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    }

    animate();

    return () => {
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full z-0 pointer-events-none"
      aria-hidden="true"
    />
  );
}
