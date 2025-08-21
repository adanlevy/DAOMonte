import React from "react";
import { useGroupDAO } from "./GroupDAOContext";
import { Users, ChevronDown, ChevronRight, Loader2, Eye } from "lucide-react";
import { toast } from "react-toastify";

const Card = ({ title, icon, children, actions, className = "" }) => (
  <div className={`rounded-2xl shadow-sm border p-4 ${className || "bg-white"}`}>
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-2 font-semibold text-lg">
        {icon}
        <span>{title}</span>
      </div>
      {actions}
    </div>
    <div>{children}</div>
  </div>
);

function parseRemoteCSV(file) {
  // Placeholder: implement CSV parsing logic here
  // For now, just show a toast
  toast.success(`Archivo CSV "${file.name}" cargado (implementa parseo).`);
}

export default function GroupList() {
  const {
    contract, demo, groups, myGroupIds, groupMembersCache, setGroupMembersCache,
    openMembersGroup, setOpenMembersGroup, loadingGroups, rosterIndex, demoGroups
  } = useGroupDAO();

  const toggleMembers = async (groupId) => {
    if (openMembersGroup === groupId) {
      setOpenMembersGroup(null);
      return;
    }
    setOpenMembersGroup(groupId);
    if (demo || groupMembersCache[groupId]) return;
    try {
      const list = await (contract.getGroupMembersSlice
        ? contract.getGroupMembersSlice(groupId, 0, 1000)
        : contract.getGroupMembers(groupId));
      setGroupMembersCache(prev => ({ ...prev, [groupId]: list }));
    } catch {
      toast.error("Error al cargar integrantes");
    }
  };

  const displayAlias = (addr) => {
    const a = (addr || "").toLowerCase();
    const meta = rosterIndex.get(a);
    if (meta && (meta.name || meta.dni)) return `${meta.name || ""}${meta.dni ? ` (DNI ${meta.dni})` : ""} – ${addr}`;
    return addr;
  };

  return (
    <Card
      title="Mis grupos"
      icon={<Users className="w-5 h-5" />}
      actions={loadingGroups && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Actualizando grupos…</div>}
    >
      <div className="flex items-center gap-2 mb-2 text-xs text-gray-500">
        <Eye className="w-3 h-3" /> Podés cargar un CSV para ver alias locales.
        <input
          type="file"
          accept=".csv"
          onChange={(e) => e.target.files?.[0] && parseRemoteCSV(e.target.files[0])}
          aria-label="Cargar CSV para alias"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {(demo ? demoGroups.map(g => g.id) : myGroupIds).map(id => {
          const g = (demo ? demoGroups : groups).find(x => x.id === id) || { name: `Grupo ${id}`, memberCount: 0 };
          const open = openMembersGroup === id;
          return (
            <div key={id}>
              <button
                onClick={() => toggleMembers(id)}
                className={`mr-2 mb-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ring-1 ring-gray-200 ${open ? "bg-gray-100" : "bg-white"}`}
                aria-label={`Toggle miembros del grupo ${g.name}`}
              >
                {open ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                {id} – {g.name}
              </button>
              {open && (
                <div className="mt-1 mb-3 ml-2 p-2 border rounded-xl bg-gray-50 max-h-40 overflow-auto text-xs">
                  <div className="mb-1 text-gray-600">Integrantes ({demo ? (demoGroups.find(x => x.id === id)?.memberCount || 0) : (groupMembersCache[id]?.length ?? g.memberCount)}):</div>
                  <ul className="font-mono space-y-1">
                    {(demo ? Array.from({length: (demoGroups.find(x => x.id === id)?.memberCount || 0)}).map((_, i) => `0xDEMO${i.toString().padStart(2, '0')}`) : (groupMembersCache[id] || [])).map((addr, i) => (
                      <li key={i}>{displayAlias(addr)}</li>
                    ))}
                    {!demo && !groupMembersCache[id] && <div className="text-gray-500 flex items-center gap-2"><Loader2 className="w-3 h-3 animate-spin"/> Cargando integrantes…</div>}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        {(!demo && !myGroupIds.length) && <div className="text-sm text-gray-500">No integrás ningún grupo todavía.</div>}
      </div>
    </Card>
  );
}