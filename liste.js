// ===== Liste de toutes les pièces du registre =====

const libelles = {
  conforme: "Conforme",
  stock: "En stock",
  posee: "Posée",
  volee: "Volée",
  rebut: "Au rebut"
};

afficherListe();

async function afficherListe() {
  const message = document.getElementById("message");
  const liste = document.getElementById("liste");
  message.textContent = "Lecture de la blockchain...";

  try {
    const pieces = await listerPieces();

    if (pieces.length === 0) {
      message.textContent = "Aucune pièce enregistrée pour le moment.";
      return;
    }
    message.textContent = pieces.length + " pièce(s) enregistrée(s)";

    // Une ligne cliquable par pièce, qui ouvre son passeport
    for (const piece of pieces) {
      const ligne = document.createElement("li");
      const lien = document.createElement("a");
      lien.href = "passeport.html?id=" + piece.id;

      const badge = document.createElement("span");
      badge.className = "statut " + piece.statut;
      badge.textContent = libelles[piece.statut] || "Inconnue";

      lien.appendChild(badge);
      lien.append(" " + piece.designation + " (" + abreger(piece.id) + ")");
      ligne.appendChild(lien);
      liste.appendChild(ligne);
    }
  } catch (erreur) {
    console.error(erreur);
    message.textContent = "Blockchain injoignable : impossible de lire le registre pour le moment.";
  }
}