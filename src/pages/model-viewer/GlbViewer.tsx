/**
 * Enhanced GLB Viewer with Intelligent Telecom Structure Analysis
 * + Element Selection / Property Inspector
 * ─────────────────────────────────────────────────────────────────
 * Features:
 *  1. Structure Height — computed from bounding box (Z or Y axis)
 *  2. Equipment Detection — uses material color + geometry heuristics
 *     (IFC→GLB export strips semantic names, so name-based regex fails)
 *  3. Element Categorization — groups meshes by material color + geometry
 *  4. Explode View — interactive model decomposition
 *  5. Wireframe Toggle — structural visualization mode
 *  6. Auto-fit camera — intelligent framing based on model bounds
 *  7. ★ Element Selection — click any mesh to inspect its properties
 *     (raycasting, highlight, animated property panel with all GLB data)
 *
 * Used by UnifiedModelViewer for GLB model type.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ─── Constants ────────────────────────────────────────────────────────────────
const DEFAULT_BACKGROUND = "#282C34";
const BACKGROUND_OPACITY = 0.2;
/** rgba(40, 44, 52, 0.2) for transparent 20% opacity background */
const DEFAULT_BACKGROUND_RGBA = "rgba(40, 44, 52, 0.2)";
const ACCENT = "#4a9eff";
const ACCENT_GLOW = "rgba(74, 158, 255, 0.25)";
const PANEL_BG = "rgba(15, 17, 23, 0.92)";
const PANEL_BORDER = "rgba(74, 158, 255, 0.15)";
const TEXT_PRIMARY = "#e2e8f0";
const TEXT_SECONDARY = "#94a3b8";
const TEXT_MUTED = "#64748b";
const SUCCESS = "#34d399";
const WARNING = "#fbbf24";
const SELECT_COLOR = "#00e5ff";
const SELECT_GLOW = "rgba(0, 229, 255, 0.3)";

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i);
  if (!m) return DEFAULT_BACKGROUND_RGBA;
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`;
}

// ─── Types ────────────────────────────────────────────────────────────────────
export interface GlbViewerProps {
  url: string | null;
  siteName?: string;
  width?: number;
  height?: number;
  /** Hex background color; used with BACKGROUND_OPACITY (0.2) for transparent look */
  backgroundColor?: string;
  onLoaded?: (triangleCount: number) => void;
  onError?: (message: string) => void;
}

interface EquipmentCount {
  Antenna: number;
  RRU: number;
  Dish: number;
}

interface CategoryInfo {
  name: string;
  count: number;
  triangles: number;
  color: string;
}

interface MeshAnalysisEntry {
  name: string;
  category: string;
  equipmentType: keyof EquipmentCount | null;
  materialColor: string;
  materialAlpha: number;
  triangles: number;
  volume: number;
  heightSpan: [number, number];
  bbox: THREE.Box3;
}

interface StructureAnalysis {
  height: number;
  heightAxis: "X" | "Y" | "Z";
  widthX: number;
  widthY: number;
  widthZ: number;
  equipment: EquipmentCount;
  categories: CategoryInfo[];
  totalTriangles: number;
  totalMeshes: number;
  meshEntries: MeshAnalysisEntry[];
}

interface GlbExplodeChild {
  mesh: THREE.Mesh;
  originalWorldPosition: THREE.Vector3;
  originalPosition: THREE.Vector3;
}

interface GlbExplodeState {
  centerWorld: THREE.Vector3;
  maxDistance: number;
  children: GlbExplodeChild[];
}

// ─── Selected Element Properties ──────────────────────────────────────────────
interface SelectedElementProps {
  // Identity
  meshName: string;
  parentName: string;
  uuid: string;
  // Classification (from our analysis)
  category: string;
  equipmentType: string | null;
  // Geometry
  triangleCount: number;
  vertexCount: number;
  boundingBox: { min: THREE.Vector3; max: THREE.Vector3 };
  dimensions: { x: number; y: number; z: number };
  volume: number;
  worldPosition: THREE.Vector3;
  // Material
  materialName: string;
  materialType: string;
  color: string;
  opacity: number;
  metalness: number;
  roughness: number;
  doubleSided: boolean;
  // Extras / User Data (IFC properties when preserved)
  userData: Record<string, unknown>;
  extras: Record<string, unknown>;
  // Hierarchy
  depth: number;
  childCount: number;
  ancestorPath: string;
}

// ─── Property Group for display ───────────────────────────────────────────────
interface PropertyGroup {
  name: string;
  icon: React.ReactNode;
  color: string;
  properties: { key: string; value: string; highlight?: boolean }[];
}

// ─── Color-to-hex helper ──────────────────────────────────────────────────────
function colorToHex(r: number, g: number, b: number): string {
  const toHex = (v: number) =>
    Math.round(v * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

// ─── Material + Geometry Based Classification ─────────────────────────────────
const NAME_EQUIPMENT_PATTERNS: Record<string, RegExp[]> = {
  Antenna: [
    /antenna/i, /ANT[\s_-]/i, /cnx_ant/i, /panel[\s_-]?ant/i,
    /sector[\s_-]?ant/i, /omni/i, /dipole/i, /yagi/i, /cnx_equip.*ant/i,
  ],
  RRU: [
    /rru/i, /remote[\s_-]?radio/i, /radio[\s_-]?unit/i, /cnx_rru/i,
    /bbu/i, /baseband/i, /cnx_equip.*rru/i, /radio[\s_-]?head/i,
  ],
  Dish: [
    /dish/i, /parabolic/i, /microwave/i, /mw[\s_-]?dish/i, /cnx_mw/i,
    /reflector/i, /cnx_dish/i, /satellite/i,
  ],
};

const NAME_CATEGORY_PATTERNS: Record<string, RegExp[]> = {
  "Tower Structure": [
    /tower/i, /mast/i, /pole/i, /monopole/i, /lattice/i,
    /cnx_str/i, /structure/i, /column/i, /leg/i, /brace/i,
    /diagonal/i, /horizontal/i, /vertical/i, /frame/i,
  ],
  "Cable & Conduit": [
    /cable/i, /conduit/i, /tray/i, /wire/i, /fiber/i,
    /cnx_cab/i, /feeder/i, /jumper/i, /connector/i, /harness/i,
  ],
  "Mounting Hardware": [
    /mount/i, /bracket/i, /clamp/i, /bolt/i, /nut/i,
    /cnx_mnt/i, /fixture/i, /support/i, /hanger/i, /pipe/i,
    /arm/i, /platform/i, /rail/i,
  ],
  Foundation: [
    /foundation/i, /base/i, /footing/i, /concrete/i, /slab/i,
    /cnx_fnd/i, /ground/i, /pad/i, /anchor/i,
  ],
  Enclosure: [
    /enclosure/i, /cabinet/i, /shelter/i, /cnx_enc/i,
    /housing/i, /box/i, /panel[\s_-]?board/i, /equipment[\s_-]?room/i,
  ],
  "Safety & Access": [
    /ladder/i, /stair/i, /handrail/i, /safety/i, /guard/i,
    /cnx_saf/i, /step/i, /cage/i, /climb/i, /fall[\s_-]?arrest/i,
  ],
  Antenna: [/antenna/i, /ant[\s_-]/i, /cnx_ant/i, /omni/i, /dipole/i, /yagi/i],
  RRU: [/rru/i, /remote[\s_-]?radio/i, /radio[\s_-]?unit/i, /cnx_rru/i, /bbu/i],
  Dish: [/dish/i, /parabolic/i, /microwave/i, /cnx_mw/i, /reflector/i],
};

function classifyByName(
  name: string
): { category: string; equipType: keyof EquipmentCount | null } {
  if (/^(empty|mesh|node|object)[\s_-]?\d*$/i.test(name)) {
    return { category: "", equipType: null };
  }
  for (const [eqType, patterns] of Object.entries(NAME_EQUIPMENT_PATTERNS)) {
    for (const p of patterns) {
      if (p.test(name))
        return {
          category: eqType,
          equipType: eqType as keyof EquipmentCount,
        };
    }
  }
  for (const [cat, patterns] of Object.entries(NAME_CATEGORY_PATTERNS)) {
    for (const p of patterns) {
      if (p.test(name)) {
        const equipType =
          cat === "Antenna" || cat === "RRU" || cat === "Dish"
            ? (cat as keyof EquipmentCount)
            : null;
        return { category: cat, equipType };
      }
    }
  }
  return { category: "", equipType: null };
}

interface MeshGeoInfo {
  mesh: THREE.Mesh;
  name: string;
  bbox: THREE.Box3;
  size: THREE.Vector3;
  center: THREE.Vector3;
  volume: number;
  triangles: number;
  materialColor: { r: number; g: number; b: number; a: number };
  materialHex: string;
}

function classifyByGeometryAndMaterial(
  infos: MeshGeoInfo[],
  modelBox: THREE.Box3,
  modelSize: THREE.Vector3,
  heightAxisIdx: number
): Map<
  THREE.Mesh,
  { category: string; equipType: keyof EquipmentCount | null }
> {
  const result = new Map<
    THREE.Mesh,
    { category: string; equipType: keyof EquipmentCount | null }
  >();
  if (infos.length === 0) return result;

  const modelHeight = [modelSize.x, modelSize.y, modelSize.z][heightAxisIdx];
  const modelMin = [modelBox.min.x, modelBox.min.y, modelBox.min.z][
    heightAxisIdx
  ];

  const volumes = infos
    .map((i) => i.volume)
    .filter((v) => v > 0)
    .sort((a, b) => a - b);
  const medianVol =
    volumes.length > 0 ? volumes[Math.floor(volumes.length / 2)] : 0;

  for (const info of infos) {
    const heightPos = [info.center.x, info.center.y, info.center.z][
      heightAxisIdx
    ];
    const relativeHeight =
      modelHeight > 0 ? (heightPos - modelMin) / modelHeight : 0;
    const sizeArr = [info.size.x, info.size.y, info.size.z];
    const heightExtent = sizeArr[heightAxisIdx];
    const maxHorizontalExtent = Math.max(
      ...sizeArr.filter((_, i) => i !== heightAxisIdx)
    );
    const aspectRatio = heightExtent / Math.max(maxHorizontalExtent, 0.001);
    const { r, g, b, a } = info.materialColor;
    const isReddish = r > 0.35 && g < 0.15 && b < 0.15;
    const isWhitish = r > 0.8 && g > 0.8 && b > 0.8 && a >= 1.0;
    const isSemiTransparent = a > 0 && a < 1.0;
    const isDark = r < 0.25 && g < 0.25 && b < 0.25 && a >= 1.0;
    const isVeryDark = r < 0.02 && g < 0.02 && b < 0.02;
    const isLightGray =
      r > 0.4 &&
      r < 0.7 &&
      Math.abs(r - g) < 0.05 &&
      Math.abs(r - b) < 0.05;

    let category = "Other";
    let equipType: keyof EquipmentCount | null = null;

    if (isReddish && relativeHeight > 0.4) {
      if (info.volume < medianVol * 2) {
        if (aspectRatio > 3) {
          category = "Antenna";
          equipType = "Antenna";
        } else {
          category = "RRU";
          equipType = "RRU";
        }
      } else {
        category = "Antenna";
        equipType = "Antenna";
      }
    } else if (isSemiTransparent) {
      if (relativeHeight < 0.25 && info.volume > medianVol) {
        category = "Enclosure";
      } else if (isLightGray) {
        category = "Safety & Access";
      } else {
        category = "Enclosure";
      }
    } else if (info.volume > medianVol * 50 && relativeHeight < 0.3) {
      category = "Foundation";
    } else if (isVeryDark && maxHorizontalExtent > heightExtent * 5) {
      category = "Cable & Conduit";
    } else if (
      isWhitish &&
      relativeHeight > 0.3 &&
      info.volume < medianVol * 5
    ) {
      category = "RRU";
      equipType = "RRU";
    } else if (isDark) {
      if (aspectRatio > 4 && heightExtent > modelHeight * 0.2) {
        category = "Tower Structure";
      } else if (info.volume < medianVol * 0.1) {
        category = "Mounting Hardware";
      } else if (relativeHeight > 0.15) {
        category = "Tower Structure";
      } else if (relativeHeight < 0.15 && info.volume > medianVol * 5) {
        category = "Foundation";
      } else {
        category = "Tower Structure";
      }
    } else if (r > 0.6 && g > 0.6 && b > 0.5 && a >= 1.0) {
      if (info.volume > medianVol * 10) {
        category = "Tower Structure";
      } else {
        category = "Mounting Hardware";
      }
    } else if (isLightGray && a >= 1.0) {
      if (info.volume > medianVol * 50) {
        category = "Foundation";
      } else {
        category = "Tower Structure";
      }
    }

    result.set(info.mesh, { category, equipType });
  }

  return result;
}

const CATEGORY_COLORS: Record<string, string> = {
  "Tower Structure": "#4a9eff",
  "Cable & Conduit": "#a78bfa",
  "Mounting Hardware": "#f59e0b",
  Foundation: "#6b7280",
  Enclosure: "#10b981",
  "Safety & Access": "#ef4444",
  Antenna: "#22d3ee",
  RRU: "#f472b6",
  Dish: "#fb923c",
  Other: "#94a3b8",
};

// ─── Analyze the loaded GLB model ─────────────────────────────────────────────
function analyzeModel(model: THREE.Group): StructureAnalysis {
  const box = new THREE.Box3().setFromObject(model);
  const size = box.getSize(new THREE.Vector3());

  let heightAxis: "X" | "Y" | "Z" = "Y";
  let heightAxisIdx = 1;
  let height = size.y;
  if (size.z > size.y && size.z > size.x) {
    heightAxis = "Z";
    heightAxisIdx = 2;
    height = size.z;
  } else if (size.x > size.y && size.x > size.z) {
    heightAxis = "X";
    heightAxisIdx = 0;
    height = size.x;
  }

  const meshInfos: MeshGeoInfo[] = [];
  let totalTriangles = 0;
  let totalMeshes = 0;

  model.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      totalMeshes++;
      const geom = child.geometry;
      let tris = 0;
      if (geom.index) tris = geom.index.count / 3;
      else tris = (geom.attributes.position?.count ?? 0) / 3;
      tris = Math.round(tris);
      totalTriangles += tris;

      const name =
        child.name || child.parent?.name || `mesh_${totalMeshes}`;

      let matColor = { r: 0.5, g: 0.5, b: 0.5, a: 1.0 };
      if (child.material) {
        const mat = Array.isArray(child.material)
          ? child.material[0]
          : child.material;
        if (mat && "color" in mat) {
          const c = (mat as THREE.MeshStandardMaterial).color;
          const opacity =
            (mat as THREE.MeshStandardMaterial).opacity ?? 1.0;
          matColor = { r: c.r, g: c.g, b: c.b, a: opacity };
        }
      }

      const meshBox = new THREE.Box3().setFromObject(child);
      const meshSize = meshBox.getSize(new THREE.Vector3());
      const meshCenter = meshBox.getCenter(new THREE.Vector3());
      const volume = meshSize.x * meshSize.y * meshSize.z;

      meshInfos.push({
        mesh: child,
        name,
        bbox: meshBox,
        size: meshSize,
        center: meshCenter,
        volume,
        triangles: tris,
        materialColor: matColor,
        materialHex: colorToHex(matColor.r, matColor.g, matColor.b),
      });
    }
  });

  const equipment: EquipmentCount = { Antenna: 0, RRU: 0, Dish: 0 };
  const categoryMap = new Map<string, { count: number; triangles: number }>();
  const meshEntries: MeshAnalysisEntry[] = [];

  const nameResults = new Map<
    THREE.Mesh,
    { category: string; equipType: keyof EquipmentCount | null }
  >();
  const unresolved: MeshGeoInfo[] = [];

  for (const info of meshInfos) {
    const nameResult = classifyByName(info.name);
    if (nameResult.category) {
      nameResults.set(info.mesh, nameResult);
    } else {
      unresolved.push(info);
    }
  }

  const geoResults = classifyByGeometryAndMaterial(
    unresolved,
    box,
    size,
    heightAxisIdx
  );

  for (const info of meshInfos) {
    const nameResult = nameResults.get(info.mesh);
    const geoResult = geoResults.get(info.mesh);
    const finalResult = nameResult ||
      geoResult || { category: "Other", equipType: null };

    if (finalResult.equipType) {
      equipment[finalResult.equipType]++;
    }

    const existing = categoryMap.get(finalResult.category) || {
      count: 0,
      triangles: 0,
    };
    existing.count++;
    existing.triangles += info.triangles;
    categoryMap.set(finalResult.category, existing);

    const heightSpan: [number, number] =
      heightAxisIdx === 0
        ? [info.bbox.min.x, info.bbox.max.x]
        : heightAxisIdx === 1
          ? [info.bbox.min.y, info.bbox.max.y]
          : [info.bbox.min.z, info.bbox.max.z];

    meshEntries.push({
      name: info.name,
      category: finalResult.category,
      equipmentType: finalResult.equipType,
      materialColor: info.materialHex,
      materialAlpha: info.materialColor.a,
      triangles: info.triangles,
      volume: info.volume,
      heightSpan,
      bbox: info.bbox,
    });
  }

  const categories: CategoryInfo[] = Array.from(categoryMap.entries())
    .map(([name, data]) => ({
      name,
      count: data.count,
      triangles: data.triangles,
      color: CATEGORY_COLORS[name] || CATEGORY_COLORS.Other,
    }))
    .sort((a, b) => b.count - a.count);

  return {
    height: Math.round(height * 100) / 100,
    heightAxis,
    widthX: Math.round(size.x * 100) / 100,
    widthY: Math.round(size.y * 100) / 100,
    widthZ: Math.round(size.z * 100) / 100,
    equipment,
    categories,
    totalTriangles: Math.round(totalTriangles),
    totalMeshes,
    meshEntries,
  };
}

// ─── Extract all properties from a selected mesh ──────────────────────────────
function extractMeshProperties(
  mesh: THREE.Mesh,
  analysisEntries: MeshAnalysisEntry[]
): SelectedElementProps {
  const geom = mesh.geometry;
  let tris = 0;
  let verts = 0;
  if (geom) {
    if (geom.index) tris = Math.round(geom.index.count / 3);
    else tris = Math.round((geom.attributes.position?.count ?? 0) / 3);
    verts = geom.attributes.position?.count ?? 0;
  }

  const bbox = new THREE.Box3().setFromObject(mesh);
  const dims = bbox.getSize(new THREE.Vector3());
  const worldPos = new THREE.Vector3();
  mesh.getWorldPosition(worldPos);

  // Material info
  const mat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
  let materialName = mat?.name || "unnamed";
  let materialType = mat?.type || "unknown";
  let color = "#808080";
  let opacity = 1;
  let metalness = 0;
  let roughness = 1;
  let doubleSided = false;

  if (mat) {
    doubleSided = mat.side === THREE.DoubleSide;
    if ("color" in mat) {
      const c = (mat as THREE.MeshStandardMaterial).color;
      color = `#${c.getHexString()}`;
    }
    if ("opacity" in mat) opacity = (mat as any).opacity ?? 1;
    if ("metalness" in mat) metalness = (mat as any).metalness ?? 0;
    if ("roughness" in mat) roughness = (mat as any).roughness ?? 1;
  }

  // Walk up hierarchy for ancestor path and depth
  let depth = 0;
  let ancestorPath = mesh.name || "mesh";
  let parent = mesh.parent;
  while (parent) {
    depth++;
    if (parent.name && parent.name !== "Scene" && parent.name !== "") {
      ancestorPath = `${parent.name} > ${ancestorPath}`;
    }
    parent = parent.parent;
  }

  // UserData — GLB/glTF extras get stored here
  const userData: Record<string, unknown> = {};
  const extras: Record<string, unknown> = {};

  // Collect mesh userData
  if (mesh.userData && Object.keys(mesh.userData).length > 0) {
    Object.entries(mesh.userData).forEach(([k, v]) => {
      userData[k] = v;
    });
  }

  // Collect parent userData (IFC properties often stored on parent nodes)
  let p = mesh.parent;
  while (p) {
    if (p.userData && Object.keys(p.userData).length > 0) {
      Object.entries(p.userData).forEach(([k, v]) => {
        if (!userData[k]) {
          extras[`${p!.name || "parent"}.${k}`] = v;
        }
      });
    }
    p = p.parent;
  }

  // Find matching analysis entry
  const meshName = mesh.name || mesh.parent?.name || "unnamed";
  const entry = analysisEntries.find(
    (e) =>
      e.name === meshName ||
      e.name === mesh.name ||
      e.name === mesh.parent?.name
  );

  return {
    meshName: mesh.name || "unnamed",
    parentName: mesh.parent?.name || "none",
    uuid: mesh.uuid.substring(0, 12),
    category: entry?.category || "Unclassified",
    equipmentType: entry?.equipmentType || null,
    triangleCount: tris,
    vertexCount: verts,
    boundingBox: { min: bbox.min, max: bbox.max },
    dimensions: {
      x: Math.round(dims.x * 1000) / 1000,
      y: Math.round(dims.y * 1000) / 1000,
      z: Math.round(dims.z * 1000) / 1000,
    },
    volume: Math.round(dims.x * dims.y * dims.z * 1000) / 1000,
    worldPosition: worldPos,
    materialName,
    materialType,
    color,
    opacity,
    metalness,
    roughness,
    doubleSided,
    userData,
    extras,
    depth,
    childCount: mesh.children.length,
    ancestorPath,
  };
}

// ─── Build property groups for the panel ──────────────────────────────────────
function buildPropertyGroups(props: SelectedElementProps): PropertyGroup[] {
  const groups: PropertyGroup[] = [];

  // 1. Identity / Attributes
  const identityProps: { key: string; value: string; highlight?: boolean }[] = [
    { key: "Name", value: props.meshName, highlight: true },
    { key: "Parent", value: props.parentName },
    { key: "UUID", value: props.uuid },
    { key: "Category", value: props.category, highlight: true },
  ];
  if (props.equipmentType) {
    identityProps.push({
      key: "Equipment Type",
      value: props.equipmentType,
      highlight: true,
    });
  }
  identityProps.push(
    { key: "Hierarchy Depth", value: String(props.depth) },
    { key: "Children", value: String(props.childCount) },
    { key: "Path", value: props.ancestorPath }
  );

  groups.push({
    name: "Attributes",
    icon: SelectionIcons.attributes,
    color: ACCENT,
    properties: identityProps,
  });

  // 2. Geometry
  groups.push({
    name: "Geometry",
    icon: SelectionIcons.geometry,
    color: SUCCESS,
    properties: [
      { key: "Triangles", value: props.triangleCount.toLocaleString() },
      { key: "Vertices", value: props.vertexCount.toLocaleString() },
      {
        key: "Dimensions (X×Y×Z)",
        value: `${props.dimensions.x} × ${props.dimensions.y} × ${props.dimensions.z}`,
      },
      { key: "Volume", value: `${props.volume} units³` },
      {
        key: "World Position",
        value: `(${props.worldPosition.x.toFixed(2)}, ${props.worldPosition.y.toFixed(2)}, ${props.worldPosition.z.toFixed(2)})`,
      },
      {
        key: "BBox Min",
        value: `(${props.boundingBox.min.x.toFixed(2)}, ${props.boundingBox.min.y.toFixed(2)}, ${props.boundingBox.min.z.toFixed(2)})`,
      },
      {
        key: "BBox Max",
        value: `(${props.boundingBox.max.x.toFixed(2)}, ${props.boundingBox.max.y.toFixed(2)}, ${props.boundingBox.max.z.toFixed(2)})`,
      },
    ],
  });

  // 3. Material
  groups.push({
    name: "Material",
    icon: SelectionIcons.material,
    color: "#f472b6",
    properties: [
      { key: "Name", value: props.materialName },
      { key: "Type", value: props.materialType },
      { key: "Color", value: props.color, highlight: true },
      { key: "Opacity", value: `${(props.opacity * 100).toFixed(0)}%` },
      { key: "Metalness", value: props.metalness.toFixed(2) },
      { key: "Roughness", value: props.roughness.toFixed(2) },
      { key: "Double Sided", value: props.doubleSided ? "Yes" : "No" },
    ],
  });

  // 4. User Data (IFC properties, glTF extras)
  const userDataEntries = Object.entries(props.userData);
  const extrasEntries = Object.entries(props.extras);
  if (userDataEntries.length > 0 || extrasEntries.length > 0) {
    const allProps: { key: string; value: string; highlight?: boolean }[] = [];
    userDataEntries.forEach(([k, v]) => {
      allProps.push({
        key: k,
        value: typeof v === "object" ? JSON.stringify(v) : String(v),
        highlight: true,
      });
    });
    extrasEntries.forEach(([k, v]) => {
      allProps.push({
        key: k,
        value: typeof v === "object" ? JSON.stringify(v) : String(v),
      });
    });
    groups.push({
      name: "IFC Properties / Extras",
      icon: SelectionIcons.properties,
      color: WARNING,
      properties: allProps,
    });
  }

  return groups;
}

// ─── SVG Icons ────────────────────────────────────────────────────────────────
const Icons = {
  height: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2v20M5 5l7-3 7 3M5 19l7 3 7-3" />
    </svg>
  ),
  triangle: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
    </svg>
  ),
  mesh: (
    <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x={3} y={3} width={7} height={7} rx={1} />
      <rect x={14} y={3} width={7} height={7} rx={1} />
      <rect x={3} y={14} width={7} height={7} rx={1} />
      <rect x={14} y={14} width={7} height={7} rx={1} />
    </svg>
  ),
  antenna: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 20V10M8 20h8M2 8c3.5-3.5 5-5 10-5s6.5 1.5 10 5M6 12c2-2 3-3 6-3s4 1 6 3" />
    </svg>
  ),
  rru: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x={4} y={4} width={16} height={16} rx={2} />
      <circle cx={12} cy={12} r={3} />
      <path d="M12 4v3M12 17v3M4 12h3M17 12h3" />
    </svg>
  ),
  dish: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M4 15c0-5.523 4.477-10 10-10" />
      <path d="M4 15l8-4M12 11l5-8" />
      <circle cx={4} cy={15} r={2} />
    </svg>
  ),
  explode: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 2l2 4M12 22l-2-4M2 12l4 2M22 12l-4-2M4.9 4.9l3.6 2.1M19.1 19.1l-3.6-2.1M19.1 4.9l-2.1 3.6M4.9 19.1l2.1-3.6" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  ),
  wireframe: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M12 3L3 8v8l9 5 9-5V8l-9-5zM3 8l9 5M12 21.5V13M21 8l-9 5M7.5 5.5l9 5M16.5 5.5l-9 5" />
    </svg>
  ),
  reset: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <path d="M1 4v6h6M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15" />
    </svg>
  ),
  info: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8}>
      <circle cx={12} cy={12} r={10} />
      <path d="M12 16v-4M12 8h0" />
    </svg>
  ),
  close: (
    <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  ),
  // Element Selection: cursor with selection target (inspect/select 3D element)
  select: (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
      {/* Pointer/cursor */}
      <path d="M5 4l6.5 14 2.5-5.5 5-2L5 4z" />
      {/* Selection target ring at tip */}
      <circle cx={17} cy={17} r={3.5} strokeWidth={1.5} strokeDasharray="1.2 1.2" />
      <circle cx={17} cy={17} r={1.25} fill="currentColor" stroke="none" />
    </svg>
  ),
};

// Icons for property groups
const SelectionIcons = {
  attributes: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx={12} cy={7} r={4} />
    </svg>
  ),
  geometry: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
    </svg>
  ),
  material: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <circle cx={13.5} cy={6.5} r={0.5} fill="currentColor" />
      <circle cx={17.5} cy={10.5} r={0.5} fill="currentColor" />
      <circle cx={8.5} cy={7.5} r={0.5} fill="currentColor" />
      <circle cx={6.5} cy={12.5} r={0.5} fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.02 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.52-4.48-9.94-10-9.94z" />
    </svg>
  ),
  properties: (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </svg>
  ),
};

// ─── Custom crosshair cursor as data URI ──────────────────────────────────────
const SELECTION_CURSOR = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3E%3Ccircle cx='16' cy='16' r='12' fill='none' stroke='%2300e5ff' stroke-width='1.5' stroke-dasharray='4 3' opacity='0.8'/%3E%3Ccircle cx='16' cy='16' r='2' fill='%2300e5ff'/%3E%3Cline x1='16' y1='2' x2='16' y2='8' stroke='%2300e5ff' stroke-width='1.5' opacity='0.6'/%3E%3Cline x1='16' y1='24' x2='16' y2='30' stroke='%2300e5ff' stroke-width='1.5' opacity='0.6'/%3E%3Cline x1='2' y1='16' x2='8' y2='16' stroke='%2300e5ff' stroke-width='1.5' opacity='0.6'/%3E%3Cline x1='24' y1='16' x2='30' y2='16' stroke='%2300e5ff' stroke-width='1.5' opacity='0.6'/%3E%3C/svg%3E") 16 16, crosshair`;

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatBadge({
  label,
  value,
  unit,
  icon,
  color = ACCENT,
}: {
  label: string;
  value: string | number;
  unit?: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "10px 14px",
        background: `linear-gradient(135deg, ${color}10, transparent)`,
        borderRadius: 10,
        border: `1px solid ${color}25`,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: 8,
          background: `${color}18`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div style={{ minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            color: TEXT_MUTED,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: TEXT_PRIMARY,
            lineHeight: 1.2,
          }}
        >
          {value}
          {unit && (
            <span
              style={{
                fontSize: 12,
                fontWeight: 400,
                color: TEXT_SECONDARY,
                marginLeft: 3,
              }}
            >
              {unit}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function EquipmentRow({
  label,
  count,
  icon,
  color,
}: {
  label: string;
  count: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 12px",
        borderRadius: 8,
        background: count > 0 ? `${color}10` : "transparent",
        border: `1px solid ${count > 0 ? `${color}20` : "rgba(255,255,255,0.05)"}`,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ color: count > 0 ? color : TEXT_MUTED }}>{icon}</span>
        <span
          style={{
            fontSize: 13,
            color: count > 0 ? TEXT_PRIMARY : TEXT_MUTED,
          }}
        >
          {label}
        </span>
      </div>
      <span
        style={{
          fontSize: 16,
          fontWeight: 700,
          color: count > 0 ? color : TEXT_MUTED,
          minWidth: 28,
          textAlign: "right",
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Property Panel for Selected Element ──────────────────────────────────────
function SelectionPropertyPanel({
  props,
  onClose,
  onDownloadExcel,
}: {
  props: SelectedElementProps;
  onClose: () => void;
  onDownloadExcel: () => void;
}) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(
    new Set(["Attributes"])
  );
  const [searchTerm, setSearchTerm] = useState("");
  const groups = buildPropertyGroups(props);

  const toggleGroup = (name: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const categoryColor =
    CATEGORY_COLORS[props.category] || CATEGORY_COLORS.Other;

  // Filter properties by search
  const filteredGroups = groups
    .map((g) => ({
      ...g,
      properties: searchTerm
        ? g.properties.filter(
            (p) =>
              p.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.value.toLowerCase().includes(searchTerm.toLowerCase())
          )
        : g.properties,
    }))
    .filter((g) => g.properties.length > 0);

  return (
    <div
      style={{
        position: "absolute",
        top: 12,
        left: 12,
        bottom: 12,
        width: 340,
        background: PANEL_BG,
        backdropFilter: "blur(20px)",
        borderRadius: 14,
        border: `1px solid ${SELECT_COLOR}30`,
        zIndex: 25,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        animation: "panelSlideIn 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
        boxShadow: `0 0 30px ${SELECT_COLOR}10, 0 8px 32px rgba(0,0,0,0.4)`,
      }}
    >
      <style>{`
        @keyframes panelSlideIn {
          from { opacity: 0; transform: translateX(-16px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulseGlow {
          0%, 100% { box-shadow: 0 0 4px ${SELECT_COLOR}40; }
          50% { box-shadow: 0 0 12px ${SELECT_COLOR}60; }
        }
        .prop-row:hover {
          background: rgba(255,255,255,0.04) !important;
        }
        .group-header:hover {
          background: rgba(255,255,255,0.03) !important;
        }
        .search-input::placeholder {
          color: ${TEXT_MUTED};
        }
      `}</style>

      {/* ─── Header with element identity ─────────────────────── */}
      <div
        style={{
          padding: "14px 16px 12px",
          borderBottom: `1px solid ${SELECT_COLOR}20`,
          background: `linear-gradient(180deg, ${SELECT_COLOR}08, transparent)`,
        }}
      >
        {/* Category badge + close */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: SELECT_COLOR,
                animation: "pulseGlow 2s ease-in-out infinite",
              }}
            />
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: SELECT_COLOR,
              }}
            >
              Element Inspector
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              color: TEXT_MUTED,
              cursor: "pointer",
              padding: 4,
              borderRadius: 4,
              display: "flex",
              alignItems: "center",
            }}
          >
            {Icons.close}
          </button>
        </div>

        {/* Element name */}
        <h3
          style={{
            margin: 0,
            fontSize: 14,
            fontWeight: 700,
            color: TEXT_PRIMARY,
            letterSpacing: "-0.01em",
            wordBreak: "break-all",
            lineHeight: 1.3,
          }}
        >
          {props.meshName}
        </h3>

        {/* Category + Equipment type badges */}
        <div
          style={{
            display: "flex",
            gap: 6,
            marginTop: 8,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              padding: "3px 8px",
              borderRadius: 4,
              background: `${categoryColor}20`,
              color: categoryColor,
              border: `1px solid ${categoryColor}30`,
              textTransform: "uppercase",
              letterSpacing: "0.06em",
            }}
          >
            {props.category}
          </span>
          {props.equipmentType && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                padding: "3px 8px",
                borderRadius: 4,
                background: `${WARNING}20`,
                color: WARNING,
                border: `1px solid ${WARNING}30`,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              {props.equipmentType}
            </span>
          )}
          {/* Material color swatch */}
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              fontWeight: 600,
              padding: "3px 8px",
              borderRadius: 4,
              background: "rgba(255,255,255,0.06)",
              color: TEXT_SECONDARY,
              border: `1px solid rgba(255,255,255,0.08)`,
            }}
          >
            <span
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                background: props.color,
                border: "1px solid rgba(255,255,255,0.2)",
                flexShrink: 0,
              }}
            />
            {props.color}
          </span>
        </div>

        {/* Quick stats row */}
        <div
          style={{
            display: "flex",
            gap: 12,
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px solid rgba(255,255,255,0.05)`,
          }}
        >
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: SUCCESS,
                lineHeight: 1,
              }}
            >
              {props.triangleCount.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 9,
                color: TEXT_MUTED,
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Triangles
            </div>
          </div>
          <div
            style={{
              width: 1,
              background: "rgba(255,255,255,0.08)",
              alignSelf: "stretch",
            }}
          />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: ACCENT,
                lineHeight: 1,
              }}
            >
              {props.vertexCount.toLocaleString()}
            </div>
            <div
              style={{
                fontSize: 9,
                color: TEXT_MUTED,
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Vertices
            </div>
          </div>
          <div
            style={{
              width: 1,
              background: "rgba(255,255,255,0.08)",
              alignSelf: "stretch",
            }}
          />
          <div style={{ textAlign: "center", flex: 1 }}>
            <div
              style={{
                fontSize: 15,
                fontWeight: 700,
                color: WARNING,
                lineHeight: 1,
              }}
            >
              {props.volume}
            </div>
            <div
              style={{
                fontSize: 9,
                color: TEXT_MUTED,
                textTransform: "uppercase",
                marginTop: 2,
              }}
            >
              Volume
            </div>
          </div>
        </div>
      </div>

      {/* ─── Action buttons ───────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          gap: 6,
          padding: "8px 12px",
          borderBottom: `1px solid rgba(255,255,255,0.05)`,
        }}
      >
        <button
          type="button"
          onClick={onDownloadExcel}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 600,
            background: `${SUCCESS}15`,
            color: SUCCESS,
            border: `1px solid ${SUCCESS}25`,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
          Export CSV
        </button>
        <button
          type="button"
          onClick={() => {
            const text = filteredGroups
              .map(
                (g) =>
                  `[${g.name}]\n${g.properties.map((p) => `  ${p.key}: ${p.value}`).join("\n")}`
              )
              .join("\n\n");
            navigator.clipboard.writeText(text);
          }}
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
            padding: "7px 10px",
            fontSize: 11,
            fontWeight: 600,
            background: "rgba(255,255,255,0.05)",
            color: TEXT_SECONDARY,
            border: `1px solid rgba(255,255,255,0.08)`,
            borderRadius: 6,
            cursor: "pointer",
          }}
        >
          <svg
            width={12}
            height={12}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
          >
            <rect x={9} y={9} width={13} height={13} rx={2} ry={2} />
            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
          </svg>
          Copy All
        </button>
      </div>

      {/* ─── Search ───────────────────────────────────────────── */}
      <div style={{ padding: "8px 12px 4px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 10px",
            borderRadius: 6,
            background: "rgba(255,255,255,0.04)",
            border: `1px solid rgba(255,255,255,0.08)`,
          }}
        >
          <svg
            width={13}
            height={13}
            viewBox="0 0 24 24"
            fill="none"
            stroke={TEXT_MUTED}
            strokeWidth={2}
          >
            <circle cx={11} cy={11} r={8} />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            className="search-input"
            type="text"
            placeholder="Search properties..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              flex: 1,
              background: "none",
              border: "none",
              outline: "none",
              color: TEXT_PRIMARY,
              fontSize: 12,
              fontFamily: "inherit",
            }}
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              style={{
                background: "none",
                border: "none",
                color: TEXT_MUTED,
                cursor: "pointer",
                padding: 0,
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* ─── Property Groups (collapsible) ────────────────────── */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "4px 0 12px",
        }}
      >
        {filteredGroups.map((group) => {
          const isExpanded = expandedGroups.has(group.name);
          return (
            <div key={group.name} style={{ marginBottom: 2 }}>
              {/* Group header */}
              <button
                type="button"
                className="group-header"
                onClick={() => toggleGroup(group.name)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  textAlign: "left",
                  transition: "background 0.1s",
                }}
              >
                {/* Expand/collapse arrow */}
                <svg
                  width={10}
                  height={10}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={TEXT_MUTED}
                  strokeWidth={3}
                  style={{
                    transform: isExpanded
                      ? "rotate(90deg)"
                      : "rotate(0deg)",
                    transition: "transform 0.15s ease",
                    flexShrink: 0,
                  }}
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
                <span style={{ color: group.color, flexShrink: 0 }}>
                  {group.icon}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: TEXT_PRIMARY,
                    flex: 1,
                  }}
                >
                  {group.name}
                </span>
                <span
                  style={{
                    fontSize: 10,
                    color: TEXT_MUTED,
                    background: "rgba(255,255,255,0.05)",
                    padding: "2px 6px",
                    borderRadius: 4,
                  }}
                >
                  {group.properties.length}
                </span>
              </button>

              {/* Properties */}
              {isExpanded && (
                <div style={{ padding: "0 8px" }}>
                  {group.properties.map((prop, i) => (
                    <div
                      key={i}
                      className="prop-row"
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        padding: "5px 10px",
                        borderRadius: 4,
                        gap: 8,
                        transition: "background 0.1s",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: TEXT_MUTED,
                          flexShrink: 0,
                          minWidth: 80,
                          paddingTop: 1,
                        }}
                      >
                        {prop.key}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: prop.highlight ? 600 : 400,
                          color: prop.highlight
                            ? TEXT_PRIMARY
                            : TEXT_SECONDARY,
                          textAlign: "right",
                          wordBreak: "break-all",
                          lineHeight: 1.4,
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                        }}
                      >
                        {/* Color swatch for color values */}
                        {prop.key === "Color" && (
                          <span
                            style={{
                              width: 12,
                              height: 12,
                              borderRadius: 3,
                              background: prop.value,
                              border:
                                "1px solid rgba(255,255,255,0.2)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                        {prop.value}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {filteredGroups.length === 0 && searchTerm && (
          <div
            style={{
              padding: "20px",
              textAlign: "center",
              color: TEXT_MUTED,
              fontSize: 12,
            }}
          >
            No properties matching "{searchTerm}"
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function GlbViewer({
  url,
  siteName,
  width = 800,
  height = 600,
  backgroundColor = DEFAULT_BACKGROUND,
  onLoaded,
  onError,
}: GlbViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer;
    scene: THREE.Scene;
    camera: THREE.PerspectiveCamera;
    controls: OrbitControls;
    animId: number;
  } | null>(null);
  const modelRef = useRef<THREE.Group | null>(null);
  const explodeStateRef = useRef<GlbExplodeState | null>(null);
  const applyExplodeRef = useRef<(amount: number) => void>(() => {});

  // ★ Selection state refs
  const raycasterRef = useRef(new THREE.Raycaster());
  const mouseRef = useRef(new THREE.Vector2());
  const highlightMaterialsRef = useRef<
    Map<THREE.Mesh, THREE.Material | THREE.Material[]>
  >(new Map());
  const outlineHelperRef = useRef<THREE.LineSegments | null>(null);
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);
  const [analysis, setAnalysis] = useState<StructureAnalysis | null>(null);
  const [showInfoPanel, setShowInfoPanel] = useState(false);
  const [showExplodeSlider, setShowExplodeSlider] = useState(false);
  const [explodeAmount, setExplodeAmount] = useState(0);
  const [hasExplodeState, setHasExplodeState] = useState(false);
  const [wireframe, setWireframe] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "equipment" | "categories"
  >("overview");

  // ★ Selection mode state
  const [selectMode, setSelectMode] = useState(false);
  const [selectedElement, setSelectedElement] =
    useState<SelectedElementProps | null>(null);
  const [hoveredMesh, setHoveredMesh] = useState<THREE.Mesh | null>(null);
  const selectModeRef = useRef(false);

  // Keep ref in sync
  useEffect(() => {
    selectModeRef.current = selectMode;
  }, [selectMode]);

  const toggleWireframe = useCallback(() => {
    const model = modelRef.current;
    if (!model) return;
    const newVal = !wireframe;
    model.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const mats = Array.isArray(child.material)
          ? child.material
          : [child.material];
        mats.forEach((mat) => {
          if ("wireframe" in mat)
            (mat as THREE.MeshStandardMaterial).wireframe = newVal;
        });
      }
    });
    setWireframe(newVal);
  }, [wireframe]);

  const resetCamera = useCallback(() => {
    const s = sceneRef.current;
    const model = modelRef.current;
    if (!s || !model) return;
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z, 1);
    const fov = s.camera.fov * (Math.PI / 180);
    const dist = Math.max(
      (maxDim / (2 * Math.tan(fov / 2))) * 1.35,
      10
    );
    s.camera.position.set(dist * 0.5, dist * 0.4, dist * 0.7);
    s.camera.lookAt(0, 0, 0);
    s.controls.target.set(0, 0, 0);
    s.controls.update();
  }, []);

  // ★ Clear selection highlight
  const clearSelection = useCallback(() => {
    // Restore original materials
    highlightMaterialsRef.current.forEach((origMat, mesh) => {
      mesh.material = origMat;
    });
    highlightMaterialsRef.current.clear();

    // Remove outline helper
    if (outlineHelperRef.current && sceneRef.current) {
      sceneRef.current.scene.remove(outlineHelperRef.current);
      outlineHelperRef.current.geometry.dispose();
      (outlineHelperRef.current.material as THREE.Material).dispose();
      outlineHelperRef.current = null;
    }

    setSelectedElement(null);
  }, []);

  // ★ Apply selection highlight to a mesh
  const selectMesh = useCallback(
    (mesh: THREE.Mesh) => {
      if (!analysis || !sceneRef.current) return;

      // Clear previous
      clearSelection();

      // Save original material
      highlightMaterialsRef.current.set(
        mesh,
        mesh.material
      );

      // Create highlight material: clone original + tint + emissive
      const origMat = Array.isArray(mesh.material)
        ? mesh.material[0]
        : mesh.material;
      const highlightMat = (
        origMat as THREE.MeshStandardMaterial
      ).clone();
      highlightMat.emissive = new THREE.Color(SELECT_COLOR);
      highlightMat.emissiveIntensity = 0.35;
      highlightMat.transparent = true;
      highlightMat.opacity = Math.max(
        (origMat as THREE.MeshStandardMaterial).opacity ?? 1,
        0.85
      );
      mesh.material = highlightMat;

      // Add outline (wireframe edges)
      const edges = new THREE.EdgesGeometry(mesh.geometry, 30);
      const lineMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(SELECT_COLOR),
        linewidth: 2,
        transparent: true,
        opacity: 0.7,
      });
      const outline = new THREE.LineSegments(edges, lineMat);
      // Copy the mesh's world transform
      mesh.updateMatrixWorld(true);
      outline.matrixAutoUpdate = false;
      outline.matrix.copy(mesh.matrixWorld);
      sceneRef.current.scene.add(outline);
      outlineHelperRef.current = outline;

      // Extract properties
      const props = extractMeshProperties(mesh, analysis.meshEntries);
      setSelectedElement(props);

      // Close info panel if it's open to avoid overlap
      setShowInfoPanel(false);
    },
    [analysis, clearSelection]
  );

  // ★ Handle click for element selection (raycast)
  const handleSelectionClick = useCallback(
    (event: MouseEvent) => {
      if (!selectModeRef.current) return;
      if (!sceneRef.current || !modelRef.current) return;

      const container = containerRef.current;
      if (!container) return;

      // Only select if mouse didn't move much (not an orbit drag)
      const downPos = mouseDownPosRef.current;
      if (downPos) {
        const dx = Math.abs(event.clientX - downPos.x);
        const dy = Math.abs(event.clientY - downPos.y);
        if (dx > 5 || dy > 5) return; // was a drag, not a click
      }

      const rect = container.getBoundingClientRect();
      mouseRef.current.x =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneRef.current.camera
      );
      const intersects = raycasterRef.current.intersectObject(
        modelRef.current,
        true
      );

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        if (hitMesh instanceof THREE.Mesh) {
          selectMesh(hitMesh);
        }
      } else {
        // Clicked empty space — deselect
        clearSelection();
      }
    },
    [selectMesh, clearSelection]
  );

  // ★ Track mousedown position for drag detection
  const handleMouseDown = useCallback((event: MouseEvent) => {
    mouseDownPosRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  // ★ Handle hover for preview highlight
  const handleSelectionHover = useCallback(
    (event: MouseEvent) => {
      if (!selectModeRef.current) return;
      if (!sceneRef.current || !modelRef.current) return;
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      mouseRef.current.x =
        ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouseRef.current.y =
        -((event.clientY - rect.top) / rect.height) * 2 + 1;

      raycasterRef.current.setFromCamera(
        mouseRef.current,
        sceneRef.current.camera
      );
      const intersects = raycasterRef.current.intersectObject(
        modelRef.current,
        true
      );

      if (intersects.length > 0) {
        const hitMesh = intersects[0].object as THREE.Mesh;
        if (hitMesh instanceof THREE.Mesh && hitMesh !== hoveredMesh) {
          setHoveredMesh(hitMesh);
        }
      } else {
        if (hoveredMesh) setHoveredMesh(null);
      }
    },
    [hoveredMesh]
  );

  // ★ Attach/detach selection event listeners
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    if (selectMode) {
      container.addEventListener("mousedown", handleMouseDown);
      container.addEventListener("click", handleSelectionClick);
      container.addEventListener("mousemove", handleSelectionHover);
    }

    return () => {
      container.removeEventListener("mousedown", handleMouseDown);
      container.removeEventListener("click", handleSelectionClick);
      container.removeEventListener("mousemove", handleSelectionHover);
    };
  }, [selectMode, handleSelectionClick, handleSelectionHover, handleMouseDown]);

  // ★ Toggle select mode
  const toggleSelectMode = useCallback(() => {
    const newMode = !selectMode;
    setSelectMode(newMode);
    if (!newMode) {
      clearSelection();
      setHoveredMesh(null);
    }
  }, [selectMode, clearSelection]);

  // ★ Download selected element as CSV
  const downloadElementCSV = useCallback(() => {
    if (!selectedElement) return;
    const groups = buildPropertyGroups(selectedElement);
    let csv = "Group,Property,Value\n";
    groups.forEach((g) => {
      g.properties.forEach((p) => {
        const escapedVal = p.value.replace(/"/g, '""');
        csv += `"${g.name}","${p.key}","${escapedVal}"\n`;
      });
    });
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${selectedElement.meshName || "element"}_properties.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [selectedElement]);

  // ─── Main scene setup ───────────────────────────────────────────────
  useEffect(() => {
    const container = containerRef.current;
    if (!container || !url) return;

    let disposed = false;
    setLoading(true);
    setLoadProgress(0);
    setError(null);
    setAnalysis(null);
    setSelectedElement(null);
    setSelectMode(false);

    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const bg = backgroundColor ?? DEFAULT_BACKGROUND;
    const bgColor = new THREE.Color(bg);
    renderer.setClearColor(bgColor, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.79;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    renderer.domElement.style.backgroundColor = "transparent";

    const scene = new THREE.Scene();
    scene.background = null;

    const camera = new THREE.PerspectiveCamera(
      50,
      width / height,
      0.1,
      10000
    );
    camera.position.set(20, 20, 20);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 1;
    controls.maxDistance = 5000;

    // Lighting — preserve product colors: no white washout, directional shine only where it hits
    scene.add(new THREE.AmbientLight(0xffffff, 0.28));
    scene.add(new THREE.HemisphereLight(0x9cb0c4, 0x1e1e28, 0.28));
    const dirLight = new THREE.DirectionalLight(0xfff5e8, 0.55);
    dirLight.position.set(200, 400, 300);
    dirLight.castShadow = false;
    scene.add(dirLight);
    const dirLight2 = new THREE.DirectionalLight(0xfff0e0, 0.38);
    dirLight2.position.set(-180, 350, 220);
    dirLight2.castShadow = false;
    scene.add(dirLight2);
    const rimLight = new THREE.DirectionalLight(0xd0dce8, 0.22);
    rimLight.position.set(-200, 100, -300);
    rimLight.castShadow = false;
    scene.add(rimLight);
    const backLight = new THREE.DirectionalLight(0xb0c0d8, 0.2);
    backLight.position.set(150, 80, -350);
    backLight.castShadow = false;
    scene.add(backLight);
    const fillLight = new THREE.DirectionalLight(0x6a7d94, 0.2);
    fillLight.position.set(-100, 200, -200);
    scene.add(fillLight);

    // Environment map — dark gray so reflections don't wash out product colors
    const envScene = new THREE.Scene();
    const envGeo = new THREE.SphereGeometry(100, 32, 16);
    const envMat = new THREE.MeshBasicMaterial({
      color: 0x4a4a4a,
      side: THREE.BackSide,
    });
    const envMesh = new THREE.Mesh(envGeo, envMat);
    envScene.add(envMesh);
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envRenderTarget = pmremGenerator.fromScene(envScene, 0.22);
    scene.environment = envRenderTarget.texture;
    envGeo.dispose();
    envMat.dispose();

    let animId = 0;
    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    sceneRef.current = { renderer, scene, camera, controls, animId };
    modelRef.current = null;
    explodeStateRef.current = null;
    highlightMaterialsRef.current.clear();
    outlineHelperRef.current = null;
    setHasExplodeState(false);

    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        scene.add(model);
        modelRef.current = model;

        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z, 1);
        model.position.sub(center);
        model.updateMatrixWorld(true);

        // Light material tweaks: roughness, envMapIntensity, dark metallic albedo, and bright emissives (lasers/LEDs)
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            const mats = Array.isArray(child.material)
              ? child.material
              : [child.material];
            for (const mat of mats) {
              if (
                mat instanceof THREE.MeshStandardMaterial ||
                (mat as THREE.MeshStandardMaterial).isMeshStandardMaterial
              ) {
                const m = mat as THREE.MeshStandardMaterial;
                m.roughness = Math.min(m.roughness, 0.88);
                // Keep env reflection subtle so model albedo/color stays dominant (no white washout)
                m.envMapIntensity =
                  m.metalness > 0.4 ? 0.32 + (1 - m.metalness) * 0.18 : 0.5;
                // Slight nudge for very dark metallic albedo so they're not pure black (stay dark)
                if (m.metalness > 0.5 && m.color.getHex() < 0x0d0d0d) {
                  m.color.setHex(0x252525);
                }
                // Boost emissive so in-model lights (lasers, LEDs, screens) look like real lighting
                if (m.emissive && (m.emissive.r > 0.01 || m.emissive.g > 0.01 || m.emissive.b > 0.01)) {
                  const current = m.emissiveIntensity ?? 1;
                  m.emissiveIntensity = Math.max(current * 3, 2.5);
                }
              }
            }
          }
        });

        const fov = camera.fov * (Math.PI / 180);
        const dist = Math.max(
          (maxDim / (2 * Math.tan(fov / 2))) * 1.35,
          10
        );
        camera.position.set(dist * 0.5, dist * 0.4, dist * 0.7);
        camera.lookAt(0, 0, 0);
        controls.target.set(0, 0, 0);
        controls.update();

        const result = analyzeModel(model);
        setAnalysis(result);
        onLoaded?.(result.totalTriangles);

        // Build explode state
        const explodeChildren: GlbExplodeChild[] = [];
        model.traverse((child) => {
          if (child instanceof THREE.Mesh && child.geometry) {
            const worldPos = new THREE.Vector3();
            child.getWorldPosition(worldPos);
            explodeChildren.push({
              mesh: child,
              originalWorldPosition: worldPos.clone(),
              originalPosition: child.position.clone(),
            });
          }
        });

        if (explodeChildren.length > 0) {
          const centerWorld = new THREE.Vector3(0, 0, 0);
          const maxDistance = 0.3 * maxDim;
          explodeStateRef.current = {
            centerWorld,
            maxDistance,
            children: explodeChildren,
          };
          applyExplodeRef.current = (amount: number) => {
            const state = explodeStateRef.current;
            if (!state) return;
            for (const {
              mesh,
              originalWorldPosition,
              originalPosition,
            } of state.children) {
              if (amount === 0) {
                mesh.position.copy(originalPosition);
                continue;
              }
              mesh.position.copy(originalPosition);
              const directionWorld = originalWorldPosition
                .clone()
                .sub(state.centerWorld)
                .normalize();
              const newWorldPos = originalWorldPosition
                .clone()
                .add(
                  directionWorld.multiplyScalar(
                    amount * state.maxDistance
                  )
                );
              if (mesh.parent) {
                mesh.position.copy(
                  mesh.parent.worldToLocal(newWorldPos)
                );
              }
            }
          };
          applyExplodeRef.current(0);
          setHasExplodeState(true);
        }

        setLoading(false);
      },
      (progress) => {
        if (progress.lengthComputable) {
          setLoadProgress(
            Math.round((progress.loaded / progress.total) * 100)
          );
        }
      },
      (err: unknown) => {
        const msg =
          err instanceof Error ? err.message : "Failed to load GLB";
        setError(msg);
        setLoading(false);
        onError?.(msg);
      }
    );

    const onResize = () => {
      if (disposed || !container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(onResize);
    ro.observe(container);

    return () => {
      disposed = true;
      modelRef.current = null;
      explodeStateRef.current = null;
      highlightMaterialsRef.current.clear();
      outlineHelperRef.current = null;
      scene.environment = null;
      envRenderTarget.dispose();
      pmremGenerator.dispose();
      ro.disconnect();
      cancelAnimationFrame(animId);
      controls.dispose();
      renderer.dispose();
      if (container?.contains(renderer.domElement))
        container.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [url, width, height, backgroundColor, onLoaded, onError]);

  // ─── Render: No URL ─────────────────────────────────────────────────
  if (!url) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: DEFAULT_BACKGROUND,
          borderRadius: 12,
          border: `1px solid ${PANEL_BORDER}`,
        }}
      >
        <p style={{ color: TEXT_MUTED, fontSize: 14 }}>
          No GLB URL provided.
        </p>
      </div>
    );
  }

  // ─── Render: Error ──────────────────────────────────────────────────
  if (error) {
    return (
      <div
        style={{
          width,
          height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          background: DEFAULT_BACKGROUND,
          borderRadius: 12,
          border: `1px solid ${PANEL_BORDER}`,
        }}
      >
        <p style={{ fontSize: 14, color: "#ef4444" }}>{error}</p>
      </div>
    );
  }

  const totalEquip = analysis
    ? analysis.equipment.Antenna +
      analysis.equipment.RRU +
      analysis.equipment.Dish
    : 0;

  const bgHex = backgroundColor ?? DEFAULT_BACKGROUND;
  const bgStyle = hexToRgba(bgHex, BACKGROUND_OPACITY);
  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${PANEL_BORDER}`,
        background: bgStyle,
        fontFamily:
          "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace",
      }}
    >
      {/* 3D Canvas */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: "100%",
          cursor: selectMode ? SELECTION_CURSOR : "grab",
          background: bgStyle,
        }}
      />

      {/* Loading overlay */}
      {loading && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: bgStyle,
            zIndex: 20,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              border: `3px solid ${PANEL_BORDER}`,
              borderTopColor: ACCENT,
              borderRadius: "50%",
              animation: "glb-spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes glb-spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ marginTop: 16, color: TEXT_SECONDARY, fontSize: 13 }}>
            Loading model...{" "}
            {loadProgress > 0 ? `${loadProgress}%` : ""}
          </p>
        </div>
      )}

      {/* ─── Select Mode Indicator Banner ────────────────────── */}
      {selectMode && !selectedElement && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 16px",
            borderRadius: 20,
            background: `${SELECT_COLOR}18`,
            backdropFilter: "blur(12px)",
            border: `1px solid ${SELECT_COLOR}35`,
            zIndex: 12,
            animation: "fadeIn 0.2s ease",
          }}
        >
          <style>{`@keyframes fadeIn { from { opacity:0; transform: translateX(-50%) translateY(-6px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }`}</style>
          <div
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: SELECT_COLOR,
              animation: "pulseGlow 1.5s ease-in-out infinite",
            }}
          />
          <style>{`@keyframes pulseGlow { 0%,100% { box-shadow: 0 0 4px ${SELECT_COLOR}60; } 50% { box-shadow: 0 0 12px ${SELECT_COLOR}90; } }`}</style>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: SELECT_COLOR,
              letterSpacing: "0.03em",
            }}
          >
            Click any element to inspect properties
          </span>
          <span
            style={{ fontSize: 10, color: TEXT_MUTED, marginLeft: 4 }}
          >
            ESC to exit
          </span>
        </div>
      )}

      {/* ─── Toolbar ──────────────────────────────────────────── */}
      {analysis && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: selectedElement ? 12 : "auto",
            left: selectedElement ? "auto" : 12,
            display: "flex",
            gap: 6,
            zIndex: 10,
          }}
        >
          {/* ★ Element Select button — primary position */}
          <ToolbarButton
            icon={Icons.select}
            active={selectMode}
            title={
              selectMode
                ? "Exit Selection Mode"
                : "Element Selection (Click to inspect)"
            }
            onClick={toggleSelectMode}
            accentColor={SELECT_COLOR}
            pulse={selectMode}
          />
          <ToolbarButton
            icon={Icons.info}
            active={showInfoPanel}
            title="Structure Analysis"
            onClick={() => {
              setShowInfoPanel((p) => !p);
              if (!showInfoPanel) {
                clearSelection();
                setSelectMode(false);
              }
            }}
          />
          <ToolbarButton
            icon={Icons.wireframe}
            active={wireframe}
            title="Wireframe"
            onClick={toggleWireframe}
          />
          <ToolbarButton
            icon={Icons.reset}
            active={false}
            title="Reset Camera"
            onClick={resetCamera}
          />
          {hasExplodeState && (
            <ToolbarButton
              icon={Icons.explode}
              active={showExplodeSlider}
              title="Explode View"
              onClick={() => setShowExplodeSlider((p) => !p)}
            />
          )}
        </div>
      )}

      {/* ─── Explode Slider ────────────────────────────────────── */}
      {showExplodeSlider && hasExplodeState && (
        <div
          style={{
            position: "absolute",
            top: 56,
            left: selectedElement ? "auto" : 12,
            right: selectedElement ? 12 : "auto",
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: PANEL_BG,
            backdropFilter: "blur(12px)",
            padding: "8px 14px",
            borderRadius: 10,
            border: `1px solid ${PANEL_BORDER}`,
            zIndex: 10,
          }}
        >
          <span
            style={{
              fontSize: 10,
              color: TEXT_MUTED,
              fontWeight: 600,
            }}
          >
            EXPLODE
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={Math.round(explodeAmount * 100)}
            onChange={(e) => {
              const value = Number(e.target.value) / 100;
              setExplodeAmount(value);
              applyExplodeRef.current?.(value);
            }}
            style={{
              width: 140,
              height: 4,
              accentColor: ACCENT,
              cursor: "pointer",
            }}
          />
          <span
            style={{
              fontSize: 11,
              color: ACCENT,
              fontWeight: 600,
              minWidth: 34,
              textAlign: "right",
            }}
          >
            {Math.round(explodeAmount * 100)}%
          </span>
        </div>
      )}

      {/* ─── Quick Stats Bar (bottom) ────────────────────────────── */}
      {analysis && !showInfoPanel && !selectedElement && (
        <div
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 16px",
            borderRadius: 10,
            background: PANEL_BG,
            backdropFilter: "blur(12px)",
            border: `1px solid ${PANEL_BORDER}`,
            zIndex: 5,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
            }}
          >
            {siteName && (
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: TEXT_PRIMARY,
                }}
              >
                {siteName}
              </span>
            )}
            <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>
              <span style={{ color: ACCENT, fontWeight: 600 }}>
                {analysis.height.toLocaleString()}
              </span>{" "}
              units tall ({analysis.heightAxis})
            </span>
            <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>
              <span style={{ color: SUCCESS, fontWeight: 600 }}>
                {analysis.totalMeshes}
              </span>{" "}
              meshes
            </span>
            <span style={{ fontSize: 12, color: TEXT_SECONDARY }}>
              <span style={{ color: WARNING, fontWeight: 600 }}>
                {(analysis.totalTriangles / 1000).toFixed(1)}k
              </span>{" "}
              tris
            </span>
          </div>
          {totalEquip > 0 && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              {analysis.equipment.Antenna > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#22d3ee",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {Icons.antenna} {analysis.equipment.Antenna}
                </span>
              )}
              {analysis.equipment.RRU > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#f472b6",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {Icons.rru} {analysis.equipment.RRU}
                </span>
              )}
              {analysis.equipment.Dish > 0 && (
                <span
                  style={{
                    fontSize: 12,
                    color: "#fb923c",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  {Icons.dish} {analysis.equipment.Dish}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* ─── Selected Element Property Panel (left side) ─────────── */}
      {selectedElement && (
        <SelectionPropertyPanel
          props={selectedElement}
          onClose={() => {
            clearSelection();
            // Stay in select mode so user can click another element
          }}
          onDownloadExcel={downloadElementCSV}
        />
      )}

      {/* ─── Detailed Analysis Panel (right side) ────────────────── */}
      {showInfoPanel && analysis && (
        <div
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            bottom: 12,
            width: 320,
            background: PANEL_BG,
            backdropFilter: "blur(16px)",
            borderRadius: 12,
            border: `1px solid ${PANEL_BORDER}`,
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Panel Header */}
          <div
            style={{
              padding: "14px 16px 12px",
              borderBottom: `1px solid ${PANEL_BORDER}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 700,
                  color: TEXT_PRIMARY,
                  letterSpacing: "-0.01em",
                }}
              >
                {siteName || "Structure Analysis"}
              </h3>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: 11,
                  color: TEXT_MUTED,
                }}
              >
                GLB Model Report (Material + Geometry)
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowInfoPanel(false)}
              style={{
                background: "none",
                border: "none",
                color: TEXT_MUTED,
                cursor: "pointer",
                padding: 4,
              }}
            >
              {Icons.close}
            </button>
          </div>

          {/* Tab Bar */}
          <div
            style={{ display: "flex", padding: "8px 12px 0", gap: 4 }}
          >
            {(["overview", "equipment", "categories"] as const).map(
              (tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    flex: 1,
                    padding: "7px 0",
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    background:
                      activeTab === tab
                        ? `${ACCENT}18`
                        : "transparent",
                    color:
                      activeTab === tab ? ACCENT : TEXT_MUTED,
                    border: `1px solid ${activeTab === tab ? `${ACCENT}35` : "transparent"}`,
                    borderRadius: 6,
                    cursor: "pointer",
                    transition: "all 0.15s",
                  }}
                >
                  {tab}
                </button>
              )
            )}
          </div>

          {/* Tab Content */}
          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "12px 12px 16px",
            }}
          >
            {activeTab === "overview" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <StatBadge
                  label="Structure Height"
                  value={analysis.height.toLocaleString()}
                  unit={`units (${analysis.heightAxis}-axis)`}
                  icon={Icons.height}
                  color={ACCENT}
                />
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                  }}
                >
                  <StatBadge
                    label="Triangles"
                    value={(analysis.totalTriangles / 1000).toFixed(
                      1
                    )}
                    unit="K"
                    icon={Icons.triangle}
                    color={WARNING}
                  />
                  <StatBadge
                    label="Meshes"
                    value={analysis.totalMeshes}
                    icon={Icons.mesh}
                    color={SUCCESS}
                  />
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${PANEL_BORDER}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: TEXT_MUTED,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 8,
                    }}
                  >
                    Bounding Box Dimensions
                  </div>
                  <div style={{ display: "flex", gap: 12 }}>
                    {[
                      {
                        axis: "X",
                        val: analysis.widthX,
                        color: "#ef4444",
                      },
                      {
                        axis: "Y",
                        val: analysis.widthY,
                        color: "#22c55e",
                      },
                      {
                        axis: "Z",
                        val: analysis.widthZ,
                        color: "#3b82f6",
                      },
                    ].map((d) => (
                      <div
                        key={d.axis}
                        style={{ flex: 1, textAlign: "center" }}
                      >
                        <div
                          style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: d.color,
                            marginBottom: 2,
                          }}
                        >
                          {d.axis}
                        </div>
                        <div
                          style={{
                            fontSize: 15,
                            fontWeight: 700,
                            color: TEXT_PRIMARY,
                          }}
                        >
                          {d.val.toLocaleString()}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div
                  style={{
                    padding: "12px 14px",
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${ACCENT}08, transparent)`,
                    border: `1px solid ${ACCENT}15`,
                    fontSize: 12,
                    color: TEXT_SECONDARY,
                    lineHeight: 1.6,
                  }}
                >
                  <div
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: ACCENT,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                      marginBottom: 6,
                    }}
                  >
                    Structure Summary
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 16 }}>
                    <li>
                      Height:{" "}
                      <strong style={{ color: TEXT_PRIMARY }}>
                        {analysis.height.toLocaleString()}
                      </strong>{" "}
                      units along {analysis.heightAxis}-axis
                    </li>
                    <li>
                      Equipment:{" "}
                      {totalEquip > 0 ? (
                        <>
                          <strong style={{ color: "#22d3ee" }}>
                            {analysis.equipment.Antenna}
                          </strong>{" "}
                          Antenna(s),{" "}
                          <strong style={{ color: "#f472b6" }}>
                            {analysis.equipment.RRU}
                          </strong>{" "}
                          RRU(s),{" "}
                          <strong style={{ color: "#fb923c" }}>
                            {analysis.equipment.Dish}
                          </strong>{" "}
                          Dish(es)
                        </>
                      ) : (
                        <span style={{ color: TEXT_MUTED }}>
                          No telecom equipment detected
                        </span>
                      )}
                    </li>
                    <li>
                      Complexity:{" "}
                      <strong style={{ color: TEXT_PRIMARY }}>
                        {analysis.totalMeshes}
                      </strong>{" "}
                      meshes,{" "}
                      <strong style={{ color: TEXT_PRIMARY }}>
                        {analysis.totalTriangles.toLocaleString()}
                      </strong>{" "}
                      tris across{" "}
                      <strong style={{ color: TEXT_PRIMARY }}>
                        {analysis.categories.length}
                      </strong>{" "}
                      categories
                    </li>
                    <li>
                      Top category:{" "}
                      <strong
                        style={{
                          color:
                            analysis.categories[0]?.color ||
                            TEXT_PRIMARY,
                        }}
                      >
                        {analysis.categories[0]?.name || "N/A"}
                      </strong>{" "}
                      ({analysis.categories[0]?.count || 0} elements)
                    </li>
                    <li>
                      Detection:{" "}
                      <span style={{ color: WARNING }}>
                        Material color + geometry heuristics
                      </span>
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {activeTab === "equipment" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div
                  style={{
                    padding: "10px 14px",
                    borderRadius: 10,
                    background:
                      totalEquip > 0
                        ? `${SUCCESS}10`
                        : "rgba(255,255,255,0.03)",
                    border: `1px solid ${totalEquip > 0 ? `${SUCCESS}20` : PANEL_BORDER}`,
                    fontSize: 12,
                    color: totalEquip > 0 ? SUCCESS : TEXT_MUTED,
                    textAlign: "center",
                    fontWeight: 600,
                  }}
                >
                  {totalEquip > 0
                    ? `${totalEquip} telecom equipment element(s) detected`
                    : "No telecom equipment detected"}
                </div>
                <EquipmentRow
                  label="Antennas"
                  count={analysis.equipment.Antenna}
                  icon={Icons.antenna}
                  color="#22d3ee"
                />
                <EquipmentRow
                  label="RRU / Radio Units"
                  count={analysis.equipment.RRU}
                  icon={Icons.rru}
                  color="#f472b6"
                />
                <EquipmentRow
                  label="Dishes / Microwave"
                  count={analysis.equipment.Dish}
                  icon={Icons.dish}
                  color="#fb923c"
                />
                {totalEquip > 0 && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "10px 12px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.03)",
                      border: `1px solid ${PANEL_BORDER}`,
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: TEXT_MUTED,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: 6,
                      }}
                    >
                      Detected Equipment Elements
                    </div>
                    <div style={{ maxHeight: 200, overflowY: "auto" }}>
                      {analysis.meshEntries
                        .filter((e) => e.equipmentType !== null)
                        .map((entry, i) => {
                          const color =
                            entry.equipmentType === "Antenna"
                              ? "#22d3ee"
                              : entry.equipmentType === "RRU"
                                ? "#f472b6"
                                : "#fb923c";
                          return (
                            <div
                              key={i}
                              style={{
                                fontSize: 11,
                                color: TEXT_SECONDARY,
                                padding: "4px 0",
                                borderBottom:
                                  "1px solid rgba(255,255,255,0.04)",
                                display: "flex",
                                alignItems: "center",
                                gap: 6,
                              }}
                            >
                              <span
                                style={{
                                  width: 6,
                                  height: 6,
                                  borderRadius: 3,
                                  background: color,
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  width: 14,
                                  height: 14,
                                  borderRadius: 3,
                                  background:
                                    entry.materialColor,
                                  border:
                                    "1px solid rgba(255,255,255,0.15)",
                                  flexShrink: 0,
                                }}
                              />
                              <span
                                style={{
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  flex: 1,
                                }}
                              >
                                {entry.name}
                              </span>
                              <span
                                style={{
                                  fontSize: 9,
                                  color,
                                  fontWeight: 700,
                                  textTransform: "uppercase",
                                  flexShrink: 0,
                                }}
                              >
                                {entry.equipmentType}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
                <div
                  style={{
                    marginTop: 4,
                    padding: "8px 12px",
                    borderRadius: 8,
                    background: `${WARNING}08`,
                    border: `1px solid ${WARNING}15`,
                    fontSize: 10,
                    color: TEXT_MUTED,
                    lineHeight: 1.5,
                  }}
                >
                  Detection method: material color + geometry
                  heuristics. IFC→GLB export strips semantic names
                  (all nodes are "empty_N"). For accurate detection,
                  preserve IFC entity names during GLB export.
                </div>
              </div>
            )}

            {activeTab === "categories" && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {analysis.categories.map((cat, i) => {
                  const pct =
                    analysis.totalMeshes > 0
                      ? (cat.count / analysis.totalMeshes) * 100
                      : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        padding: "10px 12px",
                        borderRadius: 8,
                        background: `${cat.color}08`,
                        border: `1px solid ${cat.color}18`,
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          marginBottom: 6,
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span
                            style={{
                              width: 10,
                              height: 10,
                              borderRadius: 3,
                              background: cat.color,
                              flexShrink: 0,
                            }}
                          />
                          <span
                            style={{
                              fontSize: 13,
                              fontWeight: 600,
                              color: TEXT_PRIMARY,
                            }}
                          >
                            {cat.name}
                          </span>
                        </div>
                        <span
                          style={{
                            fontSize: 12,
                            fontWeight: 700,
                            color: cat.color,
                          }}
                        >
                          {cat.count}
                        </span>
                      </div>
                      <div
                        style={{
                          height: 4,
                          borderRadius: 2,
                          background: "rgba(255,255,255,0.06)",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            height: "100%",
                            width: `${Math.max(pct, 2)}%`,
                            borderRadius: 2,
                            background: cat.color,
                            transition: "width 0.3s ease",
                          }}
                        />
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          marginTop: 4,
                          fontSize: 10,
                          color: TEXT_MUTED,
                        }}
                      >
                        <span>{pct.toFixed(1)}% of meshes</span>
                        <span>
                          {cat.triangles.toLocaleString()} tris
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Enhanced Toolbar Button ──────────────────────────────────────────────────
function ToolbarButton({
  icon,
  active,
  title,
  onClick,
  accentColor,
  pulse,
}: {
  icon: React.ReactNode;
  active: boolean;
  title: string;
  onClick: () => void;
  accentColor?: string;
  pulse?: boolean;
}) {
  const color = accentColor || ACCENT;
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 38,
        height: 38,
        padding: 0,
        border: `1px solid ${active ? `${color}50` : PANEL_BORDER}`,
        borderRadius: 8,
        background: active ? `${color}25` : PANEL_BG,
        backdropFilter: "blur(12px)",
        color: active ? color : TEXT_SECONDARY,
        cursor: "pointer",
        transition: "all 0.15s",
        position: "relative",
        boxShadow: active ? `0 0 12px ${color}30` : "none",
      }}
    >
      {icon}
      {pulse && (
        <span
          style={{
            position: "absolute",
            top: -2,
            right: -2,
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: color,
            animation: "tbPulse 1.5s ease-in-out infinite",
          }}
        />
      )}
      <style>{`@keyframes tbPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.5; transform:scale(1.3); } }`}</style>
    </button>
  );
}

export default GlbViewer;