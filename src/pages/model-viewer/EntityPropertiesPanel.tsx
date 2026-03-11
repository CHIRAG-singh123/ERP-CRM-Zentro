/**
 * Optional panel that shows DuckDB entity properties (parameters) for the selected BOS entity.
 * Ara3D BimOpenSchema Browser–style property extraction.
 */

import React, { useEffect, useState } from "react";
import { executeQuery } from "@/lib/duckdb";
import { X } from "lucide-react";

export interface EntityPropertiesPanelProps {
  entityId: number;
  entityName?: string;
  onClose?: () => void;
  /** Max height for the table (default 200px) */
  maxHeight?: number;
}

export function EntityPropertiesPanel({
  entityId,
  entityName,
  onClose,
  maxHeight = 200,
}: EntityPropertiesPanelProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setRows([]);

    const sql = `SELECT parameter_name, parameter_value FROM parameters_view WHERE entity_id = ${Number(entityId)} ORDER BY parameter_name`;
    executeQuery(sql)
      .then((result) => {
        if (!cancelled) {
          setRows(result.rows);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err?.message ?? "Failed to load parameters");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [entityId]);

  return (
    <div
      style={{
        marginTop: 8,
        padding: 12,
        background: "rgba(15, 23, 42, 0.6)",
        borderRadius: 8,
        border: "1px solid #334155",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8" }}>
          Properties {entityName != null ? `· ${entityName}` : ""} (ID: {entityId})
        </span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 4,
              color: "#64748b",
            }}
          >
            <X size={14} />
          </button>
        )}
      </div>
      {loading && <p style={{ fontSize: 11, color: "#64748b" }}>Loading parameters…</p>}
      {error && <p style={{ fontSize: 11, color: "#ef4444" }}>{error}</p>}
      {!loading && !error && rows.length === 0 && (
        <p style={{ fontSize: 11, color: "#64748b" }}>No parameters for this entity.</p>
      )}
      {!loading && !error && rows.length > 0 && (
        <div
          style={{
            maxHeight,
            overflow: "auto",
            fontSize: 11,
            fontFamily: "monospace",
          }}
        >
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #334155" }}>
                <th style={{ textAlign: "left", padding: "4px 8px", color: "#94a3b8" }}>Parameter</th>
                <th style={{ textAlign: "left", padding: "4px 8px", color: "#94a3b8" }}>Value</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i} style={{ borderBottom: "1px solid #1e293b" }}>
                  <td style={{ padding: "4px 8px", color: "#cbd5e1" }}>
                    {String((row as Record<string, unknown>).parameter_name ?? "")}
                  </td>
                  <td style={{ padding: "4px 8px", color: "#e2e8f0" }}>
                    {String((row as Record<string, unknown>).parameter_value ?? "")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
