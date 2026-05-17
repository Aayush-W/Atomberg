import { useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  MarkerType,
  Node,
  Edge,
  NodeProps,
  useEdgesState,
  useNodesState
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { goalsService } from '@/services/services';
import { PageHeader, Spinner, StatusBadge } from '@/components/common';
import type { GoalTreeLink, GoalTreeNode } from '@/types';

const EDGE_COLORS: Record<GoalTreeLink['type'], string> = {
  org: '#64748b',
  ownership: '#38bdf8',
  shared: '#8b5cf6',
  dependency: '#f59e0b'
};

function GoalTreeCard({ data }: NodeProps<GoalTreeNode>) {
  if (data.kind === 'user') {
    return (
      <div className="min-w-[220px] rounded-2xl border border-surface-700 bg-surface-900/95 px-4 py-3 shadow-xl">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">Org Node</p>
        <p className="mt-1 text-sm font-bold text-white">{data.title}</p>
        <p className="text-xs text-slate-400">{data.subtitle}</p>
      </div>
    );
  }

  return (
    <div className={`min-w-[240px] rounded-2xl border bg-surface-950/95 px-4 py-3 shadow-xl ${data.isShared ? 'border-purple-500/70' : 'border-surface-700'}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{data.ownerName}</p>
          <p className="mt-1 text-sm font-bold text-white">{data.title}</p>
          <p className="text-xs text-slate-400">{data.subtitle}</p>
        </div>
        {data.isShared ? <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-semibold text-purple-300">Shared</span> : null}
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-1.5 flex-1 rounded-full bg-surface-700">
          <div
            className={`h-full rounded-full ${data.progressScore >= 80 ? 'bg-success-400' : data.progressScore >= 50 ? 'bg-warning-400' : 'bg-danger-400'}`}
            style={{ width: `${Math.min(data.progressScore, 100)}%` }}
          />
        </div>
        <span className="text-xs font-bold text-slate-300">{data.progressScore.toFixed(0)}%</span>
      </div>
      <div className="mt-3">
        <StatusBadge status={data.status} />
      </div>
    </div>
  );
}

const nodeTypes = { goalTreeCard: GoalTreeCard };

function buildDepthMap(nodes: GoalTreeNode[], edges: GoalTreeLink[]) {
  const incoming = new Map<string, number>();
  const outgoing = new Map<string, string[]>();
  nodes.forEach((node) => incoming.set(node.id, 0));

  edges.forEach((edge) => {
    incoming.set(edge.target, (incoming.get(edge.target) ?? 0) + 1);
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge.target]);
  });

  const queue = nodes.filter((node) => (incoming.get(node.id) ?? 0) === 0).map((node) => node.id);
  const depth = new Map<string, number>(queue.map((id) => [id, 0]));

  while (queue.length) {
    const current = queue.shift()!;
    const nextDepth = (depth.get(current) ?? 0) + 1;
    for (const target of outgoing.get(current) ?? []) {
      const prior = depth.get(target);
      if (prior == null || prior < nextDepth) {
        depth.set(target, nextDepth);
      }
      incoming.set(target, (incoming.get(target) ?? 1) - 1);
      if ((incoming.get(target) ?? 0) <= 0) {
        queue.push(target);
      }
    }
  }

  nodes.forEach((node) => {
    if (!depth.has(node.id)) depth.set(node.id, 0);
  });

  return depth;
}

export default function DependencyGraphPage() {
  const { data, isLoading } = useQuery({ queryKey: ['dependency-graph'], queryFn: goalsService.getDependencyGraph });
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<GoalTreeNode | null>(null);
  const [filter, setFilter] = useState<'all' | GoalTreeLink['type']>('all');

  const filteredLinks = useMemo(() => {
    const links = (data?.links ?? []) as GoalTreeLink[];
    return filter === 'all' ? links : links.filter((link) => link.type === filter);
  }, [data?.links, filter]);

  useEffect(() => {
    const treeNodes = (data?.nodes ?? []) as GoalTreeNode[];
    if (!treeNodes.length) return;

    const depth = buildDepthMap(treeNodes, filteredLinks);
    const grouped = new Map<number, GoalTreeNode[]>();
    treeNodes.forEach((node) => {
      const level = depth.get(node.id) ?? 0;
      grouped.set(level, [...(grouped.get(level) ?? []), node]);
    });

    const flowNodes: Node[] = [];
    [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([level, group]) => {
        group.forEach((node, index) => {
          flowNodes.push({
            id: node.id,
            type: 'goalTreeCard',
            position: { x: level * 320, y: index * 180 },
            data: node
          });
        });
      });

    const flowEdges: Edge[] = filteredLinks.map((link) => ({
      id: link.id,
      source: link.source,
      target: link.target,
      label: link.type === 'org' ? 'org' : link.type === 'ownership' ? 'owns' : link.type === 'shared' ? 'aligns' : 'depends on',
      labelStyle: { fill: '#cbd5e1', fontSize: 11 },
      animated: link.type !== 'org',
      style: { stroke: EDGE_COLORS[link.type], strokeWidth: link.type === 'dependency' ? 2.5 : 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: EDGE_COLORS[link.type]
      }
    }));

    setNodes(flowNodes);
    setEdges(flowEdges);
  }, [data?.nodes, filteredLinks, setEdges, setNodes]);

  const stats = useMemo(() => {
    const treeNodes = (data?.nodes ?? []) as GoalTreeNode[];
    return {
      users: treeNodes.filter((node) => node.kind === 'user').length,
      goals: treeNodes.filter((node) => node.kind === 'goal').length,
      shared: treeNodes.filter((node) => node.kind === 'goal' && node.isShared).length,
      dependencies: ((data?.links ?? []) as GoalTreeLink[]).filter((link) => link.type === 'dependency').length
    };
  }, [data]);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><Spinner size={32} /></div>;
  }

  return (
    <div className="space-y-4 animate-fade-in">
      <PageHeader title="Goal Tree Visualizer" subtitle="Trace work from individual execution up through shared goals and org ownership" />

      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        <div className="card p-4"><p className="text-xs text-slate-400">People Nodes</p><p className="text-2xl font-display font-bold text-white">{stats.users}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-400">Goal Nodes</p><p className="text-2xl font-display font-bold text-white">{stats.goals}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-400">Shared Goal Links</p><p className="text-2xl font-display font-bold text-purple-300">{stats.shared}</p></div>
        <div className="card p-4"><p className="text-xs text-slate-400">Dependency Links</p><p className="text-2xl font-display font-bold text-warning-300">{stats.dependencies}</p></div>
      </div>

      <div className="card flex flex-wrap items-center gap-2 p-4">
        {(['all', 'org', 'ownership', 'shared', 'dependency'] as const).map((value) => (
          <button
            key={value}
            onClick={() => setFilter(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${filter === value ? 'bg-brand-600 text-white' : 'bg-surface-800 text-slate-300 hover:bg-surface-700'}`}
          >
            {value === 'all' ? 'All links' : value}
          </button>
        ))}
        <div className="ml-auto flex flex-wrap items-center gap-3 text-xs text-slate-400">
          {Object.entries(EDGE_COLORS).map(([type, color]) => (
            <div key={type} className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
              <span>{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-3xl border border-surface-800 bg-surface-950" style={{ height: 'calc(100vh - 250px)' }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeClick={(_, node) => setSelected(node.data as GoalTreeNode)}
          fitView
          className="bg-surface-950"
        >
          <Background color="#334155" gap={20} />
          <Controls className="!rounded-xl !border-surface-700 !bg-surface-900" />
          <MiniMap
            nodeColor={(node) => ((node.data as GoalTreeNode).kind === 'user' ? '#38bdf8' : '#8b5cf6')}
            className="!rounded-xl !border-surface-700 !bg-surface-900"
          />
        </ReactFlow>

        {selected ? (
          <div className="absolute right-0 top-0 h-full w-80 overflow-y-auto border-l border-surface-800 bg-surface-900/95 p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-white">Selected Node</h3>
              <button onClick={() => setSelected(null)} className="text-xl text-slate-400 hover:text-white">×</button>
            </div>
            <p className="mt-4 text-xs uppercase tracking-[0.2em] text-slate-400">{selected.kind}</p>
            <p className="mt-1 text-lg font-bold text-white">{selected.title}</p>
            <p className="text-sm text-slate-400">{selected.subtitle}</p>
            {selected.kind === 'goal' ? (
              <>
                <div className="mt-4"><StatusBadge status={selected.status} /></div>
                <div className="mt-4 rounded-2xl bg-surface-800 p-4">
                  <p className="text-xs text-slate-400">Current Progress</p>
                  <p className="mt-1 text-3xl font-display font-bold text-white">{selected.progressScore.toFixed(0)}%</p>
                </div>
                <div className="mt-4 space-y-2 text-sm text-slate-300">
                  <p>Owner: {selected.ownerName}</p>
                  <p>Shared Alignment: {selected.isShared ? 'Yes' : 'No'}</p>
                  <p>Parent Goal: {selected.parentGoalId ? 'Linked' : 'None'}</p>
                </div>
              </>
            ) : (
              <div className="mt-4 rounded-2xl bg-surface-800 p-4 text-sm text-slate-300">
                This node represents the org hierarchy layer that the goal tree rolls up through.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
