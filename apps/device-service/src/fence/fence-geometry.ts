import { UnprocessableEntityException } from '@nestjs/common';
import type { GeoJSONPolygonDto } from './dto/create-fence.dto.js';

export function assertValidPolygon(geometry: GeoJSONPolygonDto): void {
  const { coordinates } = geometry;

  if (coordinates.length < 1) {
    throw new UnprocessableEntityException(
      'Polygon must have at least one linear ring',
    );
  }

  for (const [ringIndex, ring] of coordinates.entries()) {
    if (ring.length < 4) {
      throw new UnprocessableEntityException(
        `Ring ${ringIndex} must have at least 4 positions (closed polygon)`,
      );
    }

    const first = ring[0];
    const last = ring[ring.length - 1];
    if (
      !first ||
      !last ||
      first[0] !== last[0] ||
      first[1] !== last[1]
    ) {
      throw new UnprocessableEntityException(
        `Ring ${ringIndex} must be closed (first and last position must match)`,
      );
    }

    for (const [posIndex, pos] of ring.entries()) {
      if (!Array.isArray(pos) || pos.length !== 2) {
        throw new UnprocessableEntityException(
          `Ring ${ringIndex} position ${posIndex} must be [longitude, latitude]`,
        );
      }
      const [lng, lat] = pos;
      if (typeof lng !== 'number' || typeof lat !== 'number') {
        throw new UnprocessableEntityException(
          `Ring ${ringIndex} position ${posIndex} must contain numeric coordinates`,
        );
      }
      if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
        throw new UnprocessableEntityException(
          `Ring ${ringIndex} position ${posIndex} is out of bounds (lng: -180..180, lat: -90..90)`,
        );
      }
    }
  }
}
