import { computed, ref } from "vue";
import type { SliceRect } from "../types";

function cloneSlices(slices: SliceRect[]): SliceRect[] {
  return slices.map(slice => ({ ...slice }));
}

export function useSlices() {
  const slices = ref<SliceRect[]>([]);
  const undoStack = ref<SliceRect[][]>([]);
  const redoStack = ref<SliceRect[][]>([]);

  const selectedIds = computed(() => slices.value.filter(slice => slice.selected).map(slice => slice.id));
  const selectedSlices = computed(() => slices.value.filter(slice => slice.selected));

  function snapshot() {
    undoStack.value.push(cloneSlices(slices.value));
    if (undoStack.value.length > 80) {
      undoStack.value.shift();
    }
    redoStack.value = [];
  }

  function setSlices(next: SliceRect[], shouldSnapshot = true) {
    if (shouldSnapshot) {
      snapshot();
    }
    slices.value = cloneSlices(next);
  }

  function addSlice(slice: SliceRect) {
    snapshot();
    slices.value = [...slices.value.map(item => ({ ...item, selected: false })), slice];
  }

  function updateSlice(id: string, patch: Partial<SliceRect>, shouldSnapshot = true) {
    if (shouldSnapshot) {
      snapshot();
    }
    slices.value = slices.value.map(slice => {
      if (slice.id !== id) {
        return slice;
      }
      const next = { ...slice, ...patch };
      return next.locked ? { ...next, selected: false } : next;
    });
  }

  function selectSlice(id: string, additive = false) {
    slices.value = slices.value.map(slice => ({
      ...slice,
      selected: slice.locked
        ? false
        : additive
          ? slice.id === id
            ? !slice.selected
            : slice.selected
          : slice.id === id
    }));
  }

  function clearSelection() {
    slices.value = slices.value.map(slice => ({ ...slice, selected: false }));
  }

  function deleteSelected() {
    if (!selectedIds.value.length) {
      return;
    }
    snapshot();
    const ids = new Set(selectedIds.value);
    slices.value = slices.value.filter(slice => !ids.has(slice.id));
  }

  function deleteSlice(id: string) {
    snapshot();
    slices.value = slices.value.filter(slice => slice.id !== id);
  }

  function clearSlices() {
    if (!slices.value.length) {
      return;
    }
    snapshot();
    slices.value = [];
  }

  function duplicateSelected() {
    if (!selectedSlices.value.length) {
      return;
    }
    snapshot();
    const copies = selectedSlices.value.filter(slice => !slice.locked).map((slice, index) => ({
      ...slice,
      id: crypto.randomUUID(),
      name: `${slice.name}-copy${index ? `-${index + 1}` : ""}`,
      x: slice.x + 12,
      y: slice.y + 12,
      locked: false,
      selected: true
    }));
    slices.value = [...slices.value.map(slice => ({ ...slice, selected: false })), ...copies];
  }

  function undo() {
    const previous = undoStack.value.pop();
    if (!previous) {
      return;
    }
    redoStack.value.push(cloneSlices(slices.value));
    slices.value = previous;
  }

  function redo() {
    const next = redoStack.value.pop();
    if (!next) {
      return;
    }
    undoStack.value.push(cloneSlices(slices.value));
    slices.value = next;
  }

  return {
    slices,
    undoStack,
    redoStack,
    selectedIds,
    selectedSlices,
    addSlice,
    updateSlice,
    setSlices,
    selectSlice,
    clearSelection,
    deleteSelected,
    deleteSlice,
    clearSlices,
    duplicateSelected,
    undo,
    redo
  };
}
