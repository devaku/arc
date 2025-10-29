'use client';
import React, { useEffect, useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';

type Props = {
  moves: string[]; // array of move tokens like ['R', "U'", 'F2']
  speed?: number; // ms per quarter-turn
};

function ColoredCube({ colors }: { colors?: string[] }) {
  // colors is optional array of 6 hex colors for faces: [U,R,F,D,L,B]
  const faceMaterials = (colors || ['#fff','#f00','#0f0','#ff0','#f60','#06f']).map((c) => null);
  // We'll just color a box with per-face materials via meshStandardMaterial groups is complex; instead create 6 planes around a small cube
  return (
    <group>
      <mesh>
        <boxGeometry args={[2,2,2]} />
        <meshStandardMaterial color={'#222'} roughness={0.6} />
      </mesh>
      {/* simple colored face planes */}
      {/* +Z front */}
      <mesh position={[0,0,1.01]}> <planeGeometry args={[1.9,1.9]} /> <meshStandardMaterial color={colors?.[2]||'#00aa00'} /> </mesh>
      {/* -Z back */}
      <mesh position={[0,0,-1.01]} rotation={[0,Math.PI,0]}> <planeGeometry args={[1.9,1.9]} /> <meshStandardMaterial color={colors?.[5]||'#0044aa'} /> </mesh>
      {/* +Y top */}
      <mesh position={[0,1.01,0]} rotation={[-Math.PI/2,0,0]}> <planeGeometry args={[1.9,1.9]} /> <meshStandardMaterial color={colors?.[0]||'#ffffff'} /> </mesh>
      {/* -Y bottom */}
      <mesh position={[0,-1.01,0]} rotation={[Math.PI/2,0,0]}> <planeGeometry args={[1.9,1.9]} /> <meshStandardMaterial color={colors?.[3]||'#ffff00'} /> </mesh>
      {/* +X right */}
      <mesh position={[1.01,0,0]} rotation={[0,-Math.PI/2,0]}> <planeGeometry args={[1.9,1.9]} /> <meshStandardMaterial color={colors?.[1]||'#ff0000'} /> </mesh>
      {/* -X left */}
      <mesh position={[-1.01,0,0]} rotation={[0,Math.PI/2,0]}> <planeGeometry args={[1.9,1.9]} /> <meshStandardMaterial color={colors?.[4]||'#ff8a00'} /> </mesh>
    </group>
  );
}

export default function SolverAnimator({ moves, speed = 400 }: Props) {
  const groupRef = useRef<THREE.Group | null>(null as any);
  const [playing, setPlaying] = useState(false);
  const idxRef = useRef(0);
  const animRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const fromRotationRef = useRef<[number, number, number]>([0,0,0]);
  const toRotationRef = useRef<[number, number, number]>([0,0,0]);

  useEffect(() => {
    idxRef.current = 0;
    setPlaying(false);
  }, [moves.join(' ')]);

  function parseMove(move: string) {
    const base = move[0];
    let amount = 1;
    if (move.includes('2')) amount = 2;
    if (move.includes("'")) amount = 3; // 3 quarter turns = -90
    return { base, amount };
  }

  function axisFor(base: string) {
    // simple mapping: U/D -> Y, R/L -> X, F/B -> Z
    if (base === 'U' || base === 'D') return 'y';
    if (base === 'R' || base === 'L') return 'x';
    return 'z';
  }

  function signFor(base: string) {
    if (base === 'U' || base === 'R' || base === 'F') return 1;
    return -1;
  }

  function playNext() {
    if (idxRef.current >= moves.length) {
      setPlaying(false);
      return;
    }
    const m = moves[idxRef.current];
    const { base, amount } = parseMove(m);
    const axis = axisFor(base);
    const sign = signFor(base);
    const angle = (Math.PI/2) * amount * sign;

    const from = groupRef.current?.rotation ? [groupRef.current.rotation.x, groupRef.current.rotation.y, groupRef.current.rotation.z] as [number,number,number] : [0,0,0];
    const to = [...from] as [number,number,number];
    if (axis === 'x') to[0] += angle;
    if (axis === 'y') to[1] += angle;
    if (axis === 'z') to[2] += angle;

    fromRotationRef.current = from;
    toRotationRef.current = to;
    startTimeRef.current = performance.now();

    function step(now: number) {
      if (!startTimeRef.current) return;
      const t = Math.min(1, (now - startTimeRef.current) / speed);
      // ease
      const e = 1 - Math.pow(1 - t, 3);
      const cur: [number,number,number] = [
        fromRotationRef.current[0] + (toRotationRef.current[0] - fromRotationRef.current[0]) * e,
        fromRotationRef.current[1] + (toRotationRef.current[1] - fromRotationRef.current[1]) * e,
        fromRotationRef.current[2] + (toRotationRef.current[2] - fromRotationRef.current[2]) * e,
      ];
      if (groupRef.current) {
        groupRef.current.rotation.x = cur[0];
        groupRef.current.rotation.y = cur[1];
        groupRef.current.rotation.z = cur[2];
      }
      if (t < 1) {
        animRef.current = requestAnimationFrame(step);
      } else {
        animRef.current = null;
        idxRef.current += 1;
        if (playing) playNext();
      }
    }

    if (animRef.current) cancelAnimationFrame(animRef.current);
    animRef.current = requestAnimationFrame(step);
  }

  useEffect(() => {
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, []);

  useEffect(() => {
    if (playing) playNext();
    else {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    }
  }, [playing]);

  return (
    <div className="w-full h-96 border-2 border-gray-300 rounded-md">
      <Canvas camera={{ position: [5,5,5], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5,10,5]} intensity={0.8} />
        <group ref={groupRef}>
          <ColoredCube />
        </group>
        <OrbitControls />
      </Canvas>
      <div className="p-2 flex gap-2 items-center">
        <button className="px-3 py-1 rounded bg-emerald-600 text-white" onClick={() => setPlaying(p => !p)}>{playing ? 'Pause' : 'Play'}</button>
        <button className="px-3 py-1 rounded bg-gray-200" onClick={() => { idxRef.current = Math.max(0, idxRef.current-1); setPlaying(false); }}>Step Back</button>
        <button className="px-3 py-1 rounded bg-gray-200" onClick={() => { setPlaying(false); playNext(); }}>Step</button>
        <div className="ml-auto text-sm opacity-80">Move {Math.min(idxRef.current+1, moves.length)} / {moves.length}</div>
      </div>
    </div>
  );
}
