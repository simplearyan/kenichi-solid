import { type Component, type JSX } from 'solid-js';
import { projectStore, setProjectStore } from '../../store/projectStore';

interface Props {
  leftPanel: JSX.Element;
  centerPanel: JSX.Element;
  rightPanel: JSX.Element;
  timelinePanel: JSX.Element;
}

export const WorkspaceGrid: Component<Props> = (props) => {
  return (
    <div 
      id="workspace-grid" 
      class={`flex-1 bg-background overflow-hidden relative
        ${projectStore.layout}
        ${!projectStore.showLeftPanel ? 'hide-left' : ''}
        ${!projectStore.showRightPanel ? 'hide-right' : ''}
        ${!projectStore.showTimelinePanel ? 'hide-timeline' : ''}
      `}
      style={{
        "display": "flex",
        "flex-direction": "column",
        "gap": "0.5rem",
        "padding": "0.5rem",
      }}
    >
      <style>
        {`
          @media (min-width: 768px) {
            #workspace-grid {
              --left-w: 280px; --right-w: 300px; --timeline-h: 220px; 
              display: grid !important;
              grid-template-columns: var(--left-w) minmax(0, 1fr) var(--right-w);
              grid-template-rows: minmax(0, 1fr) var(--timeline-h);
              gap: 0.75rem; padding: 0.75rem;
              transition: grid-template-columns 0.2s ease, grid-template-rows 0.2s ease;
            }
            #workspace-grid.hide-left { --left-w: 0px; }
            #workspace-grid.hide-right { --right-w: 0px; }
            #workspace-grid.hide-timeline { --timeline-h: 0px; }

            .layout-default { grid-template-areas: "left center right" "left timeline right"; }
            .layout-wide-left { grid-template-areas: "left center right" "timeline timeline right"; }
            .layout-wide-right { grid-template-areas: "left center right" "left timeline timeline"; }
            .layout-full { grid-template-areas: "left center right" "timeline timeline timeline"; }

            .panel-left-area { grid-area: left; }
            .panel-center-area { grid-area: center; }
            .panel-right-area { grid-area: right; }
            .panel-timeline-area { grid-area: timeline; }
          }
        `}
      </style>

      <div class="panel-center-area flex flex-col min-w-0 min-h-0 flex-[0_0_45vh] md:flex-none">
        {props.centerPanel}
      </div>

      <div id="mobile-tabs" class="md:hidden flex items-center bg-surface border border-border rounded-xl p-1 shrink-0 mt-1 mb-1 shadow-sm">
        <button 
          onClick={() => setProjectStore('mobileTab', 'left')}
          class={`mobile-tab-btn flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${projectStore.mobileTab === 'left' ? 'bg-[#262626] text-white' : 'text-neutral-500 hover:text-white'}`}
        >Media</button>
        <button 
          onClick={() => setProjectStore('mobileTab', 'right')}
          class={`mobile-tab-btn flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${projectStore.mobileTab === 'right' ? 'bg-[#262626] text-white' : 'text-neutral-500 hover:text-white'}`}
        >Settings</button>
        <button 
          onClick={() => setProjectStore('mobileTab', 'timeline')}
          class={`mobile-tab-btn flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors ${projectStore.mobileTab === 'timeline' ? 'bg-[#262626] text-white' : 'text-neutral-500 hover:text-white'}`}
        >Timeline</button>
      </div>

      <div class={`panel-left-area flex-col min-w-0 min-h-0 ${projectStore.mobileTab === 'left' ? 'flex flex-1' : 'hidden'} ${projectStore.showLeftPanel ? 'md:flex md:flex-initial' : 'md:hidden'}`}>
        {props.leftPanel}
      </div>

      <div class={`panel-right-area flex-col min-w-0 min-h-0 ${projectStore.mobileTab === 'right' ? 'flex flex-1' : 'hidden'} ${projectStore.showRightPanel ? 'md:flex md:flex-initial' : 'md:hidden'}`}>
        {props.rightPanel}
      </div>

      <div class={`panel-timeline-area flex-col min-w-0 min-h-0 ${projectStore.mobileTab === 'timeline' ? 'flex flex-1' : 'hidden'} ${projectStore.showTimelinePanel ? 'md:flex md:flex-initial' : 'md:hidden'}`}>
        {props.timelinePanel}
      </div>
    </div>
  );
};
