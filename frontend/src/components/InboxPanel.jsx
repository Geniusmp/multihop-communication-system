import React from "react";
import {
  ShieldCheck,
  ShieldAlert,
  Inbox,
  Trash2,
  User,
  Clock,
  Zap,
  AlertTriangle,
  Route,
  CheckCircle2,
  XCircle,
  CircleAlert,
} from "lucide-react";

function formatTime(iso) {
  if (!iso) return "";
  return new Date(iso + "Z").toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function AttackBanner({ msg }) {
  if (!msg.attackDetected) return null;
  return (
    <div className="inboxAttackBanner">
      <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: "2px" }} />
      <div>
        <strong>ATTACK DETECTED: {msg.attackType}</strong>
        {msg.relayName && (
          <p style={{ marginTop: "2px", fontSize: "11px", color: "var(--neon-red)" }}>
            Relayed via: <code>{msg.relayName} ({msg.relayIp})</code>
          </p>
        )}
        {msg.bb84Details?.errorRate !== undefined && (
          <p style={{ marginTop: "2px", fontSize: "11px", color: "var(--neon-red)" }}>
            Error Rate: <strong>{Math.round(msg.bb84Details.errorRate * 100)}%</strong> (threshold: {Math.round((msg.bb84Details.errorThreshold || 0.15) * 100)}%)
          </p>
        )}
      </div>
    </div>
  );
}

function BB84Badge({ details }) {
  if (details?.errorRate === undefined) return null;
  const pct = Math.round((details.errorRate || 0) * 100);
  const threshold = Math.round((details.errorThreshold || 0.15) * 100);
  const safe = pct <= threshold;
  return (
    <div className={`bb84Badge ${safe ? "safe" : "danger"}`}>
      {safe ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
      <span>Error rate: {pct}% (threshold: {threshold}%)</span>
      <span style={{ opacity: 0.3 }}>·</span>
      <span>Key Fingerprint: <code>{details.keyFingerprint}…</code></span>
    </div>
  );
}

function stepIcon(status) {
  if (status === "attack") return <XCircle size={12} style={{ color: "var(--neon-red)" }} />;
  if (status === "warning") return <CircleAlert size={12} style={{ color: "var(--neon-amber)" }} />;
  return <CheckCircle2 size={12} style={{ color: "var(--neon-emerald)" }} />;
}

function NodeCrypto({ step, crypto }) {
  const nodeCrypto = step.crypto || {};
  const bb84 = nodeCrypto.bb84 || {};
  if (nodeCrypto.action) {
    return (
      <div className="nodeCrypto">
        {nodeCrypto.action && <p><span>Action</span><code>{nodeCrypto.action}</code></p>}
        {nodeCrypto.decryptedPreview && <p><span>Decrypted</span><code>{nodeCrypto.decryptedPreview}</code></p>}
        {nodeCrypto.plaintextPreview && <p><span>Plaintext</span><code>{nodeCrypto.plaintextPreview}</code></p>}
        {nodeCrypto.aesKeyFingerprint && <p><span>AES Key Fingerprint</span><code>{nodeCrypto.aesKeyFingerprint}...</code></p>}
        {nodeCrypto.ivPreview && <p><span>IV</span><code>{nodeCrypto.ivPreview}...</code></p>}
        {nodeCrypto.ciphertextPreview && <p><span>Ciphertext</span><code>{nodeCrypto.ciphertextPreview}...</code></p>}
        {nodeCrypto.payload?.ciphertext && <p><span>Payload Ciphertext</span><code>{nodeCrypto.payload.ciphertext.slice(0, 40)}...</code></p>}
        {bb84.aliceBasisPreview && <p><span>Alice Basis</span><code>{bb84.aliceBasisPreview}</code></p>}
        {bb84.bobBasisPreview && <p><span>Bob Basis</span><code>{bb84.bobBasisPreview}</code></p>}
        {bb84.aliceBitPreview && <p><span>Alice Bit</span><code>{bb84.aliceBitPreview}</code></p>}
        {bb84.bobBitPreview && <p><span>Bob Bit</span><code>{bb84.bobBitPreview}</code></p>}
        {bb84.keepPreview && <p><span>Keep / sifted</span><code>{bb84.keepPreview} / {bb84.siftedPreview}</code></p>}
        {bb84.matchingBases && <p><span>BB84 counts</span><code>{bb84.matchingBases} match, {bb84.siftedBits} sifted, {bb84.comparedBits} compared</code></p>}
        {bb84.errorRate !== undefined && <p><span>Error rate</span><code>{Math.round((bb84.errorRate || 0) * 100)}% (threshold {Math.round((bb84.errorThreshold || 0.15) * 100)}%)</code></p>}
        {nodeCrypto.nonce && <p><span>Nonce</span><code>{nodeCrypto.nonce.slice(0, 24)}...</code></p>}
        {nodeCrypto.mode && <p><span>Mode seen</span><code>{nodeCrypto.mode}</code></p>}
        {nodeCrypto.blockedReason && <p><span>Blocked reason</span><code>{nodeCrypto.blockedReason}</code></p>}
        {nodeCrypto.note && <p><span>Note</span><code>{nodeCrypto.note}</code></p>}
      </div>
    );
  }

  if (!crypto?.nonce) return null;
  const sender = crypto.senderBB84 || {};
  const receiver = crypto.receiverBB84 || {};
  const node = (step.node || "").toLowerCase();

  if (node.includes("sender")) {
    return (
      <div className="nodeCrypto">
        <p><span>Plaintext</span><code>{crypto.senderPlaintextPreview || crypto.plaintextPreview || "gateway text input"}</code></p>
        <p><span>AES Key Fingerprint</span><code>{crypto.aesKeyFingerprint}...</code></p>
        <p><span>IV</span><code>{crypto.ivPreview}...</code></p>
        <p><span>Ciphertext</span><code>{crypto.ciphertextPreview}...</code></p>
        <p><span>Alice Basis</span><code>{sender.aliceBasisPreview}</code></p>
        <p><span>Bob Basis</span><code>{sender.bobBasisPreview}</code></p>
        <p><span>Alice Bit</span><code>{sender.aliceBitPreview}</code></p>
        <p><span>Bob Bit</span><code>{sender.bobBitPreview}</code></p>
        <p><span>Keep / sifted</span><code>{sender.keepPreview} / {sender.siftedPreview}</code></p>
      </div>
    );
  }

  if (node.includes("hop")) {
    return (
      <div className="nodeCrypto">
        <p><span>Nonce</span><code>{crypto.nonce.slice(0, 16)}...</code></p>
        <p><span>Ciphertext</span><code>{crypto.ciphertextPreview}...</code></p>
      </div>
    );
  }

  if (node.includes("receiver check")) {
    return (
      <div className="nodeCrypto">
        <p><span>Nonce</span><code>{crypto.nonce.slice(0, 24)}...</code></p>
        <p><span>Mode seen</span><code>{crypto.attackMode || "normal"}</code></p>
      </div>
    );
  }

  if (node.includes("receiver")) {
    return (
      <div className="nodeCrypto">
        <p><span>Alice Basis</span><code>{receiver.aliceBasisPreview}</code></p>
        <p><span>Bob Basis</span><code>{receiver.bobBasisPreview}</code></p>
        <p><span>Alice Bit</span><code>{receiver.aliceBitPreview}</code></p>
        <p><span>Bob Bit</span><code>{receiver.bobBitPreview}</code></p>
        <p><span>Keep / sifted</span><code>{receiver.keepPreview} / {receiver.siftedPreview}</code></p>
        <p><span>BB84 counts</span><code>{receiver.matchingBases} match, {receiver.siftedBits} sifted, {receiver.comparedBits} compared</code></p>
        <p><span>Error rate</span><code>{Math.round((receiver.errorRate || 0) * 100)}% (threshold {Math.round((receiver.errorThreshold || 0.15) * 100)}%)</code></p>
        <p><span>Decrypted</span><code>{crypto.decrypted ? crypto.plaintextPreview : `Blocked: ${crypto.blockedReason}`}</code></p>
      </div>
    );
  }

  return null;
}

function NodeSteps({ msg }) {
  const steps = msg.routeSteps || [];
  if (steps.length === 0) return null;

  return (
    <details className="nodeSteps">
      <summary>
        <Route size={13} style={{ marginRight: "4px" }} />
        <span>What happened</span>
      </summary>
      <ol className="nodeStepList">
        {steps.map((step, index) => (
          <li key={`${msg.id}-${step.node}-${index}`} className={`nodeStep ${step.status || "success"}`}>
            <div className="nodeStepIcon">{stepIcon(step.status)}</div>
            <div className="nodeStepBody">
              <div className="nodeStepTop">
                <strong>{index + 1}. {step.node}</strong>
                {step.name && <span style={{ color: "#ffffff" }}>({step.name})</span>}
                {step.ip && <code>{step.ip}</code>}
              </div>
              <p style={{ fontSize: "12px", color: "#ffffff", fontWeight: "600", marginTop: "2px" }}>{step.title}</p>
              <small style={{ fontSize: "11.5px", color: "#8c9ba5" }}>{step.detail}</small>
              <NodeCrypto step={step} crypto={msg.cryptoDetails} />
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

export default function InboxPanel({ messages, onClear }) {
  return (
    <section className="panel inboxPanel">
      <div className="panelHeader">
        <div className="panelHeaderLeft">
          <Inbox size={16} className="panelHeaderIcon" />
          <h2>Inbox</h2>
          {messages.length > 0 && (
            <span className="inboxCount">{messages.length}</span>
          )}
        </div>
        {messages.length > 0 && (
          <button 
            type="button" 
            className="clearBtn" 
            onClick={onClear} 
            title="Clear"
          >
            <Trash2 size={13} style={{ marginRight: "3px" }} />
            Clear
          </button>
        )}
      </div>

      {messages.length === 0 ? (
        <div className="inboxEmpty">
          <Zap size={24} style={{ marginBottom: "6px", color: "var(--neon-emerald)", opacity: 0.6 }} />
          <p>No messages received yet.</p>
          <small style={{ fontSize: "11px", color: "#516279" }}>
            Messages sent from other laptops will appear here in real-time.
          </small>
        </div>
      ) : (
        <div className="inboxList">
          {[...messages].reverse().map((msg) => (
            <div
              key={msg.id}
              className={`inboxMessage ${msg.attackDetected ? "attacked" : "safe"}`}
            >
              <div className="inboxMessageHeader">
                <div className="inboxSender">
                  {msg.attackDetected ? (
                    <ShieldAlert size={14} style={{ color: "var(--neon-red)" }} />
                  ) : (
                    <ShieldCheck size={14} style={{ color: "var(--neon-emerald)" }} />
                  )}
                  <User size={12} style={{ color: "#8c9ba5" }} />
                  <strong>{msg.senderName}</strong>
                  <code className="senderIp">{msg.senderIp}</code>
                </div>
                <div className="inboxTime">
                  <Clock size={11} />
                  <span>{formatTime(msg.receivedAtISO)}</span>
                </div>
              </div>

              <AttackBanner msg={msg} />

              <div className={`inboxText ${msg.attackDetected ? "blocked" : ""}`}>
                {msg.attackDetected
                  ? "[ATTACK DETECTED - MESSAGE BLOCKED]"
                  : `Plaintext: ${msg.plaintext}`
                }
              </div>

              <BB84Badge details={msg.bb84Details} />
              <NodeSteps msg={msg} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
