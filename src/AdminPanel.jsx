import React, { useEffect, useState } from "react";
import { useGroupDAO } from "./GroupDAOContext";
import { useForm } from "react-hook-form";
import { ethers } from "ethers";
import { Upload, UserCog, Users, ListFilter, Loader2, Link as LinkIcon, Settings, ChevronRight, ChevronDown, Shield, Pause, Play } from "lucide-react";
import { toast } from "react-toastify";
import { startOfDay, endOfDay } from "date-fns";
import RosterTable from "./RosterTable";

// Función auxiliar para verificar si una función existe en el contrato
const hasFn = (contract, fnName) => {
  return contract && contract[fnName] && typeof contract[fnName] === "function";
};

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

export default function AdminPanel() {
  const {
    contract,
    isAdmin,
    isOwner,
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
    roster, // Añadido para verificar si el usuario está en el roster
  } = useGroupDAO();

  const [adminOpen, setAdminOpen] = React.useState(false);
  const [adminAddr, setAdminAddr] = React.useState("");
  const [isUserRegistered, setIsUserRegistered] = useState(false); // Estado para rastrear registro del usuario
  const { register, handleSubmit, reset, formState: { errors } } = useForm();
  const { register: groupForm, handleSubmit: handleGroupSubmit, reset: resetGroup } = useForm();

  // Efecto para forzar la actualización de isAdmin al conectar la billetera
  useEffect(() => {
    if (contract && !isAdmin && !demo) {
      fetchAll(); // Forzar recarga de datos al conectar
    }
    // Verificar si el usuario ya está registrado en el roster
    if (contract && roster) {
      const userAddress = contract.signer?.getAddress();
      if (userAddress) {
        const isRegistered = roster.some((r) => r.address.toLowerCase() === userAddress.toLowerCase());
        setIsUserRegistered(isRegistered);
      }
    }
  }, [contract, isAdmin, demo, fetchAll, roster]);

  const onRegisterUser = async (data) => {
    if (demo) return toast.success("Demo: usuario registrado");
    if (!contract) return toast.error("Conectá tu wallet");
    const userAddress = await contract.signer.getAddress();
    await run("registerUser", async () => {
      const tx = await withGas(
        contract.registerUser.estimateGas(userAddress, data.name, data.surname, data.dni),
        (opts) => contract.registerUser(userAddress, data.name, data.surname, data.dni, opts)
      );
      await tx.wait();
      setIsUserRegistered(true);
      await fetchAll();
      toast.success("Usuario registrado exitosamente");
    });
  };

  const onCreateGroup = async (data) => {
    if (demo) return toast.success("Demo: grupo creado");
    await run("createGroup", async () => {
      const tx = await contract.createGroup(data.name);
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
    const startSec = Math.floor(startOfDay(new Date(startDate)).getTime() / 1000);
    const endSec = Math.floor(endOfDay(new Date(endDate)).getTime() / 1000);
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
      reset();
      await fetchAll();
    });
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
      const tx = await contract.pause();
      await tx.wait();
      await fetchAll();
    });
  };

  const onUnpause = async () => {
    await run("unpause", async () => {
      const tx = await contract.unpause();
      await tx.wait();
      await fetchAll();
    });
  };

  if (!isAdmin && !demo) return null;

  return (
    <>
      {!isUserRegistered && contract && (
        <div className="mb-4 p-4 border rounded-xl bg-white shadow-sm">
          <h3 className="text-lg font-semibold mb-2">Registro de Usuario</h3>
          <p className="text-sm text-gray-600 mb-4">Ingresa tus datos para asociarlos a tu billetera la primera vez.</p>
          <form onSubmit={handleSubmit(onRegisterUser)} className="grid gap-3">
            <div>
              <input
                className="border rounded-xl p-2 w-full"
                placeholder="Nombre"
                {...register("name", { required: "Nombre requerido" })}
                aria-label="Nombre"
              />
              {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
            </div>
            <div>
              <input
                className="border rounded-xl p-2 w-full"
                placeholder="Apellido"
                {...register("surname", { required: "Apellido requerido" })}
                aria-label="Apellido"
              />
              {errors.surname && <span className="text-xs text-red-600">{errors.surname.message}</span>}
            </div>
            <div>
              <input
                className="border rounded-xl p-2 w-full"
                placeholder="DNI"
                {...register("dni", { required: "DNI requerido" })}
                aria-label="DNI"
              />
              {errors.dni && <span className="text-xs text-red-600">{errors.dni.message}</span>}
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
      <Card
        title={<div className="flex items-center gap-2"><Settings className="w-5 h-5"/> Administración</div>}
        icon={<span />}
        className="bg-indigo-50"
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
          <div className="grid gap-6">
            {/* Gestión de administradores */}
            <div className="border rounded-xl p-3 bg-white">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <UserCog className="w-4 h-4" /> Gestión de administradores
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  className="border rounded-xl p-2 flex-1"
                  placeholder="0x… address"
                  value={adminAddr}
                  onChange={(e) => setAdminAddr(e.target.value)}
                  aria-label="Dirección del administrador"
                />
                <button
                  disabled={isBusy("addAdmin")}
                  onClick={onAddAdmin}
                  className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100"
                  aria-label="Agregar administrador"
                >
                  {isBusy("addAdmin") && <Loader2 className="w-4 h-4 animate-spin" />} Agregar
                </button>
                <button
                  disabled={isBusy("rmAdmin")}
                  onClick={onRemoveAdmin}
                  className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100"
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
              <div className="border rounded-xl p-3 bg-white">
                <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                  <Shield className="w-4 h-4" /> Control del contrato
                </div>
                <div className="flex gap-2">
                  <button
                    disabled={isBusy("pause")}
                    onClick={onPause}
                    className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-red-50 hover:bg-red-100"
                    aria-label="Pausar contrato"
                  >
                    {isBusy("pause") && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Pause className="w-4 h-4" /> Pausar
                  </button>
                  <button
                    disabled={isBusy("unpause")}
                    onClick={onUnpause}
                    className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-green-50 hover:bg-green-100"
                    aria-label="Despausar contrato"
                  >
                    {isBusy("unpause") && <Loader2 className="w-4 h-4 animate-spin" />}
                    <Play className="w-4 h-4" /> Despausar
                  </button>
                </div>
              </div>
            )}

            {/* Creación de grupo */}
            <div className="border rounded-xl p-3 bg-white">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Users className="w-4 h-4" /> Creación de grupo
              </div>
              <form onSubmit={handleGroupSubmit(onCreateGroup)} className="grid md:grid-cols-3 gap-2 items-center">
                <div>
                  <input
                    className="border rounded-xl p-2 w-full"
                    placeholder="Nombre del grupo"
                    {...groupForm("name", { required: "Nombre requerido" })}
                    aria-label="Nombre del grupo"
                  />
                  {errors.name && <span className="text-xs text-red-600">{errors.name.message}</span>}
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

            {/* Creación de propuesta */}
            <div className="border rounded-xl p-3 bg-white">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Shield className="w-4 h-4" /> Crear propuesta
              </div>
              <form onSubmit={handleSubmit(onCreateProposal)} className="grid gap-3">
                <div className="grid md:grid-cols-2 gap-2">
                  <div>
                    <input
                      className="border rounded-xl p-2 w-full"
                      placeholder="Título de la propuesta"
                      {...register("title", { required: "Título requerido" })}
                      aria-label="Título de la propuesta"
                    />
                    {errors.title && <span className="text-xs text-red-600">{errors.title.message}</span>}
                  </div>
                  <div>
                    <input
                      className="border rounded-xl p-2 w-full"
                      placeholder="Descripción"
                      {...register("description")}
                      aria-label="Descripción de la propuesta"
                    />
                  </div>
                </div>
                <div className="grid md:grid-cols-3 gap-2">
                  <select
                    className="border rounded-xl p-2"
                    {...register("groupId", { required: "Grupo requerido" })}
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
                      {...register("startDate", { required: "Fecha de inicio requerida" })}
                      aria-label="Fecha de inicio"
                    />
                    {errors.startDate && <span className="text-xs text-red-600">{errors.startDate.message}</span>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Hasta</label>
                    <input
                      type="date"
                      className="border rounded-xl p-2 w-full"
                      {...register("endDate", { required: "Fecha de fin requerida" })}
                      aria-label="Fecha de fin"
                    />
                    {errors.endDate && <span className="text-xs text-red-600">{errors.endDate.message}</span>}
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
            <div className="border rounded-xl p-3 bg-white">
              <div className="flex items-center gap-2 mb-2 text-sm font-medium">
                <Users className="w-4 h-4" /> Gestión de roster
              </div>
              <div className="grid gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <Upload className="w-4 h-4" />
                  <span className="text-sm">
                    Cargar padrón local (CSV: <code>name</code>, <code>dni</code>, <code>address</code>)
                  </span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => e.target.files?.[0] && parseRemoteCSV(e.target.files[0])}
                    aria-label="Cargar CSV local"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <LinkIcon className="w-4 h-4" />
                  <input
                    className="border rounded-xl p-2 flex-1 min-w-[240px]"
                    placeholder="URL CSV público"
                    value={rosterURL}
                    onChange={(e) => setRosterURL(e.target.value)}
                    aria-label="URL del CSV público"
                  />
                  <button
                    className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100"
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
                    className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-gray-50 hover:bg-gray-100"
                    disabled={isBusy("saveRosterURL")}
                    onClick={() =>
                      run("saveRosterURL", async () => {
                        const tx = await contract.setRosterURI(rosterURL);
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
                    className="rounded-xl border px-3 py-2 text-sm flex items-center gap-2 bg-white hover:bg-gray-50"
                    onClick={clearRosterAssociation}
                    aria-label="Limpiar padrón"
                  >
                    Limpiar padrón
                  </button>
                </div>
              </div>
              <RosterTable />
            </div>
          </div>
        )}
      </Card>
    </>
  );
}