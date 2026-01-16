
export type UnitSystem = 'imperial' | 'metric';

export interface Cutout {
  id: string;
  name: string;
  length: number;
  width: number;
  x: number; // Relative to slab X
  y: number; // Relative to slab Y
}

export interface Slab {
  id: string;
  name: string;
  length: number; // Stored in inches internally
  width: number;
  thickness: number;
  edges: number; 
  color?: string;
  x: number; // Position X on canvas (relative pixels)
  y: number; // Position Y on canvas (relative pixels)
  cutouts?: Cutout[];
}

export interface Quote {
  slabs: Slab[];
  sqftPrice: number;
  edgePrice: number;
  finishPrice: number;
  taxRate: number;
}

export interface MaterialSource {
  name: string;
  uri: string;
  title: string;
}

export enum AppTab {
  DESIGN = 'design',
  QUOTE = 'quote',
  RESEARCH = 'research'
}
