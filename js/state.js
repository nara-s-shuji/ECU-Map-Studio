// Centralized Application State
export const RPM_AXIS = Array.from({ length: 27 }, (_, i) => 2000 + (i * 500));
export const TPS_AXIS = Array.from({ length: 21 }, (_, i) => i * 5);

export const state = {
    fuelMap: [],
    originalFuelMap: [],
    historyStack: [],
    historyIndex: -1,
    MAX_HISTORY: 50,
    
    selT: 0,
    selR: 0,
    cellColorMode: 'diff',
    
    // Selection state
    selectedCells: new Set(),
    selectionStart: null,
    isSelecting: false,
    isShiftSelecting: false,
    
    // Popup state
    popupMode: 'abs',
    popupDeltaAbs: 10,
    popupDeltaPct: 1.0,
    
    // Application state
    ecuConnected: false,
    currentFileName: "New_Map.csv",
    currentTabId: 'editor',
    currentMap: 'fuel',

    // Map Selections
    currentFuelMapIndex: 1,
    currentIgnMapIndex: 1,
    currentPriorityMap: 1,
    currentNextMap: 2,

    // UI Interaction & Selection State
    isHeaderDragging: false,
    headerDragType: null,
    headerDragStart: null,
    lastSelectedCol: -1,
    lastSelectedRow: -1,
    
    // Mobile Touch Interaction
    longPressTimer: null,
    isLongPressMode: false,
    selectionStartCell: null, // {t, r} or index
    selectionType: null       // 'cell', 'col', 'row'
};

// For backward compatibility during migration, we can also expose them to window if needed
// but the goal is to use this module.
window.APP_STATE = state;
