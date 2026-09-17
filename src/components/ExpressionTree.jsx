import { hierarchy, tree } from 'd3';
import { useMemo } from 'react';
import { nodeLabel } from '../engine/parser';

export default function ExpressionTree({ ast, selectedNodeId, onSelect }) {
  const layout = useMemo(() => {
    if (!ast) return null;
    const root = hierarchy(ast, (node) => node.child ? [node.child] : node.left ? [node.left, node.right] : []);
    tree().nodeSize([132, 96])(root);
    const nodes = root.descendants();
    const xValues = nodes.map((node) => node.x);
    return {
      nodes,
      links: root.links(),
      width: Math.max(360, Math.max(...xValues) - Math.min(...xValues) + 180),
      height: (root.height + 1) * 96 + 38,
      xOffset: 90 - Math.min(...xValues)
    };
  }, [ast]);
  if (!ast) return <div className="empty-state tree-empty">Run a valid expression to draw its operation tree.</div>;

  return <div className="tree-wrap" aria-label="Expression tree">
    <svg className="tree-svg" viewBox={`0 0 ${layout.width} ${layout.height}`} role="tree" aria-label="Interactive expression tree">
      {layout.links.map((link) => <path key={link.target.data.id} className="tree-link" d={`M${link.source.x + layout.xOffset},${link.source.y + 30} V${link.target.y - 18} H${link.target.x + layout.xOffset}`} />)}
      {layout.nodes.map((node) => {
        const active = node.data.id === selectedNodeId;
        const relation = node.data.type === 'relation';
        const label = nodeLabel(node.data);
        return <g key={node.data.id} className={`svg-tree-node ${active ? 'selected' : ''} ${relation ? 'relation' : ''}`} transform={`translate(${node.x + layout.xOffset}, ${node.y + 18})`} role="treeitem" tabIndex="0" aria-label={`Inspect ${label}`} onClick={() => onSelect(node.data.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') onSelect(node.data.id); }}>
          <rect x="-57" y="-18" width="114" height="42" rx="8" />
          <text className="svg-node-type" x="0" y="-5">{relation ? 'RELATION' : node.data.type.toUpperCase()}</text>
          <text className="svg-node-label" x="0" y="11">{label.length > 18 ? `${label.slice(0, 17)}…` : label}</text>
        </g>;
      })}
    </svg>
  </div>;
}
