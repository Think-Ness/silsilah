// ============================================================
// ELK.js Auto Layout untuk Genealogy Canvas
// ============================================================

import type { Node, Edge } from "@xyflow/react";

interface ElkNode {
  id: string;
  width?: number;
  height?: number;
  children?: ElkNode[];
}

interface ElkEdge {
  id: string;
  sources: string[];
  targets: string[];
}

interface ElkGraph {
  id: string;
  layoutOptions?: Record<string, string>;
  children: ElkNode[];
  edges: ElkEdge[];
}

/** Jalankan ELK auto-layout */
export async function runElkLayout(
  nodes: Node[],
  edges: Edge[]
): Promise<Node[]> {
  // ELK hanya tersedia di browser
  if (typeof window === "undefined") return nodes;

  try {
    // Dynamic import karena ELK besar
    const ELK = (await import("elkjs/lib/elk.bundled.js")).default;
    const elk = new ELK();

    const elkNodes: ElkNode[] = nodes.map((n) => ({
      id: n.id,
      width: (n.width as number) || 240,
      height: (n.height as number) || 120,
    }));

    const elkEdges: ElkEdge[] = edges.map((e) => ({
      id: e.id,
      sources: [e.source],
      targets: [e.target],
    }));

    const elkGraph: ElkGraph = {
      id: "root",
      layoutOptions: {
        "elk.algorithm": "layered",
        "elk.direction": "DOWN",
        "elk.spacing.nodeNode": "60",
        "elk.layered.spacing.nodeNodeBetweenLayers": "80",
        "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
        "elk.layered.thoroughness": "10",
        "elk.separateConnectedComponents": "false",
      },
      children: elkNodes,
      edges: elkEdges,
    };

    const layout = await elk.layout(elkGraph);

    // Kembalikan nodes dengan posisi baru
    return nodes.map((node) => {
      const layoutNode = layout.children?.find((n) => n.id === node.id);
      if (layoutNode?.x != null && layoutNode?.y != null) {
        return {
          ...node,
          position: {
            x: layoutNode.x,
            y: layoutNode.y,
          },
        };
      }
      return node;
    });
  } catch (err) {
    console.error("ELK layout error:", err);
    return nodes; // fallback ke posisi yang ada
  }
}
