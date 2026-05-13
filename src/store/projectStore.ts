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
  saturation?: number;
  vignette?: number;
  exposure?: number;
  whites?: number;
  blacks?: number;
  temperature?: number;
  tint?: number;
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
  animInEase?: string;
  animOut?: string;
  animOutDuration?: number;
  animOutEase?: string;
  animLoop?: string;
  animLoopEase?: string;
  animLoopSpeed?: number;

  // Style & Effects
  borderRadius?: number;
  shadowEnabled?: boolean;
  shadowBlur?: number;
  shadowColor?: string;
  shadowOffsetX?: number;
  shadowOffsetY?: number;

  waveformStyle?: 'standard' | 'viz' | 'clean';
  audioAppearance?: 'waveform' | 'clip';
  clipColor?: string;
}

export interface ProjectState {
  duration: number;
  currentTime: number;
  fps: number;
  currentFPS: number;
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
  proxyRes: "240" | "360" | "480" | "540" | "720" | "1080";
  aspectRatio: "16/9" | "9/16" | "1/1";
  zoomMode: string;
  // UI State
  layout: "layout-default" | "layout-wide-left" | "layout-wide-right" | "layout-full";
  leftPanelTab: "pool" | "text" | "shapes";
  rightPanelTab: "layers" | "props" | "project";
  showLeftPanel: boolean;
  showRightPanel: boolean;
  showTimelinePanel: boolean;
  mobileTab: "timeline" | "pool" | "clips" | "props" | "text" | "shapes";

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
  isSeeking: boolean;
  trackHeight: number;
  followPlayhead: boolean;
  rippleEnabled: boolean;
  canvasBackground: string;
  theme: "light" | "dark";
}

export const [projectStore, setProjectStore] = createStore<ProjectState>({
  duration: 10,
  currentTime: 0,
  fps: 60,
  currentFPS: 0,
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
  mobileTab: "timeline",

  sourceModalOpen: false,
  sourceMediaId: null,
  srcIn: 0,
  srcOut: 0,
  srcCropX: 0,
  srcCropY: 0,
  srcCropScale: 1.0,

  exportModalOpen: false,
  isExporting: false,
  isSeeking: false,
  trackHeight: 120,
  followPlayhead: true,
  rippleEnabled: false,
  canvasBackground: 'transparent',
  theme: 'dark',
});

import { audioEngine } from '../engine/AudioEngine';

export const togglePlay = () => {
  setProjectStore("isPlaying", (p) => {
    const next = !p;
    if (next) {
      const ctx = audioEngine.init();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
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
  const id = `l_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const startTime = layer.startTime;
  const duration = layer.duration;
  const endTime = startTime + duration;

  let targetTrackId = projectStore.activeTrackId;

  // Collision detection helper
  const hasCollision = (trackId: string, start: number, end: number) => {
    return projectStore.layers.some(l =>
      l.trackId === trackId &&
      !(end <= l.startTime || start >= l.startTime + l.duration)
    );
  };

  if (projectStore.rippleEnabled) {
    // RIPPLE MODE
    // Priority: Active track (if type matches) -> Existing track of same type -> New track
    if (targetTrackId) {
      const trackLayers = projectStore.layers.filter(l => l.trackId === targetTrackId);
      if (trackLayers.length > 0 && trackLayers[0].type !== layer.type) {
        targetTrackId = null;
      }
    }

    if (!targetTrackId) {
      const sameTypeTrack = projectStore.tracks.find(t => {
        const layers = projectStore.layers.filter(l => l.trackId === t.id);
        return layers.length > 0 && layers[0].type === layer.type;
      });
      if (sameTypeTrack) targetTrackId = sameTypeTrack.id;
    }

    if (targetTrackId) {
      const insertionPoint = startTime;

      // 1. Shift everything that starts at or after the insertion point
      setProjectStore('layers',
        (l) => l.trackId === targetTrackId && l.startTime >= insertionPoint - 0.001,
        produce((l: any) => { l.startTime += duration; })
      );

      // 2. Professional Split: Handle clips that are intersected by the insertion point
      // We use a clone to avoid issues while iterating/modifying
      const intersectedClips = projectStore.layers.filter(l =>
        l.trackId === targetTrackId &&
        l.startTime < insertionPoint - 0.001 &&
        (l.startTime + l.duration) > insertionPoint + 0.001
      );

      for (const clip of intersectedClips) {
        const originalDuration = clip.duration;
        const headDuration = insertionPoint - clip.startTime;
        const tailDuration = originalDuration - headDuration;

        // Shorten the head clip
        setProjectStore('layers', (l) => l.id === clip.id, { duration: headDuration });

        // Create the tail clip
        const tailId = `l_${Date.now()}_${Math.random().toString(36).substring(2, 9)}_tail`;
        const tailLayer: LayerState = {
          ...clip,
          id: tailId,
          startTime: insertionPoint + duration,
          duration: tailDuration,
          inPoint: clip.inPoint + headDuration
        };
        setProjectStore('layers', (prev) => [...prev, tailLayer]);
      }
    }
  } else {
    // SMART PLACEMENT MODE (Default - Overlap Avoidance)
    // 1. Try active track first if no collision and type matches
    if (targetTrackId) {
      const trackLayers = projectStore.layers.filter(l => l.trackId === targetTrackId);
      const isTypeMatch = trackLayers.length === 0 || trackLayers[0].type === layer.type;
      if (!isTypeMatch || hasCollision(targetTrackId, startTime, endTime)) {
        targetTrackId = null;
      }
    }

    // 2. Search other existing tracks of same type for a gap
    if (!targetTrackId) {
      const suitableTrack = projectStore.tracks.find(t => {
        const layers = projectStore.layers.filter(l => l.trackId === t.id);
        const isTypeMatch = layers.length === 0 || layers[0].type === layer.type;
        return isTypeMatch && !hasCollision(t.id, startTime, endTime);
      });
      if (suitableTrack) targetTrackId = suitableTrack.id;
    }
  }

  // 3. Create new track if still no target
  if (!targetTrackId) {
    targetTrackId = `track_${Date.now()}`;
    const prefix = layer.type.charAt(0).toUpperCase() + layer.type.slice(1);
    setProjectStore('tracks', (t) => [...t, { id: targetTrackId as string, name: `${prefix} Track`, hidden: false, locked: false, volume: 1, muted: false }]);
  }

  const newLayer: LayerState = {
    ...layer,
    id,
    trackId: targetTrackId as string,
    // Apply default visual styles based on media type
    audioAppearance: layer.type === 'audio' ? 'waveform' : 'clip',
    waveformStyle: layer.type === 'audio' ? 'clean' : 'standard',
    clipColor: layer.clipColor || (layer.type === 'audio' ? '#10b981' : layer.type === 'video' ? '#3b82f6' : layer.type === 'image' ? '#7c3aed' : '#d97706')
  };
  setProjectStore('layers', (prev) => [...prev, newLayer]);
  setProjectStore('activeLayerId', id);
  recalcDuration();
  return id;
};

export const moveTrack = (id: string, direction: 'up' | 'down') => {
  setProjectStore('tracks', produce((tracks) => {
    const index = tracks.findIndex(t => t.id === id);
    if (index === -1) return;
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= tracks.length) return;
    const [track] = tracks.splice(index, 1);
    tracks.splice(newIndex, 0, track);
  }));
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
