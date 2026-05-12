export const setupResizer = (
  resizerEl: HTMLElement,
  type: 'left' | 'right' | 'timeline'
) => {
  resizerEl.addEventListener('pointerdown', (e) => {
    const workspaceGrid = document.getElementById('workspace-grid');
    if (!workspaceGrid) return;

    resizerEl.setPointerCapture(e.pointerId);
    document.body.style.cursor = type === 'timeline' ? 'row-resize' : 'col-resize';
    resizerEl.classList.add('active');
    
    workspaceGrid.style.transition = 'none';

    const onMove = (ev: PointerEvent) => {
      if (type === 'left') {
        const width = Math.max(200, Math.min(ev.clientX - 12, window.innerWidth / 2.5));
        workspaceGrid.style.setProperty('--left-w', `${width}px`);
      }
      if (type === 'right') {
        const width = Math.max(200, Math.min(window.innerWidth - ev.clientX - 12, window.innerWidth / 2.5));
        workspaceGrid.style.setProperty('--right-w', `${width}px`);
      }
      if (type === 'timeline') {
        const height = Math.max(120, Math.min(window.innerHeight - ev.clientY - 12, window.innerHeight * 0.6));
        workspaceGrid.style.setProperty('--timeline-h', `${height}px`);
      }
    };

    const onUp = () => {
      document.body.style.cursor = '';
      resizerEl.classList.remove('active');
      workspaceGrid.style.transition = '';
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  });
};
