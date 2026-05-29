/**
 * Circuit track layouts as coordinate data.
 * Each circuit is defined as a series of waypoints (normalized 0-400 x 0-300)
 * that form a closed loop representing the track shape.
 *
 * Adding a new circuit: just add an entry here, no SVG files needed.
 */

export interface CornerLabel {
  n: number;
  x: number;
  y: number;
}

export interface CircuitLayout {
  id: string;
  name: string;
  /** Waypoints forming the track shape (closed loop) */
  path: { x: number; y: number }[];
  /** Corner number positions */
  corners: CornerLabel[];
  /** Start/finish line position */
  sf: { x: number; y: number };
  /** Direction of travel */
  direction: 'cw' | 'ccw';
}

export const CIRCUIT_LAYOUTS: Record<string, CircuitLayout> = {
  // ── Australia ──
  Melbourne: {
    id: 'melbourne',
    name: 'Albert Park Circuit',
    path: [
      { x: 50, y: 20 },   // Start/finish straight
      { x: 100, y: 20 },  // T1
      { x: 130, y: 40 },  // T2-3
      { x: 120, y: 70 },  // T4-5
      { x: 140, y: 100 }, // T6-7
      { x: 170, y: 95 },  // T8
      { x: 180, y: 120 }, // T9
      { x: 200, y: 140 }, // T10
      { x: 220, y: 170 }, // T11
      { x: 240, y: 180 }, // T12
      { x: 270, y: 160 }, // T13
      { x: 280, y: 130 }, // T14-15
      { x: 300, y: 110 }, // T16
      { x: 320, y: 100 }, // Fast sweeper
      { x: 340, y: 80 },  // Back straight
      { x: 330, y: 50 },  // T17
      { x: 300, y: 40 },  // T18
      { x: 260, y: 35 },  // onto pit straight
      { x: 220, y: 30 },
      { x: 180, y: 28 },
      { x: 140, y: 25 },
      { x: 100, y: 22 },
      { x: 50, y: 20 },  // back to S/F
    ],
    corners: [
      { n: 1, x: 110, y: 22 },
      { n: 3, x: 135, y: 55 },
      { n: 5, x: 125, y: 85 },
      { n: 7, x: 175, y: 100 },
      { n: 10, x: 200, y: 145 },
      { n: 12, x: 250, y: 185 },
      { n: 14, x: 275, y: 145 },
      { n: 16, x: 310, y: 110 },
    ],
    sf: { x: 50, y: 18 },
    direction: 'cw',
  },

  // ── China ──
  Shanghai: {
    id: 'shanghai',
    name: 'Shanghai International Circuit',
    path: [
      { x: 50, y: 50 },   // S/F straight
      { x: 80, y: 30 },   // T1 spiral up
      { x: 90, y: 25 },   // T1 apex
      { x: 100, y: 30 },  // T2
      { x: 110, y: 45 },  // long right
      { x: 120, y: 70 },  // T3
      { x: 130, y: 100 }, // T4-5
      { x: 150, y: 120 }, // T6
      { x: 180, y: 130 }, // back straight
      { x: 220, y: 140 }, //
      { x: 260, y: 150 }, // T7-8 hairpin
      { x: 270, y: 170 }, // T9-10
      { x: 250, y: 190 }, // T11
      { x: 220, y: 200 }, // T12
      { x: 180, y: 200 }, // T13
      { x: 140, y: 190 }, // T14
      { x: 120, y: 170 }, // back to S/F
      { x: 100, y: 150 }, //
      { x: 80, y: 130 },  //
      { x: 60, y: 110 },  //
      { x: 55, y: 80 },   //
      { x: 50, y: 50 },   // S/F
    ],
    corners: [
      { n: 1, x: 90, y: 28 },
      { n: 3, x: 118, y: 80 },
      { n: 6, x: 155, y: 122 },
      { n: 8, x: 265, y: 155 },
      { n: 11, x: 250, y: 192 },
      { n: 13, x: 195, y: 202 },
      { n: 14, x: 125, y: 175 },
    ],
    sf: { x: 50, y: 48 },
    direction: 'cw',
  },

  // ── Bahrain ──
  Sakhir: {
    id: 'sakhir',
    name: 'Bahrain International Circuit',
    path: [
      { x: 80, y: 20 },   // S/F straight
      { x: 120, y: 20 },  // T1
      { x: 130, y: 35 },  // T2
      { x: 120, y: 50 },  // T3
      { x: 140, y: 70 },  // T4
      { x: 170, y: 80 },  // T5-6
      { x: 200, y: 100 }, // back straight
      { x: 240, y: 120 }, //
      { x: 270, y: 140 }, // T7-8
      { x: 280, y: 160 }, // T9
      { x: 270, y: 180 }, // T10
      { x: 240, y: 190 }, // T11
      { x: 200, y: 190 }, // back straight 2
      { x: 160, y: 180 }, //
      { x: 120, y: 180 }, // T12-13
      { x: 90, y: 170 },  // T14
      { x: 100, y: 140 }, // T15
      { x: 110, y: 110 }, // back to S/F
      { x: 100, y: 80 },
      { x: 90, y: 50 },
      { x: 80, y: 20 },
    ],
    corners: [
      { n: 1, x: 125, y: 22 },
      { n: 4, x: 145, y: 72 },
      { n: 8, x: 268, y: 148 },
      { n: 10, x: 272, y: 178 },
      { n: 11, x: 240, y: 192 },
      { n: 14, x: 92, y: 168 },
    ],
    sf: { x: 80, y: 18 },
    direction: 'cw',
  },

  // ── Saudi Arabia ──
  Jeddah: {
    id: 'jeddah',
    name: 'Jeddah Corniche Circuit',
    path: [
      { x: 200, y: 10 },  // S/F
      { x: 230, y: 10 },  // T1
      { x: 260, y: 20 },  // T2
      { x: 280, y: 40 },  // fast section
      { x: 300, y: 60 },  //
      { x: 320, y: 80 },  // T4
      { x: 330, y: 110 }, // T5-6
      { x: 320, y: 130 }, //
      { x: 300, y: 140 }, // T7
      { x: 270, y: 140 }, // back straight
      { x: 240, y: 130 }, //
      { x: 220, y: 120 }, // T8
      { x: 200, y: 130 }, // T9-10
      { x: 180, y: 150 }, //
      { x: 160, y: 170 }, // T11-12
      { x: 150, y: 190 }, // T13
      { x: 150, y: 210 }, // hairpin
      { x: 170, y: 230 }, // T14-15
      { x: 190, y: 240 }, //
      { x: 210, y: 240 }, // T16-17
      { x: 220, y: 220 }, //
      { x: 210, y: 200 }, // T18
      { x: 200, y: 180 }, // back to S/F
      { x: 190, y: 150 },
      { x: 190, y: 120 },
      { x: 195, y: 90 },
      { x: 195, y: 60 },
      { x: 200, y: 30 },
      { x: 200, y: 10 },
    ],
    corners: [
      { n: 1, x: 245, y: 12 },
      { n: 4, x: 318, y: 88 },
      { n: 8, x: 225, y: 118 },
      { n: 13, x: 148, y: 198 },
      { n: 15, x: 175, y: 232 },
      { n: 18, x: 208, y: 202 },
    ],
    sf: { x: 200, y: 8 },
    direction: 'cw',
  },

  // ── Miami ──
  Miami: {
    id: 'miami',
    name: 'Miami International Autodrome',
    path: [
      { x: 50, y: 100 },  // S/F straight
      { x: 80, y: 100 },  // T1
      { x: 100, y: 90 },  // T2
      { x: 110, y: 70 },  // T3
      { x: 120, y: 50 },  // T4
      { x: 150, y: 40 },  // T5
      { x: 180, y: 50 },  // back straight
      { x: 220, y: 60 },  //
      { x: 250, y: 70 },  // T6-7
      { x: 270, y: 90 },  //
      { x: 280, y: 120 }, // T8-9
      { x: 270, y: 150 }, // T10
      { x: 250, y: 170 }, // T11
      { x: 220, y: 180 }, // back straight
      { x: 180, y: 180 }, //
      { x: 140, y: 170 }, // T12-13
      { x: 110, y: 160 }, // T14
      { x: 80, y: 150 },  //
      { x: 60, y: 130 },  //
      { x: 50, y: 100 },  // S/F
    ],
    corners: [
      { n: 1, x: 90, y: 98 },
      { n: 4, x: 118, y: 48 },
      { n: 7, x: 258, y: 78 },
      { n: 10, x: 272, y: 148 },
      { n: 11, x: 248, y: 172 },
      { n: 14, x: 88, y: 148 },
    ],
    sf: { x: 50, y: 98 },
    direction: 'cw',
  },

  // ── Imola ──
  Imola: {
    id: 'imola',
    name: 'Autodromo Enzo e Dino Ferrari',
    path: [
      { x: 150, y: 10 },  // S/F straight
      { x: 180, y: 10 },  // T1 Tamburello
      { x: 210, y: 25 },  // T2
      { x: 230, y: 45 },  // T3 Villeneuve
      { x: 250, y: 70 },  // T4 Tosa
      { x: 250, y: 100 }, // uphill
      { x: 230, y: 120 }, // T5 Piratella
      { x: 240, y: 140 }, // T6 Acque Minerali
      { x: 260, y: 150 }, //
      { x: 270, y: 170 }, // T7-8
      { x: 260, y: 200 }, // T9 Variante Alta
      { x: 240, y: 210 }, // to back straight
      { x: 200, y: 210 }, // T10
      { x: 160, y: 200 }, // T11
      { x: 130, y: 190 }, // T12
      { x: 100, y: 180 }, // T13
      { x: 80, y: 160 },  // T14
      { x: 80, y: 130 },  // T15
      { x: 110, y: 110 }, // T16
      { x: 130, y: 90 },  // back to S/F
      { x: 140, y: 60 },
      { x: 145, y: 30 },
      { x: 150, y: 10 },
    ],
    corners: [
      { n: 1, x: 190, y: 12 },
      { n: 4, x: 252, y: 72 },
      { n: 6, x: 248, y: 148 },
      { n: 9, x: 262, y: 205 },
      { n: 11, x: 145, y: 198 },
      { n: 15, x: 78, y: 128 },
    ],
    sf: { x: 150, y: 8 },
    direction: 'cw',
  },

  // ── Monaco ──
  'Monte Carlo': {
    id: 'monte-carlo',
    name: 'Circuit de Monaco',
    path: [
      { x: 200, y: 30 },  // S/F on harbour
      { x: 210, y: 50 },  // T1 Sainte Devote
      { x: 200, y: 70 },  // Beau Rivage
      { x: 180, y: 80 },  // T2 Massenet
      { x: 170, y: 65 },  // T3 Casino
      { x: 180, y: 50 },  // Casino square
      { x: 170, y: 40 },  // T4 Mirabeau
      { x: 160, y: 50 },  // T5 Grand Hotel hairpin
      { x: 145, y: 60 },  // T6
      { x: 130, y: 80 },  // tunnel
      { x: 120, y: 100 }, // T7 Nouvelle chicane
      { x: 120, y: 120 }, // T8
      { x: 130, y: 140 }, // T9 Tabac
      { x: 150, y: 150 }, // T10
      { x: 170, y: 160 }, // T11
      { x: 190, y: 170 }, // swimming pool
      { x: 200, y: 200 }, // T12-13 Rascasse
      { x: 190, y: 220 }, // T14 Anthony Noghes
      { x: 200, y: 240 }, // to S/F
      { x: 205, y: 200 }, //
      { x: 205, y: 160 }, //
      { x: 202, y: 100 }, //
      { x: 200, y: 30 },  // S/F
    ],
    corners: [
      { n: 1, x: 212, y: 55 },
      { n: 3, x: 172, y: 68 },
      { n: 5, x: 148, y: 58 },
      { n: 7, x: 118, y: 105 },
      { n: 10, x: 155, y: 152 },
      { n: 13, x: 198, y: 205 },
    ],
    sf: { x: 200, y: 28 },
    direction: 'cw',
  },

  // ── Spain ──
  Barcelona: {
    id: 'barcelona',
    name: 'Circuit de Barcelona-Catalunya',
    path: [
      { x: 50, y: 120 },  // S/F straight
      { x: 80, y: 100 },  // T1
      { x: 110, y: 80 },  // T2
      { x: 140, y: 70 },  // T3
      { x: 170, y: 80 },  // T4
      { x: 200, y: 90 },  // back straight
      { x: 240, y: 100 }, //
      { x: 270, y: 110 }, // T5
      { x: 300, y: 120 }, // T6
      { x: 320, y: 140 }, // T7
      { x: 330, y: 170 }, // T8
      { x: 320, y: 200 }, // T9 Campsa
      { x: 290, y: 210 }, // downhill
      { x: 250, y: 200 }, // T10
      { x: 220, y: 190 }, // T11
      { x: 190, y: 190 }, // T12
      { x: 160, y: 200 }, // T13
      { x: 130, y: 210 }, // T14
      { x: 100, y: 200 }, // T15
      { x: 80, y: 180 },  // T16
      { x: 65, y: 155 },  // back to S/F
      { x: 50, y: 130 },
      { x: 50, y: 120 },
    ],
    corners: [
      { n: 1, x: 90, y: 95 },
      { n: 5, x: 245, y: 105 },
      { n: 9, x: 325, y: 205 },
      { n: 10, x: 280, y: 212 },
      { n: 14, x: 115, y: 212 },
      { n: 16, x: 78, y: 178 },
    ],
    sf: { x: 50, y: 118 },
    direction: 'cw',
  },

  // ── Canada ──
  Montreal: {
    id: 'montreal',
    name: 'Circuit Gilles Villeneuve',
    path: [
      { x: 80, y: 40 },   // S/F straight
      { x: 110, y: 40 },  // T1
      { x: 130, y: 55 },  // T2
      { x: 140, y: 80 },  // T3
      { x: 160, y: 100 }, // T4
      { x: 190, y: 110 }, // T5-6
      { x: 220, y: 120 }, // back straight
      { x: 260, y: 130 }, //
      { x: 290, y: 140 }, // T7-8
      { x: 300, y: 170 }, // T9-10
      { x: 280, y: 200 }, // hairpin
      { x: 240, y: 210 }, // T11-12
      { x: 200, y: 210 }, //
      { x: 160, y: 200 }, // T13
      { x: 120, y: 190 }, // T14
      { x: 90, y: 170 },  // Wall of Champions
      { x: 80, y: 140 },  // T15
      { x: 85, y: 100 },  // back to S/F
      { x: 80, y: 60 },   //
      { x: 80, y: 40 },   // S/F
    ],
    corners: [
      { n: 1, x: 120, y: 42 },
      { n: 4, x: 168, y: 102 },
      { n: 8, x: 295, y: 148 },
      { n: 10, x: 298, y: 178 },
      { n: 13, x: 200, y: 212 },
      { n: 14, x: 92, y: 168 },
    ],
    sf: { x: 80, y: 38 },
    direction: 'cw',
  },

  // ── Austria ──
  'Red Bull Ring': {
    id: 'red-bull-ring',
    name: 'Red Bull Ring',
    path: [
      { x: 200, y: 10 },  // S/F straight
      { x: 230, y: 20 },  // T1
      { x: 250, y: 40 },  // T2
      { x: 260, y: 70 },  // T3
      { x: 240, y: 90 },  // T4
      { x: 220, y: 100 }, // back straight
      { x: 200, y: 110 }, //
      { x: 180, y: 120 }, //
      { x: 150, y: 130 }, // T5-6
      { x: 130, y: 150 }, // T7
      { x: 120, y: 180 }, // T8
      { x: 130, y: 210 }, // T9
      { x: 160, y: 230 }, // T10
      { x: 190, y: 230 }, // back straight
      { x: 210, y: 220 }, //
      { x: 220, y: 190 }, //
      { x: 210, y: 160 }, // T11
      { x: 200, y: 130 }, // back to S/F
      { x: 200, y: 80 },  //
      { x: 200, y: 40 },  //
      { x: 200, y: 10 },  // S/F
    ],
    corners: [
      { n: 1, x: 238, y: 22 },
      { n: 4, x: 238, y: 88 },
      { n: 7, x: 132, y: 155 },
      { n: 9, x: 132, y: 212 },
      { n: 10, x: 165, y: 232 },
    ],
    sf: { x: 200, y: 8 },
    direction: 'cw',
  },

  // ── Silverstone ──
  Silverstone: {
    id: 'silverstone',
    name: 'Silverstone Circuit',
    path: [
      { x: 50, y: 20 },   // S/F straight
      { x: 80, y: 30 },   // T1 Abbey
      { x: 100, y: 50 },  // T2 Farm
      { x: 120, y: 70 },  // T3 Village
      { x: 140, y: 90 },  // T4 The Loop
      { x: 170, y: 100 }, // T5 Aintree
      { x: 200, y: 100 }, // Wellington straight
      { x: 230, y: 110 }, // T6 Brooklands
      { x: 250, y: 130 }, // T7 Luffield
      { x: 280, y: 140 }, // T8-9 Woodcote
      { x: 310, y: 150 }, // Copse approach
      { x: 330, y: 170 }, // T10 Copse
      { x: 320, y: 200 }, // T11 Maggots
      { x: 290, y: 220 }, // T12 Becketts
      { x: 260, y: 230 }, // T13 Chapel
      { x: 230, y: 220 }, // Hangar straight
      { x: 200, y: 200 }, //
      { x: 170, y: 190 }, // T14 Stowe
      { x: 140, y: 180 }, // T15 Vale
      { x: 110, y: 160 }, // T16 Club
      { x: 80, y: 130 },  //
      { x: 60, y: 100 },  // T17
      { x: 55, y: 60 },   // back to S/F
      { x: 50, y: 20 },   // S/F
    ],
    corners: [
      { n: 1, x: 85, y: 32 },
      { n: 4, x: 148, y: 92 },
      { n: 7, x: 255, y: 132 },
      { n: 11, x: 295, y: 218 },
      { n: 14, x: 145, y: 178 },
      { n: 16, x: 82, y: 128 },
    ],
    sf: { x: 50, y: 18 },
    direction: 'cw',
  },

  // ── Hungary ──
  Hungaroring: {
    id: 'hungaroring',
    name: 'Hungaroring',
    path: [
      { x: 80, y: 20 },   // S/F straight
      { x: 110, y: 20 },  // T1
      { x: 130, y: 35 },  // T2
      { x: 140, y: 55 },  // T3
      { x: 130, y: 80 },  // T4-5
      { x: 150, y: 100 }, // T6-7
      { x: 180, y: 110 }, // back straight
      { x: 220, y: 110 }, //
      { x: 250, y: 100 }, // T8
      { x: 270, y: 80 },  // T9
      { x: 280, y: 100 }, // T10-11
      { x: 270, y: 130 }, //
      { x: 250, y: 150 }, // T12
      { x: 220, y: 170 }, // T13
      { x: 190, y: 180 }, // T14
      { x: 160, y: 180 }, // back straight
      { x: 130, y: 170 }, //
      { x: 100, y: 160 }, // T15
      { x: 70, y: 150 },  // T16
      { x: 60, y: 120 },  // T17
      { x: 60, y: 80 },   // back to S/F
      { x: 70, y: 50 },   //
      { x: 80, y: 20 },   // S/F
    ],
    corners: [
      { n: 1, x: 118, y: 22 },
      { n: 4, x: 132, y: 82 },
      { n: 8, x: 248, y: 98 },
      { n: 12, x: 248, y: 152 },
      { n: 14, x: 188, y: 182 },
    ],
    sf: { x: 80, y: 18 },
    direction: 'cw',
  },

  // ── Belgium ──
  Spa: {
    id: 'spa',
    name: 'Circuit de Spa-Francorchamps',
    path: [
      { x: 50, y: 50 },   // La Source hairpin
      { x: 80, y: 30 },   // Eau Rouge up
      { x: 110, y: 25 },  // Raidillon
      { x: 140, y: 30 },  // Kemmel straight
      { x: 180, y: 40 },  //
      { x: 220, y: 50 },  // T5 Les Combes
      { x: 240, y: 70 },  // T6
      { x: 250, y: 90 },  // T7
      { x: 260, y: 110 }, // T8
      { x: 240, y: 130 }, // T9 Bruxelles
      { x: 220, y: 140 }, // T10
      { x: 200, y: 150 }, // T11
      { x: 180, y: 170 }, // T12
      { x: 170, y: 190 }, // T13 Pouhon
      { x: 190, y: 210 }, // T14
      { x: 220, y: 210 }, // T15 Fagnes
      { x: 240, y: 190 }, // T16 Stavelot
      { x: 260, y: 170 }, // T17
      { x: 280, y: 150 }, // back straight
      { x: 310, y: 140 }, // T18 Blanchimont
      { x: 330, y: 160 }, // T19
      { x: 310, y: 190 }, // T20 Bus Stop
      { x: 280, y: 200 }, // to S/F
      { x: 240, y: 200 }, //
      { x: 200, y: 190 }, //
      { x: 160, y: 170 }, //
      { x: 120, y: 140 }, //
      { x: 80, y: 100 },  //
      { x: 60, y: 75 },   // back to La Source
      { x: 50, y: 50 },
    ],
    corners: [
      { n: 1, x: 52, y: 48 },
      { n: 3, x: 128, y: 28 },
      { n: 6, x: 242, y: 78 },
      { n: 13, x: 172, y: 195 },
      { n: 15, x: 222, y: 212 },
      { n: 20, x: 308, y: 195 },
    ],
    sf: { x: 45, y: 55 },
    direction: 'cw',
  },

  // ── Netherlands ──
  Zandvoort: {
    id: 'zandvoort',
    name: 'Circuit Zandvoort',
    path: [
      { x: 200, y: 10 },  // S/F straight
      { x: 220, y: 25 },  // T1 Tarzan
      { x: 230, y: 50 },  // T2-3
      { x: 210, y: 70 },  // T4
      { x: 190, y: 80 },  // T5
      { x: 170, y: 100 }, // T6-7
      { x: 180, y: 130 }, // T8
      { x: 200, y: 140 }, // T9
      { x: 220, y: 150 }, // T10
      { x: 240, y: 170 }, // T11
      { x: 250, y: 190 }, // T12
      { x: 230, y: 210 }, // T13
      { x: 200, y: 210 }, // T14
      { x: 170, y: 200 }, // back to S/F
      { x: 160, y: 170 }, //
      { x: 150, y: 140 }, //
      { x: 155, y: 110 }, //
      { x: 170, y: 80 },  //
      { x: 185, y: 50 },  //
      { x: 195, y: 25 },  //
      { x: 200, y: 10 },  // S/F
    ],
    corners: [
      { n: 1, x: 222, y: 28 },
      { n: 4, x: 208, y: 72 },
      { n: 8, x: 182, y: 130 },
      { n: 11, x: 248, y: 172 },
      { n: 13, x: 228, y: 212 },
    ],
    sf: { x: 200, y: 8 },
    direction: 'cw',
  },

  // ── Monza ──
  Monza: {
    id: 'monza',
    name: 'Autodromo Nazionale di Monza',
    path: [
      { x: 250, y: 10 },  // S/F straight
      { x: 280, y: 10 },  // T1 Rettifilo
      { x: 300, y: 25 },  // T2
      { x: 310, y: 45 },  // T3
      { x: 290, y: 60 },  // T4-5 Curva Grande
      { x: 270, y: 80 },  // back straight
      { x: 250, y: 100 }, //
      { x: 230, y: 120 }, // T6-7
      { x: 200, y: 130 }, //
      { x: 170, y: 140 }, // T8 Lesmo 1
      { x: 140, y: 150 }, // T9 Lesmo 2
      { x: 120, y: 180 }, // back straight
      { x: 100, y: 210 }, // T10 Serraglio
      { x: 70, y: 210 },  // T11-12
      { x: 60, y: 190 },  // T13-14
      { x: 70, y: 170 },  // T15 Ascari
      { x: 90, y: 150 },  //
      { x: 110, y: 130 }, // T16 Parabolica
      { x: 140, y: 110 }, //
      { x: 170, y: 90 },  //
      { x: 200, y: 70 },  //
      { x: 220, y: 45 },  // back to S/F
      { x: 240, y: 25 },  //
      { x: 250, y: 10 },  // S/F
    ],
    corners: [
      { n: 1, x: 295, y: 12 },
      { n: 4, x: 288, y: 62 },
      { n: 8, x: 202, y: 132 },
      { n: 10, x: 108, y: 212 },
      { n: 15, x: 72, y: 168 },
      { n: 16, x: 138, y: 108 },
    ],
    sf: { x: 250, y: 8 },
    direction: 'cw',
  },

  // ── Azerbaijan ──
  Baku: {
    id: 'baku',
    name: 'Baku City Circuit',
    path: [
      { x: 200, y: 10 },  // S/F straight
      { x: 220, y: 20 },  // T1
      { x: 240, y: 35 },  // T2
      { x: 250, y: 60 },  // T3
      { x: 230, y: 80 },  // T4-5
      { x: 200, y: 90 },  // old city
      { x: 170, y: 100 }, // T6-7
      { x: 150, y: 120 }, // T8
      { x: 130, y: 140 }, // T9-10
      { x: 110, y: 160 }, // T11
      { x: 100, y: 180 }, // T12
      { x: 100, y: 200 }, // castle section
      { x: 120, y: 220 }, // T13-14
      { x: 150, y: 240 }, // T15
      { x: 180, y: 250 }, // long back straight
      { x: 220, y: 250 }, //
      { x: 260, y: 240 }, //
      { x: 290, y: 220 }, //
      { x: 310, y: 190 }, // T16
      { x: 320, y: 150 }, // T17-19
      { x: 300, y: 120 }, //
      { x: 270, y: 100 }, // T20
      { x: 240, y: 80 },  // back to S/F
      { x: 220, y: 50 },  //
      { x: 205, y: 25 },  //
      { x: 200, y: 10 },  // S/F
    ],
    corners: [
      { n: 1, x: 228, y: 22 },
      { n: 5, x: 195, y: 92 },
      { n: 8, x: 132, y: 145 },
      { n: 12, x: 102, y: 205 },
      { n: 15, x: 185, y: 252 },
      { n: 17, x: 318, y: 148 },
    ],
    sf: { x: 200, y: 8 },
    direction: 'cw',
  },

  // ── Singapore ──
  'Marina Bay': {
    id: 'marina-bay',
    name: 'Marina Bay Street Circuit',
    path: [
      { x: 100, y: 20 },  // S/F straight
      { x: 120, y: 30 },  // T1
      { x: 130, y: 50 },  // T2-3
      { x: 150, y: 70 },  // T4
      { x: 180, y: 80 },  // T5
      { x: 210, y: 90 },  // T6
      { x: 240, y: 100 }, // T7
      { x: 260, y: 120 }, // T8
      { x: 280, y: 150 }, // T9
      { x: 290, y: 180 }, // T10
      { x: 270, y: 200 }, // T11-12
      { x: 240, y: 210 }, // T13
      { x: 210, y: 200 }, // T14
      { x: 180, y: 190 }, // T15
      { x: 150, y: 180 }, // T16-17
      { x: 120, y: 170 }, // T18
      { x: 90, y: 180 },  // T19
      { x: 70, y: 200 },  // T20
      { x: 70, y: 230 },  // T21
      { x: 90, y: 250 },  // T22
      { x: 120, y: 250 }, // T23
      { x: 140, y: 230 }, // T24
      { x: 150, y: 200 }, // to S/F
      { x: 140, y: 160 },
      { x: 130, y: 120 },
      { x: 110, y: 80 },
      { x: 100, y: 40 },
      { x: 100, y: 20 },
    ],
    corners: [
      { n: 1, x: 125, y: 32 },
      { n: 5, x: 185, y: 82 },
      { n: 8, x: 262, y: 125 },
      { n: 11, x: 268, y: 202 },
      { n: 18, x: 120, y: 168 },
      { n: 21, x: 72, y: 232 },
    ],
    sf: { x: 100, y: 18 },
    direction: 'cw',
  },

  // ── COTA (USA) ──
  'COTA': {
    id: 'cota',
    name: 'Circuit of the Americas',
    path: [
      { x: 80, y: 40 },   // S/F straight
      { x: 100, y: 30 },  // T1 steep uphill
      { x: 110, y: 45 },  // T2
      { x: 120, y: 65 },  // T3-4
      { x: 130, y: 90 },  // T5
      { x: 160, y: 100 }, // T6
      { x: 180, y: 120 }, // T7
      { x: 200, y: 140 }, // T8
      { x: 230, y: 150 }, // T9
      { x: 260, y: 140 }, // T10
      { x: 280, y: 120 }, // back straight
      { x: 300, y: 100 }, // T11
      { x: 310, y: 80 },  // T12
      { x: 300, y: 60 },  // T13
      { x: 280, y: 70 },  // T14
      { x: 260, y: 90 },  // T15
      { x: 240, y: 100 }, // T16
      { x: 210, y: 120 }, // T17
      { x: 180, y: 140 }, // T18-19
      { x: 140, y: 150 }, // T20
      { x: 100, y: 140 }, // back to S/F
      { x: 85, y: 100 },  //
      { x: 80, y: 60 },   //
      { x: 80, y: 40 },   // S/F
    ],
    corners: [
      { n: 1, x: 102, y: 28 },
      { n: 4, x: 128, y: 95 },
      { n: 9, x: 238, y: 152 },
      { n: 11, x: 308, y: 98 },
      { n: 16, x: 212, y: 122 },
      { n: 20, x: 125, y: 152 },
    ],
    sf: { x: 80, y: 38 },
    direction: 'cw',
  },

  // ── Mexico City ──
  'Mexico City': {
    id: 'mexico-city',
    name: 'Autódromo Hermanos Rodríguez',
    path: [
      { x: 60, y: 30 },   // S/F straight
      { x: 90, y: 30 },   // T1
      { x: 120, y: 40 },  // T2
      { x: 140, y: 60 },  // T3
      { x: 150, y: 85 },  // T4
      { x: 130, y: 105 }, // T5
      { x: 110, y: 120 }, // T6
      { x: 100, y: 140 }, // T7
      { x: 110, y: 160 }, // T8
      { x: 130, y: 170 }, // T9
      { x: 160, y: 180 }, // T10
      { x: 200, y: 180 }, // T11
      { x: 230, y: 170 }, // T12
      { x: 260, y: 180 }, // T13
      { x: 280, y: 200 }, // T14
      { x: 280, y: 230 }, // T15
      { x: 260, y: 250 }, // T16
      { x: 230, y: 260 }, // T17
      { x: 200, y: 260 }, // T18
      { x: 170, y: 250 }, // back to S/F
      { x: 140, y: 230 }, //
      { x: 110, y: 200 }, //
      { x: 85, y: 160 },  //
      { x: 65, y: 110 },  //
      { x: 60, y: 70 },   //
      { x: 60, y: 30 },   // S/F
    ],
    corners: [
      { n: 1, x: 100, y: 32 },
      { n: 4, x: 148, y: 88 },
      { n: 8, x: 112, y: 162 },
      { n: 12, x: 232, y: 168 },
      { n: 15, x: 278, y: 232 },
      { n: 18, x: 195, y: 262 },
    ],
    sf: { x: 60, y: 28 },
    direction: 'cw',
  },

  // ── Brazil ──
  Interlagos: {
    id: 'interlagos',
    name: 'Autódromo José Carlos Pace',
    path: [
      { x: 40, y: 120 },  // S/F straight
      { x: 70, y: 100 },  // T1 Senna S
      { x: 100, y: 90 },  // T2
      { x: 120, y: 100 }, // T3
      { x: 150, y: 120 }, // T4
      { x: 180, y: 130 }, // T5
      { x: 200, y: 150 }, // T6
      { x: 210, y: 180 }, // T7
      { x: 200, y: 210 }, // T8
      { x: 170, y: 220 }, // T9
      { x: 140, y: 220 }, // T10
      { x: 110, y: 210 }, // T11
      { x: 90, y: 190 },  // T12
      { x: 80, y: 170 },  // T13
      { x: 90, y: 150 },  // T14
      { x: 110, y: 140 }, // T15
      { x: 140, y: 150 }, // uphill
      { x: 170, y: 160 }, // T16
      { x: 200, y: 170 }, // back straight
      { x: 240, y: 180 }, //
      { x: 280, y: 190 }, // T17
      { x: 310, y: 200 }, // T18
      { x: 330, y: 220 }, // T19
      { x: 320, y: 250 }, // T20
      { x: 290, y: 260 }, // T21
      { x: 260, y: 250 }, // back to S/F
      { x: 230, y: 240 }, //
      { x: 200, y: 230 }, //
      { x: 160, y: 210 }, //
      { x: 120, y: 190 }, //
      { x: 80, y: 170 },  // merge
      { x: 60, y: 145 },  // to S/F
      { x: 40, y: 120 },  // S/F
    ],
    corners: [
      { n: 1, x: 78, y: 98 },
      { n: 4, x: 155, y: 122 },
      { n: 8, x: 198, y: 212 },
      { n: 12, x: 92, y: 188 },
      { n: 17, x: 285, y: 192 },
      { n: 20, x: 318, y: 252 },
    ],
    sf: { x: 40, y: 118 },
    direction: 'ccw',
  },

  // ── Las Vegas ──
  'Las Vegas': {
    id: 'las-vegas',
    name: 'Las Vegas Strip Circuit',
    path: [
      { x: 200, y: 10 },  // S/F on Strip
      { x: 230, y: 20 },  // T1
      { x: 250, y: 40 },  // T2
      { x: 260, y: 70 },  // T3
      { x: 270, y: 100 }, // T4
      { x: 280, y: 130 }, // T5
      { x: 290, y: 160 }, // long straight (Strip)
      { x: 300, y: 190 }, //
      { x: 310, y: 210 }, //
      { x: 300, y: 240 }, // T6-7
      { x: 270, y: 250 }, //
      { x: 240, y: 240 }, // T8
      { x: 210, y: 230 }, // T9
      { x: 180, y: 240 }, // T10
      { x: 150, y: 250 }, // T11
      { x: 120, y: 240 }, // T12
      { x: 110, y: 210 }, // back straight
      { x: 100, y: 180 }, //
      { x: 100, y: 150 }, // T13
      { x: 110, y: 120 }, // T14
      { x: 130, y: 100 }, //
      { x: 150, y: 80 },  // T15
      { x: 170, y: 60 },  //
      { x: 185, y: 35 },  // back to S/F
      { x: 200, y: 10 },  // S/F
    ],
    corners: [
      { n: 1, x: 238, y: 22 },
      { n: 5, x: 285, y: 165 },
      { n: 8, x: 238, y: 238 },
      { n: 11, x: 145, y: 252 },
      { n: 14, x: 112, y: 118 },
    ],
    sf: { x: 200, y: 8 },
    direction: 'cw',
  },

  // ── Qatar ──
  Lusail: {
    id: 'lusail',
    name: 'Lusail International Circuit',
    path: [
      { x: 200, y: 10 },  // S/F straight
      { x: 230, y: 15 },  // T1
      { x: 250, y: 30 },  // T2
      { x: 270, y: 50 },  // T3
      { x: 280, y: 80 },  // T4
      { x: 260, y: 100 }, // T5
      { x: 240, y: 110 }, // back straight
      { x: 210, y: 120 }, //
      { x: 180, y: 130 }, // T6-7
      { x: 150, y: 140 }, // T8-9
      { x: 120, y: 150 }, // T10
      { x: 100, y: 170 }, // T11
      { x: 90, y: 200 },  // T12
      { x: 100, y: 230 }, // T13
      { x: 120, y: 250 }, // T14
      { x: 150, y: 260 }, // T15
      { x: 180, y: 260 }, // back straight
      { x: 210, y: 250 }, //
      { x: 230, y: 230 }, // T16
      { x: 240, y: 200 }, // T17
      { x: 230, y: 170 }, // T18
      { x: 210, y: 150 }, // back to S/F
      { x: 200, y: 100 }, //
      { x: 200, y: 50 },  //
      { x: 200, y: 10 },  // S/F
    ],
    corners: [
      { n: 1, x: 238, y: 17 },
      { n: 4, x: 278, y: 82 },
      { n: 7, x: 175, y: 132 },
      { n: 12, x: 92, y: 205 },
      { n: 15, x: 155, y: 262 },
      { n: 16, x: 232, y: 228 },
    ],
    sf: { x: 200, y: 8 },
    direction: 'cw',
  },

  // ── Abu Dhabi ──
  'Yas Marina': {
    id: 'yas-marina',
    name: 'Yas Marina Circuit',
    path: [
      { x: 200, y: 10 },  // S/F straight
      { x: 230, y: 15 },  // T1
      { x: 260, y: 20 },  // T2
      { x: 280, y: 35 },  // T3
      { x: 290, y: 55 },  // T4
      { x: 280, y: 80 },  // T5-6
      { x: 260, y: 100 }, // T7
      { x: 250, y: 120 }, // T8
      { x: 260, y: 140 }, // T9
      { x: 280, y: 150 }, // T10
      { x: 300, y: 170 }, // T11
      { x: 310, y: 200 }, // T12
      { x: 290, y: 220 }, // T13
      { x: 260, y: 230 }, // T14
      { x: 230, y: 230 }, // T15
      { x: 200, y: 220 }, // T16
      { x: 170, y: 210 }, // back straight
      { x: 140, y: 200 }, //
      { x: 110, y: 190 }, // T17-18
      { x: 80, y: 180 },  // T19
      { x: 60, y: 160 },  // T20
      { x: 60, y: 130 },  // T21-22
      { x: 80, y: 110 },  //
      { x: 110, y: 100 }, // back to S/F
      { x: 140, y: 90 },  //
      { x: 170, y: 60 },  //
      { x: 190, y: 35 },  //
      { x: 200, y: 10 },  // S/F
    ],
    corners: [
      { n: 1, x: 240, y: 16 },
      { n: 5, x: 278, y: 82 },
      { n: 9, x: 262, y: 142 },
      { n: 12, x: 308, y: 205 },
      { n: 14, x: 255, y: 232 },
      { n: 20, x: 58, y: 158 },
    ],
    sf: { x: 200, y: 8 },
    direction: 'cw',
  },

  // ── Portimão (Algarve) ──
  Portimão: {
    id: 'portimao',
    name: 'Autódromo Internacional do Algarve',
    path: [
      { x: 100, y: 20 },  // S/F straight
      { x: 130, y: 20 },  // T1 uphill
      { x: 150, y: 35 },  // T2
      { x: 170, y: 50 },  // T3-4
      { x: 200, y: 60 },  // back straight
      { x: 230, y: 70 },  // T5
      { x: 260, y: 80 },  // T6
      { x: 280, y: 100 }, // T7
      { x: 290, y: 130 }, // T8
      { x: 280, y: 160 }, // T9
      { x: 250, y: 180 }, // T10
      { x: 220, y: 190 }, // T11-12
      { x: 190, y: 200 }, // T13
      { x: 160, y: 200 }, // T14
      { x: 130, y: 190 }, // T15
      { x: 100, y: 180 }, // back to S/F
      { x: 80, y: 150 },  //
      { x: 70, y: 120 },  //
      { x: 75, y: 85 },   //
      { x: 85, y: 50 },   //
      { x: 100, y: 20 },  // S/F
    ],
    corners: [
      { n: 1, x: 138, y: 22 },
      { n: 5, x: 235, y: 72 },
      { n: 7, x: 282, y: 105 },
      { n: 11, x: 218, y: 192 },
      { n: 14, x: 155, y: 202 },
    ],
    sf: { x: 100, y: 18 },
    direction: 'cw',
  },
};

/**
 * Get a circuit layout by name (case-insensitive partial match).
 * Returns null if no layout found.
 */
export function getCircuitLayout(name: string): CircuitLayout | undefined {
  if (!name) return undefined;

  // Direct match
  if (CIRCUIT_LAYOUTS[name]) return CIRCUIT_LAYOUTS[name];

  // Partial case-insensitive match
  const cl = name.toLowerCase();
  return Object.values(CIRCUIT_LAYOUTS).find(
    (l) =>
      l.id.includes(cl) ||
      l.name.toLowerCase().includes(cl) ||
      cl.includes(l.id)
  );
}
