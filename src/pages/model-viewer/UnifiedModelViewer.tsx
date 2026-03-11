/**
 * Unified 3D model viewer for GLB, BOS, and IFC.
 * Resolves and displays models from AWS, Supabase, and OneDrive.
 */

import React, { lazy, Suspense, useState, useEffect } from "react";
import type { ModelType } from "@/lib/model-source";
import type { BosEntityMesh } from "@/components/bos/Bos3DViewerTypes";
import { GlbViewer } from "./GlbViewer";

const Bos3DViewer = lazy(() =>
  import("@/components/bos/Bos3DViewer").then((m) => ({ default: m.default }))
);
const SimpleIFCViewer = lazy(() =>
  import("@/components/Flinker/SimpleIFCViewer").then((m) => ({ default: m.default }))
);

export interface UnifiedModelViewerProps {
  /** Resolved fetchable URL for the model */
  url: string | null;
  /** Model type (glb | bos | ifc) */
  modelType: ModelType;
  /** Optional display name (e.g. site name) */
  siteName?: string;
  /** Container height (number or CSS string) */
  height?: number | string;
  /** Container width (for fixed-width layouts) */
  width?: number;
  /** BOS only: pre-loaded meshes from DuckDB (when set, viewer may skip ZIP load) */
  bosMeshes?: BosEntityMesh[] | null;
  /** BOS only: pre-loaded point cloud when no meshes */
  bosPoints?: { x: number; y: number; z: number }[] | null;
  /** BOS only: parquet table names for UI */
  bosParquetTables?: string[] | null;
  /** BOS only: entity selection callback */
  onEntitySelect?: (entityId: number | null, entityName?: string) => void;
  /** Show loading placeholder while URL is resolving or component is loading */
  loading?: boolean;
}

const defaultHeight = 600;

/** Loading overlay with spinner shown while the 3D model is loading */
function ModelLoadingOverlay({
  width,
  height,
  siteName,
}: { width: number; height: number; siteName?: string }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(245, 245, 240, 0.95)",
        borderRadius: 12,
        color: "#64748b",
        fontSize: 14,
        zIndex: 10,
      }}
    >
      <div
        style={{
          width: 48,
          height: 48,
          border: "3px solidrgb(255, 255, 255)",
          borderTopColor: "#3b82f6",
          borderRadius: "50%",
          animation: "unified-viewer-spin 0.9s linear infinite",
        }}
      />
      <p style={{ marginTop: 16, fontWeight: 500 }}>Loading model…</p>
      {siteName && <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{siteName}</p>}
      <style>{`@keyframes unified-viewer-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

export function UnifiedModelViewer({
  url,
  modelType,
  siteName,
  height = defaultHeight,
  width,
  bosMeshes,
  bosPoints,
  bosParquetTables,
  onEntitySelect,
  loading = false,
}: UnifiedModelViewerProps) {
  const h = typeof height === "number" ? height : defaultHeight;
  const w = width ?? (typeof height === "number" ? height * (4 / 3) : 800);

  const [modelLoaded, setModelLoaded] = useState(false);
  useEffect(() => {
    if (url && modelType) setModelLoaded(false);
  }, [url, modelType]);

  const handleLoaded = () => setModelLoaded(true);

  if (loading) {
    return (
      <div
        style={{
          width: w,
          height: h,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f0",
          borderRadius: 12,
          color: "#64748b",
          fontSize: 14,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            border: "3px solidrgb(255, 255, 255)",
            borderTopColor: "#3b82f6",
            borderRadius: "50%",
            animation: "unified-viewer-spin 0.9s linear infinite",
          }}
        />
        <p style={{ marginTop: 16, fontWeight: 500 }}>Resolving model…</p>
        {siteName && <p style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{siteName}</p>}
        <style>{`@keyframes unified-viewer-spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!url) {
    return (
      <div
        style={{
          width: w,
          height: h,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#f5f5f0",
          borderRadius: 12,
        }}
      >
        <p style={{ color: "#64748b", fontSize: 14 }}>
          No model URL available. Upload a GLB, BOS, or IFC file for this site.
        </p>
      </div>
    );
  }

  if (modelType === "glb") {
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        {!modelLoaded && <ModelLoadingOverlay width={w} height={h} siteName={siteName} />}
        <GlbViewer
          url={url}
          siteName={siteName}
          width={w}
          height={h}
          backgroundColor="#f5f5f0"
          onLoaded={handleLoaded}
        />
      </div>
    );
  }

  if (modelType === "bos") {
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        {!modelLoaded && <ModelLoadingOverlay width={w} height={h} siteName={siteName} />}
        <Suspense
          fallback={
            <div
              style={{
                width: w,
                height: h,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f5f5f0",
                borderRadius: 12,
                color: "#64748b",
              }}
            >
              Loading BOS viewer…
            </div>
          }
        >
          <Bos3DViewer
            bosUrl={url}
            bosSource={(!bosMeshes || bosMeshes.length === 0) ? url : undefined}
            siteName={siteName}
            width={w}
            height={h}
            meshes={bosMeshes ?? null}
            points={bosPoints ?? null}
            parquetTables={bosParquetTables ?? null}
            onEntitySelect={onEntitySelect}
            onLoaded={handleLoaded}
            backgroundColor="#f5f5f0"
            explodePerEntity={true}
          />
        </Suspense>
      </div>
    );
  }

  if (modelType === "ifc") {
    return (
      <div style={{ position: "relative", width: w, height: h }}>
        {!modelLoaded && <ModelLoadingOverlay width={w} height={h} siteName={siteName} />}
        <Suspense
          fallback={
            <div
              style={{
                width: w,
                height: h,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#0f172a",
                borderRadius: 12,
                color: "#94a3b8",
              }}
            >
              Loading IFC viewer…
            </div>
          }
        >
          <div style={{ width: w, height: h, borderRadius: 12, overflow: "hidden" }}>
            <SimpleIFCViewer ifcUrl={url} onLoaded={handleLoaded} />
          </div>
        </Suspense>
      </div>
    );
  }

  return (
    <div
      style={{
        width: w,
        height: h,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#1e293b",
        borderRadius: 12,
      }}
    >
      <p style={{ color: "#94a3b8", fontSize: 14 }}>Unsupported model type.</p>
    </div>
  );
}

export default UnifiedModelViewer;
