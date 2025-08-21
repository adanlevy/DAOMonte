// SPDX-License-Identifier: MIT

pragma solidity ^0.8.26;

import "@openzeppelin/contracts/security/Pausable.sol";


contract GroupDAO is Pausable {
    // ---------------- Ownable + Admins ----------------
    address public owner;
    mapping(address => bool) public isAdmin; // Incluye owner
    address[] private _admins; // Listado para UI
    mapping(address => uint32) private _adminIndexPlus1; // Índice + 1 para borrado eficiente

    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);
    event AdminAdded(address indexed admin);
    event AdminRemoved(address indexed admin);

    modifier onlyOwner() {
        require(msg.sender == owner, "only owner");
        _;
    }

    modifier onlyOwnerOrAdmin() {
        require(msg.sender == owner || isAdmin[msg.sender], "only owner/admin");
        _;
    }

    constructor() {
        owner = msg.sender;
        _addAdmin(msg.sender); // Owner es admin por defecto
    }

    /// @notice Transfiere la propiedad del contrato a una nueva dirección
    /// @param newOwner Dirección del nuevo propietario
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "zero address");
        require(users[newOwner].registered, "new owner not registered");
        emit OwnershipTransferred(owner, newOwner);
        _removeAdmin(owner); // Remueve admin status del owner anterior
        _addAdmin(newOwner); // Añade admin status al nuevo owner
        owner = newOwner;
    }

    /// @notice Añade un nuevo administrador
    /// @param a Dirección del nuevo administrador
    function addAdmin(address a) external onlyOwnerOrAdmin whenNotPaused {
        _addAdmin(a);
    }

    /// @notice Remueve un administrador
    /// @param a Dirección del administrador a remover
    function removeAdmin(address a) external onlyOwnerOrAdmin whenNotPaused {
        _removeAdmin(a);
    }

    function _addAdmin(address a) internal {
        require(a != address(0), "zero address");
        if (!isAdmin[a]) {
            isAdmin[a] = true;
            _admins.push(a);
            _adminIndexPlus1[a] = uint32(_admins.length); // idx+1
            emit AdminAdded(a);
        }
    }

    function _removeAdmin(address a) internal {
        if (!isAdmin[a]) return;
        isAdmin[a] = false;
        uint32 idx1 = _adminIndexPlus1[a];
        if (idx1 != 0) {
            uint32 idx = idx1 - 1;
            uint256 last = _admins.length - 1;
            if (idx != last) {
                address swapA = _admins[last];
                _admins[idx] = swapA;
                _adminIndexPlus1[swapA] = idx + 1;
            }
            _admins.pop();
            _adminIndexPlus1[a] = 0;
        }
        emit AdminRemoved(a);
    }

    /// @notice Obtiene la lista de administradores
    /// @return Array de direcciones de administradores
    function getAdmins() external view returns (address[] memory) {
        return _admins;
    }

    // ---------------- Usuarios (hash PII) ----------------
    struct User {
        bool registered;
        bytes32 dniHash;
        bytes32 nameHash;
    }
    mapping(address => User) public users;
    address[] private _registeredUsers; // Lista de usuarios registrados
    mapping(address => uint32) private _registeredUserIndexPlus1; // Índice + 1

    event UserRegistered(address indexed user, bytes32 dniHash, bytes32 nameHash);

    /// @notice Registra un usuario con hash de DNI y nombre
    /// @param dniHash Hash del DNI del usuario
    /// @param nameHash Hash del nombre completo del usuario
    function registerUser(bytes32 dniHash, bytes32 nameHash) external whenNotPaused {
        require(!users[msg.sender].registered, "ya registrado");
        users[msg.sender] = User({registered: true, dniHash: dniHash, nameHash: nameHash});
        _registeredUsers.push(msg.sender);
        _registeredUserIndexPlus1[msg.sender] = uint32(_registeredUsers.length);
        emit UserRegistered(msg.sender, dniHash, nameHash);
    }

    /// @notice Verifica si una dirección está registrada
    /// @param u Dirección del usuario
    /// @return True si está registrado
    function isRegistered(address u) external view returns (bool) {
        return users[u].registered;
    }

    /// @notice Obtiene los hashes de DNI y nombre de un usuario
    /// @param u Dirección del usuario
    /// @return dniHash Hash del DNI, nameHash Hash del nombre
    function getUserHashes(address u) external view returns (bytes32 dniHash, bytes32 nameHash) {
        User memory us = users[u];
        return (us.dniHash, us.nameHash);
    }

    /// @notice Obtiene un segmento de usuarios registrados
    /// @param start Índice inicial
    /// @param count Cantidad de usuarios a devolver
    /// @return out Array de direcciones de usuarios registrados
    function getRegisteredUsers(uint256 start, uint256 count) external view returns (address[] memory out) {
        if (start >= _registeredUsers.length) return new address[](0);
        uint256 end = start + count;
        if (end > _registeredUsers.length) end = _registeredUsers.length;
        uint256 n = end - start;
        out = new address[](n);
        for (uint256 i = 0; i < n; i++) out[i] = _registeredUsers[start + i];
    }

    // ---------------- Grupos ----------------
    struct Group {
        uint256 id;
        string name;
        bool active;
        uint32 memberCount; // Optimizado a uint32
    }

    uint256 public groupCount;
    mapping(uint256 => Group) public groups;

    mapping(uint256 => address[]) private _groupMembers;
    mapping(uint256 => mapping(address => uint32)) private _groupMemberIndexPlus1; // Índice + 1
    mapping(uint256 => mapping(address => bool)) public isInGroup;

    mapping(address => uint256[]) private _userGroups;
    mapping(address => mapping(uint256 => uint32)) private _userGroupIndexPlus1;

    event GroupCreated(uint256 indexed id, string name);
    event GroupActiveSet(uint256 indexed id, bool active);
    event GroupMemberAdded(uint256 indexed id, address indexed user);
    event GroupMemberRemoved(uint256 indexed id, address indexed user);

    /// @notice Crea un nuevo grupo
    /// @param name Nombre del grupo
    /// @return ID del grupo creado
    function createGroup(string calldata name) external onlyOwnerOrAdmin whenNotPaused returns (uint256) {
        require(bytes(name).length > 0, "nombre vacio");
        groupCount += 1;
        groups[groupCount] = Group({ id: groupCount, name: name, active: true, memberCount: 0 });
        emit GroupCreated(groupCount, name);
        return groupCount;
    }

    /// @notice Activa o desactiva un grupo
    /// @param groupId ID del grupo
    /// @param active Estado (true=activo, false=inactivo)
    function setGroupActive(uint256 groupId, bool active) external onlyOwnerOrAdmin whenNotPaused {
        require(groups[groupId].id != 0, "no group");
        groups[groupId].active = active;
        emit GroupActiveSet(groupId, active);
    }

    /// @notice Añade múltiples usuarios a un grupo
    /// @param groupId ID del grupo
    /// @param addrs Array de direcciones de usuarios
    function addUsersToGroup(uint256 groupId, address[] calldata addrs) external onlyOwnerOrAdmin whenNotPaused {
        require(groups[groupId].id != 0, "no group");
        require(addrs.length <= 100, "too many users"); // Límite para gas
        for (uint256 i = 0; i < addrs.length; i++) {
            address a = addrs[i];
            if (a == address(0) || isInGroup[groupId][a]) continue;
            require(users[a].registered, "user not registered");
            isInGroup[groupId][a] = true;
            _groupMembers[groupId].push(a);
            _groupMemberIndexPlus1[groupId][a] = uint32(_groupMembers[groupId].length);
            groups[groupId].memberCount += 1;
            if (_userGroupIndexPlus1[a][groupId] == 0) {
                _userGroups[a].push(groupId);
                _userGroupIndexPlus1[a][groupId] = uint32(_userGroups[a].length);
            }
            emit GroupMemberAdded(groupId, a);
        }
    }

    /// @notice Remueve un usuario de un grupo
    /// @param groupId ID del grupo
    /// @param user Dirección del usuario
    function removeUserFromGroup(uint256 groupId, address user) public onlyOwnerOrAdmin whenNotPaused {
        uint32 idx1 = _groupMemberIndexPlus1[groupId][user];
        if (idx1 == 0) return;
        isInGroup[groupId][user] = false;
        address[] storage arr = _groupMembers[groupId];
        uint256 lastArr = arr.length - 1; // Renamed from 'last' to 'lastArr'
        if (idx1 - 1 != lastArr) {
            address swapU = arr[lastArr];
            arr[idx1 - 1] = swapU;
            _groupMemberIndexPlus1[groupId][swapU] = idx1;
        }
        arr.pop();
        _groupMemberIndexPlus1[groupId][user] = 0;
        if (groups[groupId].memberCount > 0) groups[groupId].memberCount -= 1;
        uint32 uidx1 = _userGroupIndexPlus1[user][groupId];
        if (uidx1 != 0) {
            uint256[] storage uarr = _userGroups[user];
            uint256 lastUarr = uarr.length - 1; // Renamed from 'last' to 'lastUarr'
            if (uidx1 - 1 != lastUarr) {
                uint256 swapG = uarr[lastUarr];
                uarr[uidx1 - 1] = swapG;
                _userGroupIndexPlus1[user][swapG] = uidx1;
            }
            uarr.pop();
            _userGroupIndexPlus1[user][groupId] = 0;
        }
        emit GroupMemberRemoved(groupId, user);
    }

    /// @notice Remueve un usuario de todos los grupos
    /// @param user Dirección del usuario
    function removeUserFromAllGroups(address user) external onlyOwnerOrAdmin whenNotPaused {
        uint256[] memory gs = _userGroups[user];
        for (uint256 i = gs.length; i > 0; i--) {
            removeUserFromGroup(gs[i-1], user);
        }
    }

    /// @notice Obtiene información básica de un grupo
    /// @param groupId ID del grupo
    /// @return id ID del grupo
    /// @return name Nombre del grupo
    /// @return active Estado del grupo (activo/inactivo)
    /// @return memberCount Número de miembros en el grupo
    function getGroupCore(uint256 groupId) external view returns (uint256 id, string memory name, bool active, uint32 memberCount) {
        Group memory g = groups[groupId];
        return (g.id, g.name, g.active, g.memberCount);
    }

    /// @notice Obtiene todos los miembros de un grupo
    /// @param groupId ID del grupo
    /// @return Array de direcciones de miembros
    function getGroupMembers(uint256 groupId) external view returns (address[] memory) {
        return _groupMembers[groupId];
    }

    /// @notice Obtiene un segmento de miembros de un grupo
    /// @param groupId ID del grupo
    /// @param start Índice inicial
    /// @param count Cantidad de miembros a devolver
    /// @return out Array de direcciones de miembros
    function getGroupMembersSlice(uint256 groupId, uint256 start, uint256 count) external view returns (address[] memory out) {
        address[] storage arr = _groupMembers[groupId];
        if (start >= arr.length) return new address[](0);
        uint256 end = start + count;
        if (end > arr.length) end = arr.length;
        uint256 n = end - start;
        out = new address[](n);
        for (uint256 i = 0; i < n; i++) out[i] = arr[start + i];
    }

    /// @notice Obtiene los grupos de un usuario
    /// @param user Dirección del usuario
    /// @return Array de IDs de grupos
    function getUserGroups(address user) external view returns (uint256[] memory) {
        return _userGroups[user];
    }

    // ---------------- Propuestas ----------------
    struct Proposal {
        uint256 id;
        string title;
        string description;
        string legacyText; // Soporte para v1
        uint256 groupId;
        uint64 startDate;
        uint64 endDate;
        address creator;
        uint32 upCount;
        uint32 downCount;
    }

    uint256 public proposalCount;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => uint256[]) private _proposalsByGroup;
    mapping(uint256 => mapping(address => uint8)) private _voteOf; // Declare the _voteOf mapping

    event ProposalCreated(uint256 indexed id, uint256 indexed groupId, string title, uint64 startDate, uint64 endDate);
    event Voted(uint256 indexed id, address indexed user, uint8 choice);
    event VoteChanged(uint256 indexed id, address indexed user, uint8 oldChoice, uint8 newChoice);
    event VoteRetracted(uint256 indexed id, address indexed user, uint8 oldChoice);

    modifier onlyAdminGroup(uint256 groupId) {
        require(groups[groupId].id != 0, "no group");
        require(groups[groupId].active, "grupo inactivo");
        require(isAdmin[msg.sender] || msg.sender == owner, "only admin");
        _;
    }

    /// @notice Crea una propuesta (v1, texto único)
    /// @param text Texto completo (formato "titulo||descripcion")
    /// @param groupId ID del grupo
    /// @param startTime Fecha de inicio (epoch segundos)
    /// @param endTime Fecha de fin (epoch segundos)
    /// @return ID de la propuesta
    function createProposal(
        string calldata text,
        uint256 groupId,
        uint64 startTime,
        uint64 endTime
    ) external onlyAdminGroup(groupId) whenNotPaused returns (uint256) {
        require(bytes(text).length > 0, "texto vacio");
        require(startTime <= endTime, "rango invalido");
        proposalCount += 1;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: "",
            description: "",
            legacyText: text,
            groupId: groupId,
            startDate: startTime,
            endDate: endTime,
            creator: msg.sender,
            upCount: 0,
            downCount: 0
        });
        _proposalsByGroup[groupId].push(proposalCount);
        emit ProposalCreated(proposalCount, groupId, text, startTime, endTime);
        return proposalCount;
    }

    /// @notice Crea una propuesta (v2, título y descripción separados)
    /// @param title Título de la propuesta
    /// @param description Descripción de la propuesta
    /// @param groupId ID del grupo
    /// @param startDate Fecha de inicio (epoch segundos)
    /// @param endDate Fecha de fin (epoch segundos)
    /// @return ID de la propuesta
    function createProposal2(
        string calldata title,
        string calldata description,
        uint256 groupId,
        uint64 startDate,
        uint64 endDate
    ) external onlyAdminGroup(groupId) whenNotPaused returns (uint256) {
        require(bytes(title).length > 0, "titulo vacio");
        require(startDate <= endDate, "rango invalido");
        proposalCount += 1;
        proposals[proposalCount] = Proposal({
            id: proposalCount,
            title: title,
            description: description,
            legacyText: "",
            groupId: groupId,
            startDate: startDate,
            endDate: endDate,
            creator: msg.sender,
            upCount: 0,
            downCount: 0
        });
        _proposalsByGroup[groupId].push(proposalCount);
        emit ProposalCreated(proposalCount, groupId, title, startDate, endDate);
        return proposalCount;
    }

    /// @notice Obtiene información de una propuesta (v1)
    /// @param proposalId ID de la propuesta
    function getProposalCore(uint256 proposalId)
        external
        view
        returns (
            uint256 id,
            string memory text,
            uint256 groupId,
            uint64 startTime,
            uint64 endTime,
            address creator,
            uint32 upCount,
            uint32 downCount
        )
    {
        Proposal storage p = proposals[proposalId];
        string memory txt = bytes(p.legacyText).length != 0 ? p.legacyText : p.title;
        return (p.id, txt, p.groupId, p.startDate, p.endDate, p.creator, p.upCount, p.downCount);
    }

    /// @notice Obtiene información de una propuesta (v2)
    /// @param proposalId ID de la propuesta
    function getProposalCore2(uint256 proposalId)
        external
        view
        returns (
            uint256 id,
            string memory title,
            string memory description,
            uint256 groupId,
            uint64 startDate,
            uint64 endDate,
            address creator,
            uint32 upCount,
            uint32 downCount
        )
    {
        Proposal storage p = proposals[proposalId];
        return (p.id, p.title, p.description, p.groupId, p.startDate, p.endDate, p.creator, p.upCount, p.downCount);
    }

    /// @notice Obtiene todas las propuestas de un grupo
    /// @param groupId ID del grupo
    function getProposalsByGroup(uint256 groupId) external view returns (uint256[] memory) {
        return _proposalsByGroup[groupId];
    }

    /// @notice Obtiene un segmento de propuestas de un grupo
    /// @param groupId ID del grupo
    /// @param start Índice inicial
    /// @param count Cantidad de propuestas
    function getProposalsByGroupSlice(uint256 groupId, uint256 start, uint256 count) external view returns (uint256[] memory out) {
        uint256[] storage arr = _proposalsByGroup[groupId];
        if (start >= arr.length) return new uint256[](0);
        uint256 end = start + count;
        if (end > arr.length) end = arr.length;
        uint256 n = end - start;
        out = new uint256[](n);
        for (uint256 i = 0; i < n; i++) out[i] = arr[start + i];
    }

    /// @notice Obtiene un segmento de todas las propuestas
    /// @param start Índice inicial
    /// @param count Cantidad de propuestas
    function getAllProposals(uint256 start, uint256 count) external view returns (uint256[] memory out) {
        if (start >= proposalCount) return new uint256[](0);
        uint256 end = start + count;
        if (end > proposalCount) end = proposalCount;
        uint256 n = end - start;
        out = new uint256[](n);
        for (uint256 i = 0; i < n; i++) out[i] = start + i + 1;
    }

    // ---------------- Votación ----------------
    /// @notice Verifica si una votación está abierta
    /// @param proposalId ID de la propuesta
    function isVotingOpen(uint256 proposalId) public view returns (bool) {
        Proposal storage p = proposals[proposalId];
        if (p.id == 0) return false;
        return block.timestamp >= p.startDate && block.timestamp <= p.endDate;
    }

    function _requireMember(uint256 groupId) internal view {
        require(isInGroup[groupId][msg.sender], "no miembro");
        require(users[msg.sender].registered, "no registrado");
    }

    /// @notice Registra un voto en una propuesta
    /// @param proposalId ID de la propuesta
    /// @param choice 1 = a favor, 2 = en contra
    function vote(uint256 proposalId, uint8 choice) external whenNotPaused {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "no prop");
        require(isVotingOpen(proposalId), "cerrada");
        _requireMember(p.groupId);
        require(choice == 1 || choice == 2, "choice");
        require(_voteOf[proposalId][msg.sender] == 0, "ya voto");
        _voteOf[proposalId][msg.sender] = choice;
        if (choice == 1) {
            require(p.upCount < type(uint32).max, "upCount overflow");
            p.upCount += 1;
        } else {
            require(p.downCount < type(uint32).max, "downCount overflow");
            p.downCount += 1;
        }
        emit Voted(proposalId, msg.sender, choice);
    }

    /// @notice Cambia o retracta un voto
    /// @param proposalId ID de la propuesta
    /// @param newChoice 0 = retractar, 1 = a favor, 2 = en contra
    function changeVote(uint256 proposalId, uint8 newChoice) external whenNotPaused {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "no prop");
        require(isVotingOpen(proposalId), "cerrada");
        _requireMember(p.groupId);
        require(newChoice <= 2, "choice");
        uint8 prev = _voteOf[proposalId][msg.sender];
        require(prev != 0, "sin voto");
        if (prev == 1 && p.upCount > 0) p.upCount -= 1;
        if (prev == 2 && p.downCount > 0) p.downCount -= 1;
        if (newChoice == 1) {
            require(p.upCount < type(uint32).max, "upCount overflow");
            p.upCount += 1;
        }
        if (newChoice == 2) {
            require(p.downCount < type(uint32).max, "downCount overflow");
            p.downCount += 1;
        }
        _voteOf[proposalId][msg.sender] = newChoice;
        emit VoteChanged(proposalId, msg.sender, prev, newChoice);
    }

    /// @notice Retracta un voto
    /// @param proposalId ID de la propuesta
    function retractVote(uint256 proposalId) external whenNotPaused {
        Proposal storage p = proposals[proposalId];
        require(p.id != 0, "no prop");
        require(isVotingOpen(proposalId), "cerrada");
        _requireMember(p.groupId);
        uint8 prev = _voteOf[proposalId][msg.sender];
        require(prev != 0, "sin voto");
        if (prev == 1 && p.upCount > 0) p.upCount -= 1;
        if (prev == 2 && p.downCount > 0) p.downCount -= 1;
        _voteOf[proposalId][msg.sender] = 0;
        emit VoteRetracted(proposalId, msg.sender, prev);
    }

    /// @notice Obtiene el voto de un usuario
    /// @param proposalId ID de la propuesta
    /// @param user Dirección del usuario
    function getUserVote(uint256 proposalId, address user) external view returns (uint8) {
        return _voteOf[proposalId][user];
    }

    /// @notice Obtiene los conteos de votos de una propuesta
    /// @param proposalId ID de la propuesta
    /// @return up Votos a favor, down Votos en contra, noVotaron Miembros sin votar
    function getProposalCounts(uint256 proposalId) external view returns (uint32 up, uint32 down, uint32 noVotaron) {
        Proposal storage p = proposals[proposalId];
        up = p.upCount;
        down = p.downCount;
        uint32 voted = up + down;
        noVotaron = groups[p.groupId].memberCount > voted ? groups[p.groupId].memberCount - voted : 0;
    }

    // ---------------- Roster URI ----------------
    string public rosterURI;
    event RosterURIUpdated(string uri);

    /// @notice Establece la URL del roster (CSV público)
    /// @param uri URL del roster
    function setRosterURI(string calldata uri) external onlyOwnerOrAdmin whenNotPaused {
        rosterURI = uri;
        emit RosterURIUpdated(uri);
    }

    // ---------------- Pausabilidad ----------------
    /// @notice Pausa el contrato (solo owner)
    function pause() external onlyOwner {
        _pause();
    }

    /// @notice Despausa el contrato (solo owner)
    function unpause() external onlyOwner {
        _unpause();
    }
}