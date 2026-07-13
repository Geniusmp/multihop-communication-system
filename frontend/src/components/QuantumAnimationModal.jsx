import React, { useState, useEffect, useMemo } from "react";
import {
  X, Play, Pause, ChevronLeft, ChevronRight, RotateCcw,
  Zap, Lock, Unlock, ShieldAlert, CheckCircle2, Shield, Eye, Trash2, Database
} from "lucide-react";

// Qubit polarization helper mapping
function getPolarizationLabel(basis, bit) {
  if (basis === "+") {
    return bit === 0 ? "↑ (Rectilinear 0)" : "→ (Rectilinear 1)";
  } else {
    return bit === 0 ? "↗ (Diagonal 0)" : "↖ (Diagonal 1)";
  }
}

function getQubitSymbol(basis, bit) {
  if (basis === "+") {
    return bit === 0 ? "↑" : "→";
  } else {
    return bit === 0 ? "↗" : "↖";
  }
}

export default function QuantumAnimationModal({ node, events, attackMode, targetNode, onClose }) {
  // Find events for the last journey
  const lastJourneyEvents = useMemo(() => {
    const lastSenderIndex = [...events].reverse().findIndex(
      (e) => e.source === "sender" && e.phase === "bb84"
    );
    if (lastSenderIndex === -1) return [];
    const actualIndex = events.length - 1 - lastSenderIndex;
    return events.slice(actualIndex);
  }, [events]);

  // Find relevant events for the selected node in the last journey
  const nodeEvents = useMemo(() => {
    return lastJourneyEvents.filter((e) => e.source === node || (e.blockedNode === node && e.phase === "attack-detected"));
  }, [lastJourneyEvents, node]);

  // Determine if this node was reached or not
  const isReached = useMemo(() => {
    if (node === "sender") return true;
    
    // Check if any previous node blocked the transmission
    const routeOrder = ["sender", "node1", "node2", "node3", "receiver"];
    const nodeIndex = routeOrder.indexOf(node);
    
    for (let i = 0; i < nodeIndex; i++) {
      const prevNode = routeOrder[i];
      const hasBlock = lastJourneyEvents.some(
        (e) => (e.source === prevNode || e.blockedNode === prevNode) && e.phase === "attack-detected"
      );
      if (hasBlock) return false;
    }
    
    return lastJourneyEvents.some((e) => e.source === node || e.blockedNode === node);
  }, [lastJourneyEvents, node]);

  // Extract cryptographic information from events
  const qkdEvent = useMemo(() => nodeEvents.find((e) => e.phase === "bb84"), [nodeEvents]);
  const decryptEvent = useMemo(() => nodeEvents.find((e) => e.phase === "aes-decrypt"), [nodeEvents]);
  const encryptEvent = useMemo(() => nodeEvents.find((e) => e.phase === "aes-encrypt"), [nodeEvents]);
  const attackEvent = useMemo(() => nodeEvents.find((e) => e.phase === "attack-detected"), [nodeEvents]);

  // Check if attack happened at this node
  const nodeAttackMode = useMemo(() => {
    if (attackEvent) return attackEvent.attackMode;
    if (node === targetNode && attackMode !== "normal") return attackMode;
    return "normal";
  }, [attackEvent, node, targetNode, attackMode]);

  // Build steps configuration
  const steps = useMemo(() => {
    const list = [];

    if (!isReached) {
      list.push({
        id: "unreached",
        title: "Node Unreached",
        desc: "This routing node was not active in the path because the transmission was dropped prior to it.",
        render: () => (
          <div className="anim-unreached">
            <ShieldAlert size={48} className="anim-icon red flash" />
            <h3 style={{ color: "var(--neon-red)" }}>Route Dropped in Advance</h3>
            <p style={{ marginTop: "8px", fontSize: "13px" }}>Check previous nodes on the topology board to debug where the security check failed.</p>
          </div>
        )
      });
      return list;
    }

    if (node === "sender") {
      list.push({
        id: "start",
        title: "1. Plaintext Message",
        desc: "The Sender node prepares a plaintext payload to encrypt and forward.",
        render: () => (
          <div className="anim-step-card">
            <Unlock size={40} className="anim-icon teal" />
            <h3>Plaintext Message</h3>
            <div className="cryptoBox">
              <strong style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--neon-cyan)" }}>Message:</strong>
              <div className="plaintextPreview">
                {decryptEvent?.decryptedPreview || encryptEvent?.decryptedPreview || "QuantumHop Message"}
              </div>
            </div>
            <p className="note">To secure the signal against eavesdroppers, the node encrypts the plaintext using AES-256-CBC. First, Alice sifts a fresh shared key using the BB84 Quantum protocol.</p>
          </div>
        )
      });

      list.push({
        id: "qkd_polarization",
        title: "2. QKD Basis Exchange",
        desc: "Alice preparation: sending random bits polarized via rectilinear (+) or diagonal (x) bases.",
        render: (isPlaying) => <QKDExchangeVisualizer event={qkdEvent} eavesdrop={false} isPlaying={isPlaying} />
      });

      list.push({
        id: "qkd_sifting",
        title: "3. Sifting & Key Derivation",
        desc: "Exchange bases over a classical link. Dropping columns where bases disagree sifts a shared key.",
        render: () => <QKDSiftingVisualizer event={qkdEvent} eavesdrop={false} />
      });

      list.push({
        id: "aes_encrypt",
        title: "4. AES Encryption",
        desc: "Plaintext is encrypted and tagged with an HMAC signature using the derived key.",
        render: () => <AESEncryptVisualizer event={encryptEvent} />
      });

      list.push({
        id: "forward",
        title: "5. Forwarding Packet",
        desc: "The packed encrypted envelope is forwarded over the network socket to Node 1.",
        render: () => (
          <div className="anim-step-card animate-fly">
            <Zap size={40} className="anim-icon yellow pulse" />
            <h3>Encrypted Packet Forwarded</h3>
            <div className="envelope">
              <div className="envelope-back">
                <code>IV: {encryptEvent?.ivPreview || "b28cf..."}</code>
                <code>Cipher: {encryptEvent?.ciphertextPreview || "e59ac..."}</code>
                <code>HMAC: {encryptEvent?.tagPreview || "8a1e2..."}</code>
              </div>
            </div>
            <p className="note">The cipher envelope is secure in transit. Adversaries without the sifting key only see randomized bytes.</p>
          </div>
        )
      });
    } else if (node === "receiver") {
      list.push({
        id: "arrival",
        title: "1. Packet Arrival",
        desc: "The receiver gateway registers the encrypted envelope forwarded by Relay 3.",
        render: () => (
          <div className="anim-step-card">
            <Lock size={40} className="anim-icon blue" />
            <h3>Encrypted Packet Arrived</h3>
            <div className="envelope">
              <div className="envelope-back">
                <code>IV: {decryptEvent?.ivPreview || "b28cf..."}</code>
                <code>Cipher: {decryptEvent?.ciphertextPreview || "e59ac..."}</code>
                <code>HMAC: {decryptEvent?.tagPreview || "8a1e2..."}</code>
              </div>
            </div>
          </div>
        )
      });

      if (attackEvent && attackEvent.attackMode === "replay") {
        list.push({
          id: "replay_block",
          title: "2. Replay Check & Block",
          desc: "The receiver gateway checks if the incoming nonce is cached.",
          render: () => (
            <div className="anim-step-card danger-card">
              <ShieldAlert size={48} className="anim-icon red flash" />
              <h3 style={{ color: "var(--neon-red)" }}>Replay Attack Detected!</h3>
              <div className="evidence">
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <Database size={14} style={{ color: "var(--neon-red)" }} />
                  <code style={{ fontSize: "11px" }}>Arrived Nonce: {attackEvent.noncePreview}...</code>
                </div>
                <span className="errorText">STATUS: DUPLICATE NONCE SIGNATURE DETECTED</span>
              </div>
              <p className="note">To block network loop hijack attempts, the receiver rejects duplicate nonces immediately, dumping the packet.</p>
            </div>
          )
        });
      } else {
        list.push({
          id: "aes_decrypt",
          title: "2. Decryption & Integrity",
          desc: "Verify HMAC signature, check nonce, and decrypt the cipher using the sifting key.",
          render: () => <AESDecryptVisualizer event={decryptEvent} node={node} isSuccess={true} />
        });

        list.push({
          id: "success",
          title: "3. Message Delivered",
          desc: "Decrypted plaintext signal recovered successfully and recorded in console inbox.",
          render: () => (
            <div className="anim-step-card success-card">
              <CheckCircle2 size={48} className="anim-icon green pulse" style={{ color: "var(--neon-emerald)" }} />
              <h3>Secure Delivery Complete</h3>
              <div className="plaintextPreview green">
                {decryptEvent?.decryptedPreview || "Payload decrypted!"}
              </div>
              <p className="note">Link verified successfully. Cryptographic sifting and integrity checking complete.</p>
            </div>
          )
        });
      }
    } else {
      // Generic Hop (node1, node2, node3)
      list.push({
        id: "arrival",
        title: "1. Packet Arrival",
        desc: "The relay node registers the encrypted envelope.",
        render: () => (
          <div className="anim-step-card">
            <Lock size={40} className="anim-icon blue" />
            <h3>Encrypted Packet Arrived</h3>
            <div className="envelope">
              <div className="envelope-back">
                <code>IV: {decryptEvent?.ivPreview || attackEvent?.ivPreview || "b28cf..."}</code>
                <code>Cipher: {decryptEvent?.ciphertextPreview || attackEvent?.ciphertextPreview || "e59ac..."}</code>
                <code>HMAC: {decryptEvent?.tagPreview || attackEvent?.tagPreview || "8a1e2..."}</code>
              </div>
            </div>
          </div>
        )
      });

      if (attackEvent && attackEvent.attackMode === "replay") {
        list.push({
          id: "replay_block",
          title: "2. Replay Check & Block",
          desc: "The node checks the cache for duplicate nonce footprints.",
          render: () => (
            <div className="anim-step-card danger-card">
              <ShieldAlert size={48} className="anim-icon red flash" />
              <h3 style={{ color: "var(--neon-red)" }}>Replay Attack Detected!</h3>
              <div className="evidence">
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <Database size={14} style={{ color: "var(--neon-red)" }} />
                  <code style={{ fontSize: "11px" }}>Nonce: {attackEvent.noncePreview}...</code>
                </div>
                <span className="errorText">STATUS: DUPLICATE NONCE FOOTPRINT FOUND</span>
              </div>
              <p className="note">The relay node blacklists the sender route and drops the duplicate signal immediately.</p>
            </div>
          )
        });
      } else if (attackEvent && attackEvent.attackMode === "mitm") {
        list.push({
          id: "mitm_attack",
          title: "2. Attacker Tampering (MITM)",
          desc: "An active adversary intercepts the ciphertext on the link and alters it.",
          render: () => {
            const routeOrder = ["sender", "node1", "node2", "node3", "receiver"];
            const nodeIndex = routeOrder.indexOf(node);
            const prevNode = nodeIndex > 0 ? routeOrder[nodeIndex - 1] : "sender";

            const prevEncryptEvent = lastJourneyEvents.find(
              (e) => e.source === prevNode && e.phase === "aes-encrypt"
            );

            const originalCipherText = prevEncryptEvent?.ciphertextPreview || "e59ac";
            const tamperedCipherText = attackEvent.ciphertextPreview || "x59ac";

            return (
              <div className="anim-step-card danger-card mitm-glitch">
                <Eye size={40} className="anim-icon red pulse" style={{ color: "var(--neon-red)" }} />
                <h3>MITM Cipher Tampering</h3>
                <div className="mitm-box">
                  <div className="packet-tampered">
                    <code>ORIGINAL CIPHER: {originalCipherText}...</code>
                    <div className="lightning-bolt">⚡</div>
                    <code className="red">TAMPERED CIPHER: {tamperedCipherText}...</code>
                  </div>
                </div>
                <p className="note">The adversary modifies bytes in transit. However, since they do not have the sifting key, they cannot calculate a matching HMAC tag.</p>
              </div>
            );
          }
        });

        list.push({
          id: "aes_decrypt_fail",
          title: "3. Decryption Fail & Block",
          desc: "Recalculating the HMAC checksum shows the payload was altered. plain text release blocked.",
          render: () => <AESDecryptVisualizer event={attackEvent} node={node} isSuccess={false} />
        });
      } else {
        // Normal path or eavesdrop
        list.push({
          id: "aes_decrypt",
          title: "2. Decryption & Verification",
          desc: "Verify HMAC integrity and decrypt using the link key sifting by previous hop.",
          render: () => <AESDecryptVisualizer event={decryptEvent} node={node} isSuccess={true} />
        });

        const isEavesdropHere = nodeAttackMode === "eavesdrop";
        list.push({
          id: "qkd_polarization",
          title: "3. QKD Rekeying Basis Exchange",
          desc: isEavesdropHere 
            ? "Eve intercepts and measures link photons. Measuring collapses their state, introducing errors."
            : "Alice and Bob initiate a fresh BB84 key exchange for the next link routing.",
          render: (isPlaying) => <QKDExchangeVisualizer event={qkdEvent} eavesdrop={isEavesdropHere} isPlaying={isPlaying} />
        });

        list.push({
          id: "qkd_sifting",
          title: "4. Sifting & Error Rate Check",
          desc: "Announce bases. Compute QBER. If it exceeds 15%, drop sifting and raise alarm.",
          render: () => <QKDSiftingVisualizer event={qkdEvent} eavesdrop={isEavesdropHere} />
        });

        if (attackEvent && attackEvent.attackMode === "eavesdrop") {
          list.push({
            id: "eavesdrop_block",
            title: "5. Eavesdropping Detection & Block",
            desc: "Quantum sifting audit logs too many errors. Key discarded; path blocked.",
            render: () => (
              <div className="anim-step-card danger-card">
                <ShieldAlert size={48} className="anim-icon red flash" />
                <h3 style={{ color: "var(--neon-red)" }}>Quantum Eavesdropping Caught!</h3>
                <div className="evidence">
                  <span style={{ fontSize: "12px" }}>Calculated QBER Anomaly: <strong className="red" style={{ color: "var(--neon-red)" }}>{Math.round((attackEvent.errorRate || 0) * 100)}%</strong></span>
                  <span style={{ fontSize: "12px" }}>Threshold Limit: <strong>{Math.round((attackEvent.errorThreshold || 0.15) * 100)}%</strong></span>
                </div>
                <p className="note">By the laws of quantum mechanics (Heisenberg Uncertainty Principle), measuring photons collapses their spin. Eve's guess attempts introduce ~25% error rate, triggering the sifting block.</p>
              </div>
            )
          });
        } else {
          list.push({
            id: "aes_encrypt",
            title: "5. Re-encryption for Next Hop",
            desc: "Plaintext is re-encrypted using the newly derived sifting key for the next link.",
            render: () => <AESEncryptVisualizer event={encryptEvent} />
          });

          list.push({
            id: "forward",
            title: "6. Forwarding Packet",
            desc: "The re-encrypted envelope is forwarded over network sockets to the next routing hop.",
            render: () => (
              <div className="anim-step-card animate-fly">
                <Zap size={40} className="anim-icon yellow pulse" />
                <h3>Packet Forwarded</h3>
                <div className="envelope">
                  <div className="envelope-back">
                    <code>IV: {encryptEvent?.ivPreview || "b28cf..."}</code>
                    <code>Cipher: {encryptEvent?.ciphertextPreview || "e59ac..."}</code>
                    <code>HMAC: {encryptEvent?.tagPreview || "8a1e2..."}</code>
                  </div>
                </div>
                <p className="note">The relay node complete security routing: decrypted with incoming key, sifting a new QKD key, re-encrypted, and forwarded.</p>
              </div>
            )
          });
        }
      }
    }

    return list;
  }, [node, qkdEvent, decryptEvent, encryptEvent, attackEvent, nodeAttackMode, isReached]);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);

  // Handle auto-playing steps
  useEffect(() => {
    let timer;
    if (isPlaying) {
      timer = setTimeout(() => {
        if (currentStepIndex < steps.length - 1) {
          setCurrentStepIndex((prev) => prev + 1);
        } else {
          setIsPlaying(false);
        }
      }, 5000 / speed);
    }
    return () => clearTimeout(timer);
  }, [isPlaying, currentStepIndex, steps.length, speed]);

  const currentStep = steps[currentStepIndex];

  function handlePrev() {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.max(0, prev - 1));
  }

  function handleNext() {
    setIsPlaying(false);
    setCurrentStepIndex((prev) => Math.min(steps.length - 1, prev + 1));
  }

  function handleRestart() {
    setIsPlaying(false);
    setCurrentStepIndex(0);
  }

  return (
    <div className="anim-modal-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="anim-modal-content" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <header className="anim-modal-header">
          <div className="anim-header-left">
            <span className="anim-eyebrow">BB84 Quantum Key Distribution</span>
            <h2>Diagnostic Visualizer: {node.toUpperCase()}</h2>
          </div>
          <button className="anim-close-btn" onClick={onClose} aria-label="Close diagnostic modal" style={{ padding: "6px", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "6px", background: "rgba(255,255,255,0.02)" }}>
            <X size={16} />
          </button>
        </header>

        {/* Modal Body */}
        {steps.length === 0 ? (
          <div className="anim-empty">
            <Trash2 size={36} style={{ color: "var(--neon-red)", opacity: 0.7 }} />
            <p>Awaiting events database. Launch a link signal first to log traces.</p>
          </div>
        ) : (
          <div className="anim-modal-body">
            
            {/* Steps Left Panel */}
            <aside className="anim-steps-panel">
              <h3>Simulation Steps</h3>
              <ol className="anim-steps-list">
                {steps.map((step, idx) => (
                  <li 
                    key={step.id} 
                    className={`anim-step-item ${idx === currentStepIndex ? "active" : ""} ${idx < currentStepIndex ? "completed" : ""}`}
                    onClick={() => { setIsPlaying(false); setCurrentStepIndex(idx); }}
                  >
                    <span className="step-number">{idx + 1}</span>
                    <span className="step-title">{step.title}</span>
                  </li>
                ))}
              </ol>

              <div className="anim-attack-info-box">
                <h4>Active Configuration</h4>
                <div className={`status-badge ${nodeAttackMode}`}>
                  {nodeAttackMode === "normal" ? (
                    <Shield size={12} style={{ marginRight: "3px" }} />
                  ) : (
                    <ShieldAlert size={12} style={{ marginRight: "3px" }} />
                  )}
                  <span>Mode: {nodeAttackMode.toUpperCase()}</span>
                </div>
                {node === targetNode && attackMode !== "normal" && (
                  <p className="target-note">This node is the designated attack target.</p>
                )}
              </div>
            </aside>

            {/* Visualizer Right Panel */}
            <main className="anim-visualizer-panel">
              <div className="anim-step-desc">
                <h3 style={{ color: "var(--neon-cyan)", fontFamily: "var(--font-cyber)", textTransform: "uppercase" }}>{currentStep?.title}</h3>
                <p>{currentStep?.desc}</p>
              </div>

              <div className={`anim-viewport ${!isPlaying ? "paused" : ""}`}>
                {currentStep?.render(isPlaying)}
              </div>

              {/* Player Controls */}
              <footer className="anim-controls-footer">
                <div className="player-btns">
                  <button type="button" className="ctrl-btn" onClick={handleRestart} title="Re-evaluate from start">
                    <RotateCcw size={14} />
                  </button>
                  <button type="button" className="ctrl-btn" onClick={handlePrev} disabled={currentStepIndex === 0} title="Previous Step">
                    <ChevronLeft size={16} />
                  </button>
                  <button type="button" className="ctrl-btn play-btn" onClick={() => setIsPlaying(!isPlaying)} style={{ minHeight: "36px", padding: "0 16px" }} title={isPlaying ? "Pause Step Evaluation" : "Auto-evaluate Step Loop"}>
                    {isPlaying ? <Pause size={14} style={{ marginRight: "4px" }} /> : <Play size={14} style={{ marginRight: "4px" }} />}
                    <span>{isPlaying ? "PAUSE" : "PLAY"}</span>
                  </button>
                  <button type="button" className="ctrl-btn" onClick={handleNext} disabled={currentStepIndex === steps.length - 1} title="Next Step">
                    <ChevronRight size={16} />
                  </button>
                </div>

                <div className="speed-ctrl">
                  <span>Simulation speed:</span>
                  {[0.5, 1, 2].map((s) => (
                    <button 
                      key={s} 
                      type="button" 
                      className={`speed-btn ${speed === s ? "active" : ""}`} 
                      onClick={() => setSpeed(s)}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </footer>
            </main>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── QKD Exchange Visualizer (SVG/CSS Animations) ──────────────────────────
function QKDExchangeVisualizer({ event, eavesdrop, isPlaying }) {
  const aliceBits = String(event?.aliceBitPreview || "01101010").split("").slice(0, 8);
  const aliceBases = String(event?.aliceBasisPreview || "++x+x+xx").split("").slice(0, 8);
  const bobBases = String(event?.bobBasisPreview || "+x++xxx+").split("").slice(0, 8);
  const bobBits = String(event?.bobBitPreview || "01001111").split("").slice(0, 8);

  const [photonIndex, setPhotonIndex] = useState(0);

  useEffect(() => {
    if (!isPlaying) return;
    const timer = setInterval(() => {
      setPhotonIndex((prev) => (prev + 1) % aliceBits.length);
    }, 1500);
    return () => clearInterval(timer);
  }, [aliceBits.length, isPlaying]);

  return (
    <div className="anim-qkd-board">
      <div className="quantum-channel-header">
        <span className="badge alice">Alice (Sender)</span>
        <span className="channel-line font-teal">Fiber Channel {eavesdrop && <span className="warning-text font-red">EVE EAVESDROPPING</span>}</span>
        <span className="badge bob">Bob (Receiver)</span>
      </div>

      <div className="qkd-visual-flow">
        {/* Alice Node */}
        <div className="qkd-node-box alice">
          <div className="bit-box">
            <span>Bit: <b>{aliceBits[photonIndex]}</b></span>
            <span>Basis: <b>{aliceBases[photonIndex]}</b></span>
          </div>
          <div className="polarization-circle">
            <span className="symbol">{getQubitSymbol(aliceBases[photonIndex], parseInt(aliceBits[photonIndex]))}</span>
            <small>{getPolarizationLabel(aliceBases[photonIndex], parseInt(aliceBits[photonIndex]))}</small>
          </div>
        </div>

        {/* Particle Channel (flying photon) */}
        <div className="qkd-particle-channel">
          <div key={photonIndex} className="flying-photon animate-fly-photon">
            <div className="photon-particle">
              {getQubitSymbol(aliceBases[photonIndex], parseInt(aliceBits[photonIndex]))}
            </div>
          </div>
          
          {eavesdrop && (
            <div className="eve-node animate-pulse">
              <Eye size={12} style={{ color: "var(--neon-red)" }} />
              <span>Eve Guesses Basis!</span>
            </div>
          )}
        </div>

        {/* Bob Node */}
        <div className="qkd-node-box bob">
          <div className="bit-box">
            <span>Basis: <b>{bobBases[photonIndex]}</b></span>
            <span>Result: <b>{bobBits[photonIndex]}</b></span>
          </div>
          <div className="polarization-circle bob">
            <span className="symbol">{getQubitSymbol(bobBases[photonIndex], parseInt(bobBits[photonIndex]))}</span>
            <small>Measured spin</small>
          </div>
        </div>
      </div>

      <p className="caption">
        {eavesdrop 
          ? "Eve intercepts photons and measures them using random bases. Measurement collapses superposition, introducing irreversible errors in Bob's results."
          : "Photons are sent with specific polarizations. Bob measures them in random bases. Matching bases produce matching bits; different bases yield random results."
        }
      </p>
    </div>
  );
}

// ─── QKD Sifting & Key Derivation Visualizer ────────────────────────────────
function QKDSiftingVisualizer({ event, eavesdrop }) {
  const aliceBases = String(event?.aliceBasisPreview || "++x+x+xx").split("").slice(0, 8);
  const bobBases = String(event?.bobBasisPreview || "+x++xxx+").split("").slice(0, 8);
  const keep = String(event?.keepPreview || "YNNYNNYN").split("").slice(0, 8);
  const aliceBits = String(event?.aliceBitPreview || "01101010").split("").slice(0, 8);
  const bobBits = String(event?.bobBitPreview || "01001111").split("").slice(0, 8);

  return (
    <div className="anim-sifting-board">
      <div className="sifting-table">
        <div className="sifting-row header">
          <span>Row/Index</span>
          {aliceBases.map((_, i) => <span key={i}>{i+1}</span>)}
        </div>
        <div className="sifting-row">
          <span>Alice Bit</span>
          {aliceBits.map((b, i) => <span key={i} className="basis-val">{b}</span>)}
        </div>
        <div className="sifting-row">
          <span>Bob Bit</span>
          {bobBits.map((b, i) => {
            const isMatchBasis = keep[i] === "Y";
            const isBitMismatch = aliceBits[i] !== b;
            return (
              <span key={i} className={`basis-val ${isMatchBasis && isBitMismatch ? "font-red font-bold warning-pulse-text" : ""}`}>
                {b}
              </span>
            );
          })}
        </div>
        <div className="sifting-row">
          <span>Alice Basis</span>
          {aliceBases.map((b, i) => <span key={i} className="basis-val">{b}</span>)}
        </div>
        <div className="sifting-row">
          <span>Bob Basis</span>
          {bobBases.map((b, i) => <span key={i} className="basis-val">{b}</span>)}
        </div>
        <div className="sifting-row verdict">
          <span>Bases Match?</span>
          {keep.map((k, i) => (
            <span key={i} className={k === "Y" ? "match-yes font-green" : "match-no font-red"} style={{ color: k === "Y" ? "var(--neon-emerald)" : "var(--neon-red)" }}>
              {k === "Y" ? "✓" : "✗"}
            </span>
          ))}
        </div>
        <div className="sifting-row key-bits">
          <span>Sifted Key Bit</span>
          {keep.map((k, i) => {
            if (k !== "Y") return <span key={i} className="sifted-bit dropped">-</span>;
            const isBitMatch = aliceBits[i] === bobBits[i];
            return (
              <span key={i} className={`sifted-bit highlighted ${isBitMatch ? "font-green" : "font-red warning-pulse-text"}`}>
                {isBitMatch ? `${bobBits[i]}` : `⚠️ ${bobBits[i]}`}
              </span>
            );
          })}
        </div>
      </div>

      {eavesdrop ? (
        <div className="qber-card-info">
          <h4>📊 Quantum Bit Error Rate (QBER) Diagnostic Analysis</h4>
          <div className="qber-stats">
            <div className="qber-stat-card">
              <small>Matching bases</small>
              <strong>{event?.matchingBases || "8"}</strong>
            </div>
            <div className="qber-stat-card warning">
              <small>Bit mismatches</small>
              <strong className="red" style={{ color: "var(--neon-red)" }}>
                {Math.max(1, Math.round((event?.errorRate || 0.25) * (event?.matchingBases || 8)))}
              </strong>
            </div>
            <div className="qber-stat-card warning">
              <small>QBER (error rate)</small>
              <strong className="red" style={{ color: "var(--neon-red)" }}>{Math.round((event?.errorRate || 0.25) * 100)}%</strong>
            </div>
            <div className="qber-stat-card">
              <small>Detection threshold</small>
              <strong>{Math.round((event?.errorThreshold || 0.15) * 100)}%</strong>
            </div>
          </div>
          <p className="warning-note red">
            <strong>EAVESDROPPING CAUGHT:</strong> Note that index columns containing ⚠️ show positions where Alice and Bob used the same basis but got different bits! Because Eve measured the qubits using her own random bases, she collapsed their states and introduced a ~25% disturbance. Alice and Bob check for this, detect a QBER exceeding the 15% threshold, and reject the key!
          </p>
        </div>
      ) : (
        <div className="key-derivation-flow">
          <div className="blender-graphic">
            <RotateCcw size={16} className="spin-slow" style={{ marginRight: "4px" }} />
            <span>SHA-256 Key Derivation Function</span>
          </div>
          <div className="arrow-down">↓</div>
          <div className="derived-aes-key">
            <Lock size={12} style={{ color: "var(--neon-cyan)", marginRight: "4px" }} />
            <span>Derived AES Key Fingerprint: <strong>{event?.keyFingerprint || "3a7f8b9c"}</strong></span>
          </div>
        </div>
      )}

      <p className="caption">
        Alice and Bob announce bases publicly over a classical link. Columns where bases disagree are discarded.
      </p>
    </div>
  );
}

// ─── AES Encryption Visualizer ──────────────────────────────────────────────
function AESEncryptVisualizer({ event }) {
  return (
    <div className="anim-aes-board">
      <div className="aes-flow-grid">
        <div className="input-block">
          <span>Plaintext</span>
          <div className="block-val text">
            {event?.decryptedPreview || (event?.plaintextLength ? `Length: ${event.plaintextLength} chars` : "Awaiting Plaintext...")}
          </div>
        </div>

        <div className="plus-symbol">+</div>

        <div className="key-block">
          <span>AES-256 Key</span>
          <div className="block-val key">
            <code>Hash: {event?.keyFingerprint || "Awaiting Key..."}</code>
          </div>
        </div>

        <div className="arrow-flow">➔</div>

        <div className="crypto-engine">
          <Lock size={16} className="pulse" />
          <span>AES-256-CBC</span>
          <small>PKCS7 Padding</small>
        </div>

        <div className="arrow-flow">➔</div>

        <div className="output-envelope">
          <span>Encrypted Packet Envelope</span>
          <div className="envelope-contents">
            <div>
              <small>IV (Init Vector)</small>
              <code>{event?.ivPreview ? `${event.ivPreview}...` : "Generating IV..."}</code>
            </div>
            <div>
              <small>Ciphertext</small>
              <code>{event?.ciphertextPreview ? `${event.ciphertextPreview}...` : "Encrypting..."}</code>
            </div>
            <div>
              <small>HMAC Tag</small>
              <code>{event?.tagPreview ? `${event.tagPreview}...` : "Signing..."}</code>
            </div>
          </div>
        </div>
      </div>
      <p className="caption">The plaintext message is encrypted in 16-byte blocks using CBC mode, and combined with an HMAC SHA-256 tag using the derived symmetric key to enforce integrity and authenticity.</p>
    </div>
  );
}

// ─── AES Decryption & Verification Visualizer ──────────────────────────────
function AESDecryptVisualizer({ event, node, isSuccess }) {
  return (
    <div className="anim-aes-board">
      <div className="aes-flow-grid reverse">
        <div className="output-envelope">
          <span>Incoming Envelope</span>
          <div className="envelope-contents">
            <div>
              <small>IV (Init Vector)</small>
              <code>{event?.ivPreview ? `${event.ivPreview}...` : "Awaiting IV..."}</code>
            </div>
            <div>
              <small>Ciphertext</small>
              <code>{event?.ciphertextPreview ? `${event.ciphertextPreview}...` : "Awaiting Cipher..."}</code>
            </div>
            <div>
              <small>HMAC Tag</small>
              <code>{event?.tagPreview ? `${event.tagPreview}...` : "Awaiting HMAC..."}</code>
            </div>
          </div>
        </div>

        <div className="arrow-flow">➔</div>

        <div className={`crypto-engine decrypt ${isSuccess ? "success" : "fail"}`}>
          {isSuccess ? <Unlock size={16} className="pulse" /> : <ShieldAlert size={16} className="flash" />}
          <span>HMAC Integrity Check</span>
          <small>{isSuccess ? "VERIFIED VALID" : "SIGNATURE MISMATCH!"}</small>
        </div>

        <div className="arrow-flow">➔</div>

        {isSuccess ? (
          <div className="input-block success">
            <span>Decrypted Plaintext</span>
            <div className="block-val text green">
              <code>{event?.decryptedPreview || "Decrypting..."}</code>
            </div>
          </div>
        ) : (
          <div className="input-block fail">
            <span>Decryption Failure</span>
            <div className="block-val text red" style={{ display: "flex", flexDirection: "column", gap: "6px", alignItems: "stretch", padding: "8px 12px" }}>
              <code className="red" style={{ fontWeight: "bold", fontSize: "11px", textAlign: "center", marginBottom: "4px", color: "var(--neon-red)" }}>ERROR: BAD HMAC SIGNATURE</code>
              <div style={{ display: "flex", flexDirection: "column", gap: "4px", fontSize: "10px", opacity: 0.95, textAlign: "left" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ color: "#8c9ba5" }}>Envelope Tag:</span>
                  <code style={{ color: "#ffffff" }}>{event?.tagPreview ? event.tagPreview.slice(0, 12) + "..." : "none"}</code>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: "8px" }}>
                  <span style={{ color: "#8c9ba5" }}>Recalculated:</span>
                  <code style={{ color: "var(--neon-red)" }}>
                    {event?.recalculatedTag 
                      ? event.recalculatedTag.slice(0, 12) + "..." 
                      : (event?.tagPreview && event.tagPreview.length >= 8 
                          ? event.tagPreview.slice(0, 2) + "w9Z" + event.tagPreview.slice(5, 12) + "..."
                          : "u8Xp2Yd5q...")
                    }
                  </code>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="explanation-bubble" style={{ marginTop: "16px", padding: "12px 16px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)", background: "rgba(255,255,255,0.01)" }}>
        {isSuccess ? (
          <p className="caption" style={{ color: "var(--neon-emerald)" }}>
            The HMAC signature verified successfully. {node} decrypted the ciphertext back to plaintext using the derived link key.
          </p>
        ) : (
          <p className="caption red" style={{ color: "var(--neon-red)" }}>
            <strong>TAMPERING DETECTED:</strong> Recalculated HMAC over IV + Ciphertext did not match the envelope's tag.
            The node blocked and dropped the packet to prevent ciphertext manipulation (MITM) attacks.
          </p>
        )}
      </div>
    </div>
  );
}
