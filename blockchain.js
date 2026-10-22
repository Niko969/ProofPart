// ===== Lecture de la blockchain =====
// Ce fichier remplace donnees.js : au lieu de lire de fausses données,
// il interroge le contrat AutoTrace (nom de code de ProofPart) déployé sur le réseau de test Sepolia.
// Il ne fait que des LECTURES : gratuit, sans portefeuille ni MetaMask.

// Adresse du contrat sur Sepolia
const ADRESSE_CONTRAT = "0xcDb75620df1279C3A78faF1160f7D0E9e497cFEa";

// Numéro du bloc où le contrat a été déployé : inutile de chercher ses événements avant
const BLOC_DEPLOIEMENT = 11899491;

// Point d'accès public à Sepolia (un serveur qui relaie nos lectures vers la blockchain)
const RPC_SEPOLIA = "https://ethereum-sepolia-rpc.publicnode.com";

// L'ABI : le « mode d'emploi » des seules fonctions dont le site a besoin
const ABI = [
  "function consulterPiece(bytes32 id) view returns (string designation, uint8 statut, address proprietaire, uint256 nombreEvenements)",
  "function consulterHistorique(bytes32 id) view returns (tuple(string action, address auteur, uint256 date, string details)[])",
  "function nomsPros(address pro) view returns (string)",
  "event PieceEnregistree(bytes32 indexed id, string designation, address indexed par)"
];

// Connexion au contrat, en lecture seule
const fournisseur = new ethers.JsonRpcProvider(RPC_SEPOLIA);
const contrat = new ethers.Contract(ADRESSE_CONTRAT, ABI, fournisseur);

// Les statuts sont stockés en nombres sur la blockchain : on les traduit
const STATUTS = ["inconnue", "conforme", "stock", "posee", "rebut", "volee"];

// Transforme ce que l'utilisateur tape en identifiant de pièce (bytes32).
// - S'il colle déjà un identifiant 0x... de 66 caractères, on le garde tel quel.
// - Sinon (ex. "PHARE-001"), on calcule son empreinte, exactement comme
//   la fonction idDepuisNumero du contrat.
function identifiantDepuisSaisie(saisie) {
  const texte = saisie.trim();
  if (/^0x[0-9a-fA-F]{64}$/.test(texte)) {
    return texte.toLowerCase();
  }
  return ethers.id(texte);   // keccak256 du texte
}

// Renvoie la pièce lue sur la blockchain, ou undefined si elle n'est pas enregistrée.
// Même nom et même forme de résultat que l'ancien donnees.js.
async function consulterPiece(id) {
  let fiche;
  try {
    fiche = await contrat.consulterPiece(id);
  } catch (erreur) {
    // Le contrat refuse avec "Piece inconnue" si l'identifiant n'existe pas
    if (String(erreur.reason || erreur.message).includes("Piece inconnue")) {
      return undefined;
    }
    throw erreur;   // autre problème (réseau...) : on le signale à app.js
  }

  const evenements = await contrat.consulterHistorique(id);

  // Pour chaque événement, on cherche le nom du professionnel qui l'a inscrit
  const historique = await Promise.all(evenements.map(async (e) => {
    const nom = await contrat.nomsPros(e.auteur);
    return {
      date: new Date(Number(e.date) * 1000).toLocaleDateString("fr-FR"),
      action: e.action,
      auteur: nom || abreger(e.auteur)   // un particulier n'a pas de nom : on affiche son adresse
    };
  }));

  return {
    designation: fiche.designation,
    reference: abreger(id),
    compatible: "Non renseigné",
    statut: STATUTS[Number(fiche.statut)] || "inconnue",
    historique: historique
  };
}

// Renvoie la liste de toutes les pièces enregistrées, avec leur statut actuel.
// Le contrat ne sait pas lister ses pièces : on relit donc tous les événements
// "PieceEnregistree" émis depuis son déploiement.
// Les serveurs publics gratuits ont deux limites :
// - ils refusent de chercher sur trop de blocs d'un coup -> on découpe en tranches de 10 000 blocs ;
// - ils bloquent temporairement si on envoie trop de demandes à la fois -> on les envoie
//   une par une, et on réessaie après une courte pause en cas de refus.
const TAILLE_TRANCHE = 10000;

function pause(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function avecReessai(demande, essais = 3) {
  for (let i = 1; ; i++) {
    try {
      return await demande();
    } catch (erreur) {
      if (i >= essais) throw erreur;
      console.warn("Demande refusée, nouvel essai dans " + i + " s", erreur);
      await pause(1000 * i);
    }
  }
}

async function listerPieces() {
  const dernierBloc = await avecReessai(() => fournisseur.getBlockNumber());

  // 1. Retrouver tous les enregistrements, tranche par tranche
  const evenements = [];
  for (let debut = BLOC_DEPLOIEMENT; debut <= dernierBloc; debut += TAILLE_TRANCHE) {
    const fin = Math.min(debut + TAILLE_TRANCHE - 1, dernierBloc);
    const tranche = await avecReessai(() =>
      contrat.queryFilter(contrat.filters.PieceEnregistree(), debut, fin));
    evenements.push(...tranche);
  }

  // 2. Lire le statut actuel de chaque pièce (il a pu changer depuis l'enregistrement)
  const pieces = [];
  for (const e of evenements) {
    const id = e.args.id;
    const fiche = await avecReessai(() => contrat.consulterPiece(id));
    pieces.push({
      id: id,
      designation: fiche.designation,
      statut: STATUTS[Number(fiche.statut)] || "inconnue"
    });
  }
  return pieces;
}

// Raccourcit une adresse ou un identifiant : 0x1234...abcd
function abreger(texte) {
  return texte.slice(0, 6) + "..." + texte.slice(-4);
}