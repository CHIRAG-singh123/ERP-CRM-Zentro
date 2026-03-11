
Here's how the model-viewer displays `.glb` files.

---

## How `.glb` files are displayed

### 1. **Entry point: `UnifiedModelViewer`**

When `modelType === "glb"`, `UnifiedModelViewer` renders `GlbViewer` with the resolved model URL and size:

```157:170:src/components/model-viewer/UnifiedModelViewer.tsx
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
```

So GLB display is delegated entirely to `GlbViewer`.

---

### 2. **Three.js stack in `GlbViewer`**

`GlbViewer` uses **Three.js** and its GLTF loader:

- **`THREE.WebGLRenderer`** – draws the 3D scene into a canvas
- **`THREE.Scene`** – holds the model and lights
- **`THREE.PerspectiveCamera`** – 50° FOV, near 0.1, far 10000
- **`OrbitControls`** – orbit/pan/zoom
- **`GLTFLoader`** – loads the `.glb` (binary glTF) from the `url`

So the pipeline is: **URL → GLTFLoader → glTF scene → Three.js scene → WebGL canvas**.

---

### 3. **Scene setup (in a `useEffect` when `url` is set)**

Rough flow:

1. **Renderer**  
   - `THREE.WebGLRenderer` with antialias, SRGB output, ACES tone mapping.  
   - Canvas is appended to a container ref; container is cleared first (`container.innerHTML = ""` then `appendChild(renderer.domElement)`).

2. **Scene**  
   - `THREE.Scene` with background color.

3. **Camera**  
   - `PerspectiveCamera(50, width/height, 0.1, 10000)`, initial position `(20, 20, 20)`.

4. **Controls**  
   - `OrbitControls(camera, renderer.domElement)` with damping, min/max distance.

5. **Lights**  
   - Ambient, hemisphere, and two directional lights.

6. **Animation loop**  
   - `requestAnimationFrame` loop that calls `controls.update()` and `renderer.render(scene, camera)`.

So the “display” is a continuously updated WebGL render of this scene.

---

### 4. **Loading the `.glb`**

The actual GLB loading is done with **`GLTFLoader`**:

```1972:1978:src/components/model-viewer/GlbViewer.tsx
    const loader = new GLTFLoader();
    loader.load(
      url,
      (gltf) => {
        if (disposed) return;
        const model = gltf.scene;
        scene.add(model);
        modelRef.current = model;
```

- **Input:** `url` (string) – the GLB URL passed from `UnifiedModelViewer`.
- **Output:** `gltf.scene` is the root `THREE.Group`/scene of the glTF asset.
- **Usage:** That root is added to the Three.js `scene` and stored in `modelRef` for later use (analysis, explode, selection, etc.).

So “how it displays” the file is: **fetch and parse the binary glTF with `GLTFLoader`, take its scene graph, add it to the Three.js scene, and render that scene every frame**.

---

### 5. **Framing and centering**

After load, the code:

- Builds a bounding box from the model: `new THREE.Box3().setFromObject(model)`.
- Gets the center and subtracts it from `model.position` so the model is centered at the origin.
- Computes a distance from the box size and camera FOV and sets `camera.position` and `controls.target` so the model is framed in view.

So the .glb is both centered in the scene and auto-framed in the camera.

---

### 6. **Rendering to the user**

- The **canvas** is `renderer.domElement` (a `<canvas>`) inside the container div.
- The **animation loop** keeps calling `renderer.render(scene, camera)` and `controls.update()`, so the user sees the 3D model with orbit/pan/zoom.
- **Resize:** A `ResizeObserver` on the container updates `camera.aspect`, `camera.updateProjectionMatrix()`, and `renderer.setSize()` so the same .glb stays correctly framed when the container size changes.

---

### Summary

| Step | What happens |
|------|----------------|
| **Routing** | `UnifiedModelViewer` sees `modelType === "glb"` and renders `GlbViewer` with `url`, `width`, `height`. |
| **Engine** | Three.js: `WebGLRenderer`, `Scene`, `PerspectiveCamera`, `OrbitControls`. |
| **Load** | `GLTFLoader.load(url)` fetches and parses the .glb; `gltf.scene` is added to the Three.js scene. |
| **Display** | The scene (model + lights) is rendered every frame to the canvas; controls handle interaction. |
| **Layout** | Model is centered, camera is auto-framed from the bounding box, and a resize observer keeps aspect and size in sync. |

So: **.glb files are displayed by loading them with Three.js’s `GLTFLoader` into a WebGL-rendered Three.js scene, with orbit controls and automatic framing.**

Below is code of Glb viewing function:
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
      alpha: false,
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    const bgColor = new THREE.Color(backgroundColor);
    renderer.setClearColor(bgColor, 1);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.innerHTML = "";
    container.appendChild(renderer.domElement);
    renderer.domElement.style.backgroundColor = backgroundColor;

    const scene = new THREE.Scene();
    scene.background = bgColor;

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

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.4));
    scene.add(new THREE.HemisphereLight(0x4a9eff, 0x1a0a2e, 0.3));
    const dirLight = new THREE.DirectionalLight(0xfff5e8, 1.0);
    dirLight.position.set(200, 400, 300);
    dirLight.castShadow = false;
    scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x4a9eff, 0.3);
    fillLight.position.set(-100, 200, -200);
    scene.add(fillLight);

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

  return (
    <div
      style={{
        position: "relative",
        width,
        height,
        borderRadius: 14,
        overflow: "hidden",
        border: `1px solid ${PANEL_BORDER}`,
        background: backgroundColor,
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
          background: backgroundColor,
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
            background: "rgba(15, 17, 23, 0.85)",
            backdropFilter: "blur(8px)",
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