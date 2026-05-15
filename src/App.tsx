import { type Component, Show } from 'solid-js';
import { Header } from './components/layout/Header';
import { WorkspaceGrid } from './components/layout/WorkspaceGrid';
import { PanelLeft } from './components/layout/PanelLeft';
import { PanelCenter } from './components/layout/PanelCenter';
import { PanelRight } from './components/layout/PanelRight';
import { PanelTimeline } from './components/layout/PanelTimeline';
import { SourceModal } from './components/modals/SourceModal';
import { ExportModal } from './components/modals/ExportModal';
import { projectStore } from './store/projectStore';

import { audioEngine } from './engine/AudioEngine';
import { onMount } from 'solid-js';

const App: Component = () => {
  onMount(() => {
    // Standard Browser Audio Wakeup
    const wakeup = () => {
      audioEngine.init();
      window.removeEventListener('mousedown', wakeup);
      window.removeEventListener('keydown', wakeup);
    };
    window.addEventListener('mousedown', wakeup);
    window.addEventListener('keydown', wakeup);
  });

  return (
    <div class="h-screen w-screen flex flex-col font-sans overflow-hidden text-sm bg-background select-none">
      {/* HIDDEN DOM FOR MEDIA ELEMENTS */}
      <div id="hidden-media-container" style={{ display: 'none' }}></div>

      <Header />

      <WorkspaceGrid 
        leftPanel={<PanelLeft />}
        centerPanel={<PanelCenter />}
        rightPanel={<PanelRight />}
        timelinePanel={<PanelTimeline />}
      />

      <Show when={projectStore.sourceModalOpen}>
        <SourceModal />
      </Show>

      <Show when={projectStore.exportModalOpen}>
        <ExportModal />
      </Show>
    </div>
  );
};

export default App;
