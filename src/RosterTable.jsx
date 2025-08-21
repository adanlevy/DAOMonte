import React, { useMemo } from "react";
import { useGroupDAO } from "./GroupDAOContext";
import { ListFilter, Loader2, Check, X } from "lucide-react";
import { ethers } from "ethers";
import { toast } from "react-toastify"; // Importar toast

export default function RosterTable() {
  const {
    contract,
    demo,
    groups,
    roster,
    rosterFilter,
    setRosterFilter,
    rosterSelection,
    setRosterSelection,
    targetGroupId,
    setTargetGroupId,
    run,
    isBusy,
    fetchAll,
    demoGroups,
    withGas, // Añadido del contexto
    setGroupMembersCache,
  } = useGroupDAO();

  const actionBulkAddToGroup = async (addrs, gid) => {
    if (demo) return toast.success("Demo: asignación simulada");
    await run("bulkAdd", async () => {
      const tx = await withGas(
        contract.addUsersToGroup.estimateGas(Number(gid), addrs),
        (opts) => contract.addUsersToGroup(Number(gid), addrs, opts)
      );
      await tx.wait();
      setRosterSelection({});
      try {
        const list = await (contract.getGroupMembersSlice
          ? contract.getGroupMembersSlice(Number(gid), 0, 1000)
          : contract.getGroupMembers(Number(gid)));
        setGroupMembersCache((prev) => ({ ...prev, [gid]: list }));
      } catch {
        // ignore errors loading members
      }
      await fetchAll();
    });
  };

  // Definir filteredRoster usando useMemo para optimizar el renderizado
  const filteredRoster = useMemo(() => {
    return roster.filter((r) =>
      (r.name || r.nombre || "").toLowerCase().includes(rosterFilter.toLowerCase()) ||
      (r.surname || r.apellido || "").toLowerCase().includes(rosterFilter.toLowerCase()) ||
      (r.dni || r.DNI || "").toLowerCase().includes(rosterFilter.toLowerCase()) ||
      (r.address || "").toLowerCase().includes(rosterFilter.toLowerCase())
    );
  }, [roster, rosterFilter]);

  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-2">Agregar personas a grupo</div>
      <div className="grid md:grid-cols-3 gap-2 items-center mb-3">
        <div className="flex items-center gap-2">
          <ListFilter className="w-4 h-4" />
          <input
            className="border rounded-xl p-2 w-full"
            placeholder="Filtrar por nombre, apellido, DNI o address…"
            value={rosterFilter}
            onChange={(e) => setRosterFilter(e.target.value)}
            aria-label="Filtrar roster"
          />
        </div>
        <select
          className="border rounded-xl p-2"
          value={targetGroupId}
          onChange={(e) => setTargetGroupId(e.target.value)}
          aria-label="Seleccionar grupo para asignar usuarios"
        >
          <option value="">Elegí grupo…</option>
          {(demo ? demoGroups : groups).map((g) => (
            <option key={g.id} value={g.id}>
              {g.id} – {g.name}
            </option>
          ))}
        </select>
        <button
          disabled={isBusy("bulkAdd")}
          onClick={async () => {
            if (!targetGroupId) return toast.error("Elegí un grupo");
            const addrs = Object.entries(rosterSelection)
              .filter(([, v]) => v)
              .map(([k]) => k);
            if (!addrs.length) return toast.error("Seleccioná al menos una persona");
            await actionBulkAddToGroup(addrs, targetGroupId);
          }}
          className="rounded-xl bg-black text-white px-4 py-2 flex items-center gap-2 hover:opacity-90"
          aria-label="Agregar usuarios seleccionados al grupo"
        >
          {isBusy("bulkAdd") && <Loader2 className="w-4 h-4 animate-spin" />} Agregar seleccionados
        </button>
      </div>
      <div className="max-h-60 overflow-auto border rounded-xl">
        <table className="w-full text-sm">
          <thead className="bg-gray-100 sticky top-0">
            <tr>
              <th className="p-2 text-left">✓</th>
              <th className="p-2 text-left">Nombre</th>
              <th className="p-2 text-left">Apellido</th>
              <th className="p-2 text-left">DNI</th>
              <th className="p-2 text-left">Address</th>
              <th className="p-2 text-left">Hash</th>
            </tr>
          </thead>
          <tbody>
            {filteredRoster.map((r, idx) => {
              const dni = r.dni || r.DNI || "";
              const expected = r.puesto || "";
              const hash = dni ? ethers.keccak256(ethers.toUtf8Bytes(dni)) : "";
              const ok = expected && hash === expected;
              return (
                <tr key={idx} className="border-t">
                  <td className="p-2">
                    <input
                      type="checkbox"
                      checked={!!rosterSelection[r.address]}
                      onChange={(e) =>
                        setRosterSelection((s) => ({ ...s, [r.address]: e.target.checked }))
                      }
                      aria-label={`Seleccionar ${r.name || r.address}`}
                    />
                  </td>
                  <td className="p-2">{r.name || r.nombre || ""}</td>
                  <td className="p-2">{r.surname || r.apellido || ""}</td>
                  <td className="p-2">{dni}</td>
                  <td className="p-2 font-mono">{r.address}</td>
                  <td className="p-2 text-center">
                    {ok ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-red-600" />}
                  </td>
                </tr>
              );
            })}
            {!filteredRoster.length && (
              <tr>
                <td colSpan={6} className="p-3 text-center text-gray-500">
                  Sin datos. Cargá un CSV/URL o asegurate de tener grupos con integrantes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}