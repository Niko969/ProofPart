// ===== Affichage du passeport de la pièce =====
// Même logique qu'avant, mais les données viennent maintenant de la blockchain.
// Lire la blockchain prend un peu de temps : on utilise donc async / await.

// Texte affiché pour chaque statut
const libelles = {
  conforme: "Conforme",
  stock: "En stock",
  posee: "Posée",
  volee: "Volée",
  rebut: "Au rebut"
};

// Lancer l'affichage dès que la page est chargée
afficherPasseport();

async function afficherPasseport() {
  // 1) Lire ce qui a été tapé, dans l'adresse de la page (passeport.html?id=...)
  const parametres = new URLSearchParams(window.location.search);
  const saisie = parametres.get("id") || "";

  // 2) Message d'attente pendant la lecture de la blockchain
  document.getElementById("designation").textContent = "Lecture de la blockchain...";

  try {
    const id = identifiantDepuisSaisie(saisie);
    const piece = await consulterPiece(id);   // "await" : on attend la réponse de la blockchain

    if (piece) {
      afficherPiece(piece);
    } else {
      afficherPieceInconnue(saisie);
    }
  } catch (erreur) {
    // Problème de connexion : on ne dit PAS que la pièce est inconnue
    console.error(erreur);
    document.getElementById("designation").textContent = "Blockchain injoignable";
    document.getElementById("reference").textContent = "—";
    document.getElementById("compatible").textContent = "—";
    ajouterLigne("Impossible de lire le registre pour le moment. Vérifiez votre connexion et réessayez.");
  }
}

// --- Affiche une pièce enregistrée ---
function afficherPiece(piece) {
  document.getElementById("designation").textContent = piece.designation;
  document.getElementById("reference").textContent = piece.reference;
  document.getElementById("compatible").textContent = piece.compatible;

  const badge = document.getElementById("statut");
  badge.textContent = libelles[piece.statut] || "Inconnue";
  badge.classList.add(piece.statut);        // Classe pour la couleur

  for (const evenement of piece.historique) {
    ajouterLigne(evenement.date + " – " + evenement.action + " – " + evenement.auteur);
  }
}

// --- Affiche un avertissement si la pièce n'est pas dans le registre ---
function afficherPieceInconnue(saisie) {
  const badge = document.getElementById("statut");
  badge.textContent = "Inconnue";
  badge.classList.add("inconnue");          // Orange : prudence

  document.getElementById("designation").textContent = "Pièce non enregistrée";
  document.getElementById("reference").textContent = saisie || "aucun identifiant";
  document.getElementById("compatible").textContent = "—";
  ajouterLigne("Cette pièce n'apparaît pas dans le registre ProofPart : soyez prudent avant de l'acheter.");
}

// --- Ajoute une ligne dans l'historique ---
function ajouterLigne(texte) {
  const ligne = document.createElement("li");
  ligne.textContent = texte;
  document.getElementById("historique").appendChild(ligne);
}