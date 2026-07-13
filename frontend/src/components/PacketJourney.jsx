import React, { useMemo, useState } from "react";
import {
  CheckCircle2,
  XCircle,
  Key,
  Lock,
  Unlock,
  ShieldAlert,
  ChevronDown,
  ChevronUp,
  Zap,
  Send as SendIcon,
  ArrowDownToLine,
  ShieldCheck,
} from "lucide-react";

const phaseConfig = {
  bb84: { label: "Key Exchange (BB84)", Icon: Key, color: "teal" },
  "aes-encrypt": { label: "Encrypt (AES-CBC)", Icon: Lock, color: "amber" },
  "aes-decrypt": { label: "Decrypt (AES-CBC)", Icon: Unlock, color: "blue" },
  "attack-detected": { label: "Attack Detected", Icon: ShieldAlert, color: "red" },
};

const nodeNames = {
  sender: "Sender",
  node1: "Node 1",
  node2: "Node 2",
  node3: "Node 3",
  receiver: "Receiver",
};

function labelNode(value) {
  return nodeNames[value] || value || "next hop";
}

function previewCells(value = "") {
  return String(value).split("").slice(0, 8);
}

function BB84MiniTable({ event }) {
  if (!event.aliceBitPreview) return null;
  const rows = [
    ["Alice Bits", previewCells(event.aliceBitPreview)],
    ["Bob Bits", previewCells(event.bobBitPreview)],
    ["Alice Bases", previewCells(event.aliceBasisPreview)],
    ["Bob Bases", previewCells(event.bobBasisPreview)],
    ["Keep Bits", previewCells(event.keepPreview)],
  ];

  return (
    <div className="bb84Table" aria-label="BB84 basis table">
      <p>Sifted Key Generation (bases match comparison):</p>
      {rows.map(([label, cells]) => (
        <div className="bb84Row" key={label}>
          <span>{label}</span>
          <div>
            {cells.map((cell, index) => (
              <b
                className={`${label === "Keep Bits" && cell === "Y" ? "kept" : ""} ${label === "Keep Bits" && cell === "N" ? "dropped" : ""}`}
                key={`${label}-${index}`}
              >
                {cell}
              </b>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function stepSummary(event) {
  const summaryLines = [];

  if (event.phase === "bb84") {
    const errPct = Math.round((event.errorRate || 0) * 100);
    const thrPct = Math.round((event.errorThreshold || 0.15) * 100);
    summaryLines.push(`${event.matchingBases || "?"} matched bases sifting into ${event.siftedBits || "?"} bits.`);
    summaryLines.push(`Calculated QBER error: ${errPct}% (threat detection limit: ${thrPct}%)`);
    summaryLines.push(
      event.errorRate > event.errorThreshold
        ? "ACTION: Line error exceeds 15% threshold. Key negotiation rejected (active listening detected)."
        : "ACTION: Error rate within normal tolerance. Symmetric key verified successfully."
    );
    if (event.keyFingerprint) summaryLines.push(`Key Fingerprint derived: ${event.keyFingerprint}`);
    return summaryLines;
  }

  if (event.phase === "aes-encrypt" || event.phase === "aes-decrypt") {
    const action = event.phase === "aes-decrypt" ? "Decrypted" : "Encrypted";
    summaryLines.push(`${action} ${event.plaintextLength || "?"} chars plaintext utilizing symmetric AES-256-CBC.`);
    summaryLines.push(`Key Fingerprint applied: ${event.keyFingerprint || "unknown"}`);
    if (event.previousHop || event.nextHop) {
      summaryLines.push(`Routing Hop: ${labelNode(event.previousHop)} ➔ ${labelNode(event.nextHop)}`);
    }
    if (event.hopExplanation) summaryLines.push(event.hopExplanation);
    return summaryLines;
  }

  if (event.phase === "attack-detected") {
    summaryLines.push(`Threat Trigger: ${event.detectionReason || event.message}`);
    if (event.detectionCheckpoint) summaryLines.push(`Verification checkpoint: ${event.detectionCheckpoint}`);
    if (event.attackMode) summaryLines.push(`Simulated vector: ${event.attackMode}`);
    if (event.targetNode) summaryLines.push(`Target node: ${labelNode(event.targetNode)}`);
    if (event.integrityTagPresent !== undefined) {
      summaryLines.push(`HMAC Signature Present: ${event.integrityTagPresent ? "YES" : "NO"}`);
    }
    if (event.ciphertextTampered !== undefined) {
      summaryLines.push(`Ciphertext Altered: ${event.ciphertextTampered ? "YES (Integrity Check Failed)" : "NO"}`);
    }
    if (event.inspectedAtTarget !== undefined) {
      summaryLines.push(`Target Match: ${event.inspectedAtTarget ? "YES" : "NO"}`);
    }
    if (event.blockedNode) summaryLines.push(`LINK STATUS: ${labelNode(event.blockedNode)} blocked. Packet propagation halted.`);
    return summaryLines;
  }

  return summaryLines;
}

function StepDetail({ event }) {
  const [expanded, setExpanded] = useState(event.phase === "attack-detected");
  const phase = phaseConfig[event.phase] || phaseConfig["attack-detected"];
  const summaryLines = stepSummary(event);

  return (
    <div className={`journeyStepDetail ${phase.color}`}>
      <div className="journeyStepHeader" onClick={() => setExpanded(!expanded)}>
        <div className="journeyStepIcon">
          <phase.Icon size={14} />
        </div>
        <div className="journeyStepInfo">
          <span className="journeyStepLabel">{phase.label}</span>
          <p className="journeyStepMessage">{event.message}</p>
        </div>
        <button type="button" className="expandToggle" aria-label={expanded ? "Collapse Details" : "Expand Details"}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {summaryLines.length > 0 && (
        <ul className="journeyStepSummary">
          {summaryLines.map((line, i) => (
            <li key={`${line}-${i}`}>{line}</li>
          ))}
        </ul>
      )}

      {expanded && (
        <div className="journeyStepExpanded">
          {event.phase === "bb84" && <BB84MiniTable event={event} />}
          {(event.ivPreview || event.ciphertextPreview || event.tagPreview || event.decryptedPreview) && (
            <div className="technicalDetails">
              {event.ivPreview && <code>IV Vector: {event.ivPreview}...</code>}
              {event.ciphertextPreview && <code>Ciphertext: {event.ciphertextPreview}...</code>}
              {event.tagPreview && <code>HMAC Checksum: {event.tagPreview}...</code>}
              {event.decryptedPreview && <code>Decrypted Plaintext: {event.decryptedPreview}</code>}
            </div>
          )}
          {event.noncePreview && (
            <div className="technicalDetails">
              <code>Slide Nonce: {event.noncePreview}...</code>
            </div>
          )}
          {event.detectionEvidence?.length > 0 && (
            <div className="evidenceList">
              <strong>TAMPERING DIAGNOSTIC FORENSICS:</strong>
              <ol>
                {event.detectionEvidence.map((line, index) => (
                  <li key={`${line}-${index}`}>{line}</li>
                ))}
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OutcomeBanner({ events }) {
  const attackEvents = events.filter((e) => e.phase === "attack-detected" || e.status === "attack");
  const receiverSuccess = events.find((e) => e.source === "receiver" && e.status === "success");
  const isSuccess = receiverSuccess && attackEvents.length === 0;
  const isBlocked = attackEvents.length > 0;

  if (events.length === 0) return null;

  if (isSuccess) {
    return (
      <div className="outcomeBanner success">
        <ShieldCheck size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Message Delivered Successfully</strong>
          <p>The packet traversed the 3-hop virtual route successfully. Hop-by-hop QKD rekeying completed honestly. CBC layers decrypted safely at the receiver node.</p>
        </div>
      </div>
    );
  }

  if (isBlocked) {
    const attack = attackEvents[0];
    const reason = attack?.detectionReason || attack?.message || "Threat anomaly detected";
    const blockedAt = attack?.blockedNode || attack?.source || "unknown node";
    const mitmCopy = attack?.ciphertextTampered
      ? "Payload modified in transit. HMAC tag check mismatch caught the alteration and dropped plaintext release."
      : "Gateway check failed. The node dropped key derivation and blacklisted the threat pathway.";

    return (
      <div className="outcomeBanner blocked">
        <ShieldAlert size={20} style={{ flexShrink: 0 }} />
        <div>
          <strong>Attack Detected and Blocked at {labelNode(blockedAt)}</strong>
          <p>{reason}. {mitmCopy}</p>
        </div>
      </div>
    );
  }

  return null;
}

export default function PacketJourney({ events, onNodeClick, receiverName }) {
  const stageEvents = useMemo(
    () => events.filter((e) => e.phase || e.status === "attack"),
    [events]
  );

  const nodeSteps = useMemo(() => {
    const nodeOrder = ["sender", "node1", "node2", "node3", "receiver"];
    return nodeOrder
      .map((node) => ({
        node,
        name: node === "receiver" ? (receiverName || "Receiver") : nodeNames[node],
        events: stageEvents.filter((e) => e.source === node),
      }))
      .filter((n) => n.events.length > 0);
  }, [stageEvents, receiverName]);

  if (stageEvents.length === 0) {
    return (
      <section className="panel journeyPanel">
        <div className="panelHeader">
          <div className="panelHeaderLeft">
            <Zap size={16} className="panelHeaderIcon" />
            <h2>Packet Journey</h2>
          </div>
        </div>
        <div className="journeyEmpty">
          <Zap size={28} style={{ color: "var(--neon-cyan)", opacity: 0.5, marginBottom: "8px" }} />
          <p style={{ fontSize: "12px", color: "#516279" }}>Waiting for packet to start...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="panel journeyPanel">
      <div className="panelHeader">
        <div className="panelHeaderLeft">
          <Zap size={16} className="panelHeaderIcon" />
          <h2>Packet Journey</h2>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="infoBadge">
            💡 Click any node header to view animation
          </span>
          <span className="stepStatus" style={{ fontSize: "11px", fontWeight: "700", color: "var(--neon-cyan)", fontFamily: "var(--font-cyber)" }}>
            {stageEvents.length} events
          </span>
        </div>
      </div>

      <OutcomeBanner events={events} />

      <div className="journeyTimeline">
        {nodeSteps.map((nodeGroup, nodeIndex) => {
          const hasAttack = nodeGroup.events.some(
            (e) => e.phase === "attack-detected" || e.status === "attack"
          );
          const isFirst = nodeIndex === 0;
          const isLast = nodeIndex === nodeSteps.length - 1;
          const NodeIcon = isFirst ? SendIcon : isLast ? ArrowDownToLine : Key;

          return (
            <div
              className={`journeyNode ${hasAttack ? "attacked" : ""}`}
              key={nodeGroup.node}
            >
              <div 
                className="journeyNodeHeader clickable"
                onClick={() => onNodeClick && onNodeClick(nodeGroup.node)}
                title="Launch visual sifting/decryption diagnostics animation"
                style={{ cursor: "pointer" }}
              >
                <div className={`journeyNodeDot ${hasAttack ? "red" : "teal"}`}>
                  <NodeIcon size={14} />
                </div>
                <div className="journeyNodeLine" />
                <h3>{nodeGroup.name}</h3>
                {hasAttack && (
                  <span className="journeyAttackTag">
                    <ShieldAlert size={10} style={{ marginRight: "3px" }} /> blocked
                  </span>
                )}
                <span className="journeyAnimateLink">Animate HUD →</span>
              </div>
              <div className="journeyNodeSteps">
                {nodeGroup.events.map((event, index) => (
                  <StepDetail event={event} key={`${event.time}-${event.phase}-${index}`} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
