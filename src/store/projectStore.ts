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
}

export interface ProjectState {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  globalMuted: boolean;
  activeLayerId: string | null;
  layers: any[]; // Todo: Define Layer interface
  mediaPool: Record<string, MediaItem>; // id -> media item
  // UI State
  layout: "layout-default" | "layout-wide-left" | "layout-wide-right" | "layout-full";
  leftPanelTab: "pool" | "text" | "shapes";
  rightPanelTab: "layers" | "props";
  showLeftPanel: boolean;
  showRightPanel: boolean;
  showTimelinePanel: boolean;
  mobileTab: "left" | "right" | "timeline";
}

export const [projectStore, setProjectStore] = createStore<ProjectState>({
  duration: 10,
  currentTime: 0,
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
