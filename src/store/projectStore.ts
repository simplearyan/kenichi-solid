import { createStore } from "solid-js/store";

export interface ProjectState {
  duration: number;
  currentTime: number;
  isPlaying: boolean;
  globalMuted: boolean;
  activeLayerId: string | null;
  layers: any[]; // Todo: Define Layer interface
  mediaPool: Record<string, any>; // id -> media item
  // UI State
  layout: "layout-default" | "layout-wide-left" | "layout-wide-right" | "layout-full";
  leftPanelTab: "pool" | "text" | "shapes";
  rightPanelTab: "layers" | "props";
  showLeftPanel: boolean;
  showRightPanel: boolean;
  showTimelinePanel: boolean;
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
});

export const togglePlay = () => setProjectStore("isPlaying", (p) => !p);
export const setCurrentTime = (time: number) => setProjectStore("currentTime", time);
export const setLayout = (layout: ProjectState["layout"]) => setProjectStore("layout", layout);
