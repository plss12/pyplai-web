/**
 * TEMPORARY: viewport measurements for the iPhone bug where the new game dialog opens too big
 * and shrinks at the first tap. Enabled with ?debug in the URL; prints inside the dialog so it
 * shows above the backdrop. Remove once the cause is fixed.
 */

export interface ViewportDebug {
  snapshot(label: string): void;
}

export function createViewportDebug(dialog: HTMLDialogElement): ViewportDebug {
  const output = document.createElement("pre");
  output.className = "text-xs leading-snug whitespace-pre-wrap";
  output.style.fontFamily = "ui-monospace, monospace";
  dialog.querySelector("form")?.prepend(output);

  // What 100vw resolves to, measured with a probe, since that is what the dialog's width uses
  const probe = document.createElement("div");
  probe.style.cssText = "position:fixed;left:0;top:0;width:100vw;height:0;visibility:hidden";
  document.body.append(probe);

  const round = (n: number): number => Math.round(n * 10) / 10;

  function snapshot(label: string): void {
    const box = dialog.getBoundingClientRect();
    const board = document.querySelector("[data-board]")?.getBoundingClientRect();
    const vv = window.visualViewport;
    const lines = [
      `— ${label} (${round(performance.now())} ms)`,
      `inner ${innerWidth}×${innerHeight}  client ${document.documentElement.clientWidth}  scroll ${document.documentElement.scrollWidth}`,
      `visualViewport ${vv ? `${round(vv.width)}×${round(vv.height)} scale ${round(vv.scale)}` : "none"}`,
      `100vw = ${round(probe.getBoundingClientRect().width)}  dpr ${devicePixelRatio}  screen ${screen.width}`,
      `dialog ${round(box.width)}×${round(box.height)}  css width ${getComputedStyle(dialog).width}`,
      `board ${board ? round(board.width) : "-"}  font ${document.fonts.check('16px "Instrument Sans"') ? "loaded" : "fallback"}`,
    ];
    output.textContent += lines.join("\n") + "\n";
  }

  setTimeout(() => snapshot("+1 s"), 1000);
  setTimeout(() => snapshot("+3 s"), 3000);
  document.addEventListener("pointerdown", () => setTimeout(() => snapshot("after the first tap"), 300), {
    once: true,
    capture: true,
  });
  return { snapshot };
}
