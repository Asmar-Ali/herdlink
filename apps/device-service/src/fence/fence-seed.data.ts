import { GeofenceType } from './entities/fence.entity.js';
import type { CreateFenceDto } from './dto/create-fence.dto.js';

/** Closed GeoJSON ring for a small axis-aligned paddock (lng/lat). */
function paddockCoordinates(
  originLng: number,
  originLat: number,
  size = 0.008,
): number[][][] {
  const east = originLng + size;
  const north = originLat + size;
  return [
    [
      [originLng, originLat],
      [east, originLat],
      [east, north],
      [originLng, north],
      [originLng, originLat],
    ],
  ];
}

/** Ten inclusion paddocks aligned with device seed herds `herd-demo-1` … `herd-demo-10`. */
export function buildDemoInclusionFences(): CreateFenceDto[] {
  return Array.from({ length: 10 }, (_, index) => {
    const herdNum = index + 1;
    const col = index % 5;
    const row = Math.floor(index / 5);
    const originLng = 144.9 + col * 0.025;
    const originLat = -37.8 + row * 0.025;

    return {
      name: `Demo Paddock ${herdNum}`,
      description: `Dev seed inclusion fence for herd-demo-${herdNum}`,
      type: GeofenceType.INCLUSION,
      geometry: {
        type: 'Polygon',
        coordinates: paddockCoordinates(originLng, originLat),
      },
      herdIds: [`herd-demo-${herdNum}`],
      metadata: { seed: true, herd: `herd-demo-${herdNum}` },
      createdBy: 'dev-seed',
    };
  });
}
