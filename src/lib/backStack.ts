// Android back button support for overlays (bottom sheets).
// Each open overlay registers a close callback; the hardware back button closes the top one first.

interface Entry {
  close: () => void;
}

const stack: Entry[] = [];

/** Register an overlay. Returns an unregister function (call it when the overlay unmounts). */
export function pushBack(close: () => void): () => void {
  const entry: Entry = { close };
  stack.push(entry);
  return () => {
    const i = stack.indexOf(entry);
    if (i >= 0) stack.splice(i, 1);
  };
}

/** Close the top overlay. Returns true if something was closed. */
export function handleBack(): boolean {
  const top = stack.pop();
  if (!top) return false;
  top.close();
  return true;
}
