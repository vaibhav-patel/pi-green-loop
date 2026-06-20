import type { Check } from "../types.js";
import type { DetectContext, Detector } from "./types.js";
export type { DetectContext, Detector, EcosystemSource } from "./types.js";
/** Array order is priority: earlier detectors win when several emit the same check kind. */
export declare const DETECTORS: Detector[];
/** Run every matching detector (each guarded so one ecosystem can't break detection). */
export declare function detectAll(ctx: DetectContext): Check[];
