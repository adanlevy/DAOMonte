import React, { useState, useMemo } from "react";
import { useGroupDAO } from "./GroupDAOContext";
import { Shield, ThumbsUp, ThumbsDown, CircleSlash, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import Card from "./components/Card";
import Skeleton from "./components/Skeleton";

// Función nowSec definida localmente
const nowSec = () => Math.floor(Date.now() / 1000);

export default function ProposalList() {
  const {
    contract,
    demo,
    myGroupIds,
    proposals,
    groups,
    demoGroups,
    groupMembersCache,
    setGroupMembersCache,
    run,
    isBusy,
    fetchAll,
    demoProposals,
    withGas,
    loadingProposals, // Añadido aquí
  } = useGroupDAO();

  const [activeFilter, setActiveFilter] = useState("");
  const [closedFilter, setClosedFilter] = useState("");
  const [breakdownOpen, setBreakdownOpen] = useState({});
  const [breakdownData, setBreakdownData] = useState({});
  const [breakdownLoading, setBreakdownLoading] = useState({});

  const myProposals = useMemo(() => {
    const m = new Map();
    for (const p of proposals) {
      const ids = p.groupIds || [p.groupId];
      if (ids.some(id => myGroupIds.includes(id))) m.set(p.id, p);
    }
    return Array.from(m.values()).sort((a, b) => b.id - a.id);
  }, [proposals, myGroupIds]);

  const activeProposals = useMemo(() => {
    return myProposals.filter(p => nowSec() <= p.endTime && p.title.toLowerCase().includes(activeFilter.toLowerCase()));
  }, [myProposals, activeFilter]);

  const closedProposals = useMemo(() => {
    return myProposals.filter(p => nowSec() > p.endTime && p.title.toLowerCase().includes(closedFilter.toLowerCase()));
  }, [myProposals, closedFilter]);

  const loadBreakdown = async (p) => {
    const pid = p.id;
    const newOpen = !breakdownOpen[pid];
    setBreakdownOpen((s) => ({ ...s, [pid]: newOpen }));
    if (!newOpen || breakdownData[pid] || demo) return;
    setBreakdownLoading((s) => ({ ...s, [pid]: true }));
    try {
      let members = groupMembersCache[p.groupId];
      if (!members) {
        const list = await (contract.getGroupMembersSlice
          ? contract.getGroupMembersSlice(p.groupId, 0, 2000)
          : contract.getGroupMembers(p.groupId));
        members = list;
        setGroupMembersCache(prev => ({ ...prev, [p.groupId]: list }));
      }
      const up = [], down = [], none = [];
      for (const addr of members) {
        let v = 0;
        try { v = Number(await contract.getUserVote(p.id, addr)); } catch {
          // intentionally ignore errors
        }
        if (v === 1) up.push(addr);
        else if (v === 2) down.push(addr);
        else none.push(addr);
      }
      setBreakdownData((s) => ({ ...s, [pid]: { up, down, none } }));
    } finally {
      setBreakdownLoading((s) => ({ ...s, [pid]: false }));
    }
  };

  const refreshBreakdown = async (p) => {
    const pid = p.id;
    if (!breakdownOpen[pid] || demo) return;
    setBreakdownLoading((s) => ({ ...s, [pid]: true }));
    try {
      let members = groupMembersCache[p.groupId];
      if (!members) {
        const list = await (contract.getGroupMembersSlice
          ? contract.getGroupMembersSlice(p.groupId, 0, 2000)
          : contract.getGroupMembers(p.groupId));
        members = list;
        setGroupMembersCache(prev => ({ ...prev, [p.groupId]: list }));
      }
      const up = [], down = [], none = [];
      for (const addr of members) {
        let v = 0;
        try { v = Number(await contract.getUserVote(p.id, addr)); } catch {
          // intentionally ignore errors
        }
        if (v === 1) up.push(addr);
        else if (v === 2) down.push(addr);
        else none.push(addr);
      }
      setBreakdownData((s) => ({ ...s, [pid]: { up, down, none } }));
    } finally {
      setBreakdownLoading((s) => ({ ...s, [pid]: false }));
    }
  };

  const actionVote = async (p, choice) => {
    const pid = p.id;
    if (demo) return;
    await run(`vote:${pid}`, async () => {
      const tx = await withGas(
        contract.vote.estimateGas(pid, choice),
        (opts) => contract.vote(pid, choice, opts)
      );
      await tx.wait();
      await fetchAll();
      await refreshBreakdown(p);
    });
  };


  const actionRetractVote = async (p) => {
    const pid = p.id;
    if (demo) return;
    await run(`retract:${pid}`, async () => {
      let tx;
      try {
        tx = await withGas(
          contract.retractVote.estimateGas(pid),
          (opts) => contract.retractVote(pid, opts)
        );
      } catch {
        tx = await withGas(
          contract.changeVote.estimateGas(pid, 0),
          (opts) => contract.changeVote(pid, 0, opts)
        );
      }
      await tx.wait();
      await fetchAll();
      await refreshBreakdown(p);
    });
  };

  const fmtDate = (sec) => {
    try { return format(new Date(sec * 1000), "P", { locale: es }); } catch { return "-"; }
  };

  return (
    <Card
      title="Votaciones"
      icon={<Shield className="w-5 h-5" />}
      actions={<div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" hidden={!loadingProposals} /> {loadingProposals && "Actualizando votaciones…"}</div>}
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="border rounded-xl p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="flex justify-between mb-2">
            <h2 className="text-sm font-semibold">Votaciones en curso</h2>
            <input
              type="text"
              className="border rounded-xl p-2 w-32 text-sm"
              placeholder="Filtrar…"
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              aria-label="Filtrar votaciones en curso"
            />
          </div>
          {loadingProposals ? (
            <div className="space-y-2 mt-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              {(demo ? demoProposals : activeProposals).map(p => (
                <div key={p.id} className={`relative border-2 rounded-xl p-3 shadow-sm ${nowSec() > p.endTime ? "bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-500" : "bg-white border-gray-300 dark:bg-gray-800 dark:border-gray-600"}`}>
              <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end">
                {(p.groupIds || [p.groupId]).map(gid => {
                  const g = (demo ? demoGroups : groups).find(x => x.id === gid) || { id: gid, name: `Grupo ${gid}` };
                  return (
                    <span
                      key={gid}
                      title="Grupos que intervienen en esta votación"
                      className="inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {g.id} – {g.name}
                    </span>
                  );
                })}
              </div>
              <details>
                <summary className="cursor-pointer select-none flex items-start justify-between gap-2">
                  <div className="font-semibold text-base leading-tight">#{p.id} · {p.title || p.text}</div>
                </summary>
                <div className="mt-2 text-xs text-gray-500">Período para votación: {fmtDate(p.startTime)} → {fmtDate(p.endTime)}</div>
                {p.description && <div className="mt-1 text-sm whitespace-pre-wrap">{p.description}</div>}
              </details>
              <div className="flex flex-wrap items-center gap-3 mt-3">
                <button
                  className={`rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-medium transition ${
                    nowSec() > p.endTime || p.myVote !== 0 || isBusy(`vote:${p.id}`)
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                      : "bg-green-600 text-white hover:bg-green-700"
                }`}
                  onClick={() => actionVote(p, 1)}
                  disabled={nowSec() > p.endTime || isBusy(`vote:${p.id}`) || p.myVote !== 0}
                  aria-label="Votar a favor"
                >
                  <ThumbsUp className="w-5 h-5" /> A favor
                </button>
                <button
                  className={`rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-medium transition ${
                    nowSec() > p.endTime || p.myVote !== 0 || isBusy(`vote:${p.id}`)
                      ? "bg-gray-200 text-gray-500 cursor-not-allowed dark:bg-gray-700 dark:text-gray-400"
                      : "bg-red-600 text-white hover:bg-red-700"
                  }`}
                  onClick={() => actionVote(p, 2)}
                  disabled={nowSec() > p.endTime || isBusy(`vote:${p.id}`) || p.myVote !== 0}
                  aria-label="Votar en contra"
                >
                  <ThumbsDown className="w-5 h-5" /> En contra
                </button>
                {p.myVote !== 0 && (
                  <>
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        p.myVote === 1 ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {p.myVote === 1 ? (
                        <ThumbsUp className="w-4 h-4" />
                      ) : (
                        <ThumbsDown className="w-4 h-4" />
                      )}
                      Votaste {p.myVote === 1 ? "a favor" : "en contra"}
                    </span>
                    <button
                      className="rounded-xl px-3 py-2 flex items-center gap-2 text-sm font-medium transition bg-blue-800 text-white hover:bg-blue-900 disabled:bg-blue-400 disabled:cursor-not-allowed"
                      onClick={() => actionRetractVote(p)}
                      disabled={isBusy(`retract:${p.id}`)}
                      aria-label="Retractar voto"
                    >
                      {isBusy(`retract:${p.id}`) && <Loader2 className="w-4 h-4 animate-spin" />}
                      Retractar
                    </button>
                  </>
                )}
              </div>
              <button
                className="text-xs text-gray-500 mt-2"
                onClick={() => loadBreakdown(p)}
                aria-label={`Toggle detalles de votación ${p.title}`}
              >
                {breakdownOpen[p.id] ? "Ocultar detalles" : "Ver detalles"}
              </button>
              {breakdownOpen[p.id] && (
                <div className="mt-2 text-xs">
                  {breakdownLoading[p.id] ? (
                    <div className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Cargando detalles…</div>
                  ) : (
                    <div>
                      <div>A favor: {breakdownData[p.id]?.up?.length || 0}</div>
                      <div>En contra: {breakdownData[p.id]?.down?.length || 0}</div>
                      <div>Sin votar: {breakdownData[p.id]?.none?.length || 0}</div>
                    </div>
                  )}
                </div>
              )}
            </div>
              ))}
            </div>
          )}
        </div>
        <div className="border rounded-xl p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
          <div className="flex justify-between mb-2">
            <h2 className="text-sm font-semibold">Votaciones finalizadas</h2>
            <input
              type="text"
              className="border rounded-xl p-2 w-32 text-sm"
              placeholder="Filtrar…"
              value={closedFilter}
              onChange={(e) => setClosedFilter(e.target.value)}
              aria-label="Filtrar votaciones finalizadas"
            />
          </div>
          {loadingProposals ? (
            <div className="space-y-2 mt-2">
              <Skeleton className="h-6 w-full" />
              <Skeleton className="h-6 w-full" />
            </div>
          ) : (
            <div className="mt-2 space-y-3">
              {(demo ? demoProposals : closedProposals).map(p => (
                <div key={p.id} className="relative border-2 rounded-xl p-3 shadow-sm bg-gray-50 border-gray-300 dark:bg-gray-700 dark:border-gray-500">
              <div className="absolute top-2 right-2 flex flex-wrap gap-1 justify-end">
                {(p.groupIds || [p.groupId]).map(gid => {
                  const g = (demo ? demoGroups : groups).find(x => x.id === gid) || { id: gid, name: `Grupo ${gid}` };
                  return (
                    <span
                      key={gid}
                      title="Grupos que intervienen en esta votación"
                      className="inline-flex items-center rounded-md border border-gray-300 bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300"
                    >
                      {g.id} – {g.name}
                    </span>
                  );
                })}
              </div>
              <details>
                <summary className="cursor-pointer select-none flex items-start justify-between gap-2">
                  <div className="font-semibold text-base leading-tight">#{p.id} · {p.title || p.text}</div>
                </summary>
                <div className="mt-2 text-xs text-gray-500">Período para votación: {fmtDate(p.startTime)} → {fmtDate(p.endTime)}</div>
                {p.description && <div className="mt-1 text-sm whitespace-pre-wrap">{p.description}</div>}
              </details>
              <div className="mt-3 flex items-center justify-end gap-4 text-sm">
                <div className="inline-flex items-center gap-1 text-gray-800">
                  <ThumbsUp className="w-4 h-4 text-yellow-500" />
                  <b>{p.upCount}</b>
                </div>
                <div className="inline-flex items-center gap-1 text-gray-800">
                  <ThumbsDown className="w-4 h-4 text-yellow-500" />
                  <b>{p.downCount}</b>
                </div>
                <div className="inline-flex items-center gap-1 text-gray-800">
                  <CircleSlash className="w-4 h-4 text-gray-500" />
                  <span className="text-gray-600">{p.noVotaron}</span>
                </div>
              </div>
            </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}