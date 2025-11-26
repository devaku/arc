'use client';
import React, { useState, useEffect, useRef } from 'react';
import { cubeStateToCubejsString, cubejsStringToCubeState } from '@/lib/cubeAdapter';

type CubeState = {
  front: string[][];
  back: string[][];
  left: string[][];
  right: string[][];
  top: string[][];
  bottom: string[][];
};

type Props = {
  moves: string[];
  speed?: number;
  cubeState?: CubeState;
  onStateChange?: (state: CubeState) => void;
};

// Apply moves using cubejs library to ensure correctness
async function applyMovesUsingCubejs(initialState: CubeState, moves: string[]): Promise<CubeState> {
  try {
    const cubejsModule: any = await import('cubejs');
    const Cube = cubejsModule?.default || cubejsModule?.Cube || cubejsModule;
    
    if (!Cube) {
      throw new Error('Could not find Cube class');
    }
    
    // Convert our state to cubejs format
    const stateStr = cubeStateToCubejsString(initialState);
    
    // Create cube from string
    const cube = Cube.fromString(stateStr);
    
    // Apply all moves using cubejs
    for (const move of moves) {
      cube.move(move);
    }
    
    // Get the resulting state string
    const resultStr = cube.asString();
    
    // Convert back to our format
    return cubejsStringToCubeState(resultStr);
  } catch (e) {
    console.error('Error applying moves with cubejs:', e);
    // Fallback to our implementation if cubejs fails
    return applyMoveFallback(initialState, moves);
  }
}

// Fallback move application (our implementation)
function applyMoveFallback(state: CubeState, moves: string[]): CubeState {
  let newState = JSON.parse(JSON.stringify(state)) as CubeState;
  
  for (const move of moves) {
    newState = applyMove(newState, move);
  }
  
  return newState;
}

// Apply a single move to the cube state (fallback)
function applyMove(state: CubeState, move: string): CubeState {
  const newState = JSON.parse(JSON.stringify(state)) as CubeState;
    const base = move[0];
    let amount = 1;
    if (move.includes('2')) amount = 2;
  if (move.includes("'")) amount = 3;

  function rotateFaceCW(face: string[][]) {
    const temp = face[0][0];
    face[0][0] = face[2][0];
    face[2][0] = face[2][2];
    face[2][2] = face[0][2];
    face[0][2] = temp;
    
    const temp2 = face[0][1];
    face[0][1] = face[1][0];
    face[1][0] = face[2][1];
    face[2][1] = face[1][2];
    face[1][2] = temp2;
  }

  for (let a = 0; a < amount; a++) {
    if (base === 'U') {
      rotateFaceCW(newState.top);
      const temp = [...newState.front[0]];
      newState.front[0] = [...newState.right[0]];
      newState.right[0] = [...newState.back[0]];
      newState.back[0] = [...newState.left[0]];
      newState.left[0] = temp;
    } else if (base === 'D') {
      rotateFaceCW(newState.bottom);
      const temp = [...newState.front[2]];
      newState.front[2] = [...newState.left[2]];
      newState.left[2] = [...newState.back[2]];
      newState.back[2] = [...newState.right[2]];
      newState.right[2] = temp;
    } else if (base === 'R') {
      rotateFaceCW(newState.right);
      const temp = [newState.top[0][2], newState.top[1][2], newState.top[2][2]];
      newState.top[0][2] = newState.front[0][2];
      newState.top[1][2] = newState.front[1][2];
      newState.top[2][2] = newState.front[2][2];
      newState.front[0][2] = newState.bottom[0][2];
      newState.front[1][2] = newState.bottom[1][2];
      newState.front[2][2] = newState.bottom[2][2];
      newState.bottom[0][2] = newState.back[2][0];
      newState.bottom[1][2] = newState.back[1][0];
      newState.bottom[2][2] = newState.back[0][0];
      newState.back[2][0] = temp[2];
      newState.back[1][0] = temp[1];
      newState.back[0][0] = temp[0];
    } else if (base === 'L') {
      rotateFaceCW(newState.left);
      const temp = [newState.top[0][0], newState.top[1][0], newState.top[2][0]];
      newState.top[0][0] = newState.back[2][2];
      newState.top[1][0] = newState.back[1][2];
      newState.top[2][0] = newState.back[0][2];
      newState.back[2][2] = newState.bottom[0][0];
      newState.back[1][2] = newState.bottom[1][0];
      newState.back[0][2] = newState.bottom[2][0];
      newState.bottom[0][0] = newState.front[0][0];
      newState.bottom[1][0] = newState.front[1][0];
      newState.bottom[2][0] = newState.front[2][0];
      newState.front[0][0] = temp[0];
      newState.front[1][0] = temp[1];
      newState.front[2][0] = temp[2];
    } else if (base === 'F') {
      rotateFaceCW(newState.front);
      const temp = [newState.top[2][0], newState.top[2][1], newState.top[2][2]];
      newState.top[2][0] = newState.left[2][2];
      newState.top[2][1] = newState.left[1][2];
      newState.top[2][2] = newState.left[0][2];
      newState.left[2][2] = newState.bottom[0][2];
      newState.left[1][2] = newState.bottom[0][1];
      newState.left[0][2] = newState.bottom[0][0];
      newState.bottom[0][2] = newState.right[0][0];
      newState.bottom[0][1] = newState.right[1][0];
      newState.bottom[0][0] = newState.right[2][0];
      newState.right[0][0] = temp[2];
      newState.right[1][0] = temp[1];
      newState.right[2][0] = temp[0];
    } else if (base === 'B') {
      rotateFaceCW(newState.back);
      const temp = [newState.top[0][0], newState.top[0][1], newState.top[0][2]];
      newState.top[0][0] = newState.right[0][2];
      newState.top[0][1] = newState.right[1][2];
      newState.top[0][2] = newState.right[2][2];
      newState.right[0][2] = newState.bottom[2][2];
      newState.right[1][2] = newState.bottom[2][1];
      newState.right[2][2] = newState.bottom[2][0];
      newState.bottom[2][2] = newState.left[2][0];
      newState.bottom[2][1] = newState.left[1][0];
      newState.bottom[2][0] = newState.left[0][0];
      newState.left[2][0] = temp[0];
      newState.left[1][0] = temp[1];
      newState.left[0][0] = temp[2];
    }
  }

  return newState;
}

// Component to verify if cube is actually solved
function SolvedStatus({ cubeState }: { cubeState: CubeState }) {
  const [isSolved, setIsSolved] = useState<boolean | null>(null);
  
  useEffect(() => {
    async function checkSolved() {
      try {
        const cubejsModule: any = await import('cubejs');
        const Cube = cubejsModule?.default || cubejsModule?.Cube || cubejsModule;
        if (!Cube) return;
        
        const stateStr = cubeStateToCubejsString(cubeState);
        const cube = Cube.fromString(stateStr);
        setIsSolved(cube.isSolved());
      } catch (e) {
        console.error('Error checking if solved:', e);
        setIsSolved(null);
      }
    }
    checkSolved();
  }, [cubeState]);
  
  if (isSolved === null) {
    return (
      <div className="mt-4 p-4 bg-amber-100 border-2 border-amber-400 rounded-lg text-center">
        <p className="text-amber-800 font-bold text-lg">Checking if solved...</p>
      </div>
    );
  }
  
  if (isSolved) {
    return (
      <div className="mt-4 p-4 bg-green-100 border-2 border-green-400 rounded-lg text-center">
        <p className="text-green-800 font-bold text-lg">✓ Cube Solved!</p>
      </div>
    );
  }
  
  return (
    <div className="mt-4 p-4 bg-red-100 border-2 border-red-400 rounded-lg text-center">
      <p className="text-red-800 font-bold text-lg">⚠ Cube not solved - moves may be incorrect</p>
      <p className="text-red-700 text-sm mt-2">Check the console for details</p>
    </div>
  );
}

// 3D Cube Visualization with Move Arrows
function CubeVisualization({ 
  cubeState, 
  currentMove 
}: { 
  cubeState: CubeState | null;
  currentMove: string | null;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [rotation, setRotation] = useState({ x: -20, y: 30 });
  const [mouseDown, setMouseDown] = useState(false);
  const [lastMouse, setLastMouse] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!canvasRef.current || !cubeState) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d')!;
    const cubeSize = 100;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const rotX = (rotation.x * Math.PI) / 180;
    const rotY = (rotation.y * Math.PI) / 180;

    function rotatePoint(x: number, y: number, z: number) {
      let tempY = y * Math.cos(rotX) - z * Math.sin(rotX);
      let tempZ = y * Math.sin(rotX) + z * Math.cos(rotX);
      y = tempY;
      z = tempZ;
      let tempX = x * Math.cos(rotY) + z * Math.sin(rotY);
      tempZ = -x * Math.sin(rotY) + z * Math.cos(rotY);
      x = tempX;
      z = tempZ;
      return { x, y, z };
    }

    function project(x: number, y: number, z: number) {
      const perspective = 800;
      const scale = perspective / (perspective + z + 400);
      return {
        x: centerX + x * scale,
        y: centerY + y * scale,
        scale: scale
      };
    }

    function getFaceData(faceName: keyof CubeState): string[][] {
      return cubeState[faceName] || Array(3).fill(null).map(() => Array(3).fill('#CCCCCC'));
    }

    function drawFace(face: string[][], projected: any[], original3D: any[], faceName: string) {
      const avgZ = original3D.reduce((sum, c) => sum + c.z, 0) / 4;
      const v1 = {
        x: original3D[1].x - original3D[0].x,
        y: original3D[1].y - original3D[0].y,
        z: original3D[1].z - original3D[0].z,
      };
      const v2 = {
        x: original3D[3].x - original3D[0].x,
        y: original3D[3].y - original3D[0].y,
        z: original3D[3].z - original3D[0].z,
      };
      const normal = {
        x: v1.y * v2.z - v1.z * v2.y,
        y: v1.z * v2.x - v1.x * v2.z,
        z: v1.x * v2.y - v1.y * v2.x,
      };
      if (normal.z > 0) return avgZ;

      const isActiveFace = currentMove && (
        (currentMove[0] === 'F' && faceName === 'front') ||
        (currentMove[0] === 'B' && faceName === 'back') ||
        (currentMove[0] === 'R' && faceName === 'right') ||
        (currentMove[0] === 'L' && faceName === 'left') ||
        (currentMove[0] === 'U' && faceName === 'top') ||
        (currentMove[0] === 'D' && faceName === 'bottom')
      );

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const x0 = projected[0].x + (projected[1].x - projected[0].x) * (col / 3);
          const y0 = projected[0].y + (projected[1].y - projected[0].y) * (col / 3);
          const x1 = projected[0].x + (projected[1].x - projected[0].x) * ((col + 1) / 3);
          const y1 = projected[0].y + (projected[1].y - projected[0].y) * ((col + 1) / 3);
          const x2 = projected[3].x + (projected[2].x - projected[3].x) * (col / 3);
          const y2 = projected[3].y + (projected[2].y - projected[3].y) * (col / 3);
          const x3 = projected[3].x + (projected[2].x - projected[3].x) * ((col + 1) / 3);
          const y3 = projected[3].y + (projected[2].y - projected[3].y) * ((col + 1) / 3);

          const topLeftX = x0 + (x2 - x0) * (row / 3);
          const topLeftY = y0 + (y2 - y0) * (row / 3);
          const topRightX = x1 + (x3 - x1) * (row / 3);
          const topRightY = y1 + (y3 - y1) * (row / 3);
          const bottomLeftX = x0 + (x2 - x0) * ((row + 1) / 3);
          const bottomLeftY = y0 + (y2 - y0) * ((row + 1) / 3);
          const bottomRightX = x1 + (x3 - x1) * ((row + 1) / 3);
          const bottomRightY = y1 + (y3 - y1) * ((row + 1) / 3);

          ctx.beginPath();
          ctx.moveTo(topLeftX, topLeftY);
          ctx.lineTo(topRightX, topRightY);
          ctx.lineTo(bottomRightX, bottomRightY);
          ctx.lineTo(bottomLeftX, bottomLeftY);
          ctx.closePath();

          const color = face[row][col];
          if (color && color !== '#CCCCCC' && color !== '#222') {
            ctx.fillStyle = color;
          } else {
            ctx.fillStyle = '#888888';
          }
          ctx.fill();
          
          if (isActiveFace) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 3;
          } else {
            ctx.strokeStyle = '#000';
            ctx.lineWidth = 2;
          }
          ctx.stroke();
        }
      }

      // Draw arrow on active face
      if (isActiveFace) {
        const centerX = (projected[0].x + projected[1].x + projected[2].x + projected[3].x) / 4;
        const centerY = (projected[0].y + projected[1].y + projected[2].y + projected[3].y) / 4;
        
        const isClockwise = !currentMove?.includes("'");
        const isDouble = currentMove?.includes('2');
        
        ctx.save();
        ctx.translate(centerX, centerY);
        
        // Draw circular arrow
        ctx.strokeStyle = '#FF0000';
        ctx.fillStyle = '#FF0000';
        ctx.lineWidth = 4;
        
        const radius = 30;
        ctx.beginPath();
        if (isClockwise) {
          ctx.arc(0, 0, radius, -Math.PI / 4, Math.PI * 1.75, false);
        } else {
          ctx.arc(0, 0, radius, Math.PI / 4, -Math.PI * 1.75, true);
        }
        ctx.stroke();
        
        // Arrow head
        const angle = isClockwise ? -Math.PI / 4 : Math.PI / 4;
        const arrowX = Math.cos(angle) * radius;
        const arrowY = Math.sin(angle) * radius;
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - 10 * Math.cos(angle + Math.PI / 6), arrowY - 10 * Math.sin(angle + Math.PI / 6));
        ctx.lineTo(arrowX - 10 * Math.cos(angle - Math.PI / 6), arrowY - 10 * Math.sin(angle - Math.PI / 6));
        ctx.closePath();
        ctx.fill();
        
        if (isDouble) {
          ctx.beginPath();
          if (isClockwise) {
            ctx.arc(0, 0, radius - 15, -Math.PI / 4, Math.PI * 1.75, false);
      } else {
            ctx.arc(0, 0, radius - 15, Math.PI / 4, -Math.PI * 1.75, true);
          }
          ctx.stroke();
        }
        
        ctx.restore();
      }

      return avgZ;
    }

    const faces = [
      {
        name: 'front',
        corners: [
          rotatePoint(-cubeSize, -cubeSize, cubeSize),
          rotatePoint(cubeSize, -cubeSize, cubeSize),
          rotatePoint(cubeSize, cubeSize, cubeSize),
          rotatePoint(-cubeSize, cubeSize, cubeSize),
        ],
        data: getFaceData('front')
      },
      {
        name: 'back',
        corners: [
          rotatePoint(cubeSize, -cubeSize, -cubeSize),
          rotatePoint(-cubeSize, -cubeSize, -cubeSize),
          rotatePoint(-cubeSize, cubeSize, -cubeSize),
          rotatePoint(cubeSize, cubeSize, -cubeSize),
        ],
        data: getFaceData('back')
      },
      {
        name: 'left',
        corners: [
          rotatePoint(-cubeSize, -cubeSize, -cubeSize),
          rotatePoint(-cubeSize, -cubeSize, cubeSize),
          rotatePoint(-cubeSize, cubeSize, cubeSize),
          rotatePoint(-cubeSize, cubeSize, -cubeSize),
        ],
        data: getFaceData('left')
      },
      {
        name: 'right',
        corners: [
          rotatePoint(cubeSize, -cubeSize, cubeSize),
          rotatePoint(cubeSize, -cubeSize, -cubeSize),
          rotatePoint(cubeSize, cubeSize, -cubeSize),
          rotatePoint(cubeSize, cubeSize, cubeSize),
        ],
        data: getFaceData('right')
      },
      {
        name: 'top',
        corners: [
          rotatePoint(-cubeSize, -cubeSize, -cubeSize),
          rotatePoint(cubeSize, -cubeSize, -cubeSize),
          rotatePoint(cubeSize, -cubeSize, cubeSize),
          rotatePoint(-cubeSize, -cubeSize, cubeSize),
        ],
        data: getFaceData('top')
      },
      {
        name: 'bottom',
        corners: [
          rotatePoint(-cubeSize, cubeSize, cubeSize),
          rotatePoint(cubeSize, cubeSize, cubeSize),
          rotatePoint(cubeSize, cubeSize, -cubeSize),
          rotatePoint(-cubeSize, cubeSize, -cubeSize),
        ],
        data: getFaceData('bottom')
      },
    ];

    const projectedFaces = faces.map(face => ({
      ...face,
      projectedCorners: face.corners.map(c => project(c.x, c.y, c.z)),
      avgZ: face.corners.reduce((sum, c) => sum + c.z, 0) / 4
    }));

    projectedFaces.sort((a, b) => b.avgZ - a.avgZ);

    projectedFaces.forEach(face => {
      drawFace(face.data, face.projectedCorners, face.corners, face.name);
    });
  }, [cubeState, rotation, currentMove]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setMouseDown(true);
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!mouseDown) return;
    const deltaX = e.clientX - lastMouse.x;
    const deltaY = e.clientY - lastMouse.y;
    setRotation(prev => ({
      x: prev.x + deltaY * 0.5,
      y: prev.y + deltaX * 0.5
    }));
    setLastMouse({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setMouseDown(false);
  };

  if (!cubeState) {
    return (
      <div className="w-full h-96 bg-amber-100/50 border-2 border-amber-300/30 rounded-lg flex items-center justify-center">
        <p className="text-amber-900 font-semibold">Loading cube...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center">
      <canvas
        ref={canvasRef}
        width={400}
        height={400}
        className="border-4 border-amber-800/50 bg-amber-50 rounded-xl cursor-move shadow-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      />
      <p className="text-sm text-amber-900/70 font-medium mt-2">Drag to rotate • {currentMove ? `Next: ${currentMove}` : 'Solved!'}</p>
    </div>
  );
}

export default function SolverAnimator({ moves, cubeState, onStateChange }: Props) {
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [displayState, setDisplayState] = useState<CubeState | null>(null);

  // Initialize display state from cubeState
  useEffect(() => {
    if (cubeState) {
      setDisplayState(JSON.parse(JSON.stringify(cubeState)));
      setCurrentMoveIndex(0);
    }
  }, [cubeState]);

  // Apply moves up to currentMoveIndex using cubejs
  useEffect(() => {
    if (!cubeState || moves.length === 0) return;
    
    const movesToApply = moves.slice(0, currentMoveIndex);
    if (movesToApply.length === 0) {
      setDisplayState(JSON.parse(JSON.stringify(cubeState)));
      return;
    }
    
    // Use cubejs to apply moves correctly
    applyMovesUsingCubejs(cubeState, movesToApply).then(state => {
      setDisplayState(state);
    }).catch(e => {
      console.error('Error applying moves:', e);
      // Fallback to our implementation
      let state = JSON.parse(JSON.stringify(cubeState)) as CubeState;
      for (let i = 0; i < currentMoveIndex && i < moves.length; i++) {
        state = applyMove(state, moves[i]);
      }
      setDisplayState(state);
    });
  }, [currentMoveIndex, moves.join(' '), cubeState]);

  // Call onStateChange separately to avoid dependency issues
  const onStateChangeRef = React.useRef(onStateChange);
  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useEffect(() => {
    if (displayState && onStateChangeRef.current) {
      onStateChangeRef.current(displayState);
    }
  }, [displayState]);

  const handleNext = () => {
    if (currentMoveIndex < moves.length) {
      setCurrentMoveIndex(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentMoveIndex > 0) {
      setCurrentMoveIndex(prev => prev - 1);
    }
  };

  const handleReset = () => {
    setCurrentMoveIndex(0);
  };

  const handleApplyAll = () => {
    setCurrentMoveIndex(moves.length);
  };

  const copySolution = () => {
    const solutionText = moves.join(' ');
    navigator.clipboard.writeText(solutionText);
    alert('Solution copied to clipboard!');
  };

  const currentMove = currentMoveIndex < moves.length ? moves[currentMoveIndex] : null;

  if (moves.length === 0) {
    return (
      <div className="w-full p-6 bg-amber-100/80 border-2 border-amber-300/30 rounded-lg text-center">
        <p className="text-amber-900 font-semibold">No solution available</p>
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 3D Cube Visualization with Arrows */}
      <div className="mb-6 p-4 bg-amber-100/80 border-2 border-amber-300/30 rounded-lg">
        <CubeVisualization cubeState={displayState} currentMove={currentMove} />
      </div>

      {/* Solution Header */}
      <div className="mb-4 p-4 bg-amber-100/80 border-2 border-amber-300/30 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <div className="text-lg font-bold text-amber-900">
            Solution: {moves.length} moves
          </div>
          <button
            onClick={copySolution}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm transition-colors"
          >
            📋 Copy Solution
          </button>
        </div>
        <div className="text-sm text-amber-800 font-mono bg-amber-50 p-2 rounded border border-amber-300/50 break-all">
          {moves.join(' ')}
        </div>
      </div>

      {/* Move Navigation */}
      <div className="mb-4 p-4 bg-amber-100/80 border-2 border-amber-300/30 rounded-lg">
        <div className="flex items-center gap-3 mb-3">
          <button
            onClick={handlePrev}
            disabled={currentMoveIndex === 0}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white font-bold transition-colors"
          >
            ⏮ Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentMoveIndex >= moves.length}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 disabled:cursor-not-allowed text-white font-bold transition-colors"
          >
            Next ⏭
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-semibold transition-colors"
          >
            ↺ Reset
          </button>
          <button
            onClick={handleApplyAll}
            className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition-colors"
          >
            ✓ Apply All
          </button>
        </div>
        <div className="text-center text-amber-900 font-bold">
          Step {currentMoveIndex} / {moves.length}
          {currentMove && (
            <span className="ml-2 text-amber-700">Next: {currentMove}</span>
          )}
        </div>
      </div>

      {/* Move List */}
      <div className="bg-amber-50/80 border-2 border-amber-300/30 rounded-lg p-4">
        <h3 className="text-lg font-bold text-amber-900 mb-3">Move Sequence:</h3>
        <div className="flex flex-wrap gap-2">
          {moves.map((move, index) => (
            <button
              key={index}
              onClick={() => setCurrentMoveIndex(index + 1)}
              className={`px-3 py-1.5 rounded-lg font-mono font-bold transition-all ${
                index < currentMoveIndex
                  ? 'bg-green-500 text-white'
                  : index === currentMoveIndex
                  ? 'bg-amber-600 text-white ring-2 ring-amber-800'
                  : 'bg-amber-200 text-amber-900 hover:bg-amber-300'
              }`}
            >
              {move}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-amber-700">
          <span className="font-semibold">Green</span> = Applied •{' '}
          <span className="font-semibold">Amber</span> = Current •{' '}
          <span className="font-semibold">Light</span> = Pending
        </p>
      </div>

      {/* Status */}
      {currentMoveIndex >= moves.length && displayState && (
        <SolvedStatus cubeState={displayState} />
      )}
    </div>
  );
}
