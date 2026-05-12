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
              --left-w: 280px; --right-w: 300px; --timeline-h: 420px; 
              display: grid !important;
              grid-template-columns: var(--left-w) minmax(0, 1fr) var(--right-w);
              grid-template-rows: minmax(0, 1fr) var(--timeline-h);
              --row-gap: 0.75rem;
              --col-gap: 0.75rem;
              gap: var(--row-gap) var(--col-gap);
              padding: 0.75rem;
              transition: grid-template-columns 0.3s cubic-bezier(0.4, 0, 0.2, 1), 
                          grid-template-rows 0.3s cubic-bezier(0.4, 0, 0.2, 1),
                          gap 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            #workspace-grid.hide-left { --left-w: 0px !important; }
            #workspace-grid.hide-right { --right-w: 0px !important; }
            #workspace-grid.hide-timeline { 
              --timeline-h: 0px !important; 
              --row-gap: 0px !important;
            }
            #workspace-grid.hide-timeline .panel-timeline-area { display: none !important; }

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

      <div id="mobile-tabs" class="md:hidden flex items-center bg-[#1a1a1a] border border-border rounded-xl p-1 shrink-0 mt-1 mb-1 shadow-2xl overflow-x-auto no-scrollbar">
        <div class="flex items-center gap-1 min-w-max px-1">
          <button 
            onClick={() => setProjectStore('mobileTab', 'timeline')}
            class={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 ${projectStore.mobileTab === 'timeline' ? 'bg-primary text-black shadow-[0_0_15px_rgba(5,213,144,0.3)]' : 'text-neutral-500 hover:text-neutral-300'}`}
          >Timeline</button>
          
          <button 
            onClick={() => { setProjectStore('mobileTab', 'pool'); setProjectStore('leftPanelTab', 'pool'); }}
            class={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 ${projectStore.mobileTab === 'pool' ? 'bg-primary text-black shadow-[0_0_15px_rgba(5,213,144,0.3)]' : 'text-neutral-500 hover:text-neutral-300'}`}
          >Media</button>
          
          <button 
            onClick={() => { setProjectStore('mobileTab', 'clips'); setProjectStore('rightPanelTab', 'layers'); }}
            class={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 ${projectStore.mobileTab === 'clips' ? 'bg-primary text-black shadow-[0_0_15px_rgba(5,213,144,0.3)]' : 'text-neutral-500 hover:text-neutral-300'}`}
          >Clips</button>
          
          <button 
            onClick={() => { setProjectStore('mobileTab', 'props'); setProjectStore('rightPanelTab', 'props'); }}
            class={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 ${projectStore.mobileTab === 'props' ? 'bg-primary text-black shadow-[0_0_15px_rgba(5,213,144,0.3)]' : 'text-neutral-500 hover:text-neutral-300'}`}
          >Properties</button>
          
          <button 
            onClick={() => { setProjectStore('mobileTab', 'text'); setProjectStore('leftPanelTab', 'text'); }}
            class={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 ${projectStore.mobileTab === 'text' ? 'bg-primary text-black shadow-[0_0_15px_rgba(5,213,144,0.3)]' : 'text-neutral-500 hover:text-neutral-300'}`}
          >Text</button>
          
          <button 
            onClick={() => { setProjectStore('mobileTab', 'shapes'); setProjectStore('leftPanelTab', 'shapes'); }}
            class={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all active:scale-95 ${projectStore.mobileTab === 'shapes' ? 'bg-primary text-black shadow-[0_0_15px_rgba(5,213,144,0.3)]' : 'text-neutral-500 hover:text-neutral-300'}`}
          >Shapes</button>
        </div>
      </div>

      <div class={`panel-left-area flex-col min-w-0 min-h-0 ${['pool', 'text', 'shapes'].includes(projectStore.mobileTab) ? 'flex flex-1' : 'hidden'} ${projectStore.showLeftPanel ? 'md:flex md:flex-initial' : 'md:hidden'}`}>
        {props.leftPanel}
      </div>

      <div class={`panel-right-area flex-col min-w-0 min-h-0 ${['clips', 'props'].includes(projectStore.mobileTab) ? 'flex flex-1' : 'hidden'} ${projectStore.showRightPanel ? 'md:flex md:flex-initial' : 'md:hidden'}`}>
        {props.rightPanel}
      </div>

      <div class={`panel-timeline-area flex-col min-w-0 min-h-0 ${projectStore.mobileTab === 'timeline' ? 'flex flex-1' : 'hidden'} ${projectStore.showTimelinePanel ? 'md:flex md:flex-initial' : 'md:hidden'}`}>
        {props.timelinePanel}
      </div>
    </div>
  );
};
