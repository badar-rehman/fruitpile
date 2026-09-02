import 'three/examples/jsm/lines/LineMaterial.js';

declare module 'three/examples/jsm/lines/LineMaterial.js' {
  interface LineMaterial {
    /**
     * Runtime getter/setter exists (see LineMaterial.js) but the shipped
     * @types/three declaration omits it from the class.
     */
    linewidth: number;
  }
}
