import ReactFlow, { Background, Controls, MiniMap, useNodesState, useEdgesState, addEdge, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';
import { useQuery } from '@tanstack/react-query';
import { goalsService } from '@/services/services';
import { useEffect, useState } from 'react';
import { PageHeader, Spinner, StatusBadge } from '@/components/common';
import type { Goal } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: '#64748b', SUBMITTED: '#3b82f6', APPROVED: '#22c55e', REJECTED: '#ef4444', LOCKED: '#8b5cf6',
};

function GoalNode({ data }: { data: Goal & { progressScore: number } }) {
  return (
    <div className={`bg-surface-900 border-2 rounded-xl p-3 shadow-xl min-w-[200px] ${data.isShared ? 'border-dashed border-purple-500' : 'border-surface-700'}`}
      style={{ borderColor: STATUS_COLORS[data.status] }}>
      {data.isShared && <span className="badge bg-purple-900/50 text-purple-300 mb-2">Shared</span>}
      <p className="text-xs font-semibold text-slate-300 truncate max-w-[180px]">{data.user?.name}</p>
      <p className="text-sm font-bold text-white mt-0.5 truncate max-w-[180px]">{data.title}</p>
      <div className="flex items-center gap-2 mt-2">
        <div className="flex-1 h-1.5 rounded-full bg-surface-700">
          <div className="h-full rounded-full" style={{ width: `${Math.min(data.progressScore, 100)}%`, background: data.progressScore >= 80 ? '#22c55e' : data.progressScore >= 60 ? '#f59e0b' : '#ef4444' }}/>
        </div>
        <span className="text-xs font-bold text-slate-300">{data.progressScore.toFixed(0)}%</span>
      </div>
      <div className="mt-1.5">
        <StatusBadge status={data.status}/>
      </div>
    </div>
  );
}

const nodeTypes = { goalNode: GoalNode };

export default function DependencyGraphPage() {
  const { data: graphData, isLoading } = useQuery({ queryKey: ['dependency-graph'], queryFn: goalsService.getDependencyGraph });
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [selected, setSelected] = useState<Goal | null>(null);

  useEffect(() => {
    if (!graphData || !graphData.goals) return;
    const { goals = [], dependencies = [] } = graphData as { 
      goals: (Goal & { progressScore: number })[]; 
      dependencies: any[] 
    };

    const cols = 4;
    const newNodes: Node[] = goals.map((g, i) => ({
      id: g.id,
      type: 'goalNode',
      position: { x: (i % cols) * 280, y: Math.floor(i / cols) * 200 },
      data: { ...g, progressScore: g.progressScore ?? 0 },
    }));

    const newEdges: Edge[] = dependencies.map((d: any) => ({
      id: `${d.requiredGoalId}-${d.dependentGoalId}`,
      source: d.requiredGoalId,
      target: d.dependentGoalId,
      animated: true,
      style: { stroke: '#5b6ef3', strokeWidth: 2 },
      markerEnd: { type: 'arrowclosed' as any, color: '#5b6ef3' },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [graphData]);

  if (isLoading) return <div className="flex items-center justify-center h-64"><Spinner size={32}/></div>;

  return (
    <div className="space-y-4 animate-fade-in h-full">
      <PageHeader title="Goal Dependency Graph" subtitle="Visualize inter-goal dependencies across the team"/>
      <div className="card p-0 overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <ReactFlow
          nodes={nodes} edges={edges}
          onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={(_, node) => setSelected(node.data as Goal)}
          fitView
          className="dark:bg-surface-950"
        >
          <Background color="#334155" gap={16}/>
          <Controls className="!bg-surface-800 !border-surface-700 !rounded-xl"/>
          <MiniMap nodeColor={(n) => STATUS_COLORS[(n.data as any).status] ?? '#64748b'} className="!bg-surface-900 !border-surface-700 !rounded-xl"/>
        </ReactFlow>

        {/* Side panel */}
        {selected && (
          <div className="absolute top-0 right-0 h-full w-72 bg-surface-900 border-l border-surface-700 p-5 animate-slide-in overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-white">Goal Detail</h3>
              <button onClick={() => setSelected(null)} className="text-slate-400 hover:text-white text-lg">×</button>
            </div>
            <StatusBadge status={selected.status}/>
            <p className="font-bold text-white mt-2 mb-1">{selected.title}</p>
            <p className="text-xs text-slate-400 mb-3">{selected.user?.name} · {selected.thrustArea}</p>
            <p className="text-sm text-slate-300 leading-relaxed">{selected.description}</p>
            {selected.checkIns && selected.checkIns.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-2">Check-in History</p>
                {selected.checkIns.map((ci) => (
                  <div key={ci.id} className="mb-2 p-2 rounded-lg bg-surface-800 text-xs">
                    <div className="flex items-center justify-between">
                      <StatusBadge status={ci.quarter}/> <span className="font-bold text-brand-400">{ci.progressScore.toFixed(0)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
