import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
} from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TYPES & INTERFACES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Environment lighting presets */
export type EnvironmentPreset = "studio" | "outdoor" | "showroom" | "dramatic";

/** Camera angle presets */
export type CameraPreset = "beauty" | "front" | "side" | "top" | "back";

/** Material category detected by the classifier */
type MaterialCategory =
  | "metal-polished"
  | "metal-brushed"
  | "metal-rough"
  | "glass"
  | "fabric"
  | "plastic-glossy"
  | "plastic-matte"
  | "rubber"
  | "wood"
  | "ceramic"
  | "leather"
  | "gemstone"
  | "emissive"
  | "generic";

export interface GlbViewerProps {
  url: string | null;
  /** Optional product/site name shown in the bottom bar */
  siteName?: string;
  width?: number;
  height?: number;
  /** Hex background color (default: transparent) */
  backgroundColor?: string;
  /** Background opacity 0–1 (default 0 = fully transparent) */
  backgroundOpacity?: number;
  /** Starting environment preset */
  environment?: EnvironmentPreset;
  /** Enable auto-rotate on load */
  autoRotate?: boolean;
  /** Show ground shadow plane */
  showGroundShadow?: boolean;
  /** Show ground reflection */
  showGroundReflection?: boolean;
  /** Show dimension wireframe */
  showDimensions?: boolean;
  /** Enable screenshot button */
  enableScreenshot?: boolean;
  /** Enable fullscreen button */
  enableFullscreen?: boolean;
  /** Enable camera preset buttons */
  enableCameraPresets?: boolean;
  /** Enable environment switcher */
  enableEnvironmentSwitch?: boolean;
  /** Called when the model finishes loading */
  onLoaded?: (info: {
    triangleCount: number;
    materialCount: number;
    boundingBox: { x: number; y: number; z: number };
  }) => void;
  /** Called on load error */
  onError?: (message: string) => void;
  /** Close button handler — if provided, a close button appears */
  onClose?: () => void;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONSTANTS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const DEFAULT_BG = "#0a0a0f";
const DRACO_DECODER_PATH = "https://www.gstatic.com/draco/versioned/decoders/1.5.7/";

/** Environment preset configurations */
const ENV_CONFIGS: Record<
  EnvironmentPreset,
  {
    label: string;
    icon: string;
    gradient: {
      bottom: [number, number, number];
      mid: [number, number, number];
      top: [number, number, number];
    };
    softboxes: Array<{
      pos: [number, number, number];
      size: number;
      intensity: number;
      color?: [number, number, number];
    }>;
    lights: {
      ambient: number;
      hemiSky: string;
      hemiGround: string;
      hemiIntensity: number;
      key: { color: string; intensity: number; pos: [number, number, number] };
      fill: { color: string; intensity: number; pos: [number, number, number] };
      rim: { color: string; intensity: number; pos: [number, number, number] };
      bottom: { color: string; intensity: number };
    };
    toneMappingExposure: number;
  }
> = {
  studio: {
    label: "Studio",
    icon: "◐",
    gradient: {
      bottom: [0.22, 0.2, 0.19],
      mid: [0.32, 0.32, 0.33],
      top: [0.5, 0.5, 0.53],
    },
    softboxes: [
      { pos: [40, 65, 30], size: 38, intensity: 2.0 },
      { pos: [-55, 35, 25], size: 32, intensity: 1.1 },
      { pos: [10, 25, -65], size: 28, intensity: 0.85 },
      { pos: [0, -55, 0], size: 65, intensity: 0.5 },
      { pos: [30, 80, -20], size: 20, intensity: 1.5 },
    ],
    lights: {
      ambient: 0.08,
      hemiSky: "#c8d8e8",
      hemiGround: "#2a2018",
      hemiIntensity: 0.2,
      key: { color: "#fff8f0", intensity: 0.65, pos: [80, 150, 100] },
      fill: { color: "#e8f0ff", intensity: 0.3, pos: [-100, 80, 60] },
      rim: { color: "#ffffff", intensity: 0.25, pos: [20, 60, -120] },
      bottom: { color: "#e0dcd8", intensity: 0.08 },
    },
    toneMappingExposure: 0.75,
  },
  outdoor: {
    label: "Outdoor",
    icon: "☀",
    gradient: {
      bottom: [0.35, 0.32, 0.28],
      mid: [0.55, 0.6, 0.7],
      top: [0.4, 0.6, 0.9],
    },
    softboxes: [
      { pos: [0, 90, 10], size: 80, intensity: 2.5, color: [1.0, 0.96, 0.88] },
      { pos: [-40, 20, 40], size: 50, intensity: 0.6, color: [0.7, 0.8, 1.0] },
      { pos: [0, -50, 0], size: 70, intensity: 0.4, color: [0.5, 0.45, 0.38] },
    ],
    lights: {
      ambient: 0.12,
      hemiSky: "#87ceeb",
      hemiGround: "#8b7355",
      hemiIntensity: 0.3,
      key: { color: "#fff4e0", intensity: 0.9, pos: [60, 200, 80] },
      fill: { color: "#b0d4f1", intensity: 0.25, pos: [-80, 40, 60] },
      rim: { color: "#ffeedd", intensity: 0.18, pos: [30, 80, -100] },
      bottom: { color: "#d4c4a8", intensity: 0.12 },
    },
    toneMappingExposure: 0.85,
  },
  showroom: {
    label: "Showroom",
    icon: "◆",
    gradient: {
      bottom: [0.15, 0.15, 0.16],
      mid: [0.2, 0.2, 0.22],
      top: [0.35, 0.35, 0.38],
    },
    softboxes: [
      { pos: [50, 70, 40], size: 45, intensity: 2.2 },
      { pos: [-50, 70, 40], size: 45, intensity: 2.0 },
      { pos: [0, 90, 0], size: 60, intensity: 1.8 },
      { pos: [0, -50, 0], size: 70, intensity: 0.35 },
      { pos: [60, 30, -40], size: 25, intensity: 1.0 },
      { pos: [-60, 30, -40], size: 25, intensity: 0.9 },
    ],
    lights: {
      ambient: 0.05,
      hemiSky: "#d0d0e0",
      hemiGround: "#1a1a1a",
      hemiIntensity: 0.15,
      key: { color: "#ffffff", intensity: 0.7, pos: [60, 140, 80] },
      fill: { color: "#f0f0ff", intensity: 0.35, pos: [-60, 140, 80] },
      rim: { color: "#ffffff", intensity: 0.3, pos: [0, 50, -130] },
      bottom: { color: "#e8e8e8", intensity: 0.06 },
    },
    toneMappingExposure: 0.8,
  },
  dramatic: {
    label: "Dramatic",
    icon: "◑",
    gradient: {
      bottom: [0.05, 0.04, 0.06],
      mid: [0.1, 0.08, 0.12],
      top: [0.15, 0.12, 0.2],
    },
    softboxes: [
      { pos: [60, 80, 20], size: 30, intensity: 3.0, color: [1.0, 0.95, 0.85] },
      { pos: [-20, 10, 50], size: 15, intensity: 0.4 },
      { pos: [0, -50, 0], size: 40, intensity: 0.15 },
    ],
    lights: {
      ambient: 0.02,
      hemiSky: "#1a1a2e",
      hemiGround: "#000000",
      hemiIntensity: 0.05,
      key: { color: "#fff0d0", intensity: 1.0, pos: [100, 120, 50] },
      fill: { color: "#c0c8e0", intensity: 0.1, pos: [-80, 60, 80] },
      rim: { color: "#e0d0ff", intensity: 0.45, pos: [-30, 40, -100] },
      bottom: { color: "#1a1a1a", intensity: 0.01 },
    },
    toneMappingExposure: 0.75,
  },
};

/** Camera preset angles (normalized direction + distance multiplier) */
const CAMERA_PRESETS: Record<
  CameraPreset,
  { label: string; dir: [number, number, number]; distMul: number }
> = {
  beauty: { label: "¾", dir: [0.6, 0.35, 0.7], distMul: 1.5 },
  front: { label: "F", dir: [0, 0.15, 1], distMul: 1.6 },
  side: { label: "S", dir: [1, 0.15, 0], distMul: 1.6 },
  top: { label: "T", dir: [0.05, 1, 0.05], distMul: 1.8 },
  back: { label: "B", dir: [0, 0.15, -1], distMul: 1.6 },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATERIAL CLASSIFIER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Classifies a MeshStandardMaterial into a product-relevant category
// so we can apply category-specific rendering optimizations.

function classifyMaterial(m: THREE.MeshStandardMaterial): MaterialCategory {
  const metalness = m.metalness ?? 0;
  const roughness = m.roughness ?? 0.5;
  const opacity = m.opacity ?? 1;
  // More sensitive detection - check for ANY emissive component, even very small
  const hasEmissive =
    m.emissive &&
    (m.emissive.r > 0.001 || m.emissive.g > 0.001 || m.emissive.b > 0.001);
  // Also check emissiveIntensity property
  const hasEmissiveIntensity = (m as any).emissiveIntensity && (m as any).emissiveIntensity > 0;

  if (hasEmissive || hasEmissiveIntensity) return "emissive";

  // Transparent / translucent → glass or gemstone
  if (opacity < 0.85 || m.transparent) {
    if (metalness > 0.1) return "gemstone";
    return "glass";
  }

  // High metalness
  if (metalness > 0.5) {
    if (roughness < 0.15) return "metal-polished";
    if (roughness < 0.45) return "metal-brushed";
    return "metal-rough";
  }

  // Low metalness, varying roughness
  if (metalness < 0.1) {
    if (roughness > 0.85) return "fabric";
    if (roughness > 0.7) return "rubber";
    if (roughness > 0.5) return "plastic-matte";
    if (roughness > 0.3) {
      // Could be wood, ceramic, or leather — use color heuristics
      const hsl = { h: 0, s: 0, l: 0 };
      m.color.getHSL(hsl);
      if (hsl.s < 0.15 && hsl.l > 0.7) return "ceramic";
      if (hsl.h > 0.02 && hsl.h < 0.12 && hsl.s > 0.2) return "wood";
      if (hsl.h > 0.0 && hsl.h < 0.08 && hsl.s > 0.3 && hsl.l < 0.4)
        return "leather";
      return "plastic-matte";
    }
    return "plastic-glossy";
  }

  return "generic";
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MATERIAL OPTIMIZER — category-aware
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// NEVER overrides authored colors. Only tunes rendering params per category.

function optimizeMaterial(m: THREE.MeshStandardMaterial, cat: MaterialCategory) {
  switch (cat) {
    case "metal-polished":
      // Chrome, polished steel, gold — needs strong reflections
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.9, 1.8);
      m.roughness = Math.max(m.roughness, 0.04); // prevent perfect mirror
      fixDarkMetalColor(m);
      break;

    case "metal-brushed":
      // Brushed aluminum, stainless steel — softer reflections
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.7, 1.5);
      fixDarkMetalColor(m);
      break;

    case "metal-rough":
      // Cast iron, weathered metal — needs texture visibility
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.6, 1.4);
      fixDarkMetalColor(m);
      // Ensure texture details show through
      m.roughness = Math.max(m.roughness ?? 0.5, 0.5);
      break;

    case "glass":
      // Ensure transparency renders correctly
      m.transparent = true;
      // For glass, we need depthWrite enabled for proper depth sorting
      // But disable it only if opacity is very low to prevent artifacts
      m.depthWrite = m.opacity > 0.5;
      m.side = THREE.DoubleSide;
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.8, 2.0);
      // Boost transmission appearance
      if (m.opacity > 0.1 && m.opacity < 0.5) {
        m.opacity = Math.max(m.opacity, 0.25);
      }
      // Add polygon offset for overlapping glass surfaces
      m.polygonOffset = true;
      m.polygonOffsetFactor = 2;
      m.polygonOffsetUnits = 2;
      break;

    case "gemstone":
      // High refraction look — strong env, moderate roughness
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 1.2, 2.5);
      m.transparent = true;
      // Enable depthWrite for gemstones to prevent z-fighting
      m.depthWrite = m.opacity > 0.5;
      m.side = THREE.DoubleSide;
      // Add polygon offset for overlapping gemstone surfaces
      m.polygonOffset = true;
      m.polygonOffsetFactor = 2;
      m.polygonOffsetUnits = 2;
      break;
      break;

    case "fabric":
      // Fabric textures need better visibility - increase env map slightly
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.4, 0.8);
      // Ensure fabric textures show through
      m.roughness = Math.max(m.roughness ?? 0.5, 0.6);
      break;

    case "rubber":
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.2, 0.6);
      break;

    case "leather":
      // Leather needs better texture visibility
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.5, 1.0);
      m.roughness = Math.max(m.roughness ?? 0.5, 0.5);
      break;

    case "plastic-glossy":
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.5, 1.2);
      break;

    case "plastic-matte":
      // Improve texture visibility for matte plastics
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.4, 0.9);
      break;

    case "wood":
      // Wood needs higher env map intensity to show grain and texture detail
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.6, 1.2);
      // Ensure wood textures are visible with proper roughness
      m.roughness = Math.max(m.roughness ?? 0.5, 0.4);
      break;

    case "ceramic":
      // Glossy ceramic needs decent reflections
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.5, 1.2);
      break;

    case "emissive":
      // LEDs, screens, indicators, lasers — PROFESSIONAL GLOW with maximum brightness
      // Set very high emissive intensity for professional appearance
      const currentEmissiveIntensity = (m as any).emissiveIntensity ?? 1.0;
      // Significantly boost emissive intensity - minimum 10.0 for professional glow
      m.emissiveIntensity = Math.max(currentEmissiveIntensity * 2.0, 10.0);
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.01, 0.2);
      
      // Ensure emissive color is VERY bright and saturated
      if (m.emissive) {
        const maxEmissive = Math.max(m.emissive.r, m.emissive.g, m.emissive.b);
        
        // Detect if this is a red laser/light (red is dominant)
        const isRedLaser = m.emissive.r > m.emissive.g * 1.5 && m.emissive.r > m.emissive.b * 1.5;
        
        // For red lasers, boost even more aggressively
        if (isRedLaser) {
          // Make red lasers VERY bright and saturated
          m.emissive.r = Math.min(m.emissive.r * 8.0, 1.0); // Cap at 1.0 but boost significantly
          m.emissive.g = Math.min(m.emissive.g * 2.0, 0.2); // Keep green low for pure red
          m.emissive.b = Math.min(m.emissive.b * 2.0, 0.2); // Keep blue low for pure red
          // Set minimum intensity even higher for red lasers
          m.emissiveIntensity = Math.max(m.emissiveIntensity, 15.0);
        } else {
          // For other colors, boost based on brightness
          if (maxEmissive < 0.5) {
            // Boost dim colors by 6-10x
            const boostFactor = maxEmissive < 0.1 ? 10.0 : 6.0;
            m.emissive.multiplyScalar(boostFactor);
            // Clamp to prevent overflow but keep bright
            m.emissive.r = Math.min(m.emissive.r, 1.0);
            m.emissive.g = Math.min(m.emissive.g, 1.0);
            m.emissive.b = Math.min(m.emissive.b, 1.0);
          } else {
            // Already bright, but ensure saturation and boost slightly
            m.emissive.multiplyScalar(2.5);
            m.emissive.r = Math.min(m.emissive.r, 1.0);
            m.emissive.g = Math.min(m.emissive.g, 1.0);
            m.emissive.b = Math.min(m.emissive.b, 1.0);
          }
        }
        
        // Ensure minimum brightness for all emissive materials
        if (maxEmissive < 0.8) {
          const targetBrightness = isRedLaser ? 0.95 : 0.85;
          const scaleFactor = targetBrightness / maxEmissive;
          m.emissive.multiplyScalar(Math.min(scaleFactor, 3.0));
          // Clamp again after scaling
          m.emissive.r = Math.min(m.emissive.r, 1.0);
          m.emissive.g = Math.min(m.emissive.g, 1.0);
          m.emissive.b = Math.min(m.emissive.b, 1.0);
        }
      } else {
        // If no emissive color set but material is classified as emissive, add one
        // Use the base color as emissive and make it very bright
        m.emissive.copy(m.color);
        m.emissive.multiplyScalar(5.0);
        m.emissive.r = Math.min(m.emissive.r, 1.0);
        m.emissive.g = Math.min(m.emissive.g, 1.0);
        m.emissive.b = Math.min(m.emissive.b, 1.0);
      }
      
      // Make emissive materials stand out by reducing base color influence
      // Darken base color slightly so emissive glow is more prominent
      m.color.multiplyScalar(0.7);
      
      // Optimize material properties for maximum glow visibility
      m.metalness = Math.min(m.metalness ?? 0, 0.2); // Low metalness for better glow
      m.roughness = Math.max(m.roughness ?? 0.5, 0.8); // Higher roughness for softer glow
      
      // Disable tone mapping for pure, bright glow (or use very high exposure)
      m.toneMapped = false; // This ensures the glow isn't dimmed by tone mapping
      break;

    case "generic":
    default:
      // Generic materials need better texture visibility
      m.envMapIntensity = clamp(m.envMapIntensity ?? 1.0, 0.5, 1.2);
      break;
  }

  // ── Optimize normal maps for better texture detail ──
  if (m.normalMap) {
    // Ensure normal maps are properly configured for texture visibility
    if (!m.normalScale) {
      m.normalScale = new THREE.Vector2(1, 1);
    }
    const ns = m.normalScale;
    // Cap extreme normal scale that makes surfaces look like crumpled foil
    if (ns.x > 2.0) ns.x = 2.0;
    if (ns.y > 2.0) ns.y = 2.0;
    // Ensure minimum normal map strength for texture detail
    if (ns.x < 0.3) ns.x = 0.5;
    if (ns.y < 0.3) ns.y = 0.5;
    
    // Set proper texture filtering for normal maps
    m.normalMap.minFilter = THREE.LinearMipmapLinearFilter;
    m.normalMap.magFilter = THREE.LinearFilter;
    m.normalMap.generateMipmaps = true;
  }
  
  // ── Optimize all textures for better visibility ──
  if (m.map) {
    m.map.minFilter = THREE.LinearMipmapLinearFilter;
    m.map.magFilter = THREE.LinearFilter;
    m.map.generateMipmaps = true;
    m.map.anisotropy = 16; // High anisotropy for crisp textures
  }
  
  if (m.roughnessMap) {
    m.roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
    m.roughnessMap.magFilter = THREE.LinearFilter;
    m.roughnessMap.generateMipmaps = true;
  }
  
  if (m.metalnessMap) {
    m.metalnessMap.minFilter = THREE.LinearMipmapLinearFilter;
    m.metalnessMap.magFilter = THREE.LinearFilter;
    m.metalnessMap.generateMipmaps = true;
  }
  
  if (m.aoMap) {
    m.aoMap.minFilter = THREE.LinearMipmapLinearFilter;
    m.aoMap.magFilter = THREE.LinearFilter;
    m.aoMap.generateMipmaps = true;
  }

  m.needsUpdate = true;
}

/** Fix near-black metallic base colors that result in invisible reflections */
function fixDarkMetalColor(m: THREE.MeshStandardMaterial) {
  const hex = m.color.getHex();
  if (hex < 0x0f0f0f) {
    m.color.setHex(0x3a3a3a);
  } else if (hex < 0x1a1a1a) {
    m.color.setHex(0x2a2a2a);
  }
}

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENVIRONMENT MAP BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildEnvironment(
  renderer: THREE.WebGLRenderer,
  preset: EnvironmentPreset
): THREE.Texture {
  const cfg = ENV_CONFIGS[preset];
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileCubemapShader();

  const envScene = new THREE.Scene();

  // ── Gradient backdrop sphere ──
  const geo = new THREE.SphereGeometry(100, 64, 32);
  const colors = new Float32Array(geo.attributes.position.count * 3);
  const posAttr = geo.attributes.position;
  const { bottom, mid, top } = cfg.gradient;

  for (let i = 0; i < posAttr.count; i++) {
    const y = posAttr.getY(i);
    const t = (y + 100) / 200; // normalize [0,1]

    let r: number, g: number, b: number;
    if (t < 0.4) {
      const s = t / 0.4;
      r = lerp(bottom[0], mid[0], s);
      g = lerp(bottom[1], mid[1], s);
      b = lerp(bottom[2], mid[2], s);
    } else {
      const s = (t - 0.4) / 0.6;
      r = lerp(mid[0], top[0], s);
      g = lerp(mid[1], top[1], s);
      b = lerp(mid[2], top[2], s);
    }

    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const mat = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
  });
  envScene.add(new THREE.Mesh(geo, mat));

  // ── Softbox panels ──
  for (const sb of cfg.softboxes) {
    const sbGeo = new THREE.PlaneGeometry(sb.size, sb.size);
    const color = sb.color
      ? new THREE.Color(sb.color[0] * sb.intensity, sb.color[1] * sb.intensity, sb.color[2] * sb.intensity)
      : new THREE.Color(sb.intensity, sb.intensity, sb.intensity * 0.98);
    const sbMat = new THREE.MeshBasicMaterial({
      color,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(sbGeo, sbMat);
    mesh.position.set(sb.pos[0], sb.pos[1], sb.pos[2]);
    mesh.lookAt(0, 0, 0);
    envScene.add(mesh);
  }

  const envTexture = pmrem.fromScene(envScene, 0.04).texture;

  // Cleanup generator resources
  geo.dispose();
  mat.dispose();
  pmrem.dispose();

  return envTexture;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SCENE LIGHTS BUILDER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildSceneLights(
  scene: THREE.Scene,
  preset: EnvironmentPreset,
  modelRadius: number
): THREE.Group {
  const cfg = ENV_CONFIGS[preset].lights;
  const group = new THREE.Group();
  group.name = "__product_lights__";

  // Scale light positions relative to model size
  const scale = Math.max(modelRadius * 2, 1);

  const ambient = new THREE.AmbientLight(0xffffff, cfg.ambient);
  group.add(ambient);

  const hemi = new THREE.HemisphereLight(cfg.hemiSky, cfg.hemiGround, cfg.hemiIntensity);
  group.add(hemi);

  const key = new THREE.DirectionalLight(cfg.key.color, cfg.key.intensity);
  key.position.set(
    cfg.key.pos[0] * (scale / 100),
    cfg.key.pos[1] * (scale / 100),
    cfg.key.pos[2] * (scale / 100)
  );
  // Shadow for key light (contact shadow)
  key.castShadow = true;
  key.shadow.mapSize.width = 1024;
  key.shadow.mapSize.height = 1024;
  const shadowExtent = modelRadius * 2;
  key.shadow.camera.left = -shadowExtent;
  key.shadow.camera.right = shadowExtent;
  key.shadow.camera.top = shadowExtent;
  key.shadow.camera.bottom = -shadowExtent;
  key.shadow.camera.near = 0.1;
  key.shadow.camera.far = scale * 5;
  key.shadow.bias = -0.002;
  key.shadow.normalBias = 0.02;
  group.add(key);

  const fill = new THREE.DirectionalLight(cfg.fill.color, cfg.fill.intensity);
  fill.position.set(
    cfg.fill.pos[0] * (scale / 100),
    cfg.fill.pos[1] * (scale / 100),
    cfg.fill.pos[2] * (scale / 100)
  );
  group.add(fill);

  const rim = new THREE.DirectionalLight(cfg.rim.color, cfg.rim.intensity);
  rim.position.set(
    cfg.rim.pos[0] * (scale / 100),
    cfg.rim.pos[1] * (scale / 100),
    cfg.rim.pos[2] * (scale / 100)
  );
  group.add(rim);

  const bottom = new THREE.DirectionalLight(cfg.bottom.color, cfg.bottom.intensity);
  bottom.position.set(0, -scale * 0.8, 0);
  group.add(bottom);

  scene.add(group);
  return group;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GROUND PLANE (shadow + reflection)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createGroundPlane(
  modelRadius: number,
  showShadow: boolean,
  showReflection: boolean
): THREE.Group {
  const group = new THREE.Group();
  group.name = "__ground__";

  const planeSize = modelRadius * 6;

  if (showShadow) {
    // Shadow-catching plane (transparent except for shadows)
    const shadowGeo = new THREE.PlaneGeometry(planeSize, planeSize);
    const shadowMat = new THREE.ShadowMaterial({
      opacity: 0.25,
      color: 0x000000,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.receiveShadow = true;
    shadowMesh.name = "__shadow_plane__";
    group.add(shadowMesh);
  }

  if (showReflection) {
    // Subtle radial-gradient reflection disc
    const reflGeo = new THREE.CircleGeometry(planeSize * 0.4, 64);
    const reflMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.04,
      depthWrite: false,
    });
    const reflMesh = new THREE.Mesh(reflGeo, reflMat);
    reflMesh.rotation.x = -Math.PI / 2;
    reflMesh.position.y = -0.01;
    reflMesh.name = "__reflection_disc__";
    group.add(reflMesh);
  }

  return group;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DIMENSION WIREFRAME
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function createDimensionOverlay(box: THREE.Box3): THREE.Group {
  const group = new THREE.Group();
  group.name = "__dimensions__";

  const helper = new THREE.Box3Helper(box, new THREE.Color(0x4488ff));
  (helper.material as THREE.LineBasicMaterial).transparent = true;
  (helper.material as THREE.LineBasicMaterial).opacity = 0.4;
  (helper.material as THREE.LineBasicMaterial).depthTest = true;
  group.add(helper);

  return group;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UTILS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function countTriangles(model: THREE.Group): number {
  let total = 0;
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      const geom = child.geometry;
      total += geom.index
        ? geom.index.count / 3
        : (geom.attributes.position?.count ?? 0) / 3;
    }
  });
  return Math.round(total);
}

function countMaterials(model: THREE.Group): number {
  const mats = new Set<number>();
  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      const arr = Array.isArray(child.material) ? child.material : [child.material];
      arr.forEach((m) => mats.add(m.id));
    }
  });
  return mats.size;
}

/** Smoothly animate camera to a target position & lookAt over ~500ms */
function animateCameraTo(
  camera: THREE.PerspectiveCamera,
  controls: OrbitControls,
  targetPos: THREE.Vector3,
  targetLookAt: THREE.Vector3,
  duration = 500
) {
  const startPos = camera.position.clone();
  const startTarget = controls.target.clone();
  const startTime = performance.now();

  const tick = () => {
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const ease = 1 - Math.pow(1 - t, 3);

    camera.position.lerpVectors(startPos, targetPos, ease);
    controls.target.lerpVectors(startTarget, targetLookAt, ease);
    controls.update();

    if (t < 1) requestAnimationFrame(tick);
  };
  tick();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CSS STYLES (injected once)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const VIEWER_STYLES = `
  @keyframes glb-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes glb-shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
  @keyframes glb-fade-in {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .glb-viewer-root {
    position: relative;
    border-radius: 12px;
    overflow: hidden;
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
    user-select: none;
    -webkit-user-select: none;
  }

  .glb-viewer-root * { box-sizing: border-box; }

  .glb-canvas-container {
    width: 100%;
    height: 100%;
    cursor: grab;
    background: transparent;
  }
  .glb-canvas-container:active { cursor: grabbing; }

  /* ── Toolbar (bottom-center) ── */
  .glb-toolbar {
    position: absolute;
    bottom: 14px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px;
    border-radius: 10px;
    background: rgba(10, 10, 18, 0.72);
    backdrop-filter: blur(16px) saturate(1.3);
    -webkit-backdrop-filter: blur(16px) saturate(1.3);
    border: 1px solid rgba(255,255,255,0.08);
    z-index: 15;
    animation: glb-fade-in 0.4s ease 0.3s both;
  }

  .glb-toolbar-divider {
    width: 1px;
    height: 20px;
    margin: 0 4px;
    background: rgba(255,255,255,0.1);
  }

  .glb-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 7px;
    background: transparent;
    color: rgba(255,255,255,0.65);
    cursor: pointer;
    transition: all 0.15s ease;
    font-size: 12px;
    font-weight: 600;
    padding: 0;
    line-height: 1;
  }
  .glb-btn:hover {
    background: rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.95);
  }
  .glb-btn.active {
    background: rgba(255,255,255,0.15);
    color: #ffffff;
  }
  .glb-btn svg { width: 16px; height: 16px; }

  .glb-btn-text {
    font-size: 11px;
    letter-spacing: 0.02em;
  }

  /* ── Camera presets (right side) ── */
  .glb-cam-presets {
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 4px;
    border-radius: 10px;
    background: rgba(10, 10, 18, 0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.06);
    z-index: 15;
    animation: glb-fade-in 0.4s ease 0.5s both;
  }

  /* ── Close button ── */
  .glb-close-btn {
    position: absolute;
    top: 12px;
    right: 12px;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(10, 10, 18, 0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 9px;
    color: rgba(255,255,255,0.7);
    cursor: pointer;
    z-index: 20;
    transition: all 0.15s ease;
  }
  .glb-close-btn:hover {
    background: rgba(255,50,50,0.35);
    color: #ffffff;
    transform: scale(1.05);
  }

  /* ── Site name badge ── */
  .glb-site-badge {
    position: absolute;
    top: 12px;
    left: 12px;
    padding: 6px 14px;
    border-radius: 8px;
    background: rgba(10, 10, 18, 0.55);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.06);
    z-index: 10;
    animation: glb-fade-in 0.3s ease 0.4s both;
  }
  .glb-site-badge span {
    font-size: 12px;
    font-weight: 600;
    color: rgba(255,255,255,0.8);
    letter-spacing: 0.03em;
  }

  /* ── Loading overlay ── */
  .glb-loading-overlay {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background: rgba(10,10,18,0.5);
    backdrop-filter: blur(12px);
    -webkit-backdrop-filter: blur(12px);
    z-index: 25;
  }

  .glb-spinner {
    width: 44px;
    height: 44px;
    border: 3px solid rgba(255,255,255,0.1);
    border-top-color: rgba(255,255,255,0.85);
    border-radius: 50%;
    animation: glb-spin 0.7s linear infinite;
  }

  .glb-loading-text {
    margin-top: 16px;
    color: rgba(255,255,255,0.7);
    font-size: 13px;
    font-weight: 500;
  }

  .glb-progress-bar {
    width: 160px;
    height: 3px;
    margin-top: 10px;
    background: rgba(255,255,255,0.08);
    border-radius: 2px;
    overflow: hidden;
  }
  .glb-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, rgba(255,255,255,0.6), rgba(255,255,255,0.9));
    border-radius: 2px;
    transition: width 0.3s ease;
  }


  /* ── Error state ── */
  .glb-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
    background: rgba(10,10,18,0.05);
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.06);
  }

  /* ── Empty state ── */
  .glb-empty {
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0,0,0,0.03);
    border-radius: 12px;
    border: 1px solid rgba(0,0,0,0.06);
  }

  /* ── Material info tooltip ── */
  .glb-mat-tooltip {
    position: absolute;
    padding: 6px 12px;
    border-radius: 6px;
    background: rgba(10,10,18,0.8);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255,255,255,0.08);
    pointer-events: none;
    z-index: 30;
    animation: glb-fade-in 0.15s ease;
  }
  .glb-mat-tooltip span {
    font-size: 11px;
    color: rgba(255,255,255,0.75);
  }
`;

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SVG ICON HELPERS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const Icon = {
  close: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  rotate: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
    </svg>
  ),
  camera: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  ),
  fullscreen: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
    </svg>
  ),
  dimensions: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M21 3H3v18h18V3z" opacity="0.3" />
      <path d="M3 3l4 4M21 3l-4 4M3 21l4-4M21 21l-4-4" />
    </svg>
  ),
  reset: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
      <path d="M3 12a9 9 0 019-9 9.75 9.75 0 016.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 01-9 9 9.75 9.75 0 01-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  ),
  error: (
    <svg width={36} height={36} viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth={1.5}>
      <circle cx={12} cy={12} r={10} />
      <path d="M12 8v4M12 16h.01" />
    </svg>
  ),
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MAIN COMPONENT
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function GlbViewer({
  url,
  siteName,
  width = 800,
  height = 600,
  backgroundColor = DEFAULT_BG,
  backgroundOpacity = 0,
  environment: initialEnvironment = "studio",
  autoRotate: initialAutoRotate = false,
  showGroundShadow = true,
  showGroundReflection = true,
  showDimensions: initialShowDimensions = false,
  enableScreenshot = true,
  enableFullscreen = true,
  enableCameraPresets = true,
  enableEnvironmentSwitch = true,
  onLoaded,
  onError,
  onClose,
}: GlbViewerProps) {
  // ── Refs ──
  const containerRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    animId: number;
    lightsGroup: THREE.Group | null;
    groundGroup: THREE.Group | null;
    dimensionsGroup: THREE.Group | null;
    modelRadius: number;
    modelCenter: THREE.Vector3;
  } | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const envTextureRef = useRef<THREE.Texture | null>(null);
  const isInteractingRef = useRef(false);
  const autoRotateTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── State ──
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [envPreset, setEnvPreset] = useState<EnvironmentPreset>(initialEnvironment);
  const [isAutoRotating, setIsAutoRotating] = useState(initialAutoRotate);
  const [showDims, setShowDims] = useState(initialShowDimensions);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hoveredMaterial, setHoveredMaterial] = useState<{
    name: string;
    category: string;
    x: number;
    y: number;
  } | null>(null);

  // ── Stable callbacks ──
  const handleScreenshot = useCallback(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.renderer.render(s.scene, s.camera);
    const dataUrl = s.renderer.domElement.toDataURL("image/png");
    const link = document.createElement("a");
    link.download = `${siteName || "product"}-3d-capture.png`;
    link.href = dataUrl;
    link.click();
  }, [siteName]);

  const handleFullscreen = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    if (!document.fullscreenElement) {
      root.requestFullscreen?.().then(() => setIsFullscreen(true));
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false));
    }
  }, []);

  const setCameraPreset = useCallback((preset: CameraPreset) => {
    const s = sceneRef.current;
    const model = modelRef.current;
    if (!s || !model) return;

    const cfg = CAMERA_PRESETS[preset];
    const center = s.modelCenter.clone();
    const radius = s.modelRadius;

    const fov = s.camera.fov * (Math.PI / 180);
    const dist = Math.max(
      (radius * 2) / (2 * Math.tan(fov / 2)) * cfg.distMul,
      radius * 2
    );

    const dir = new THREE.Vector3(cfg.dir[0], cfg.dir[1], cfg.dir[2]).normalize();
    const targetPos = center.clone().add(dir.multiplyScalar(dist));

    animateCameraTo(s.camera, s.controls, targetPos, center);
  }, []);

  const resetCamera = useCallback(() => {
    setCameraPreset("beauty");
  }, [setCameraPreset]);

  // ── Toggle dimensions ──
  useEffect(() => {
    const s = sceneRef.current;
    const model = modelRef.current;
    if (!s || !model) return;

    if (showDims && !s.dimensionsGroup) {
      const box = new THREE.Box3().setFromObject(model);
      const dimGroup = createDimensionOverlay(box);
      s.scene.add(dimGroup);
      s.dimensionsGroup = dimGroup;
    } else if (!showDims && s.dimensionsGroup) {
      s.scene.remove(s.dimensionsGroup);
      s.dimensionsGroup = null;
    }
  }, [showDims]);

  // ── Toggle auto-rotate ──
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    s.controls.autoRotate = isAutoRotating;
    s.controls.autoRotateSpeed = 1.2;
  }, [isAutoRotating]);

  // ── Environment switch ──
  const switchEnvironment = useCallback(
    (preset: EnvironmentPreset) => {
      const s = sceneRef.current;
      if (!s) return;

      // Dispose old env
      if (envTextureRef.current) {
        envTextureRef.current.dispose();
        envTextureRef.current = null;
      }

      // Build new env
      const newEnv = buildEnvironment(s.renderer, preset);
      s.scene.environment = newEnv;
      envTextureRef.current = newEnv;

      // Rebuild lights
      if (s.lightsGroup) {
        s.scene.remove(s.lightsGroup);
      }
      s.lightsGroup = buildSceneLights(s.scene, preset, s.modelRadius);

      // Update tone mapping exposure
      s.renderer.toneMappingExposure = ENV_CONFIGS[preset].toneMappingExposure;

      setEnvPreset(preset);
    },
    []
  );

  // ── Hover material detection ──
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      const s = sceneRef.current;
      const model = modelRef.current;
      if (!s || !model) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      mouseRef.current.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(mouseRef.current, s.camera);
      const intersects = raycasterRef.current.intersectObject(model, true);

      if (intersects.length > 0) {
        const mesh = intersects[0].object as THREE.Mesh;
        if (mesh.material) {
          const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
          if (mat instanceof THREE.MeshStandardMaterial) {
            const cat = classifyMaterial(mat);
            setHoveredMaterial({
              name: mat.name || mesh.name || "Unnamed",
              category: cat.replace(/-/g, " "),
              x: e.clientX - rect.left,
              y: e.clientY - rect.top - 40,
            });
            return;
          }
        }
      }
      setHoveredMaterial(null);
    },
    []
  );

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!sceneRef.current) return;
      switch (e.key.toLowerCase()) {
        case "r":
          resetCamera();
          break;
        case " ":
          e.preventDefault();
          setIsAutoRotating((prev) => !prev);
          break;
        case "1":
          setCameraPreset("beauty");
          break;
        case "2":
          setCameraPreset("front");
          break;
        case "3":
          setCameraPreset("side");
          break;
        case "4":
          setCameraPreset("top");
          break;
        case "d":
          setShowDims((prev) => !prev);
          break;
        case "f":
          if (enableFullscreen) handleFullscreen();
          break;
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [resetCamera, setCameraPreset, handleFullscreen, enableFullscreen]);

  // ── Double-click to focus ──
  const handleDblClick = useCallback(
    (e: React.MouseEvent) => {
      const s = sceneRef.current;
      const model = modelRef.current;
      if (!s || !model) return;

      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;

      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, s.camera);
      const intersects = raycaster.intersectObject(model, true);

      if (intersects.length > 0) {
        const point = intersects[0].point;
        const fov = s.camera.fov * (Math.PI / 180);
        const dist = Math.max(s.modelRadius * 0.5 / Math.tan(fov / 2), s.modelRadius * 0.3);
        const dir = s.camera.position.clone().sub(point).normalize();
        const newPos = point.clone().add(dir.multiplyScalar(dist));

        animateCameraTo(s.camera, s.controls, newPos, point, 400);
      }
    },
    []
  );

  // ── Pause auto-rotate on interaction ──
  const handleInteractStart = useCallback(() => {
    isInteractingRef.current = true;
    if (autoRotateTimeoutRef.current) {
      clearTimeout(autoRotateTimeoutRef.current);
    }
    const s = sceneRef.current;
    if (s) s.controls.autoRotate = false;
  }, []);

  const handleInteractEnd = useCallback(() => {
    isInteractingRef.current = false;
    if (isAutoRotating) {
      autoRotateTimeoutRef.current = setTimeout(() => {
        const s = sceneRef.current;
        if (s && !isInteractingRef.current) {
          s.controls.autoRotate = true;
        }
      }, 2000);
    }
  }, [isAutoRotating]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // MAIN SCENE SETUP & MODEL LOADING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;

    let disposed = false;
    setLoading(true);
    setLoadProgress(0);
    setError(null);
    setHoveredMaterial(null);

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true, // needed for screenshot
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Note: outputEncoding is deprecated in favor of outputColorSpace, but kept for compatibility

    // Tone mapping - use ACES for better handling of bright emissive materials
    if ((THREE as any).AgXToneMapping !== undefined) {
      renderer.toneMapping = (THREE as any).AgXToneMapping;
    } else {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
    }
    // Increase tone mapping exposure to make emissive materials brighter
    // This helps with professional glow appearance
    renderer.toneMappingExposure = ENV_CONFIGS[envPreset].toneMappingExposure * 1.3;
    
    // Enable better handling of HDR/bright colors for emissive materials
    renderer.useLegacyLights = false; // Use modern lighting model
    
    // Ensure renderer can handle bright emissive values
    // This helps with proper rendering of glowing elements
    if ((renderer as any).toneMappingWhitePoint !== undefined) {
      (renderer as any).toneMappingWhitePoint = 1.5; // Higher white point for brighter glow
    }

    // Shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Improve depth buffer precision to prevent z-fighting
    renderer.sortObjects = true; // Enable depth sorting
    renderer.depthTest = true;
    renderer.depthWrite = true;

    // Transparent background
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    renderer.domElement.style.backgroundColor = "transparent";

    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = null;

    // ── Camera ──
    // Use reasonable default near/far planes - will be adjusted after model loads
    // Wide range causes z-fighting and depth precision issues
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 1000);
    camera.position.set(10, 8, 10);

    // ── Controls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.07;
    controls.minDistance = 0.3;
    controls.maxDistance = 5000;
    controls.enablePan = true;
    controls.panSpeed = 0.8;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.2;
    controls.autoRotate = initialAutoRotate;
    controls.autoRotateSpeed = 1.2;
    controls.maxPolarAngle = Math.PI * 0.95; // prevent flipping under

    // Pause auto-rotate on user interaction
    controls.addEventListener("start", () => {
      isInteractingRef.current = true;
      if (autoRotateTimeoutRef.current) clearTimeout(autoRotateTimeoutRef.current);
      controls.autoRotate = false;
    });
    controls.addEventListener("end", () => {
      isInteractingRef.current = false;
      if (isAutoRotating) {
        autoRotateTimeoutRef.current = setTimeout(() => {
          if (!isInteractingRef.current && !disposed) {
            controls.autoRotate = true;
          }
        }, 2000);
      }
    });

    // ── Environment ──
    const envTexture = buildEnvironment(renderer, envPreset);
    scene.environment = envTexture;
    envTextureRef.current = envTexture;

    // ── Animation loop ──
    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      
      // Sort meshes by depth to fix overlapping/z-fighting issues
      // This ensures proper front/back rendering order
      if (modelRef.current) {
        const meshes: THREE.Mesh[] = [];
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            meshes.push(child);
          }
        });
        
        // Sort meshes by their distance from camera (further = render first)
        meshes.sort((a, b) => {
          const aWorldPos = new THREE.Vector3();
          const bWorldPos = new THREE.Vector3();
          a.getWorldPosition(aWorldPos);
          b.getWorldPosition(bWorldPos);
          const aDist = camera.position.distanceTo(aWorldPos);
          const bDist = camera.position.distanceTo(bWorldPos);
          return bDist - aDist; // Further objects render first
        });
        
        // Apply render order based on sorted depth
        meshes.forEach((mesh, index) => {
          mesh.renderOrder = index;
        });
      }
      
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = {
      renderer,
      scene,
      camera,
      controls,
      animId,
      lightsGroup: null,
      groundGroup: null,
      dimensionsGroup: null,
      modelRadius: 1,
      modelCenter: new THREE.Vector3(),
    };
    modelRef.current = null;

    // ── GLTF Loader with Draco ──
    const loader = new GLTFLoader();
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath(DRACO_DECODER_PATH);
    dracoLoader.setDecoderConfig({ type: "js" });
    loader.setDRACOLoader(dracoLoader);

    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;

        // ── Extract and preserve lights from GLB file ──
        const embeddedLights: THREE.Light[] = [];
        model.traverse((child) => {
          if (
            child instanceof THREE.Light ||
            child instanceof THREE.PointLight ||
            child instanceof THREE.SpotLight ||
            child instanceof THREE.DirectionalLight ||
            child instanceof THREE.RectAreaLight ||
            child instanceof THREE.HemisphereLight
          ) {
            embeddedLights.push(child as THREE.Light);
          }
        });
        
        // Add embedded lights to scene (they're already in the model hierarchy)
        // But ensure they're properly configured for PROFESSIONAL visibility
        embeddedLights.forEach((light) => {
          // PROFESSIONAL: Significantly boost light intensity for maximum visibility
          // GLB files often have lights with very low intensity values
          if (light.intensity > 0) {
            // Boost by 5-10x depending on original intensity for professional appearance
            const boostFactor = light.intensity < 0.5 ? 10.0 : 
                               light.intensity < 1.0 ? 7.0 : 5.0;
            light.intensity *= boostFactor;
            
            // Ensure minimum intensity for professional glow
            if (light.intensity < 3.0) {
              light.intensity = 3.0;
            }
          }
          
          if (light instanceof THREE.PointLight || light instanceof THREE.SpotLight) {
            // Ensure point/spot lights cast shadows and are visible
            light.castShadow = true;
            if (light.shadow) {
              light.shadow.mapSize.width = 2048; // Higher resolution for better quality
              light.shadow.mapSize.height = 2048;
              light.shadow.camera.near = 0.1;
              light.shadow.camera.far = 2000; // Increased range
              light.shadow.bias = -0.0001;
              light.shadow.normalBias = 0.02;
            }
            // Increase decay/distance for point lights to make them more visible
            if (light instanceof THREE.PointLight) {
              light.distance = light.distance || 1000;
              light.decay = 1.0; // Linear decay for more consistent brightness
            }
          }
          
          // For spot lights, ensure they have a good angle and penumbra
          if (light instanceof THREE.SpotLight) {
            light.angle = Math.min(light.angle || Math.PI / 6, Math.PI / 4);
            light.penumbra = light.penumbra || 0.3;
            light.distance = light.distance || 1000;
            light.decay = 1.0;
          }
        });

        // ── Center model at origin ──
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        model.position.sub(center);
        model.updateMatrixWorld(true);

        // Recompute after centering
        const centeredBox = new THREE.Box3().setFromObject(model);
        const centeredCenter = centeredBox.getCenter(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 0.01);
        const modelRadius = maxDim / 2;

        // ── Fix meshing issues: Enable proper depth sorting and face culling ──
        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            child.frustumCulled = true; // performance
            
            // Fix face culling - prevent back faces from showing through
            // FrontSide = only render front faces (default, but ensure it's set)
            if (child.material) {
              const materials = Array.isArray(child.material) ? child.material : [child.material];
              materials.forEach((mat) => {
                if (mat instanceof THREE.MeshStandardMaterial || mat instanceof THREE.MeshBasicMaterial) {
                  // Only use DoubleSide for transparent materials
                  if (!mat.transparent && mat.opacity === 1) {
                    mat.side = THREE.FrontSide; // Only render front faces
                  }
                  
                  // Enable depth writing for opaque materials to prevent z-fighting
                  if (!mat.transparent || mat.opacity > 0.99) {
                    mat.depthWrite = true;
                  }
                  
                  // Add polygon offset to prevent z-fighting on overlapping surfaces
                  mat.polygonOffset = true;
                  mat.polygonOffsetFactor = 1;
                  mat.polygonOffsetUnits = 1;
                  
                  mat.needsUpdate = true;
                }
              });
            }
            
            // Ensure proper render order - objects further away render first
            child.renderOrder = 0;
          }
        });

        // ── Optimize all textures for maximum quality and visibility ──
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat: any) => {
              // Optimize all textures on the material
              if (mat.map) {
                mat.map.minFilter = THREE.LinearMipmapLinearFilter;
                mat.map.magFilter = THREE.LinearFilter;
                mat.map.generateMipmaps = true;
                mat.map.anisotropy = 16;
              }
              if (mat.normalMap) {
                mat.normalMap.minFilter = THREE.LinearMipmapLinearFilter;
                mat.normalMap.magFilter = THREE.LinearFilter;
                mat.normalMap.generateMipmaps = true;
              }
              if (mat.roughnessMap) {
                mat.roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
                mat.roughnessMap.magFilter = THREE.LinearFilter;
                mat.roughnessMap.generateMipmaps = true;
              }
              if (mat.metalnessMap) {
                mat.metalnessMap.minFilter = THREE.LinearMipmapLinearFilter;
                mat.metalnessMap.magFilter = THREE.LinearFilter;
                mat.metalnessMap.generateMipmaps = true;
              }
              if (mat.aoMap) {
                mat.aoMap.minFilter = THREE.LinearMipmapLinearFilter;
                mat.aoMap.magFilter = THREE.LinearFilter;
                mat.aoMap.generateMipmaps = true;
              }
            });
          }
        });

        // ── Classify & optimize every material ──
        model.traverse((child) => {
          if (!(child instanceof THREE.Mesh) || !child.material) return;
          const mats = Array.isArray(child.material)
            ? child.material
            : [child.material];
          for (const mat of mats) {
            // Handle MeshBasicMaterial (often used for glowing elements like lasers)
            if (mat instanceof THREE.MeshBasicMaterial) {
              const basicMat = mat as THREE.MeshBasicMaterial;
              // If it has emissive properties, boost them PROFESSIONALLY
              if (basicMat.emissive) {
                const maxEmissive = Math.max(
                  basicMat.emissive.r,
                  basicMat.emissive.g,
                  basicMat.emissive.b
                );
                
                // Detect red laser/light
                const isRedLaser = basicMat.emissive.r > basicMat.emissive.g * 1.5 && 
                                   basicMat.emissive.r > basicMat.emissive.b * 1.5;
                
                if (maxEmissive > 0.001) {
                  if (isRedLaser) {
                    // Red lasers get maximum boost for professional appearance
                    basicMat.emissive.r = Math.min(basicMat.emissive.r * 10.0, 1.0);
                    basicMat.emissive.g = Math.min(basicMat.emissive.g * 2.0, 0.15);
                    basicMat.emissive.b = Math.min(basicMat.emissive.b * 2.0, 0.15);
                  } else {
                    // Boost other colors significantly
                    const boostFactor = maxEmissive < 0.2 ? 8.0 : 5.0;
                    basicMat.emissive.multiplyScalar(boostFactor);
                    // Clamp to prevent overflow
                    basicMat.emissive.r = Math.min(basicMat.emissive.r, 1.0);
                    basicMat.emissive.g = Math.min(basicMat.emissive.g, 1.0);
                    basicMat.emissive.b = Math.min(basicMat.emissive.b, 1.0);
                  }
                  
                  // Set very high emissive intensity for professional glow
                  if ((basicMat as any).emissiveIntensity !== undefined) {
                    (basicMat as any).emissiveIntensity = Math.max(
                      (basicMat as any).emissiveIntensity ?? 1.0,
                      isRedLaser ? 20.0 : 12.0
                    );
                  }
                } else {
                  // No emissive color but material is basic - use base color
                  basicMat.emissive = basicMat.color.clone();
                  basicMat.emissive.multiplyScalar(8.0);
                  basicMat.emissive.r = Math.min(basicMat.emissive.r, 1.0);
                  basicMat.emissive.g = Math.min(basicMat.emissive.g, 1.0);
                  basicMat.emissive.b = Math.min(basicMat.emissive.b, 1.0);
                }
              } else {
                // No emissive set - create from base color
                basicMat.emissive = basicMat.color.clone();
                basicMat.emissive.multiplyScalar(8.0);
                basicMat.emissive.r = Math.min(basicMat.emissive.r, 1.0);
                basicMat.emissive.g = Math.min(basicMat.emissive.g, 1.0);
                basicMat.emissive.b = Math.min(basicMat.emissive.b, 1.0);
              }
              
              // Make basic materials glow professionally
              basicMat.toneMapped = false; // Disable tone mapping for pure, bright glow
              continue;
            }
            
            if (
              mat instanceof THREE.MeshStandardMaterial ||
              (mat as any).isMeshStandardMaterial
            ) {
              const m = mat as THREE.MeshStandardMaterial;
              const category = classifyMaterial(m);
              
              // Check if this is an emissive material BEFORE optimizing
              const isEmissive = category === "emissive";
              
              optimizeMaterial(m, category);
              
              // Only reduce brightness for NON-emissive materials
              // Emissive materials should stay bright to glow properly
              if (!isEmissive) {
                // Slightly reduce brightness to prevent overexposure, but keep textures visible
                // Reduced darkening from 15% to 8% to preserve texture detail
                const currentColor = m.color.clone();
                currentColor.multiplyScalar(0.92); // Reduce brightness by only 8% to preserve textures
                m.color.copy(currentColor);
                
                // Don't reduce envMapIntensity as much - textures need it for visibility
                // Only reduce if it's extremely high to prevent overexposure
                if (m.envMapIntensity && m.envMapIntensity > 1.5) {
                  m.envMapIntensity *= 0.85; // Less aggressive reduction
                }
                
                // Ensure proper depth handling for opaque materials
                if (!m.transparent && m.opacity === 1) {
                  m.depthWrite = true;
                  m.side = THREE.FrontSide; // Only render front faces
                  // Add polygon offset to prevent z-fighting
                  if (!m.polygonOffset) {
                    m.polygonOffset = true;
                    m.polygonOffsetFactor = 1;
                    m.polygonOffsetUnits = 1;
                  }
                }
              } else {
                // For emissive materials, disable tone mapping for maximum glow
                // This ensures the glow isn't dimmed and appears professional
                m.toneMapped = false; // Disable tone mapping for pure bright glow
                
                // Emissive materials also need proper depth handling
                m.depthWrite = true;
                m.side = THREE.FrontSide;
                if (!m.polygonOffset) {
                  m.polygonOffset = true;
                  m.polygonOffsetFactor = 1;
                  m.polygonOffsetUnits = 1;
                }
                
                // Ensure emissive intensity is very high for professional appearance
                const currentEmissiveIntensity = (m as any).emissiveIntensity ?? 1.0;
                (m as any).emissiveIntensity = Math.max(currentEmissiveIntensity, 12.0);
              }
            }
          }
        });

        scene.add(model);
        modelRef.current = model;

        // Store model metrics
        if (sceneRef.current) {
          sceneRef.current.modelRadius = modelRadius;
          sceneRef.current.modelCenter = centeredCenter;
        }

        // ── Build lights (scaled to model) ──
        const lightsGroup = buildSceneLights(scene, envPreset, modelRadius);
        if (sceneRef.current) sceneRef.current.lightsGroup = lightsGroup;

        // ── Ground plane ──
        const groundGroup = createGroundPlane(
          modelRadius,
          showGroundShadow,
          showGroundReflection
        );
        // Position at bottom of model
        groundGroup.position.y = centeredBox.min.y;
        scene.add(groundGroup);
        if (sceneRef.current) sceneRef.current.groundGroup = groundGroup;

        // ── Camera setup ──
        const fov = camera.fov * (Math.PI / 180);
        const dist = Math.max(
          (maxDim / (2 * Math.tan(fov / 2))) * 1.5,
          maxDim * 1.5
        );
        camera.position.set(
          centeredCenter.x + dist * 0.6,
          centeredCenter.y + dist * 0.35,
          centeredCenter.z + dist * 0.7
        );
        camera.lookAt(centeredCenter);
        controls.target.copy(centeredCenter);
        controls.update();

        // Near/far planes - optimized to prevent z-fighting
        // Keep near plane as close as possible and far plane reasonable
        // This improves depth buffer precision
        const nearPlane = Math.max(maxDim * 0.001, 0.01);
        const farPlane = Math.min(maxDim * 50, 10000);
        camera.near = nearPlane;
        camera.far = farPlane;
        camera.updateProjectionMatrix();
        
        // Update renderer to use better depth precision
        renderer.setClearColor(0x000000, 0);
        renderer.clearDepth(); // Clear depth buffer

        // Min distance for zoom
        controls.minDistance = maxDim * 0.1;
        controls.maxDistance = maxDim * 20;

        // ── Report metrics ──
        const triCount = countTriangles(model);
        const matCount = countMaterials(model);
        onLoaded?.({
          triangleCount: triCount,
          materialCount: matCount,
          boundingBox: { x: size.x, y: size.y, z: size.z },
        });
        setLoading(false);
      },
      (progress) => {
        if (progress.lengthComputable) {
          setLoadProgress(Math.round((progress.loaded / progress.total) * 100));
        }
      },
      (err: unknown) => {
        if (disposed) return;
        const msg = err instanceof Error ? err.message : "Failed to load GLB file";
        setError(msg);
        setLoading(false);
        onError?.(msg);
      }
    );

    // ── Resize observer ──
    const onResize = () => {
      if (disposed || !container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    // ── Fullscreen change listener ──
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFsChange);

    // ── Cleanup ──
    return () => {
      disposed = true;
      modelRef.current = null;
      if (envTextureRef.current) {
        envTextureRef.current.dispose();
        envTextureRef.current = null;
      }
      if (autoRotateTimeoutRef.current) {
        clearTimeout(autoRotateTimeoutRef.current);
      }
      scene.environment = null;
      ro.disconnect();
      document.removeEventListener("fullscreenchange", handleFsChange);
      cancelAnimationFrame(animId);
      controls.dispose();
      dracoLoader.dispose();
      renderer.dispose();
      if (container?.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      sceneRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url, width, height]);

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // RENDER
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ── No URL ──
  if (!url) {
    return (
      <div className="glb-empty" style={{ width, height }}>
        <style>{VIEWER_STYLES}</style>
        <p style={{ color: "#94a3b8", fontSize: 14 }}>No 3D model available</p>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="glb-error" style={{ width, height }}>
        <style>{VIEWER_STYLES}</style>
        {Icon.error}
        <p style={{ fontSize: 13, color: "#ef4444", textAlign: "center", maxWidth: 300 }}>
          {error}
        </p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            // Force re-mount by toggling a key — the parent should handle retry
            onError?.("retry");
          }}
          style={{
            marginTop: 8,
            padding: "8px 20px",
            border: "1px solid rgba(239,68,68,0.3)",
            borderRadius: 8,
            background: "rgba(239,68,68,0.08)",
            color: "#ef4444",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Try Again
        </button>
      </div>
    );
  }

  // ── Active viewer ──
  const envKeys = Object.keys(ENV_CONFIGS) as EnvironmentPreset[];

  return (
    <div
      ref={rootRef}
      className="glb-viewer-root"
      style={{ width: isFullscreen ? "100vw" : width, height: isFullscreen ? "100vh" : height }}
      tabIndex={0}
    >
      <style>{VIEWER_STYLES}</style>

      {/* 3D Canvas */}
      <div
        ref={containerRef}
        className="glb-canvas-container"
        onPointerMove={handlePointerMove}
        onPointerLeave={() => setHoveredMaterial(null)}
        onDoubleClick={handleDblClick}
        onPointerDown={handleInteractStart}
        onPointerUp={handleInteractEnd}
      />

      {/* Loading overlay */}
      {loading && (
        <div className="glb-loading-overlay">
          <div className="glb-spinner" />
          <p className="glb-loading-text">
            Loading 3D Model{loadProgress > 0 ? ` · ${loadProgress}%` : "…"}
          </p>
          {loadProgress > 0 && (
            <div className="glb-progress-bar">
              <div className="glb-progress-fill" style={{ width: `${loadProgress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* Material tooltip on hover */}
      {hoveredMaterial && !loading && (
        <div
          className="glb-mat-tooltip"
          style={{ left: hoveredMaterial.x, top: hoveredMaterial.y }}
        >
          <span>
            <strong>{hoveredMaterial.name}</strong> — {hoveredMaterial.category}
          </span>
        </div>
      )}

      {/* Close button */}
      {onClose && (
        <button className="glb-close-btn" onClick={onClose} title="Close 3D Viewer">
          {Icon.close}
        </button>
      )}

      {/* Site name badge */}
      {siteName && !loading && (
        <div className="glb-site-badge">
          <span>{siteName}</span>
        </div>
      )}

      {/* ── Bottom toolbar ── */}
      {!loading && (
        <div className="glb-toolbar">
          {/* Auto-rotate toggle */}
          <button
            className={`glb-btn ${isAutoRotating ? "active" : ""}`}
            onClick={() => setIsAutoRotating((v) => !v)}
            title="Auto-rotate (Space)"
          >
            {Icon.rotate}
          </button>

          {/* Reset camera */}
          <button className="glb-btn" onClick={resetCamera} title="Reset camera (R)">
            {Icon.reset}
          </button>

          {/* Dimensions toggle */}
          <button
            className={`glb-btn ${showDims ? "active" : ""}`}
            onClick={() => setShowDims((v) => !v)}
            title="Toggle dimensions (D)"
          >
            {Icon.dimensions}
          </button>

          <div className="glb-toolbar-divider" />

          {/* Environment presets */}
          {enableEnvironmentSwitch &&
            envKeys.map((key) => (
              <button
                key={key}
                className={`glb-btn glb-btn-text ${envPreset === key ? "active" : ""}`}
                onClick={() => switchEnvironment(key)}
                title={`${ENV_CONFIGS[key].label} lighting`}
              >
                {ENV_CONFIGS[key].icon}
              </button>
            ))}

          {enableEnvironmentSwitch && (enableScreenshot || enableFullscreen) && (
            <div className="glb-toolbar-divider" />
          )}

          {/* Screenshot */}
          {enableScreenshot && (
            <button className="glb-btn" onClick={handleScreenshot} title="Screenshot">
              {Icon.camera}
            </button>
          )}

          {/* Fullscreen */}
          {enableFullscreen && (
            <button className="glb-btn" onClick={handleFullscreen} title="Fullscreen (F)">
              {Icon.fullscreen}
            </button>
          )}
        </div>
      )}

      {/* ── Camera preset buttons (right side) ── */}
      {enableCameraPresets && !loading && (
        <div className="glb-cam-presets">
          {(Object.keys(CAMERA_PRESETS) as CameraPreset[]).map((key) => (
            <button
              key={key}
              className="glb-btn glb-btn-text"
              onClick={() => setCameraPreset(key)}
              title={`${CAMERA_PRESETS[key].label} view`}
            >
              {CAMERA_PRESETS[key].label}
            </button>
          ))}
        </div>
      )}

    </div>
  );
}

export default GlbViewer;