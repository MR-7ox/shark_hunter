import React, { useState, useRef, useEffect } from 'react';
import * as THREE from 'three';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, useTexture } from '@react-three/drei';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';

const hudPanels = [
  { title: "Characteristics", text: "Cybernetic apex predator with hyperspeed and laser-guided senses, adapted for zero-gravity aquatic voids." },
  { title: "Travel Patterns", text: "Migrates through interstellar oceans via wormhole currents, following magnetic ley lines for light-year-spanning hunts." },
  { title: "Food Habits", text: "Hunts bio-luminescent prey with swarm intelligence, using EMP bursts to stun; thinks like a chess master with AI-augmented neural networks." }
];

function limitVector(v, max) {
  const len = v.length();
  if (len > max) v.multiplyScalar(max / len);
  return v;
}

function screenToWorld(nX, nY, scale = 4) {
  const x = (nX - 0.5) * scale;
  const y = (0.5 - nY) * (scale * 0.5);
  return new THREE.Vector3(x, y, 0);
}

function SharkModel({ target = { x: 0.5, y: 0.5 }, scale = 2.0 }) {
  const obj = useLoader(OBJLoader, '/assets/base.obj');
  const texture = useTexture('/assets/texture_diffuse.png');
  const ref = useRef();

  const velocity = useRef(new THREE.Vector3(0.01, 0, 0));
  const acceleration = useRef(new THREE.Vector3(0, 0, 0));
  const maxSpeed = 0.5; // slower for realism
  const maxForce = 0.01; // gentler acceleration

  useEffect(() => {
    if (!obj) return;
    obj.traverse((child) => {
      if (child.isMesh) {
        if (texture) {
          child.material.map = texture;
        } else {
          child.material = new THREE.MeshPhongMaterial({
            color: 0x4a5568,
            emissive: 0x1a202c,
            emissiveIntensity: 0.2,
            shininess: 80
          });
        }
        child.material.needsUpdate = true;
      }
    });
  }, [obj, texture]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    // Double the gap: 0.2 units (20 cm)
    const offset = new THREE.Vector3(0.2, 0, 0); // 20 cm gap along x-axis
    const worldTarget = screenToWorld(target.x, target.y, 6).add(offset);
    const pos = ref.current.position.clone();
    const desired = worldTarget.clone().sub(pos);
    const distance = desired.length();

    if (distance > 0.001) {
      desired.normalize();
      const slowRadius = 1.2;
      const m = (distance < slowRadius) ? (maxSpeed * (distance / slowRadius)) : maxSpeed;
      desired.multiplyScalar(m);
    }

    const steer = desired.clone().sub(velocity.current);
    limitVector(steer, maxForce);

    acceleration.current.add(steer);

    velocity.current.add(acceleration.current.clone().multiplyScalar(delta * 40)); // smoother
    limitVector(velocity.current, maxSpeed);
    const nextPos = pos.add(velocity.current.clone().multiplyScalar(delta * 4)); // smoother

    if (velocity.current.length() > 0.001) {
      ref.current.position.lerp(nextPos, 0.95); // smoother

      const forward = velocity.current.clone().normalize();
      const lookAt = new THREE.Vector3().copy(ref.current.position).add(forward);
      ref.current.lookAt(lookAt);
      const lateral = forward.x;
      ref.current.rotation.z = -lateral * 0.18 + Math.sin(state.clock.elapsedTime * 0.4) * 0.015; // gentler
      ref.current.rotation.x = -forward.y * 0.12;
    }

    acceleration.current.multiplyScalar(0);
    velocity.current.multiplyScalar(0.995);
  });

  return <primitive ref={ref} object={obj} scale={[scale, scale, scale]} position={[0, -0.8, 0]} />;
}

export default function SciFiHome() {
  const [fishes, setFishes] = useState(() => Array.from({ length: 15 }, (_, i) => ({
    id: 'fish-' + i,
    x: 0.1 + Math.random() * 0.8,
    y: 0.15 + Math.random() * 0.7,
    vx: (Math.random() - 0.5) * 0.003,
    vy: (Math.random() - 0.5) * 0.003
  })));

  const [sharkPos, setSharkPos] = useState({ x: 0.5, y: 0.5 });
  const [hudIndex, setHudIndex] = useState(null);
  const [ambientBubbles, setAmbientBubbles] = useState([]);
  const [cursorBubbles, setCursorBubbles] = useState([]);
  const containerRef = useRef();
  const cursorBubbleId = useRef(0);
  const lastMoveTime = useRef(Date.now());

  useEffect(() => {
    const moveFish = () => {
      setFishes(prev => prev.map(f => {
        let { x, y, vx, vy, id } = f;
        vx += (Math.random() - 0.5) * 0.0005;
        vy += (Math.random() - 0.5) * 0.0005;
        x += vx;
        y += vy;
        if (x < 0.05 || x > 0.95) vx *= -1;
        if (y < 0.08 || y > 0.92) vy *= -1;
        x = Math.max(0.05, Math.min(0.95, x));
        y = Math.max(0.08, Math.min(0.92, y));
        return { x, y, vx, vy, id };
      }));
      requestAnimationFrame(moveFish);
    };
    moveFish();
    return () => {};
  }, []);

  useEffect(() => {
    setFishes(prev => prev.filter(f => {
      const dx = f.x - sharkPos.x;
      const dy = f.y - sharkPos.y;
      return (dx * dx + dy * dy) > 0.012;
    }));
  }, [sharkPos]);

  useEffect(() => {
    const initial = Array.from({ length: 80 }).map((_, i) => ({
      id: `a-${i}`,
      left: Math.random() * 100,
      size: 6 + Math.random() * 48,
      delay: Math.random() * 8,
      duration: 8 + Math.random() * 24,
      opacity: 0.02 + Math.random() * 0.6
    }));
    setAmbientBubbles(initial);
  }, []);

  const spawnCursorBubble = (xPx, yPx) => {
    const id = `c-${cursorBubbleId.current++}`;
    const size = 6 + Math.random() * 20;
    const left = xPx;
    const top = yPx;
    const lifetime = 1200 + Math.random() * 800;
    setCursorBubbles(prev => [...prev, { id, left, top, size, lifetime, opacity: 0.45 }]);
    setTimeout(() => setCursorBubbles(prev => prev.filter(b => b.id !== id)), lifetime);
  };

  const handlePointerMove = (e) => {
    lastMoveTime.current = Date.now();
    const clientX = e.clientX ?? (e.touches && e.touches[0].clientX) ?? (window.innerWidth / 2);
    const clientY = e.clientY ?? (e.touches && e.touches[0].clientY) ?? (window.innerHeight / 2);
    const nx = clientX / window.innerWidth;
    const ny = clientY / window.innerHeight;
    setSharkPos({ x: nx, y: ny });

    spawnCursorBubble(clientX + (Math.random() - 0.5) * 20, clientY + (Math.random() - 0.5) * 20);
    if (Math.random() > 0.6) spawnCursorBubble(clientX + (Math.random() - 0.5) * 40, clientY + (Math.random() - 0.5) * 40);
  };

  const canvasParallax = {
    transform: `translate3d(${(sharkPos.x - 0.5) * 28}px, ${(sharkPos.y - 0.5) * 14}px, 0)`,
    transition: 'transform 0.06s linear'
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      style={{
        width: '100vw',
        height: '100vh',
        backgroundImage: `url('/background/785.jpg')`,
        backgroundSize: 'cover',
        backgroundPosition: 'center center',
        backgroundRepeat: 'no-repeat',
        position: 'fixed',
        left: 0,
        top: 0,
        overflow: 'hidden',
        color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif'
      }}
    >
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage:
          'radial-gradient(circle at 10% 20%, rgba(30,140,255,0.12), transparent 10%),' +
          'radial-gradient(circle at 80% 70%, rgba(124,77,255,0.09), transparent 12%),' +
          'radial-gradient(circle at 50% 40%, rgba(0,229,255,0.08), transparent 8%),' +
          'radial-gradient(ellipse at 30% 60%, rgba(0,255,255,0.06), transparent 15%),' +
          'radial-gradient(ellipse at 70% 30%, rgba(30,140,255,0.07), transparent 18%)',
        mixBlendMode: 'screen',
        animation: 'causticsShift 12s linear infinite',
        zIndex: 2, pointerEvents: 'none', opacity: 0.95
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, rgba(2,18,40,0.35), rgba(0,10,20,0.45), rgba(0,0,0,0.28))',
        zIndex: 3, pointerEvents: 'none', opacity: 0.95,
        animation: 'sheen 18s ease-in-out infinite'
      }} />

      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.4) 1px, transparent 1px)',
        backgroundSize: '50px 50px',
        opacity: 0.08,
        animation: 'particleFloat 25s linear infinite',
        zIndex: 5,
        pointerEvents: 'none'
      }} />

      <div style={{ position: 'absolute', inset: 0, zIndex: 4, pointerEvents: 'none', transform: canvasParallax.transform, transition: canvasParallax.transition }}>
        <svg width="100%" height="100%" preserveAspectRatio="none" style={{ display: 'block' }}>
          <defs><filter id="glow"><feGaussianBlur stdDeviation="6" result="coloredBlur" /><feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge></filter></defs>
          <g fill="none" stroke="#7c4dff22" strokeWidth="2" filter="url(#glow)">
            <ellipse cx="85%" cy="8%" rx="180" ry="30" />
            <ellipse cx="12%" cy="82%" rx="120" ry="24" />
          </g>
        </svg>
      </div>

      <div style={{ position: 'absolute', inset: 0, zIndex: 10, pointerEvents: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: '100%', height: '100%', ...canvasParallax }}>
          <Canvas camera={{ position: [0, 0, 6], fov: 50 }}>
            <ambientLight intensity={0.4} color="#1e8cff" />
            <directionalLight position={[5, 8, 5]} intensity={1.2} color="#00e5ff" castShadow />
            <directionalLight position={[-3, -2, 3]} intensity={0.6} color="#7c4dff" />
            <pointLight position={[0, 5, 2]} intensity={0.8} color="#00ffff" distance={10} />
            <hemisphereLight args={["#1e8cff", "#0a1a2e", 0.5]} />
            <fog attach="fog" args={['#021224', 8, 20]} />
            <SharkModel target={sharkPos} scale={2.2} />
            <OrbitControls enablePan={false} enableZoom={false} enableRotate={false} />
          </Canvas>
        </div>
      </div>

      {fishes.map(f => (
        <img
          key={f.id}
          src={process.env.PUBLIC_URL + '/assests_2/images-removebg-preview (3.png'}
          alt="fish"
          style={{
            position: 'absolute',
            left: `${f.x * 100}vw`,
            top: `${f.y * 100}vh`,
            width: 32,
            height: 18,
            pointerEvents: 'none',
            zIndex: 20,
            userSelect: 'none',
            filter: 'drop-shadow(0 0 6px #00e5ff88)'
          }}
        />
      ))}

      {cursorBubbles.map(b => (
        <div
          key={b.id}
          style={{
            position: 'fixed',
            left: b.left,
            top: b.top,
            width: b.size,
            height: b.size,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(0,229,255,0.45))',
            boxShadow: '0 0 18px rgba(0,229,255,0.22)',
            pointerEvents: 'none',
            zIndex: 75,
            transform: 'translate(-50%, -50%)',
            opacity: b.opacity,
            animation: `cursorBubbleRise ${b.lifetime}ms linear forwards`
          }}
        />
      ))}

      {ambientBubbles.map(b => (
        <div key={b.id} style={{
          position: 'absolute',
          left: `${b.left}%`,
          bottom: '-20vh',
          width: b.size,
          height: b.size,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 30% 30%, rgba(255,255,255,0.95), rgba(255,255,255,0.02))',
          boxShadow: '0 0 18px rgba(0,229,255,0.06)',
          opacity: b.opacity,
          zIndex: 15,
          pointerEvents: 'none',
          animation: `bubbleFloat ${b.duration}s cubic-bezier(.2,.8,.2,1) ${b.delay}s infinite`,
          transform: `translateY(0) scale(${0.9 + (b.size / 60)})`
        }} />
      ))}

      <button onClick={() => window.location.href = '/map'} style={{
        position: 'absolute', right: '4vw', bottom: 'calc(6vh + 180px)', zIndex: 100,
        background: 'linear-gradient(90deg, rgba(0,229,255,0.98), rgba(124,77,255,0.98))',
        color: '#00101a', fontFamily: 'Orbitron, monospace', fontSize: '0.85em', border: 'none', borderRadius: '40px',
        padding: '10px 22px', boxShadow: '0 8px 32px rgba(0,229,255,0.12)', cursor: 'pointer', transition: 'transform 0.12s ease, box-shadow 0.12s ease'
      }} onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-6px) scale(1.02)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0) scale(1)'}>
        🦈 Explore Live Shark Map
      </button>

      <div style={{ position: 'absolute', bottom: '6vh', left: '6vw', zIndex: 80, display: 'flex', gap: '18px', pointerEvents: 'auto' }}>
        {hudPanels.map((panel, idx) => (
          <div key={panel.title} onMouseEnter={() => setHudIndex(idx)} onMouseLeave={() => setHudIndex(null)} onClick={() => setHudIndex(idx)}
            style={{
              background: hudIndex === idx ? 'linear-gradient(135deg, rgba(10,30,60,0.94), rgba(20,40,70,0.78))' : 'rgba(6,18,36,0.48)',
              border: '1px solid rgba(0,229,255,0.18)', borderRadius: '12px', padding: '14px 20px', color: '#e6fbff',
              fontFamily: 'Orbitron, monospace', fontSize: '0.95em', boxShadow: hudIndex === idx ? '0 0 36px rgba(0,229,255,0.16)' : '0 0 8px rgba(124,77,255,0.06)',
              cursor: 'pointer', transition: 'all 0.18s', minWidth: '260px', backdropFilter: 'blur(6px)'
            }}>
            <div style={{ color: '#00e5ff', fontWeight: '700', marginBottom: '6px', fontSize: '1.05em' }}>{panel.title}</div>
            <div style={{ opacity: hudIndex === idx ? 1 : 0.85, lineHeight: 1.4 }}>{panel.text}</div>
          </div>
        ))}
      </div>

      <style>{`
        @keyframes causticsShift { 
          0% { background-position: 0% 0%; } 
          50% { background-position: 50% 50%; } 
          100% { background-position: 0% 0%; } 
        }
        @keyframes sheen { 
          0% { opacity: 0.85; transform: translateY(0px); } 
          50% { opacity: 0.95; transform: translateY(-12px) scale(1.01); } 
          100% { opacity: 0.85; transform: translateY(0px); } 
        }
        @keyframes bubbleFloat {
          0% { transform: translateY(0) scale(0.9); opacity: 0; }
          10% { opacity: 0.12; }
          50% { opacity: 0.08; transform: translateY(-60vh) scale(1.02); }
          90% { opacity: 0.02; }
          100% { transform: translateY(-120vh) scale(1.05); opacity: 0; }
        }
        @keyframes cursorBubbleRise {
          0% { transform: translate(-50%, -50%) translateY(0) scale(0.6); opacity: 0.95; }
          40% { transform: translate(-50%, -50%) translateY(-22vh) scale(0.9); opacity: 0.6; }
          100% { transform: translate(-50%, -50%) translateY(-48vh) scale(1.1); opacity: 0; }
        }
        @keyframes particleFloat {
          0% { transform: translateY(0) translateX(0); }
          50% { transform: translateY(-30px) translateX(15px); }
          100% { transform: translateY(-60px) translateX(0); }
        }
      `}</style>
    </div>
  );
}