# 🎰 BetZilla - Decentralized Sports Betting Platform

BetZilla è una piattaforma di scommesse sportive decentralizzata costruita su blockchain Ethereum. Gli utenti possono piazzare scommesse "cieche" (blind betting) su partite sportive prima che le quote vengano rivelate, creando un'esperienza di scommesse unica e trasparente.

## 🌟 Caratteristiche Principali

### 🎯 **Blind Betting System**
- **Scommesse Cieche**: Piazzamento scommesse prima della rivelazione delle quote
- **Trasparenza Totale**: Tutte le transazioni sono registrate sulla blockchain
- **Nessuna Manipolazione**: Le quote vengono rivelate solo all'inizio della partita

### 💰 **Gestione Scommesse**
- **Scommesse Multiple**: Possibilità di scommettere più volte sullo stesso mercato
- **Portfolio Tracking**: Visualizzazione completa delle scommesse attive e risolte
- **Statistiche Dettagliate**: Tracking di vittorie, perdite e importi scommessi

### 🏆 **Sistema di Vincite**
- **Claim Automatico**: Ritiro automatico delle vincite quando le partite sono risolte
- **Gestione Rischi**: Sistema di validazione per prevenire scommesse non valide
- **Trasparenza**: Tutti i risultati sono verificabili sulla blockchain

## 🏗️ Architettura del Sistema

```
BetZilla/
├── contracts/          # Smart Contracts (Solidity)
│   ├── BetZilla.sol   # Contratto principale
│   └── scripts/       # Script di deploy
├── backend/           # API Backend (Node.js/Express)
│   └── index.js      # Server API
├── frontend/         # Interfaccia Utente (React)
│   ├── src/
│   │   ├── App.js    # Componente principale
│   │   ├── hooks/    # Custom hooks
│   │   └── abi/      # ABI del contratto
│   └── public/
└── scripts/          # Script di utilità
    ├── start-betzilla.sh
    └── stop-betzilla.sh
```

## 🚀 Installazione e Setup

### Prerequisiti
- **Node.js** (versione 16 o superiore)
- **npm** o **yarn**
- **MetaMask** (estensione browser)
- **Git**

### 1. Clona il Repository
```bash
git clone <repository-url>
cd betzilla
```

### 2. Installa le Dipendenze
```bash
# Smart Contracts
cd contracts
npm install

# Backend
cd ../backend
npm install

# Frontend
cd ../frontend
npm install
```

### 3. Configurazione MetaMask
1. Apri MetaMask
2. Aggiungi una nuova rete:
   - **Network Name**: `Hardhat Local`
   - **New RPC URL**: `http://127.0.0.1:8545`
   - **Chain ID**: `31337`
   - **Currency Symbol**: `ETH`

3. Importa un account di test:
   - **Address**: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
   - **Private Key**: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

## 🎮 Utilizzo

### Avvio Rapido
```bash
# Usa gli script di utilità
./start-betzilla.sh
```

### Avvio Manuale

#### 1. Avvia Hardhat Node
```bash
cd contracts
npx hardhat node
```

#### 2. Deploya il Contratto
```bash
# In un nuovo terminale
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

#### 3. Avvia il Backend
```bash
# In un nuovo terminale
cd backend
npm start
```

#### 4. Avvia il Frontend
```bash
# In un nuovo terminale
cd frontend
npm start
```

### Accesso all'Applicazione
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Hardhat Node**: http://localhost:8545

## 📱 Funzionalità dell'Interfaccia

### 🎯 **Sezione Scommesse**
- **Visualizzazione Partite**: Lista delle partite disponibili per le scommesse
- **Blind Betting**: Piazzamento scommesse prima della rivelazione quote
- **Validazione**: Controlli automatici per outcome validi per sport

### 📊 **Portfolio Scommesse**
- **Scommesse Attive**: Visualizzazione scommesse in corso
- **Scommesse Risolte**: Storico scommesse completate
- **Claim Vincite**: Ritiro automatico delle vincite

### 📈 **Statistiche**
- **Totale Scommesse**: Numero totale di scommesse piazzate
- **Importo Totale**: Somma di tutte le scommesse
- **Vittorie/Perdite**: Tracking performance

## 🔧 Smart Contract - BetZilla.sol

### Funzioni Principali

#### `placeBet(uint256 marketId, uint8 outcome)`
- Piazzamento di una scommessa su un mercato specifico
- Validazione outcome e importo
- Supporto per scommesse multiple sullo stesso mercato

#### `createMarket(string memory description, uint256 startTime)`
- Creazione di nuovi mercati di scommesse
- Impostazione descrizione e orario di inizio

#### `resolveMarket(uint256 marketId, uint8 winningOutcome)`
- Risoluzione di un mercato con l'outcome vincente
- Calcolo automatico delle vincite

#### `claimWinnings(uint256 marketId)`
- Ritiro delle vincite per scommesse vincenti
- Validazione stato scommessa

### Eventi
- `BetPlaced`: Emesso quando viene piazzata una scommessa
- `MarketCreated`: Emesso quando viene creato un nuovo mercato
- `MarketResolved`: Emesso quando un mercato viene risolto
- `WinningsClaimed`: Emesso quando vengono ritirate le vincite

## 🛠️ Sviluppo

### Struttura del Codice

#### Frontend (React)
- **useBetzilla.js**: Hook personalizzato per interazione con smart contract
- **App.js**: Componente principale con interfaccia utente
- **App.css**: Stili moderni e responsive

#### Backend (Node.js/Express)
- **API Markets**: Endpoint per recupero partite disponibili
- **Validazione**: Controlli per dati di input
- **Logging**: Sistema di log per debugging

#### Smart Contract (Solidity)
- **Modifier**: Controlli di sicurezza e validazione
- **Mapping**: Strutture dati per mercati e scommesse
- **Events**: Sistema di eventi per tracking

### Testing
```bash
# Test Smart Contract
cd contracts
npx hardhat test

# Test Frontend
cd frontend
npm test
```

## 🔒 Sicurezza

### Validazioni Smart Contract
- **Controllo Mercati**: Verifica esistenza mercato
- **Validazione Outcome**: Controllo outcome validi (1-3)
- **Controllo Tempo**: Verifica partita non ancora iniziata
- **Gestione Importi**: Validazione importi scommesse

### Sicurezza Frontend
- **Validazione Input**: Controlli lato client
- **Gestione Errori**: Messaggi di errore informativi
- **MetaMask Integration**: Connessione sicura al wallet

## 🚨 Risoluzione Problemi

### Errori Comuni

#### "Internal JSON-RPC error"
- **Causa**: ChainId mismatch tra MetaMask e Hardhat
- **Soluzione**: Configura MetaMask per usare chainId 31337

#### "User has already placed a bet"
- **Causa**: Tentativo di scommessa duplicata (risolto nelle versioni recenti)
- **Soluzione**: Il sistema ora permette scommesse multiple

#### "Contract deployment failed"
- **Causa**: Hardhat node non attivo o porta occupata
- **Soluzione**: Riavvia Hardhat node e ridistribuisci

### Debug
```bash
# Controlla processi attivi
ps aux | grep hardhat

# Controlla porte in uso
netstat -tulpn | grep 8545

# Log Hardhat
tail -f contracts/hardhat.log
```

## 📝 Roadmap

### Funzionalità Future
- [ ] **Sistema di Quote Dinamiche**: Calcolo automatico quote basato su scommesse
- [ ] **Multi-Sport**: Supporto per più sport (calcio, basket, tennis)
- [ ] **Sistema di Referral**: Programma di affiliazione
- [ ] **Mobile App**: Applicazione mobile nativa
- [ ] **DeFi Integration**: Yield farming e staking
- [ ] **Governance DAO**: Sistema di governance decentralizzato

### Miglioramenti Tecnici
- [ ] **Layer 2**: Integrazione con Polygon o Arbitrum
- [ ] **Oracle Integration**: Feed dati esterni per risultati
- [ ] **Advanced Analytics**: Dashboard analitiche avanzate
- [ ] **Multi-Chain**: Supporto per multiple blockchain

## 🤝 Contribuire

1. **Fork** il repository
2. **Crea** un branch per la feature (`git checkout -b feature/AmazingFeature`)
3. **Commit** le modifiche (`git commit -m 'Add some AmazingFeature'`)
4. **Push** al branch (`git push origin feature/AmazingFeature`)
5. **Apri** una Pull Request

## 📄 Licenza

Questo progetto è rilasciato sotto licenza MIT. Vedi il file `LICENSE` per i dettagli.

## 👥 Autori

- **Matteo** - *Sviluppo iniziale* - [GitHub](https://github.com/yourusername)

## 🙏 Ringraziamenti

- **OpenZeppelin** per le librerie di sicurezza
- **Hardhat** per il framework di sviluppo
- **React** per l'interfaccia utente
- **Ethers.js** per l'interazione con Ethereum

---

**⚠️ Disclaimer**: Questo è un progetto dimostrativo. Non utilizzare per scommesse reali senza le appropriate licenze e conformità normative. 