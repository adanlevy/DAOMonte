import React from "react";
import { useGroupDAO } from "./GroupDAOContext";
import { Users, ChevronDown, ChevronRight, Loader2, X } from "lucide-react";
import { toast } from "react-toastify";
import Card from "./components/Card";
import Skeleton from "./components/Skeleton";

const MembersModal = ({ groupId, onClose, triggerRef }) => {
  const { demo, groups, demoGroups, groupMembersCache, rosterIndex } = useGroupDAO();
  const modalRef = React.useRef(null);
  const closeRef = React.useRef(null);

  const handleClose = React.useCallback(() => {
    onClose();
    triggerRef?.current?.focus();
  }, [onClose, triggerRef]);

  React.useEffect(() => {
    const focusable = () => {
      if (!modalRef.current) return [];
      return modalRef.current.querySelectorAll(
        'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
    };
    const trap = (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      } else if (e.key === "Tab") {
        const nodes = focusable();
        if (!nodes.length) return;
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", trap);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", trap);
  }, [handleClose]);

  const g = (demo ? demoGroups : groups).find((x) => x.id === groupId) || { name: `Grupo ${groupId}` };
  const addresses = demo
    ? Array.from({ length: demoGroups.find((x) => x.id === groupId)?.memberCount || 0 }).map((_, i) => `0xDEMO${i.toString().padStart(2, '0')}`)
    : groupMembersCache[groupId] || [];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" role="dialog" aria-modal="true">
      <div ref={modalRef} className="bg-white dark:bg-gray-800 rounded-xl p-4 w-full max-w-lg max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold">Integrantes de {g.name}</h2>
          <button ref={closeRef} onClick={handleClose} aria-label="Cerrar" className="text-gray-500 hover:text-gray-700">
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
              <thead className="bg-gray-100 dark:bg-gray-700 sticky top-0">
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
                    <tr key={i} className="border-t dark:border-gray-700">
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

  const modalTriggerRef = React.useRef(null);

  const toggleMembers = async (groupId, e) => {
    if (openMembersGroup === groupId) {
      setOpenMembersGroup(null);
      return;
    }
    modalTriggerRef.current = e?.currentTarget || null;
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
          {loadingGroups ? (
            <>
              <Skeleton className="h-6 w-32" />
              <Skeleton className="h-6 w-24" />
            </>
          ) : (
            <>
              {(demo ? demoGroups.map(g => g.id) : myGroupIds).map(id => {
                const g = (demo ? demoGroups : groups).find(x => x.id === id) || { name: `Grupo ${id}`, memberCount: 0 };
                const open = openMembersGroup === id;
                return (
                  <button
                    key={id}
                    onClick={(e) => toggleMembers(id, e)}
                    className={`mr-2 mb-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm ring-1 ring-gray-200 dark:ring-gray-600 ${open ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"}`}
                    aria-label={`Ver miembros del grupo ${g.name}`}
                  >
                    {open ? <ChevronDown className="w-3 h-3"/> : <ChevronRight className="w-3 h-3"/>}
                    {id} – {g.name}
                  </button>
                );
              })}
              {(!demo && !myGroupIds.length) && <div className="text-sm text-gray-500">No integrás ningún grupo todavía.</div>}
            </>
          )}
        </div>
      </Card>
      {openMembersGroup && (
        <MembersModal groupId={openMembersGroup} onClose={() => setOpenMembersGroup(null)} triggerRef={modalTriggerRef} />
      )}
    </>
  );
}