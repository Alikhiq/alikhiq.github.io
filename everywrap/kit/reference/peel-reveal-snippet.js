// ORIGINAL snippet written for this kit (free to use, MIT-equivalent). Tested in vendor/verify-peel.html with three r187.
// Vinyl "wrap / peel" reveal on ONE MeshPhysicalMaterial: finish A (old paint) -> finish B (wrap), split by a
// moving plane in world/object space, with a thin glowing peel edge. Works on any GLB mesh (patch each car-paint material).
import * as THREE from 'three';

export function makePeelMaterial(base, wrap, { axis = new THREE.Vector3(1, 0, 0), edge = 0.04 } = {}) {
  // base: MeshPhysicalMaterial (paint). wrap: {color, roughness, metalness, clearcoat, clearcoatRoughness, normalMap?}
  const m = base.clone();
  const u = { uWipe: { value: -2 }, uAxis: { value: axis.clone().normalize() }, uEdge: { value: edge },
    wColor: { value: new THREE.Color(wrap.color) }, wRough: { value: wrap.roughness ?? 0.4 },
    wMetal: { value: wrap.metalness ?? 0.0 }, wCC: { value: wrap.clearcoat ?? 0 }, wCCR: { value: wrap.clearcoatRoughness ?? 0.1 },
    uEdgeColor: { value: new THREE.Color(0xffffff) } };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vWPos; uniform float uWipe, uEdge, wRough, wMetal, wCC, wCCR; uniform vec3 uAxis, wColor, uEdgeColor;`)
      // mask: 1 where wrap already applied (behind the wipe plane), soft edge band for the glow
      .replace('#include <color_fragment>', `#include <color_fragment>
float peelD = dot(vWPos, uAxis) - uWipe;          // <0 => wrapped
float wrapMask = 1.0 - smoothstep(-0.002, 0.002, peelD);
float edgeBand = (1.0 - smoothstep(0.0, uEdge, abs(peelD)));
diffuseColor.rgb = mix(diffuseColor.rgb, wColor, wrapMask);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, wRough, wrapMask);`)
      .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
metalnessFactor = mix(metalnessFactor, wMetal, wrapMask);`)
      .replace('#include <opaque_fragment>', `totalEmissiveRadiance += uEdgeColor * edgeBand * 0.6;
#include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'peel-v1';
  m.userData.peel = u;                 // animate: gsap.to(m.userData.peel.uWipe, { value: 2, ease: 'power2.inOut' })
  return m;
}
// Notes: for clearcoat, also mix `material.clearcoat`/`clearcoatRoughness` after <clearcoat_normal_fragment>:
//   .replace('#include <clearcoat_normal_fragment>', '#include <clearcoat_normal_fragment>\nmaterial.clearcoat = mix(material.clearcoat, wCC, wrapMask); material.clearcoatRoughness = mix(material.clearcoatRoughness, wCCR, wrapMask);')
// (emissive line above sits before opaque_fragment so the edge glow survives tone mapping.)
