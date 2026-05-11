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
  peaks?: number[];
}
export interface TrackState {
  id: string;
  name: string;
  hidden: boolean;
  locked: boolean;
  volume: number;
  muted: boolean;
}

export interface LayerState {
  id: string;
  trackId: string;
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
  fontWeight?: string;
  letterSpacing?: number;
  dropShadow?: boolean;

  animIn?: string;
  animInDuration?: number;
  animOut?: string;
  animOutDuration?: number;
  animLoop?: string;
}

export interface ProjectState {
  duration: number;
  currentTime: number;
  fps: number;
  pixelsPerSecond: number;
  isPlaying: boolean;
  globalMuted: boolean;
  globalVolume: number;
  activeLayerId: string | null;
  activeTrackId: string | null;
  tracks: TrackState[];
  layers: LayerState[];
  mediaPool: Record<string, MediaItem>;
  
  // Settings
  proxyRes: string;
  aspectRatio: string;
  zoomMode: string;
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
  
  exportModalOpen: boolean;
  isExporting: boolean;
  trackHeight: number;
  followPlayhead: boolean;
}

export const [projectStore, setProjectStore] = createStore<ProjectState>({
  duration: 10,
  currentTime: 0,
  fps: 0,
  pixelsPerSecond: 50,
  isPlaying: false,
  globalMuted: false,
  globalVolume: 1,
  activeLayerId: null,
  activeTrackId: null,
  tracks: [{ id: 'track_1', name: 'Track 1', hidden: false, locked: false, volume: 1, muted: false }],
  layers: [],
  mediaPool: {},
  
  proxyRes: "480",
  aspectRatio: "16/9",
  zoomMode: "fit",
  
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
  
  exportModalOpen: false,
  isExporting: false,
  trackHeight: 48,
  followPlayhead: true,
});

import { audioEngine } from '../engine/AudioEngine';

export const togglePlay = () => {
  setProjectStore("isPlaying", (p) => {
    const next = !p;
    if (next && audioEngine.ctx?.state === 'suspended') {
      audioEngine.ctx.resume();
    }
    return next;
  });
};
export const setCurrentTime = (time: number) => setProjectStore("currentTime", time);
export const setLayout = (layout: ProjectState["layout"]) => setProjectStore("layout", layout);

const recalcDuration = () => {
  setProjectStore(produce(state => {
    let max = 10;
    for (const l of state.layers) {
      if (l.startTime + l.duration > max) max = l.startTime + l.duration;
    }
    state.duration = max;
  }));
};

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

export const addTrack = () => {
  const id = `track_${Date.now()}`;
  setProjectStore('tracks', (t) => [...t, { id, name: `Track ${t.length + 1}`, hidden: false, locked: false, volume: 1, muted: false }]);
  setProjectStore('activeTrackId', id);
};

export const deleteTrack = (id: string) => {
  setProjectStore('tracks', (t) => t.filter(x => x.id !== id));
  setProjectStore('layers', (l) => l.filter(x => x.trackId !== id)); // Delete all clips in track
  if (projectStore.activeTrackId === id) setProjectStore('activeTrackId', null);
  recalcDuration();
};

export const addLayer = (layer: Omit<LayerState, 'id' | 'trackId'>) => {
  const id = `l_${Date.now()}_${Math.random().toString(36).substring(2,9)}`;
  let targetTrackId = projectStore.activeTrackId;
  
  if (targetTrackId) {
    // Check if the active track already contains a different media type
    const trackLayers = projectStore.layers.filter(l => l.trackId === targetTrackId);
    if (trackLayers.length > 0 && trackLayers[0].type !== layer.type) {
      targetTrackId = null; // Force creating a new track
    }
  }

  if (!targetTrackId) {
    targetTrackId = `track_${Date.now()}`;
    const prefix = layer.type.charAt(0).toUpperCase() + layer.type.slice(1);
    setProjectStore('tracks', (t) => [...t, { id: targetTrackId as string, name: `${prefix} Track`, hidden: false, locked: false, volume: 1, muted: false }]);
  }

  const newLayer = { ...layer, id, trackId: targetTrackId };
  setProjectStore('layers', (prev) => [...prev, newLayer]);
  setProjectStore('activeLayerId', id);
  recalcDuration();
  return id;
};

export const updateLayer = (id: string, updates: Partial<LayerState>) => {
  setProjectStore('layers', (l) => l.id === id, updates);
  recalcDuration();
};

export const removeLayer = (id: string) => {
  setProjectStore('layers', (prev) => prev.filter(l => l.id !== id));
  if (projectStore.activeLayerId === id) setProjectStore('activeLayerId', null);
  recalcDuration();
};
