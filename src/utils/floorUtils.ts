import { Restaurant, RestaurantFloor, Table } from '../types';

/**
 * Standard default floors generator matching specification:
 * If count = 3: Ground Floor, Floor 1, Floor 2
 * If count = 5: Ground Floor, Floor 1, Floor 2, Floor 3, Floor 4
 */
export function getDefaultFloors(count = 2): RestaurantFloor[] {
  const result: RestaurantFloor[] = [];
  const safeCount = Math.max(1, Math.min(20, count));

  for (let i = 0; i < safeCount; i++) {
    const floorName = i === 0 ? 'Ground Floor' : `Floor ${i}`;
    result.push({
      id: `floor-${i}`,
      floorNumber: i,
      name: floorName,
      description: i === 0 ? 'Main dining hall & courtyard' : `Level ${i} dining space`,
      order: i,
      objects: [
        { id: `obj-${i}-door`, floorId: `floor-${i}`, type: 'entrance', name: 'Main Entrance', x: 2, y: 48, width: 6, height: 12 },
        { id: `obj-${i}-kitchen`, floorId: `floor-${i}`, type: 'kitchen', name: 'Kitchen & Service', x: 78, y: 12, width: 18, height: 18 },
        { id: `obj-${i}-counter`, floorId: `floor-${i}`, type: 'counter', name: 'Host Podium & Billing', x: 12, y: 80, width: 16, height: 10 },
        { id: `obj-${i}-washroom`, floorId: `floor-${i}`, type: 'washroom', name: 'Washrooms', x: 80, y: 78, width: 14, height: 12 },
      ],
    });
  }
  return result;
}

/**
 * Ensures all restaurants have dynamic floors and assigned floorIds for tables.
 * If restaurant has no floors, defaults to 2 dynamic floors (Ground Floor, 1st Floor).
 */
export function ensureRestaurantFloors(restaurant: Restaurant): RestaurantFloor[] {
  if (restaurant.floors && restaurant.floors.length > 0) {
    return [...restaurant.floors].sort((a, b) => a.order - b.order);
  }
  return getDefaultFloors(2);
}

/**
 * Distribute tables to floors if they don't have a floorId yet.
 * Ground floor gets first half, 1st floor gets second half (or based on table index).
 */
export function ensureTablesHaveFloors(tables: Table[], floors: RestaurantFloor[]): Table[] {
  if (!floors || floors.length === 0) return tables;
  
  const floorMap = new Map<string, RestaurantFloor>();
  floors.forEach((f) => floorMap.set(f.id, f));
  const defaultFloor = floors[0];

  return tables.map((t, idx) => {
    // If table already has valid floorId matching an existing floor
    if (t.floorId && floorMap.has(t.floorId)) {
      const f = floorMap.get(t.floorId)!;
      return {
        ...t,
        floorId: f.id,
        floorNumber: f.floorNumber,
        floorName: f.name,
        shape: 'rect', // Fixed as RECTANGLE
      };
    }

    // Assign floor based on table index / total floors
    const floorIndex = Math.floor((idx / Math.max(1, tables.length)) * floors.length);
    const assignedFloor = floors[Math.min(floorIndex, floors.length - 1)] || defaultFloor;

    // For tables assigned to higher floors without existing custom coordinates, arrange in clean grid
    let x = t.x;
    let y = t.y;
    if (assignedFloor.floorNumber > 0 && !t.floorId) {
      const floorTableIdx = idx % Math.max(1, Math.ceil(tables.length / floors.length));
      const col = floorTableIdx % 3;
      const row = Math.floor(floorTableIdx / 3);
      x = 12 + col * 28;
      y = 18 + row * 32;
    }

    return {
      ...t,
      floorId: assignedFloor.id,
      floorNumber: assignedFloor.floorNumber,
      floorName: assignedFloor.name,
      shape: 'rect', // Fixed as RECTANGLE
      x,
      y,
      width: t.width || 18,
      height: t.height || 16,
      category: t.category || deriveCategory(t),
    };
  });
}

function deriveCategory(table: Table): string {
  const sec = (table.section || '').toLowerCase();
  const feats = (table.features || []).map((f) => f.toLowerCase());

  if (feats.some((f) => f.includes('vip') || f.includes('butler'))) return 'VIP';
  if (feats.some((f) => f.includes('romantic') || f.includes('couple')) || table.capacity === 2) return 'Couple';
  if (table.capacity >= 6 || feats.some((f) => f.includes('family') || f.includes('banquet'))) return 'Family';
  if (sec.includes('private') || feats.some((f) => f.includes('private') || f.includes('alcove'))) return 'Private';
  if (sec.includes('bar') || feats.some((f) => f.includes('bar') || f.includes('cocktail'))) return 'Bar';
  if (sec.includes('terrace') || feats.some((f) => f.includes('garden') || f.includes('breeze') || f.includes('canopy'))) return 'Outdoor';
  return 'Standard';
}
