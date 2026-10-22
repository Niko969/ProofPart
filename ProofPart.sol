// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/*
 * AutoTrace — prototype de traçabilité des pièces auto sur blockchain
 *
 * Principe :
 *  - Un administrateur (le consortium) autorise des professionnels :
 *    fabricants, casses agréées, garages, assureurs.
 *  - Les professionnels écrivent l'histoire technique de la pièce
 *    (fabrication, démontage, pose, réparation, rebut, vol).
 *  - Les particuliers ne peuvent faire qu'une chose : se transmettre
 *    la pièce (cession en deux temps : le vendeur propose, l'acheteur accepte).
 *  - Rien n'est jamais effacé : chaque action ajoute une ligne à l'historique.
 *  - Une pièce volée ou au rebut ne peut plus être posée ni revendue.
 *
 * Identifiant d'une pièce : l'empreinte (hash) du numéro unique de sa puce NFC.
 * Pour tester, la fonction idDepuisNumero("PHARE-001") calcule cet identifiant.
 */
contract AutoTrace {
    // Valeurs à saisir dans Remix : Aucun=0, Fabricant=1, Casse=2, Garage=3, Assureur=4
    enum Role { Aucun, Fabricant, Casse, Garage, Assureur }

    // NonEnregistree=0, Conforme=1, EnStock=2, Posee=3, AuRebut=4, Volee=5
    enum Statut { NonEnregistree, Conforme, EnStock, Posee, AuRebut, Volee }

    struct Evenement {
        string action;     // ex. "Fabrication", "Pose sur vehicule", "Declaration de vol"
        address auteur;    // qui a inscrit l'événement
        uint256 date;      // horodatage du bloc
        string details;    // info libre : lot, véhicule, numéro de dossier...
    }

    struct Piece {
        string designation;          // ex. "Phare avant gauche Clio 4"
        Statut statut;
        address proprietaire;
        address cessionEnAttente;  // acheteur désigné par le vendeur, en attente d'acceptation
        bool existe;
    }

    address public administrateur;
    mapping(address => Role) public roles;
    mapping(address => string) public nomsPros;

    mapping(bytes32 => Piece) private pieces;
    mapping(bytes32 => Evenement[]) private historiques;

    event ProAutorise(address indexed pro, Role role, string nom);
    event PieceEnregistree(bytes32 indexed id, string designation, address indexed par);
    event StatutModifie(bytes32 indexed id, Statut statut, address indexed par);
    event CessionProposee(bytes32 indexed id, address indexed vendeur, address indexed acheteur);
    event CessionEffectuee(bytes32 indexed id, address indexed ancien, address indexed nouveau);

    modifier seulementAdmin() {
        require(msg.sender == administrateur, "Reserve a l'administrateur");
        _;
    }

    modifier seulementRole(Role r) {
        require(roles[msg.sender] == r, "Role non autorise pour cette action");
        _;
    }

    modifier pieceExiste(bytes32 id) {
        require(pieces[id].existe, "Piece inconnue");
        _;
    }

    constructor() {
        administrateur = msg.sender;
    }

    // ---------------------------------------------------------------
    // Gestion des professionnels
    // ---------------------------------------------------------------

    function autoriserPro(address pro, Role role, string calldata nom) external seulementAdmin {
        require(role != Role.Aucun, "Role invalide");
        roles[pro] = role;
        nomsPros[pro] = nom;
        emit ProAutorise(pro, role, nom);
    }

    function retirerPro(address pro) external seulementAdmin {
        roles[pro] = Role.Aucun;
    }

    // ---------------------------------------------------------------
    // Entrée de la pièce dans la blockchain (fabricant ou casse)
    // ---------------------------------------------------------------

    function enregistrerPiece(bytes32 id, string calldata designation, string calldata details) external {
        Role r = roles[msg.sender];
        require(r == Role.Fabricant || r == Role.Casse, "Seuls fabricants et casses enregistrent");
        require(!pieces[id].existe, "Piece deja enregistree");

        Statut s = (r == Role.Casse) ? Statut.EnStock : Statut.Conforme;
        pieces[id] = Piece(designation, s, msg.sender, address(0), true);

        _ajouter(id, r == Role.Casse ? "Demontage et mise en stock" : "Fabrication", details);
        emit PieceEnregistree(id, designation, msg.sender);
    }

    // ---------------------------------------------------------------
    // Vie technique de la pièce (professionnels uniquement)
    // ---------------------------------------------------------------

    function poserPiece(bytes32 id, string calldata vehicule) external seulementRole(Role.Garage) pieceExiste(id) {
        _exigerUtilisable(id);
        _changerStatut(id, Statut.Posee, "Pose sur vehicule", vehicule);
    }

    function signalerReparation(bytes32 id, string calldata details) external seulementRole(Role.Garage) pieceExiste(id) {
        _exigerUtilisable(id);
        _ajouter(id, "Reparation", details);
    }

    function mettreEnStock(bytes32 id, string calldata details) external seulementRole(Role.Casse) pieceExiste(id) {
        _exigerUtilisable(id);
        _changerStatut(id, Statut.EnStock, "Demontage et mise en stock", details);
    }

    function mettreAuRebut(bytes32 id, string calldata raison) external pieceExiste(id) {
        Role r = roles[msg.sender];
        require(r == Role.Garage || r == Role.Casse, "Seuls garages et casses mettent au rebut");
        _changerStatut(id, Statut.AuRebut, "Mise au rebut", raison);
        pieces[id].cessionEnAttente = address(0);
    }

    function declarerVol(bytes32 id, string calldata numeroDossier) external seulementRole(Role.Assureur) pieceExiste(id) {
        _changerStatut(id, Statut.Volee, "Declaration de vol", numeroDossier);
        pieces[id].cessionEnAttente = address(0);
    }

    // ---------------------------------------------------------------
    // Cession entre propriétaires (particuliers ou pros)
    // Dans le vrai produit, l'acceptation exige de scanner la puce NFC,
    // ce qui prouve que l'acheteur a la pièce entre les mains.
    // ---------------------------------------------------------------

    function proposerCession(bytes32 id, address acheteur) external pieceExiste(id) {
        Piece storage p = pieces[id];
        require(msg.sender == p.proprietaire, "Seul le proprietaire peut ceder");
        require(acheteur != address(0) && acheteur != msg.sender, "Acheteur invalide");
        _exigerUtilisable(id);

        p.cessionEnAttente = acheteur;
        emit CessionProposee(id, msg.sender, acheteur);
    }

    function accepterCession(bytes32 id) external pieceExiste(id) {
        Piece storage p = pieces[id];
        require(msg.sender == p.cessionEnAttente, "Aucune cession en attente pour vous");
        _exigerUtilisable(id);

        address ancien = p.proprietaire;
        p.proprietaire = msg.sender;
        p.cessionEnAttente = address(0);

        _ajouter(id, "Cession", "");
        emit CessionEffectuee(id, ancien, msg.sender);
    }

    // ---------------------------------------------------------------
    // Consultation (gratuite, accessible à tous)
    // ---------------------------------------------------------------

    function consulterPiece(bytes32 id)
        external
        view
        pieceExiste(id)
        returns (string memory designation, Statut statut, address proprietaire, uint256 nombreEvenements)
    {
        Piece storage p = pieces[id];
        return (p.designation, p.statut, p.proprietaire, historiques[id].length);
    }

    function consulterHistorique(bytes32 id) external view pieceExiste(id) returns (Evenement[] memory) {
        return historiques[id];
    }

    function idDepuisNumero(string calldata numero) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(numero));
    }

    // ---------------------------------------------------------------
    // Fonctions internes
    // ---------------------------------------------------------------

    function _exigerUtilisable(bytes32 id) internal view {
        Statut s = pieces[id].statut;
        require(s != Statut.Volee && s != Statut.AuRebut, "Piece volee ou au rebut");
    }

    function _changerStatut(bytes32 id, Statut s, string memory action, string memory details) internal {
        pieces[id].statut = s;
        _ajouter(id, action, details);
        emit StatutModifie(id, s, msg.sender);
    }

    function _ajouter(bytes32 id, string memory action, string memory details) internal {
        historiques[id].push(Evenement(action, msg.sender, block.timestamp, details));
    }
}
