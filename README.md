# ProofPart

**Digital passport for used car parts, on blockchain.**
Each part gets a tamper-proof identity and history. Buyers can check, in one click, whether a part is genuine, where it comes from, and whether it has been reported stolen. Master's project, Sorbonne University (Innovation Management).

🔗 **Live demo:** https://niko969.github.io/ProofPart/
📜 **Smart contract (Sepolia testnet):** [`0xcDb75620df1279C3A78faF1160f7D0E9e497cFEa`](https://sepolia.etherscan.io/address/0xcDb75620df1279C3A78faF1160f7D0E9e497cFEa)

---

## 🇫🇷 Présentation

Le marché des pièces auto d'occasion souffre de deux problèmes : les **pièces volées** revendues en ligne, et les **contrefaçons ou pièces non conformes**. L'acheteur n'a aucun moyen fiable de vérifier ce qu'il achète.

ProofPart donne à chaque pièce un **passeport numérique** inscrit sur une blockchain :

- **Une identité unique** : l'empreinte (hash) du numéro de la pièce (dans le produit final, celui d'une puce NFC).
- **Un historique infalsifiable** : fabrication, démontage en casse, pose sur un véhicule, cession, vol… Chaque étape est signée par le professionnel qui la déclare et ne peut jamais être effacée.
- **Des règles appliquées automatiquement** : une pièce déclarée volée ou mise au rebut ne peut plus être posée ni revendue.

### Essayer la démo

1. Ouvrez le [site](https://niko969.github.io/ProofPart/) et cliquez sur **Vérifier une pièce**.
2. Tapez l'un de ces numéros (attention aux majuscules) :

| Numéro | Pièce | Ce que montre la démo |
|---|---|---|
| `Phare-001` | Phare avant Clio 4 | Pièce conforme, revendue à un autre propriétaire |
| `Injecteur-001` | Injecteur Clio 4 | Pièce conforme, juste sortie d'usine |
| `Turbo-001` | Turbo Clio 4 | **Pièce déclarée volée** par un assureur : revente bloquée |

Liens directs : [Phare-001](https://niko969.github.io/ProofPart/passeport.html?id=Phare-001) · [Injecteur-001](https://niko969.github.io/ProofPart/passeport.html?id=Injecteur-001) · [Turbo-001](https://niko969.github.io/ProofPart/passeport.html?id=Turbo-001)

Le site lit les données **en direct sur la blockchain**, gratuitement et sans compte.

### Qui peut faire quoi ?

| Acteur | Actions |
|---|---|
| Consortium (administrateur) | Autorise les professionnels |
| Fabricant | Enregistre une pièce neuve |
| Casse automobile | Enregistre une pièce démontée, la met en stock ou au rebut |
| Garage | Pose une pièce sur un véhicule, signale une réparation, met au rebut |
| Assureur | Déclare une pièce volée |
| Propriétaire (pro ou particulier) | Cède la pièce, en deux temps : le vendeur propose, l'acheteur accepte |
| Tout le monde | Consulte le passeport d'une pièce |

### Architecture technique

```
Navigateur (HTML / CSS / JavaScript)
        │  lecture gratuite via ethers.js
        ▼
Nœud public Sepolia (RPC)
        │
        ▼
Smart contract ProofPart V1 (Solidity) sur Ethereum Sepolia
```

| Fichier | Rôle |
|---|---|
| `ProofPart.sol` | Le smart contract (Solidity), identique au code déployé et vérifié. À l'intérieur, le contrat s'appelle encore `AutoTrace`, le nom de code de la V1 : le renommer changerait le code et il ne correspondrait plus au contrat déployé. |
| `index.html` | Page d'accueil |
| `verifier.html` | Formulaire de saisie du numéro de pièce |
| `passeport.html` + `app.js` | Affichage du passeport (statut et historique) |
| `blockchain.js` | Connexion au contrat : adresse, ABI, lectures |
| `liste.html` + `liste.js` | Liste de toutes les pièces (en cours, voir ci-dessous) |
| `style.css` | Mise en forme |

**Technologies :** Solidity 0.8 · Remix · MetaMask · Ethereum Sepolia (testnet) · ethers.js v6 · HTML / CSS / JavaScript · GitHub Pages. Le contrat est vérifié publiquement sur Sourcify.

### État du projet et prochaines étapes

- ✅ Smart contract déployé et testé (rôles, statuts, cession en deux temps, blocage des pièces volées)
- ✅ Site connecté à la blockchain, en ligne
- 🚧 Page « liste de toutes les pièces » : limitée par les quotas du serveur public gratuit
- 🔜 Espace professionnel : enregistrer et déclarer depuis le site, sans passer par Remix
- 🔜 V2 du contrat : déclaration « pièce retrouvée », compatibilité véhicule, frais de transaction pris en charge par ProofPart (les professionnels gardent leurs propres clés), déploiement sur un layer 2 pour réduire les coûts

> ⚠️ Prototype pédagogique sur un réseau de test : les données et la monnaie utilisées n'ont aucune valeur réelle. Aucune donnée personnelle n'est inscrite sur la blockchain.

### Équipe

Projet réalisé dans le cadre du PPE du Master Management de l'Innovation, Sorbonne Université (2026-2027).

- Nicolas Ramirez Vidal : blockchain, smart contract et site
- *[À compléter avec les membres du groupe et leur rôle]*
