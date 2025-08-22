import React, { useEffect } from "react";
import { useGroupDAO } from "./GroupDAOContext";
import { useForm } from "react-hook-form";
import { ethers } from "ethers";
import { UserCog, Users, ListFilter, Loader2, Link as LinkIcon, Settings, ChevronRight, ChevronDown, Shield, Pause, Play } from "lucide-react";
import { toast } from "react-toastify";
import RosterTable from "./RosterTable";
import Card from "./components/Card";

// Función auxiliar para verificar si una función existe en el contrato
const hasFn = (contract, fnName) => {
  return contract && contract[fnName] && typeof contract[fnName] === "function";
};

export default function AdminPanel() {
  const {
    contract,
    isAdmin,
    isOwner,
    paused,
    demo,
    groups,
    run,
    isBusy,
    fetchAll,
    demoGroups,
    parseRemoteCSV,
    rosterURL,
    setRosterURL,
    admins,
    withGas,
    clearRosterAssociation,
    registerUser,
    groupMembersCache,
    setGroupMembersCache,
    openMembersGroup,
    setOpenMembersGroup,
    rosterIndex,
    registered,
    account,
  } = useGroupDAO();

  const [adminOpen, setAdminOpen] = React.useState(false);
  const [adminAddr, setAdminAddr] = React.useState("");
  const {
    register: userForm,
    handleSubmit: handleUserSubmit,
    reset: resetUser,
    formState: { errors: userErrors },
  } = useForm();
  const {
    register: groupForm,
    handleSubmit: handleGroupSubmit,
    reset: resetGroup,
    formState: { errors: groupErrors },
  } = useForm();
  const {
    register: proposalForm,
    handleSubmit: handleProposalSubmit,
    reset: resetProposal,
    formState: { errors: proposalErrors },
  } = useForm();

  // Efecto para forzar la actualización de isAdmin al conectar la billetera
  useEffect(() => {
    if (contract && !isAdmin && !demo) {
      fetchAll(); // Forzar recarga de datos al conectar
    }
  }, [contract, isAdmin, demo, fetchAll]);

  const onRegisterUser = async (data) => {
    await registerUser(data.name, data.surname, data.dni);
    resetUser();
  };

  const onCreateGroup = async (data) => {
    if (demo) return toast.success("Demo: grupo creado");
    await run("createGroup", async () => {
      const tx = await withGas(
        contract.createGroup.estimateGas(data.name),
        (opts) => contract.createGroup(data.name, opts)
      );
      await tx.wait();
      resetGroup();
      await fetchAll();
    });
  };

  const onCreateProposal = async (data) => {
    if (demo) return toast.success("Demo: propuesta creada");
    if (!contract) return toast.error("Conectá tu wallet");
    if (!isAdmin) return toast.error("Solo admins pueden crear propuestas");
    const { title, description, groupId, startDate, endDate } = data;
    if (!groupId || !groups.find((g) => g.id === Number(groupId))) return toast.error("Grupo inválido");
    const startSec = Math.floor(new Date(`${startDate}T00:00:00`).getTime() / 1000);
    const endSec = Math.floor(new Date(`${endDate}T23:59:59`).getTime() / 1000);
    await run("createProposal", async () => {
      const hasCP2 = hasFn(contract, "createProposal2");
      const tx = await withGas(
        hasCP2
          ? contract.createProposal2.estimateGas(title, description || "", Number(groupId), startSec, endSec)
          : contract.createProposal.estimateGas(`${title}||${description}`, Number(groupId), startSec, endSec),
        (opts) =>
          hasCP2
            ? contract.createProposal2(title, description || "", Number(groupId), startSec, endSec, opts)
            : contract.createProposal(`${title}||${description}`, Number(groupId), startSec, endSec, opts)
      );
      await tx.wait();
      resetProposal();
      await fetchAll();
    });
  };

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
      setGroupMembersCache((prev) => ({ ...prev, [groupId]: list }));
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

  const onAddAdmin = async () => {
    if (!ethers.isAddress(adminAddr)) return toast.error("Dirección inválida");
    await run("addAdmin", async () => {
      const tx = await withGas(
        contract.addAdmin.estimateGas(adminAddr),
        (opts) => contract.addAdmin(adminAddr, opts)
      );
      await tx.wait();
      setAdminAddr("");
      await fetchAll();
    });
  };

  const onRemoveAdmin = async () => {
    if (!ethers.isAddress(adminAddr)) return toast.error("Dirección inválida");
    await run("rmAdmin", async () => {
      const tx = await withGas(
        contract.removeAdmin.estimateGas(adminAddr),
        (opts) => contract.removeAdmin(adminAddr, opts)
      );
      await tx.wait();
      setAdminAddr("");
      await fetchAll();
    });
  };

  const onPause = async () => {
    await run("pause", async () => {
      const tx = await withGas(
        contract.pause.estimateGas(),
        (opts) => contract.pause(opts)
      );
      await tx.wait();
      await fetchAll();
    });
  };

  const onUnpause = async () => {
    await run("unpause", async () => {
      const tx = await withGas(
        contract.unpause.estimateGas(),
        (opts) => contract.unpause(opts)
      );
      await tx.wait();
      await fetchAll();
    });
  };

  if (!contract && !demo) return null;

  return (
    <>
      {contract && account && registered !== true && (
        <div className="mb-4 p-4 border rounded-xl bg-white dark:bg-gray-800 dark:border-gray-700 shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Registro de Usuario</h3>
          <p className="text-sm text-gray-600 mb-4">Ingresa tus datos para asociarlos a tu billetera la primera vez.</p>
          <form onSubmit={handleUserSubmit(onRegisterUser)} className="grid gap-3">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">Nombre</label>
              <input
                id="name"
                className="border rounded-xl p-2 w-full"
                placeholder="Nombre"
                {...userForm("name", { required: "Nombre requerido" })}
              />
              {userErrors.name && <span className="text-xs text-red-600">{userErrors.name.message}</span>}
            </div>
            <div>
              <label htmlFor="surname" className="block text-sm font-medium mb-1">Apellido</label>
              <input
                id="surname"
                className="border rounded-xl p-2 w-full"
                placeholder="Apellido"
                {...userForm("surname", { required: "Apellido requerido" })}
              />
              {userErrors.surname && <span className="text-xs text-red-600">{userErrors.surname.message}</span>}
            </div>
            <div>
              <label htmlFor="dni" className="block text-sm font-medium mb-1">DNI</label>
              <input
                id="dni"
                className="border rounded-xl p-2 w-full"
                placeholder="DNI"
                {...userForm("dni", { required: "DNI requerido" })}
              />
              {userErrors.dni && <span className="text-xs text-red-600">{userErrors.dni.message}</span>}
            </div>
            <button
              disabled={isBusy("registerUser")}
              type="submit"
              className="rounded-xl bg-black text-white px-4 py-2 flex items-center gap-2 hover:opacity-90"
              aria-label="Registrar usuario"
            >
              {isBusy("registerUser") && <Loader2 className="w-4 h-4 animate-spin" />} Registrar
            </button>
          </form>
        </div>
      )}
      {(isAdmin || demo) && (
        <Card
          title={<div className="flex items-center gap-2"><Settings className="w-5 h-5"/> Administración</div>}
          icon={<span />}
          className="bg-indigo-50 dark:bg-indigo-900"
          actions={
            <button
              onClick={() => setAdminOpen((v) => !v)}
              className="text-sm border rounded-xl px-3 py-1 flex items-center gap-1"
              aria-label={adminOpen ? "Ocultar panel de administración" : "Mostrar panel de administración"}
            >
              {adminOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              {adminOpen ? "Ocultar" : "Mostrar"}
            </button>
          }
        >
          {adminOpen && (
            <div className="grid grid-cols-1 gap-6 w-full">
            {/* Gestión de administradores */}
            <div className="border rounded-xl p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-sm font-medium">
                <UserCog className="w-4 h-4" /> Gestión de administradores
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <label htmlFor="adminAddr" className="sr-only">Dirección del administrador</label>
                <input
                  id="adminAddr"
                  className="border rounded-xl p-2 flex-1"
                  placeholder="0x… address"
                  value={adminAddr}
                  onChange={(e) => setAdminAddr(e.target.value)}
                />
                <button
                  disabled={isBusy("addAdmin")}
                  onClick={onAddAdmin}
                  className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600"
                  aria-label="Agregar administrador"
                >
                  {isBusy("addAdmin") && <Loader2 className="w-4 h-4 animate-spin" />} Agregar
                </button>
                <button
                  disabled={isBusy("rmAdmin")}
                  onClick={onRemoveAdmin}
                  className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600"
                  aria-label="Revocar administrador"
                >
                  {isBusy("rmAdmin") && <Loader2 className="w-4 h-4 animate-spin" />} Revocar
                </button>
              </div>
              <div className="mt-3 text-sm">
                <div className="font-medium">Admins actuales:</div>
                <ul className="list-disc pl-5 text-xs mt-1">
                  {(admins || []).map((a, i) => (
                    <li key={i} className="font-mono">
                      {a}
                    </li>
                  ))}
                  {(!admins || admins.length === 0) && <li className="text-gray-500">No disponible</li>}
                </ul>
              </div>
            </div>

            {/* Pausabilidad */}
            {isOwner && (
              <div className="border rounded-xl p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-sm font-medium">
                <Shield className="w-4 h-4" /> Control del contrato
                  <span
                    className={`ml-auto px-2 py-0.5 rounded-full text-xs ${paused ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}
                  >
                    {paused ? "Pausado" : "Activo"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isBusy("pause") || paused}
                    onClick={onPause}
                    className={`rounded-xl border px-3 py-2 text-sm flex items-center gap-2 ${
                      isBusy("pause") || paused
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-red-50 hover:bg-red-100"
                    }`}
                    aria-label="Pausar contrato"
                  >
                    {isBusy("pause") && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Pause className="w-4 h-4" /> Pausar
                  </button>
                  <button
                    disabled={isBusy("unpause") || !paused}
                    onClick={onUnpause}
                    className={`rounded-xl border px-3 py-2 text-sm flex items-center gap-2 ${
                      isBusy("unpause") || !paused
                        ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                        : "bg-green-50 hover:bg-green-100"
                    }`}
                    aria-label="Reanudar contrato"
                  >
                    {isBusy("unpause") && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Play className="w-4 h-4" /> Reanudar
                  </button>
                </div>
              </div>
            )}

            {/* Creación de grupo */}
            <div className="border rounded-xl p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-sm font-medium">
                <Users className="w-4 h-4" /> Creación de grupo
              </div>
              <form onSubmit={handleGroupSubmit(onCreateGroup)} className="grid md:grid-cols-3 gap-2 items-center">
                <div>
                  <label htmlFor="groupName" className="block text-sm font-medium mb-1">Nombre del grupo</label>
                  <input
                    id="groupName"
                    className="border rounded-xl p-2 w-full"
                    placeholder="Nombre del grupo"
                    {...groupForm("name", { required: "Nombre requerido" })}
                  />
                  {groupErrors?.name && <span className="text-xs text-red-600">{groupErrors.name.message}</span>}
                </div>
                <button
                  disabled={isBusy("createGroup")}
                  type="submit"
                  className="rounded-xl bg-black text-white px-4 py-2 flex items-center gap-2 hover:opacity-90"
                  aria-label="Crear grupo"
                >
                  {isBusy("createGroup") && <Loader2 className="w-4 h-4 animate-spin" />} Crear grupo
                </button>
                <div className="text-sm text-gray-500">Total grupos: {demo ? demoGroups.length : groups.length}</div>
              </form>
            </div>

            {/* Listado de grupos */}
            <div className="border rounded-xl p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-sm font-medium">
                <Users className="w-4 h-4" /> Grupos existentes
              </div>
              <div className="flex flex-wrap gap-2">
                {(demo ? demoGroups.map((g) => g.id) : groups.map((g) => g.id)).map((id) => {
                  const g = (demo ? demoGroups : groups).find((x) => x.id === id) || { name: `Grupo ${id}`, memberCount: 0 };
                  const open = openMembersGroup === id;
                  return (
                    <div key={id}>
                      <button
                        onClick={() => toggleMembers(id)}
                        className={`mr-2 mb-2 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs ring-1 ring-gray-200 dark:ring-gray-600 ${open ? "bg-gray-100 dark:bg-gray-700" : "bg-white dark:bg-gray-800"}`}
                        aria-label={`Toggle miembros del grupo ${g.name}`}
                      >
                        {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        {id} – {g.name}
                      </button>
                      {open && (
                        <div className="mt-1 mb-3 ml-2 p-2 border rounded-xl bg-gray-50 dark:bg-gray-700 dark:border-gray-600 max-h-40 overflow-auto text-xs">
                          <div className="mb-1 text-gray-600">
                            Integrantes ({demo ? (demoGroups.find((x) => x.id === id)?.memberCount || 0) : (groupMembersCache[id]?.length ?? g.memberCount)}):
                          </div>
                          <ul className="font-mono space-y-1">
                            {(demo
                              ? Array.from({ length: (demoGroups.find((x) => x.id === id)?.memberCount || 0) }).map((_, i) => `0xDEMO${i.toString().padStart(2, "0")}`)
                              : (groupMembersCache[id] || [])
                            ).map((addr, i) => (
                              <li key={i}>{displayAlias(addr)}</li>
                            ))}
                            {!demo && !groupMembersCache[id] && (
                              <div className="text-gray-500 flex items-center gap-2">
                                <Loader2 className="w-3 h-3 animate-spin" /> Cargando integrantes…
                              </div>
                            )}
                          </ul>
                        </div>
                      )}
                    </div>
                  );
                })}
                {(!demo && groups.length === 0) && <div className="text-sm text-gray-500">No hay grupos creados.</div>}
              </div>
            </div>

            {/* Creación de propuesta */}
            <div className="border rounded-xl p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-sm font-medium">
                <Shield className="w-4 h-4" /> Crear propuesta
              </div>
              <form onSubmit={handleProposalSubmit(onCreateProposal)} className="grid gap-3">
                <div className="grid md:grid-cols-2 gap-2">
                  <div>
                    <input
                      className="border rounded-xl p-2 w-full"
                      placeholder="Título de la propuesta"
                      {...proposalForm("title", { required: "Título requerido" })}
                      aria-label="Título de la propuesta"
                    />
                    {proposalErrors.title && <span className="text-xs text-red-600">{proposalErrors.title.message}</span>}
                  </div>
                  <div>
                    <input
                      className="border rounded-xl p-2 w-full"
                      placeholder="Descripción"
                      {...proposalForm("description")}
                      aria-label="Descripción de la propuesta"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  <select
                    className="border rounded-xl p-2"
                    {...proposalForm("groupId", { required: "Grupo requerido" })}
                    aria-label="Seleccionar grupo"
                  >
                    <option value="">Elegí grupo…</option>
                    {(demo ? demoGroups : groups).map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.id} – {g.name}
                      </option>
                    ))}
                  </select>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Desde</label>
                    <input
                      type="date"
                      className="border rounded-xl p-2 w-full"
                      {...proposalForm("startDate", { required: "Fecha de inicio requerida" })}
                      aria-label="Fecha de inicio"
                    />
                    {proposalErrors.startDate && (
                      <span className="text-xs text-red-600">{proposalErrors.startDate.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hasta</label>
                    <input
                      type="date"
                      className="border rounded-xl p-2 w-full"
                      {...proposalForm("endDate", { required: "Fecha de fin requerida" })}
                      aria-label="Fecha de fin"
                    />
                    {proposalErrors.endDate && <span className="text-xs text-red-600">{proposalErrors.endDate.message}</span>}
                  </div>
                </div>
                <button
                  disabled={isBusy("createProposal")}
                  type="submit"
                  className="rounded-xl bg-black text-white px-4 py-2 flex items-center gap-2 hover:opacity-90"
                  aria-label="Crear propuesta"
                >
                  {isBusy("createProposal") && <Loader2 className="w-4 h-4 animate-spin" />} Crear propuesta
                </button>
              </form>
            </div>

            {/* Gestión de roster */}
            <div className="border rounded-xl p-3 bg-white dark:bg-gray-800 dark:border-gray-700">
              <div className="flex flex-wrap items-center gap-2 mb-2 text-sm font-medium">
                <Users className="w-4 h-4" /> Gestión de roster
              </div>
              <div className="grid gap-3">
                <div className="flex flex-col sm:flex-row gap-2 w-full">
                  <div className="flex items-center gap-2 flex-1 w-full">
                    <LinkIcon className="w-4 h-4" />
                    <input
                      className="border rounded-xl p-2 flex-1 w-full"
                      placeholder="URL CSV público"
                      value={rosterURL}
                      onChange={(e) => setRosterURL(e.target.value)}
                      aria-label="URL del CSV público"
                    />
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600"
                      disabled={isBusy("loadRosterURL")}
                      onClick={() =>
                        run("loadRosterURL", async () => {
                          if (rosterURL) await parseRemoteCSV(rosterURL);
                        })
                      }
                      aria-label="Cargar CSV remoto"
                    >
                      {isBusy("loadRosterURL") && <Loader2 className="w-4 h-4 animate-spin" />} Cargar remoto
                    </button>
                    <button
                      className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100 dark:bg-gray-700 dark:hover:bg-gray-600 dark:border-gray-600"
                      disabled={isBusy("saveRosterURL")}
                      onClick={() =>
                        run("saveRosterURL", async () => {
                          const tx = await withGas(
                            contract.setRosterURI.estimateGas(rosterURL),
                            (opts) => contract.setRosterURI(rosterURL, opts)
                          );
                          await tx.wait();
                          localStorage.setItem("groupdao.rosterURL", rosterURL);
                          setRosterURL(rosterURL);
                          if (rosterURL) await parseRemoteCSV(rosterURL);
                        })
                      }
                      aria-label="Publicar URL para todos"
                    >
                      {isBusy("saveRosterURL") && <Loader2 className="w-4 h-4 animate-spin" />} Publicar URL
                    </button>
                    <button
                      className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-700"
                      onClick={clearRosterAssociation}
                      aria-label="Limpiar padrón"
                    >
                      Limpiar padrón
                    </button>
                  </div>
                </div>
              </div>
              <RosterTable />
            </div>
          </div>
        )}
      </Card>
      )}
    </>
  );
}