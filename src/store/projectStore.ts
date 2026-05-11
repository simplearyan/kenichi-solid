import { createStore, produce } from "solid-js/store";

export interface MediaItem {
  id: string;
  file: File;
  url: string;
  name: string;
  type: 'video' | 'audio' | 'image';
  duration: number;
  origW?: number;
  origH?: number;
  origH?: number;
  peaks?: number[];
}

export interface LayerState {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'image' | 'text' | 'shape';
  mediaId?: string;
  
  startTime: number;
  duration: number;
  inPoint: number;
  
  hidden: boolean;
  locked: boolean;
  
  scale: number;
  rotation: number;
  posX: number;
  posY: number;
  radius: number;
  
  brightness: number;
  contrast: number;
  chromaKey: boolean;
  chromaColor: string;
  chromaTolerance: number;
  colorReplace: boolean;
  replaceFromColor: string;
  replaceToColor: string;
  
  volume: number;
  fadeIn: number;
  fadeOut: number;
  echo: boolean;
  echoDelay: number;
  echoFeedback: number;
  
  textContent?: string;
  fillColor?: string;
  strokeColor?: string;
  strokeWidth?: number;
  fontSize?: number;
  fontFamily?: string;
}

export interface ProjectState {
  duration: number;
  currentTime: number;
  pixelsPerSecond: number;
  isPlaying: boolean;
  globalMuted: boolean;
  activeLayerId: string | null;
  layers: LayerState[];
  mediaPool: Record<string, MediaItem>;
  // UI State
  layout: "layout-default" | "layout-wide-left" | "layout-wide-right" | "layout-full";
  leftPanelTab: "pool" | "text" | "shapes";
  rightPanelTab: "layers" | "props";
  showLeftPanel: boolean;
  showRightPanel: boolean;
  showTimelinePanel: boolean;
  mobileTab: "left" | "right" | "timeline";
  
  // Source Modal State
  sourceModalOpen: boolean;
  sourceMediaId: string | null;
  srcIn: number;
  srcOut: number;
  srcCropX: number;
  srcCropY: number;
  srcCropScale: number;
}

export const [projectStore, setProjectStore] = createStore<ProjectState>({
  duration: 10,
  currentTime: 0,
  pixelsPerSecond: 50,
  isPlaying: false,
  globalMuted: false,
  activeLayerId: null,
  layers: [],
  mediaPool: {},
  
  layout: "layout-default",
  leftPanelTab: "pool",
  rightPanelTab: "layers",
  showLeftPanel: true,
  showRightPanel: true,
  showTimelinePanel: true,
  mobileTab: "left",
  
  sourceModalOpen: false,
  sourceMediaId: null,
  srcIn: 0,
  srcOut: 0,
  srcCropX: 0,
  srcCropY: 0,
  srcCropScale: 1.0,
});

export const togglePlay = () => setProjectStore("isPlaying", (p) => !p);
export const setCurrentTime = (time: number) => setProjectStore("currentTime", time);
export const setLayout = (layout: ProjectState["layout"]) => setProjectStore("layout", layout);

export const addMediaToPool = (media: MediaItem) => {
  setProjectStore(produce((state) => {
    state.mediaPool[media.id] = media;
  }));
};

export const removeMediaFromPool = (id: string) => {
  setProjectStore(produce((state) => {
    if (state.mediaPool[id]) {
      URL.revokeObjectURL(state.mediaPool[id].url);
      delete state.mediaPool[id];
    }
  }));
};

export const openSourceModal = (id: string) => {
  setProjectStore(produce((state) => {
    const media = state.mediaPool[id];
    if (media) {
      state.sourceMediaId = id;
      state.sourceModalOpen = true;
      state.srcIn = 0;
      state.srcOut = media.duration;
      state.srcCropX = 0;
      state.srcCropY = 0;
      state.srcCropScale = 1.0;
    }
  }));
};

export const closeSourceModal = () => {
  setProjectStore("sourceModalOpen", false);
};

export const updateSourceModalState = (updates: Partial<ProjectState>) => {
  setProjectStore(produce((state) => {
    Object.assign(state, updates);
  }));
};

export const addLayer = (layer: Omit<LayerState, 'id'>) => {
  const id = `l_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
  const newLayer = { ...layer, id };
  setProjectStore('layers', (prev) => [...prev, newLayer]);
  setProjectStore('activeLayerId', id);
  return id;
};

export const updateLayer = (id: string, updates: Partial<LayerState>) => {
  setProjectStore('layers', (l) => l.id === id, updates);
};

export const removeLayer = (id: string) => {
  setProjectStore('layers', (prev) => prev.filter(l => l.id !== id));
  if (projectStore.activeLayerId === id) setProjectStore('activeLayerId', null);
};
