import React, { useMemo, useEffect, useState } from "react";
import { useGroupDAO } from "./GroupDAOContext";
import { ListFilter, Loader2, Check, X } from "lucide-react";
import { ethers } from "ethers";
import { toast } from "react-toastify"; // Importar toast
import Papa from "papaparse";

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
    groupMembersCache,
    setGroupMembersCache,
  } = useGroupDAO();

  const [chainHashes, setChainHashes] = useState({});

  useEffect(() => {
    if (!contract) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        roster.map(async (r) => {
          const addr = r.address;
          if (!addr) return [addr, ""];
          try {
            const [dniHash] = await contract.getUserHashes(addr);
            return [addr.toLowerCase(), dniHash];
          } catch {
            return [addr.toLowerCase(), ""];
          }
        })
      );
      if (!cancelled) {
        const map = {};
        entries.forEach(([addr, h]) => {
          if (addr) map[addr.toLowerCase()] = h;
        });
        setChainHashes(map);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [contract, roster]);

  const actionBulkAddToGroup = async (addrs, gid) => {
    if (demo) return toast.success("Demo: asignación simulada");

    // Cargar miembros existentes para evitar duplicados
    let existing = groupMembersCache[gid];
    if (!existing) {
      try {
        const list = await (contract.getGroupMembersSlice
          ? contract.getGroupMembersSlice(Number(gid), 0, 1000)
          : contract.getGroupMembers(Number(gid)));
        existing = list;
        setGroupMembersCache((prev) => ({ ...prev, [gid]: list }));
      } catch {
        existing = [];
      }
    }
    const existingSet = new Set((existing || []).map((a) => a.toLowerCase()));
    const uniqueAddrs = addrs.filter((a) => !existingSet.has(a.toLowerCase()));
    const skipped = addrs.length - uniqueAddrs.length;
    if (!uniqueAddrs.length) {
      toast.info("Todos los usuarios seleccionados ya están en el grupo");
      return;
    }
    if (skipped)
      toast.info(
        `${skipped} persona${skipped > 1 ? "s" : ""} ya integraba el grupo y fue omitida`
      );

    await run("bulkAdd", async () => {
      const tx = await withGas(
        contract.addUsersToGroup.estimateGas(Number(gid), uniqueAddrs),
        (opts) => contract.addUsersToGroup(Number(gid), uniqueAddrs, opts)
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

  const downloadCSV = () => {
    const rows = filteredRoster.map((r) => {
      const name = r.name || r.nombre || "";
      const surname = r.surname || r.apellido || "";
      const dni = r.dni || r.DNI || "";
      const address = r.address || "";
      const expected = chainHashes[address.toLowerCase()] || "";
      const hash = dni ? ethers.keccak256(ethers.toUtf8Bytes(dni)) : "";
      const ok = expected && hash.toLowerCase() === expected.toLowerCase();
      return {
        Nombre: name,
        Apellido: surname,
        DNI: dni,
        Address: address,
        Hash: ok ? "OK" : "X",
      };
    });
    const csv = Papa.unparse(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "roster.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4">
      <div className="text-sm font-semibold mb-2">Agregar personas a grupo</div>
      <div className="grid md:grid-cols-4 gap-2 items-center mb-3">
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
        <button
          onClick={downloadCSV}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 hover:opacity-90"
          aria-label="Descargar roster como CSV"
        >
          Descargar CSV
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
              const expected = chainHashes[r.address?.toLowerCase()] || "";
              const hash = dni ? ethers.keccak256(ethers.toUtf8Bytes(dni)) : "";
              const ok = expected && hash.toLowerCase() === expected.toLowerCase();
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