export type CubeState = {
  front: string[][];
  back: string[][];
  left: string[][];
  right: string[][];
  top: string[][];
  bottom: string[][];
};

// Known Rubik's colors (same palette used in the scanner)
const RUBIKS = [
  { hex: '#FFFFFF', letter: 'U', r: 255, g: 255, b: 255 }, // white -> Up
  { hex: '#FFD500', letter: 'D', r: 255, g: 213, b: 0 },   // yellow -> Down
  { hex: '#009B48', letter: 'F', r: 0, g: 155, b: 72 },    // green -> Front
  { hex: '#0046AD', letter: 'B', r: 0, g: 70, b: 173 },    // blue -> Back
  { hex: '#B71234', letter: 'R', r: 183, g: 18, b: 52 },   // red -> Right
  { hex: '#FF5800', letter: 'L', r: 255, g: 88, b: 0 },    // orange -> Left
];

function hexToRgb(hex: string) {
  const h = hex.replace('#', '').trim();
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function colorDistanceSq(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }) {
  return (a.r - b.r) * (a.r - b.r) + (a.g - b.g) * (a.g - b.g) + (a.b - b.b) * (a.b - b.b);
}

function hexToLetter(hex: string) {
  if (!hex) return 'U';
  const key = hex.toUpperCase();
  // direct match first
  const direct = RUBIKS.find(r => r.hex.toUpperCase() === key);
  if (direct) return direct.letter;

  // otherwise find nearest by RGB distance
  let rgb;
  try {
    rgb = hexToRgb(hex);
  } catch (e) {
    return 'U';
  }
  let best = RUBIKS[0];
  let bestDist = colorDistanceSq(rgb, best);
  for (const cand of RUBIKS) {
    const dist = colorDistanceSq(rgb, cand);
    if (dist < bestDist) {
      bestDist = dist;
      best = cand;
    }
  }
  return best.letter;
}

// cubejs expects faces in the order: U R F D L B (each 9 chars)
export function cubeStateToCubejsString(state: CubeState) {
  const order: (keyof CubeState)[] = ['top', 'right', 'front', 'bottom', 'left', 'back'];

  const parts = order.map(faceKey => {
    const face = state[faceKey];
    // face is 3x3 array row-major; cubejs expects row-major
    return face.flat().map(hexToLetter).join('');
  });

  return parts.join('');
}
