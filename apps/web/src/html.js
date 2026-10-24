// Preact + htm: componentes sin paso de compilación de JSX.
import { h } from 'preact';
import htm from 'htm';

/** @type {(strings: TemplateStringsArray, ...valores: any[]) => any} */
export const html = /** @type {any} */ (htm).bind(h);
