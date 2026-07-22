// The brackets-viewer dist bundle ships no types for its subpath; it is an
// IIFE whose side effect registers window.bracketsViewer (typed in
// brackets-viewer.d.ts). This shorthand declaration must live in a file with
// no imports/exports so it stays an ambient (global) declaration.
declare module 'brackets-viewer/dist/brackets-viewer.min.js';
