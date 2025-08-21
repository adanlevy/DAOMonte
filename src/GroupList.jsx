import React from "react";
import { useGroupDAO } from "./GroupDAOContext";
import { Users, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
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

const MembersModal = ({ groupId, onClose }) => {
  const { demo, groups, demoGroups, groupMembersCache, rosterIndex } = useGroupDAO();
  const g = (demo ? demoGroups : groups).find(x => x.id === groupId) || { name: `Grupo ${groupId}` };
  const addresses = demo
    ? Array.from({ length: demoGroups.find(x => x.id === groupId)?.memberCount || 0 }).map((_, i) => `0xDEMO${i.toString().padStart(2, '0')}`)
    : (groupMembersCache[groupId] || []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div className="bg-white rounded-xl p-4 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Integrantes de {g.name}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="text-gray-500 hover:text-gray-700">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="overflow-auto mt-2">
          {(!demo && !groupMembersCache[groupId]) ? (
            <div className="text-gray-500 flex items-center gap-2 justify-center p-4">
              <Loader2 className="w-4 h-4 animate-spin" /> Cargando integrantes…
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className="p-2 text-left">Nombre</th>
                  <th className="p-2 text-left">Apellido</th>
                  <th className="p-2 text-left">DNI</th>
                  <th className="p-2 text-left">Address</th>
                </tr>
              </thead>
              <tbody>
                {addresses.map((addr, i) => {
                  const meta = rosterIndex.get((addr || "").toLowerCase()) || {};
                  return (
                    <tr key={i} className="border-t">
                      <td className="p-2">{meta.name || ""}</td>
                      <td className="p-2">{meta.surname || ""}</td>
                      <td className="p-2">{meta.dni || ""}</td>
                      <td className="p-2 font-mono">{addr}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default function GroupList() {
  const {
    contract, demo, groups, myGroupIds, groupMembersCache, setGroupMembersCache,
    openMembersGroup, setOpenMembersGroup, loadingGroups, demoGroups
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

  return (
    <>
      <Card
        title="Mis grupos"
        icon={<Users className="w-5 h-5" />}
        actions={loadingGroups && <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Actualizando grupos…</div>}
      >
        <div className="flex flex-wrap gap-2">
          {(demo ? demoGroups.map(g => g.id) : myGroupIds).map(id => {
            const g = (demo ? demoGroups : groups).find(x => x.id === id) || { name: `Grupo ${id}`, memberCount: 0 };
            const open = openMembersGroup === id;
            return (
              <button
                key={id}
                onClick={() => toggleMembers(id)}
                className={`mr-2 mb-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ring-1 ring-gray-200 ${open ? "bg-gray-100" : "bg-white"}`}
                aria-label={`Ver miembros del grupo ${g.name}`}
              >
                {open ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                {id} – {g.name}
              </button>
            );
          })}
          {(!demo && !myGroupIds.length) && <div className="text-sm text-gray-500">No integrás ningún grupo todavía.</div>}
        </div>
      </Card>
      {openMembersGroup && (
        <MembersModal groupId={openMembersGroup} onClose={() => setOpenMembersGroup(null)} />
      )}
    </>
  );
}