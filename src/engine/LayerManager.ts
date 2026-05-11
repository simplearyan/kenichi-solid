import { projectStore, setProjectStore } from '../store/projectStore';

export interface Layer {
  id: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'shape';
  name: string;
  start: number; // Start time on timeline
  duration: number; // Duration on timeline
  inPoint: number; // Trim start
  outPoint: number; // Trim end
  
  // Transform
  x: number;
  y: number;
  scale: number;
  rotation: number;
  
  // Media source reference
  mediaId?: string;
  
  // Visual props
  hidden: boolean;
  locked: boolean;
  
  // Custom props
  customProps: Record<string, any>;
}

export class LayerManager {
  addLayer(layer: Omit<Layer, 'id'>) {
    const id = `layer_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const newLayer: Layer = { ...layer, id };
    
    setProjectStore('layers', (prev) => [...prev, newLayer]);
    setProjectStore('activeLayerId', id);
    return id;
  }

  removeLayer(id: string) {
    setProjectStore('layers', (prev) => prev.filter(l => l.id !== id));
    if (projectStore.activeLayerId === id) {
      setProjectStore('activeLayerId', null);
    }
  }

  updateLayer(id: string, updates: Partial<Layer>) {
    setProjectStore('layers', (l) => l.id === id, updates);
  }
}

export const layerManager = new LayerManager();
