// apps/device-service/src/geofences/schemas/geofence.schema.ts

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum GeofenceType {
  INCLUSION = 'INCLUSION', // devices SHOULD be inside (safe paddock)
  EXCLUSION = 'EXCLUSION', // devices SHOULD NOT be inside (road, river, neighbour's land)
}

export enum BreachDirection {
  ENTER = 'ENTER', // alert when device crosses INTO the polygon
  EXIT = 'EXIT', // alert when device crosses OUT of the polygon
  BOTH = 'BOTH',
}

// MongoDB stores polygons as GeoJSON natively, with proper geospatial indexing.
@Schema({ _id: false })
class GeoJSONPolygon {
  @Prop({ type: String, enum: ['Polygon'], required: true, default: 'Polygon' })
  type: 'Polygon';

  // GeoJSON spec: array of linear rings.
  // First ring = outer boundary; subsequent rings = holes.
  // Each ring = array of [longitude, latitude] pairs (note the order!).
  // First and last coordinate of each ring must be identical (closed ring).
  @Prop({ type: [[[Number]]], required: true })
  coordinates: number[][][];
}
const GeoJSONPolygonSchema = SchemaFactory.createForClass(GeoJSONPolygon);

@Schema({
  collection: 'geofences',
  timestamps: true, // adds createdAt + updatedAt
})
export class Geofence {
  @Prop({ required: true, trim: true, maxlength: 120 })
  name: string;

  @Prop({ trim: true, maxlength: 500 })
  description?: string;

  @Prop({ enum: GeofenceType, required: true })
  type: GeofenceType;

  @Prop({
    enum: BreachDirection,
    required: true,
    default: BreachDirection.BOTH,
  })
  breachDirection: BreachDirection;

  // The polygon itself — uses GeoJSON so MongoDB's $geoIntersects / $geoWithin work natively.
  @Prop({ type: GeoJSONPolygonSchema, required: true, index: '2dsphere' })
  geometry: GeoJSONPolygon;

  // Soft-disable a fence without deleting it (e.g. seasonal paddocks).
  @Prop({ default: true, index: true })
  active: boolean;

  // Which devices this fence applies to.
  // Empty array = applies to ALL devices. Otherwise, restrict to specific herds.
  @Prop({ type: [String], default: [], index: true })
  herdIds: string[];

  // Cool-down window for re-alerting on the same device for the same fence.
  // Prevents alert spam when a cow lingers on a boundary.
  @Prop({ default: 300, min: 0 })
  alertCooldownSeconds: number;

  // Severity drives UI colour and (later) escalation rules.
  @Prop({ enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'MEDIUM' })
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

  // Free-form metadata — gate codes, paddock numbers, vet notes.
  @Prop({ type: Object, default: {} })
  metadata: Record<string, unknown>;

  // Audit who created/last-modified the fence.
  // Strings now; can become foreign keys to a users collection later.
  @Prop()
  createdBy?: string;

  @Prop()
  updatedBy?: string;
}

export type GeofenceDocument = Geofence & Document;
export const GeofenceSchema = SchemaFactory.createForClass(Geofence);

// 2dsphere index on geometry — enables fast geospatial queries:
//   db.geofences.find({ geometry: { $geoIntersects: { $geometry: pointGeoJSON } } })
GeofenceSchema.index({ geometry: '2dsphere' });
GeofenceSchema.index({ active: 1, type: 1 });
