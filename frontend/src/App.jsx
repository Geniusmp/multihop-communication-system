import React, { useEffect, useMemo, useState } from "react";
import { RotateCcw, Send, Shield, Wifi, Monitor, Radio, ShieldAlert, UserRoundX, RadioTower, Repeat } from "lucide-react";
import {
  fetchEvents, fetchStatus, fetchPeers, fetchInbox,
  resetDemo, sendToPeer, clearInbox, summarizeEvents,
} from "./api/client.js";
import PeerList from "./components/PeerList.jsx";
import InboxPanel from "./components/InboxPanel.jsx";
import MetricCards from "./components/MetricCards.jsx";
import HopFlow from "./components/HopFlow.jsx";
import ErrorRateBar from "./components/ErrorRateBar.jsx";
import LiveLog from "./components/LiveLog.jsx";
import PacketJourney from "./components/PacketJourney.jsx";
import AttackControls from "./components/AttackControls.jsx";
import QuantumAnimationModal from "./components/QuantumAnimationModal.jsx";

const attackModes = [
  { id: "normal", label: "Normal send", Icon: Shield, color: "teal", desc: "All 3 hops forward the encrypted packet safely. Receiver decrypts it." },
  { id: "mitm", label: "Random MITM", Icon: UserRoundX, color: "red", desc: "One hop tampers with ciphertext. Receiver blocks when AES HMAC integrity verification fails." },
  { id: "eavesdrop", label: "Eavesdrop", Icon: RadioTower, color: "orange", desc: "An eavesdropper disturbs BB84 measurements. Receiver blocks when QBER exceeds the threshold." },
  { id: "replay", label: "Replay", Icon: Repeat, color: "purple", desc: "The same encrypted packet is resent. Receiver blocks when the nonce is already in the replay cache." },
];

function getReceiverResult(sendResult) {
  return sendResult?.result?.result || sendResult?.result || sendResult;
}

function NodeCrypto({ step, crypto }) {
  const nodeCrypto = step.crypto || {};
  const bb84 = nodeCrypto.bb84 || {};
  if (nodeCrypto.action) {
    return (
      <div className="nodeCrypto">
        {nodeCrypto.decryptedPreview && <p><span>Decrypted</span><code>{nodeCrypto.decryptedPreview}</code></p>}
        {nodeCrypto.plaintextPreview && <p><span>Plaintext</span><code>{nodeCrypto.plaintextPreview}</code></p>}
        {nodeCrypto.aesKeyFingerprint && <p><span>New AES key</span><code>{nodeCrypto.aesKeyFingerprint}... ({nodeCrypto.aesKeyLengthBits} bits)</code></p>}
        {nodeCrypto.ivPreview && <p><span>New IV</span><code>{nodeCrypto.ivPreview}...</code></p>}
        {nodeCrypto.ciphertextPreview && <p><span>New ciphertext</span><code>{nodeCrypto.ciphertextPreview}...</code></p>}
        {nodeCrypto.tagPreview && <p><span>AES HMAC tag</span><code>{nodeCrypto.tagPreview}...</code></p>}
        {nodeCrypto.payload?.ciphertext && <p><span>Incoming ciphertext</span><code>{nodeCrypto.payload.ciphertext.slice(0, 40)}...</code></p>}
        {bb84.aliceBasisPreview && <p><span>BB84 bases</span><code>Alice {bb84.aliceBasisPreview} | Bob {bb84.bobBasisPreview}</code></p>}
        {bb84.aliceBitPreview && <p><span>Bits</span><code>Alice {bb84.aliceBitPreview} | Bob {bb84.bobBitPreview}</code></p>}
        {bb84.keepPreview && <p><span>Keep / sifted</span><code>{bb84.keepPreview} / {bb84.siftedPreview}</code></p>}
        {bb84.matchingBases && <p><span>BB84 counts</span><code>{bb84.matchingBases} matching, {bb84.siftedBits} sifted, {bb84.comparedBits} compared</code></p>}
        {bb84.errorRate !== undefined && <p><span>Error rate</span><code>{Math.round((bb84.errorRate || 0) * 100)}% / {Math.round((bb84.errorThreshold || 0.15) * 100)}%</code></p>}
        {nodeCrypto.nonce && <p><span>Nonce</span><code>{nodeCrypto.nonce.slice(0, 24)}...</code></p>}
        {nodeCrypto.mode && <p><span>Mode seen</span><code>{nodeCrypto.mode}</code></p>}
        {nodeCrypto.blockedReason && <p><span>Blocked reason</span><code>{nodeCrypto.blockedReason}</code></p>}
        {nodeCrypto.note && <p><span>What happened</span><code>{nodeCrypto.note}</code></p>}
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
        <p><span>Plaintext</span><code>{crypto.senderPlaintextPreview || crypto.plaintextPreview || "message typed by sender"}</code></p>
        <p><span>AES key</span><code>{crypto.aesKeyFingerprint}... ({crypto.aesKeyLengthBits} bits)</code></p>
        <p><span>IV</span><code>{crypto.ivPreview}...</code></p>
        <p><span>Ciphertext</span><code>{crypto.ciphertextPreview}...</code></p>
        {crypto.tagPreview && <p><span>AES HMAC tag</span><code>{crypto.tagPreview}...</code></p>}
        <p><span>BB84 bases</span><code>Alice {sender.aliceBasisPreview} | Bob {sender.bobBasisPreview}</code></p>
        <p><span>Bits</span><code>Alice {sender.aliceBitPreview} | Bob {sender.bobBitPreview}</code></p>
        <p><span>Keep / sifted</span><code>{sender.keepPreview} / {sender.siftedPreview}</code></p>
      </div>
    );
  }

  if (node.includes("hop")) {
    return (
      <div className="nodeCrypto">
        <p><span>Packet state</span><code>Encrypted only; hop cannot read plaintext</code></p>
        <p><span>Carrying</span><code>nonce {crypto.nonce.slice(0, 16)}... + ciphertext {crypto.ciphertextPreview}...</code></p>
      </div>
    );
  }

  if (node.includes("receiver check")) {
    return (
      <div className="nodeCrypto">
        <p><span>Nonce check</span><code>{crypto.nonce.slice(0, 24)}...</code></p>
        <p><span>Mode seen</span><code>{crypto.attackMode || "normal"}</code></p>
      </div>
    );
  }

  if (node.includes("receiver")) {
    return (
      <div className="nodeCrypto">
        <p><span>Receiver BB84 bases</span><code>Alice {receiver.aliceBasisPreview} | Bob {receiver.bobBasisPreview}</code></p>
        <p><span>Receiver bits</span><code>Alice {receiver.aliceBitPreview} | Bob {receiver.bobBitPreview}</code></p>
        <p><span>Keep / sifted</span><code>{receiver.keepPreview} / {receiver.siftedPreview}</code></p>
        <p><span>BB84 counts</span><code>{receiver.matchingBases} matching, {receiver.siftedBits} sifted, {receiver.comparedBits} compared</code></p>
        <p><span>Error rate</span><code>{Math.round((receiver.errorRate || 0) * 100)}% / {Math.round((receiver.errorThreshold || 0.15) * 100)}%</code></p>
        <p><span>Decryption</span><code>{crypto.decrypted ? `Plaintext: ${crypto.plaintextPreview}` : `Blocked: ${crypto.blockedReason}`}</code></p>
      </div>
    );
  }

  return null;
}

function SendExplanation({ sendResult }) {
  if (!sendResult) return null;
  const receiverResult = getReceiverResult(sendResult);
  const steps = receiverResult?.routeSteps || [];
  const crypto = receiverResult?.cryptoDetails || {};
  const blocked = receiverResult?.attackDetected || receiverResult?.ok === false;

  return (
    <div className={`sendExplanation ${blocked ? "blocked" : "delivered"}`}>
      <strong>{blocked ? "Receiver blocked the message" : "Receiver accepted the message"}</strong>
      {receiverResult?.attackType && <p>{receiverResult.attackType}</p>}
      {steps.length > 0 && (
        <ol>
          {steps.map((step, index) => (
            <li key={`${step.node}-${index}`}>
              <span>{index + 1}. {step.node}</span>
              <p>{step.detail}</p>
              <NodeCrypto step={step} crypto={crypto} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function getOutgoingPreviews(step) {
  if (!step || !step.crypto) return { iv: "", ciphertext: "", tag: "" };
  const crypto = step.crypto;
  const payload = crypto.payload || {};
  return {
    iv: payload.iv || crypto.ivPreview || "",
    ciphertext: payload.ciphertext || crypto.ciphertextPreview || "",
    tag: payload.tag || crypto.tagPreview || "",
  };
}

function mapRouteStepsToEvents(routeSteps, attackMode, targetNode, originalMessage) {
  if (!routeSteps || routeSteps.length === 0) return [];
  const events = [];
  const now = new Date().toISOString();

  routeSteps.forEach((step, idx) => {
    const nodeName = step.node;
    const crypto = step.crypto || {};
    const bb84 = crypto.bb84 || {};
    const prevStep = idx > 0 ? routeSteps[idx - 1] : null;
    const prevPreviews = getOutgoingPreviews(prevStep);

    let source = "sender";
    if (nodeName.includes("Hop 1")) source = "node1";
    else if (nodeName.includes("Hop 2")) source = "node2";
    else if (nodeName.includes("Hop 3")) source = "node3";
    else if (nodeName.includes("Receiver")) source = "receiver";

    if (nodeName === "Sender laptop") {
      events.push({
        time: now,
        source: "sender",
        message: "BB84 generated matching bases and sifted a shared key",
        status: "info",
        phase: "bb84",
        generatedBits: bb84.generatedBits,
        matchingBases: bb84.matchingBases,
        siftedBits: bb84.siftedBits,
        comparedBits: bb84.comparedBits,
        errorRate: bb84.errorRate,
        errorThreshold: bb84.errorThreshold || 0.15,
        aliceBasisPreview: bb84.aliceBasisPreview,
        bobBasisPreview: bb84.bobBasisPreview,
        aliceBitPreview: bb84.aliceBitPreview,
        bobBitPreview: bb84.bobBitPreview,
        keepPreview: bb84.keepPreview,
        siftedPreview: bb84.siftedPreview,
        keyFingerprint: crypto.aesKeyFingerprint,
      });

      events.push({
        time: now,
        source: "sender",
        message: "AES-CBC encrypted plaintext for first hop",
        status: "info",
        phase: "aes-encrypt",
        plaintextLength: originalMessage ? originalMessage.length : (crypto.plaintextPreview ? crypto.plaintextPreview.length : 0),
        decryptedPreview: originalMessage || crypto.plaintextPreview || crypto.decryptedPreview || crypto.senderPlaintextPreview,
        ivPreview: crypto.ivPreview,
        ciphertextPreview: crypto.ciphertextPreview,
        tagPreview: crypto.tagPreview,
        keyFingerprint: crypto.aesKeyFingerprint,
      });

      events.push({
        time: now,
        source: "sender",
        message: "Sent encrypted packet",
        status: "success",
        errorRate: bb84.errorRate,
      });
    } else if (nodeName.includes("Hop")) {
      const hopNum = nodeName.replace("Hop ", "").trim();
      const hopSource = `node${hopNum}`;

      if (step.status === "attack") {
        events.push({
          time: now,
          source: hopSource,
          message: step.detail || "MITM tampering detected by AES integrity check",
          status: "attack",
          phase: "attack-detected",
          detectionReason: step.detail || "AES integrity check failed",
          attackMode: attackMode,
          targetNode: targetNode,
          inspectedAtTarget: true,
          previousHop: hopNum === "1" ? "sender" : `node${parseInt(hopNum) - 1}`,
          nextHop: hopNum === "3" ? "receiver" : `node${parseInt(hopNum) + 1}`,
          detectionCheckpoint: "AES HMAC verification before plaintext release",
          integrityTagPresent: true,
          ciphertextTampered: true,
          detectionEvidence: [
            `Packet arrived at Hop ${hopNum} from ${hopNum === "1" ? "sender" : `Hop ${parseInt(hopNum) - 1}`}.`,
            `The attacker modified the ciphertext in transit at Hop ${hopNum}.`,
            "The attacker did not know the hop AES key, so it could not create a valid HMAC tag for the modified ciphertext.",
            "Before decrypting, the node recalculated the HMAC over IV + ciphertext using the hop key.",
            "Calculated tag did not match the packet tag.",
            `Hop ${hopNum} blocked the packet and the router removed this hop from the active route.`
          ],
          errorRate: bb84.errorRate ?? 0,
          errorThreshold: bb84.errorThreshold ?? 0.15,
          noncePreview: crypto.nonce ? crypto.nonce.slice(0, 12) : "",
          blockedNode: hopSource,
          ivPreview: crypto.ivPreview,
          ciphertextPreview: crypto.ciphertextPreview,
          tagPreview: crypto.tagPreview,
          recalculatedTag: crypto.recalculatedTag,
          keyFingerprint: crypto.aesKeyFingerprint,
        });
      } else {
        events.push({
          time: now,
          source: hopSource,
          message: "AES-CBC decrypted packet from previous hop",
          status: "info",
          phase: "aes-decrypt",
          plaintextLength: crypto.decryptedPreview ? crypto.decryptedPreview.length : (originalMessage ? originalMessage.length : 0),
          ivPreview: prevPreviews.iv || crypto.ivPreview,
          ciphertextPreview: prevPreviews.ciphertext || crypto.ciphertextPreview,
          tagPreview: prevPreviews.tag || crypto.tagPreview,
          keyFingerprint: crypto.aesKeyFingerprint,
          previousHop: hopNum === "1" ? "sender" : `node${parseInt(hopNum) - 1}`,
          nextHop: hopNum === "3" ? "receiver" : `node${parseInt(hopNum) + 1}`,
          decryptedPreview: crypto.decryptedPreview || originalMessage,
          hopExplanation: `${nodeName} used the AES key from the previous hop to open the packet, recover the plaintext, and prepare it for re-encryption.`,
        });

        events.push({
          time: now,
          source: hopSource,
          message: "BB84 rekey completed for next hop",
          status: "info",
          phase: "bb84",
          generatedBits: bb84.generatedBits,
          matchingBases: bb84.matchingBases,
          siftedBits: bb84.siftedBits,
          comparedBits: bb84.comparedBits,
          errorRate: bb84.errorRate,
          errorThreshold: bb84.errorThreshold || 0.15,
          aliceBasisPreview: bb84.aliceBasisPreview,
          bobBasisPreview: bb84.bobBasisPreview,
          aliceBitPreview: bb84.aliceBitPreview,
          bobBitPreview: bb84.bobBitPreview,
          keepPreview: bb84.keepPreview,
          siftedPreview: bb84.siftedPreview,
          keyFingerprint: crypto.aesKeyFingerprint,
        });

        events.push({
          time: now,
          source: hopSource,
          message: "AES-CBC encrypted packet for next hop",
          status: "info",
          phase: "aes-encrypt",
          plaintextLength: crypto.decryptedPreview ? crypto.decryptedPreview.length : (originalMessage ? originalMessage.length : 0),
          decryptedPreview: crypto.decryptedPreview || originalMessage,
          ivPreview: crypto.ivPreview,
          ciphertextPreview: crypto.ciphertextPreview,
          tagPreview: crypto.tagPreview,
          keyFingerprint: crypto.aesKeyFingerprint,
          previousHop: hopSource,
          nextHop: hopNum === "3" ? "receiver" : `node${parseInt(hopNum) + 1}`,
          hopExplanation: `${nodeName} generated a fresh BB84-derived AES key and encrypted the same plaintext.`,
        });

        events.push({
          time: now,
          source: hopSource,
          message: "Forwarded encrypted packet",
          status: "success",
          errorRate: bb84.errorRate,
        });
      }
    } else if (nodeName === "Receiver check") {
      if (step.status === "attack") {
        events.push({
          time: now,
          source: "receiver",
          message: step.detail || "Replay Attack - duplicate nonce detected",
          status: "attack",
          phase: "attack-detected",
          detectionReason: "Replay Attack - duplicate nonce detected",
          attackMode: "replay",
          targetNode: "receiver",
          detectionCheckpoint: "nonce and BB84 checks before AES decrypt",
          detectionEvidence: [
            "Packet arrived at Receiver check.",
            `Nonce preview ${crypto.nonce ? crypto.nonce.slice(0, 12) : ""}... was checked against the local replay cache.`,
            "A duplicate nonce was found, indicating a potential replay attack.",
            "The receiver immediately blocked and discarded the packet."
          ],
          noncePreview: crypto.nonce ? crypto.nonce.slice(0, 12) : "",
          blockedNode: "receiver",
        });
      }
    } else if (nodeName === "Receiver laptop" || nodeName === "Receiver") {
      if (step.status === "attack") {
        const isEavesdrop = attackMode === "eavesdrop";
        const isMitm = attackMode === "mitm";
        const reason = step.detail || (isEavesdrop ? "Eavesdropping detected" : "AES integrity check failed");

        events.push({
          time: now,
          source: "receiver",
          message: reason,
          status: "attack",
          phase: "attack-detected",
          detectionReason: reason,
          attackMode: attackMode,
          targetNode: targetNode,
          inspectedAtTarget: targetNode === "receiver",
          previousHop: "node3",
          nextHop: null,
          detectionCheckpoint: isMitm ? "AES HMAC verification before plaintext release" : "nonce and BB84 checks before AES decrypt",
          integrityTagPresent: isMitm,
          ciphertextTampered: isMitm,
          errorRate: bb84.errorRate ?? 0,
          errorThreshold: bb84.errorThreshold ?? 0.15,
          noncePreview: crypto.nonce ? crypto.nonce.slice(0, 12) : "",
          blockedNode: "receiver",
          ivPreview: crypto.payload ? crypto.payload.iv : (crypto.ivPreview || ""),
          ciphertextPreview: crypto.payload ? crypto.payload.ciphertext : (crypto.ciphertextPreview || ""),
          tagPreview: crypto.payload ? crypto.payload.tag : (crypto.tagPreview || ""),
          recalculatedTag: crypto.recalculatedTag,
          keyFingerprint: crypto.aesKeyFingerprint,
          detectionEvidence: isEavesdrop ? [
            "Packet arrived at Receiver from Hop 3.",
            `BB84 error rate was ${Math.round((bb84.errorRate || 0) * 100)}%, exceeding the threshold of ${Math.round((bb84.errorThreshold || 0.15) * 100)}%.`,
            "This high error rate indicates active measurement disturbance on the quantum channel by an eavesdropper.",
            "The receiver aborted key derivation and blocked the transmission."
          ] : [
            "Packet arrived at Receiver from Hop 3.",
            "The recalculated AES HMAC checksum over IV + Ciphertext did not match the envelope's tag.",
            "The receiver blocked the packet to prevent ciphertext manipulation (MITM) attacks."
          ],
        });
      } else {
        events.push({
          time: now,
          source: "receiver",
          message: "AES-CBC decrypted final packet",
          status: "info",
          phase: "aes-decrypt",
          plaintextLength: crypto.decryptedPreview ? crypto.decryptedPreview.length : (originalMessage ? originalMessage.length : 0),
          decryptedPreview: crypto.decryptedPreview || originalMessage,
          ivPreview: prevPreviews.iv || (crypto.payload ? crypto.payload.iv : (crypto.ivPreview || "")),
          ciphertextPreview: prevPreviews.ciphertext || (crypto.payload ? crypto.payload.ciphertext : (crypto.ciphertextPreview || "")),
          tagPreview: prevPreviews.tag || (crypto.payload ? crypto.payload.tag : (crypto.tagPreview || "")),
          keyFingerprint: crypto.aesKeyFingerprint,
        });

        events.push({
          time: now,
          source: "receiver",
          message: `Received plaintext: ${crypto.decryptedPreview || originalMessage}`,
          status: "success",
          plaintext: crypto.decryptedPreview || originalMessage,
        });
      }
    }
  });

  return events;
}

function getStatusesFromRouteSteps(routeSteps) {
  const statuses = {
    sender: { status: "active", nextHop: "node1" },
    node1: { status: "active", nextHop: "node2" },
    node2: { status: "active", nextHop: "node3" },
    node3: { status: "active", nextHop: "receiver" },
    receiver: { status: "active" },
  };

  if (!routeSteps) return statuses;

  routeSteps.forEach((step) => {
    let key = null;
    if (step.node === "Sender laptop") key = "sender";
    else if (step.node.includes("Hop 1")) key = "node1";
    else if (step.node.includes("Hop 2")) key = "node2";
    else if (step.node.includes("Hop 3")) key = "node3";
    else if (step.node === "Receiver check" || step.node === "Receiver laptop" || step.node === "Receiver") key = "receiver";

    if (key) {
      if (step.status === "attack") {
        statuses[key].status = "blocked";
      } else if (step.status === "warning") {
        statuses[key].status = "warning";
      } else if (step.status === "success") {
        statuses[key].status = "active";
      }
    }
  });

  return statuses;
}

export default function App() {
  // Peer state
  const [selfInfo, setSelfInfo] = useState(null);
  const [peers, setPeers] = useState([]);
  const [inboxMessages, setInboxMessages] = useState([]);

  // Send form
  const [message, setMessage] = useState("");
  const [targetIp, setTargetIp] = useState("");
  const [attackMode, setAttackMode] = useState("normal");
  const [busy, setBusy] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  // Existing simulation state
  const [events, setEvents] = useState([]);
  const [statuses, setStatuses] = useState({});
  const [simAttackMode, setSimAttackMode] = useState("normal");
  const [targetNode, setTargetNode] = useState("node1");

  // Animation visualizer state
  const [activeAnimationNode, setActiveAnimationNode] = useState(null);
  const [showAnimationModal, setShowAnimationModal] = useState(false);

  // Real network visualizer state
  const [netEvents, setNetEvents] = useState([]);
  const [netStatuses, setNetStatuses] = useState({
    sender: { status: "active", nextHop: "node1" },
    node1: { status: "active", nextHop: "node2" },
    node2: { status: "active", nextHop: "node3" },
    node3: { status: "active", nextHop: "receiver" },
    receiver: { status: "active" },
  });
  const [netAttackMode, setNetAttackMode] = useState("normal");
  const [netTargetNode, setNetTargetNode] = useState("node1");

  function handleNodeClick(nodeName) {
    setActiveAnimationNode(nodeName);
    setShowAnimationModal(true);
  }

  // Tab state
  const [activeTab, setActiveTab] = useState("network");

  async function refreshAll() {
    try {
      const [evts, statusData, peerData, inboxData] = await Promise.all([
        fetchEvents(),
        fetchStatus(),
        fetchPeers(),
        fetchInbox(),
      ]);
      setEvents(evts);
      if (statusData?.nodes) {
        setStatuses(statusData.nodes);
        setSimAttackMode(statusData.attackMode || "normal");
        setTargetNode(statusData.targetNode || "node1");
      }
      if (statusData?.self) setSelfInfo(statusData.self);
      if (peerData?.self) setSelfInfo(peerData.self);
      setPeers(peerData?.peers || []);
      setInboxMessages(inboxData || []);
    } catch {
      /* offline */
    }
  }

  useEffect(() => {
    refreshAll();
    const iv = setInterval(refreshAll, 2000);
    return () => clearInterval(iv);
  }, []);

  const metrics = useMemo(() => summarizeEvents(events), [events]);

  // Auto-select first peer as target
  useEffect(() => {
    if (!targetIp && peers.length > 0) setTargetIp(peers[0].ip);
  }, [peers, targetIp]);

  async function handleSend(e) {
    e.preventDefault();
    if (!message.trim() || !targetIp) return;
    const originalMessage = message.trim();
    setBusy(true);
    setSendResult(null);

    const targetPeerObj = peers.find((p) => p.ip === targetIp);
    const targetSocketPort = targetPeerObj?.socketPort || 5010;

    try {
      const result = await sendToPeer(
        originalMessage, targetIp, targetSocketPort,
        attackMode, "", 5010
      );
      setSendResult(result);
      setMessage("");

      // Update Net Simulation States for Animation
      const receiverResult = getReceiverResult(result);
      if (receiverResult && receiverResult.routeSteps) {
        const targetStep = receiverResult.routeSteps.find(s => s.status === "attack");
        let targetedNode = "node1";
        if (targetStep) {
          if (targetStep.node.includes("Hop 1")) targetedNode = "node1";
          else if (targetStep.node.includes("Hop 2")) targetedNode = "node2";
          else if (targetStep.node.includes("Hop 3")) targetedNode = "node3";
          else if (targetStep.node.includes("Receiver")) targetedNode = "receiver";
        }

        const mappedEvents = mapRouteStepsToEvents(receiverResult.routeSteps, attackMode, targetedNode, originalMessage);

        setNetEvents(mappedEvents);
        setNetStatuses(getStatusesFromRouteSteps(receiverResult.routeSteps));
        setNetAttackMode(attackMode);
        setNetTargetNode(targetedNode);
      }

      setTimeout(refreshAll, 500);
    } catch (err) {
      setSendResult({ ok: false, error: err.message });
    }
    setBusy(false);
  }

  async function handleReset() {
    setBusy(true);
    await resetDemo();
    setSendResult(null);
    await refreshAll();
    setBusy(false);
  }

  const activeAttack = attackModes.find((m) => m.id === attackMode) || attackModes[0];
  const targetPeer = peers.find((p) => p.ip === targetIp);
  const pathText = `Path: You -> Hop 1 -> Hop 2 -> Hop 3 -> ${targetPeer?.name || "receiver"}`;

  return (
    <div className="dashboard-container">
      {/* ─── Persistent Sidebar ─── */}
      <aside className="sidebar">
        <div className="brand-section">
          <div className="brand-title">QuantumHop</div>
          <div className="brand-subtitle">BB84 Quantum Key Distribution</div>
        </div>

        {selfInfo && (
          <div className="selfBadge" title="Local node details">
            <Monitor size={14} style={{ marginRight: "4px" }} />
            <span>{selfInfo.name}</span>
            <code>{selfInfo.ip}</code>
          </div>
        )}

        <nav className="tabBar" aria-label="Main Navigation">
          <button
            type="button"
            className={`tab ${activeTab === "network" ? "active" : ""}`}
            onClick={() => setActiveTab("network")}
          >
            <Wifi size={16} />
            <span>Real Network</span>
            {peers.length > 0 && <span className="tabBadge">{peers.length}</span>}
          </button>
          <button
            type="button"
            className={`tab ${activeTab === "simulation" ? "active" : ""}`}
            onClick={() => setActiveTab("simulation")}
          >
            <Radio size={16} />
            <span>Local Simulation</span>
          </button>
        </nav>

        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column" }}>
          <button 
            className="iconButton" 
            style={{ width: "100%", height: "42px", borderRadius: "8px", display: "flex", gap: "8px" }} 
            type="button" 
            onClick={handleReset} 
            disabled={busy}
            title="Reset demo"
          >
            <RotateCcw size={16} className={busy ? "spin" : ""} />
            <span>Reset demo</span>
          </button>
        </div>
      </aside>

      {/* ─── Main Console Content Workspace ─── */}
      <main className="console-main">
        {/* ─── Top Header Bar ─── */}
        <header className="topbar">
          <div>
            <p className="eyebrow">BB84 Quantum Key Distribution</p>
            <h1>QuantumHop Secure Network</h1>
          </div>
        </header>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* REAL NETWORK TAB                                                   */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "network" && (
          <>
            {/* ─── Send Panel ─── */}
            <section className="panel sendPanel">
              <div className="panelHeader">
                <h2>Send Secure Message</h2>
                {attackMode !== "normal" && (
                  <span className="attackBadge">
                    <ShieldAlert size={14} />
                    {activeAttack.label}
                  </span>
                )}
              </div>

              <form className="sendForm" onSubmit={handleSend}>
                <div className="sendRow2">
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Type a message to send securely…"
                    aria-label="Message"
                    className="sendInput"
                  />
                </div>

                <div className="sendOptions">
                  <div className="sendOption">
                    <label>To:</label>
                    <select value={targetIp} onChange={(e) => setTargetIp(e.target.value)}>
                      {peers.length === 0 && <option value="">No peers online</option>}
                      {peers.map((p) => (
                        <option key={p.ip} value={p.ip}>
                          {p.name} ({p.ip})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sendOption">
                    <label>Mode:</label>
                    <select value={attackMode} onChange={(e) => setAttackMode(e.target.value)}>
                      {attackModes.map((m) => (
                        <option key={m.id} value={m.id}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <button type="submit" className="sendBtn" disabled={busy || !targetIp || !message.trim()}>
                    <Send size={16} style={{ marginRight: "4px" }} />
                    {busy ? "Sending…" : "Send Securely"}
                  </button>
                </div>

                <div className={`attackDesc ${attackMode !== "normal" ? "warning" : ""}`}>
                  <activeAttack.Icon size={14} />
                  <p><strong>{pathText}</strong> {activeAttack.desc}</p>
                </div>
              </form>

              {sendResult && (
                <>
                  <div className={`sendResult ${getReceiverResult(sendResult)?.attackDetected || !sendResult.ok ? "error" : "success"}`}>
                    {sendResult.ok
                      ? getReceiverResult(sendResult)?.attackDetected
                        ? "Message reached receiver, but attack detection blocked it."
                        : "Message delivered through 3 hops."
                      : `${sendResult.error || "Send failed"}`
                    }
                  </div>
                  <SendExplanation sendResult={sendResult} />
                </>
              )}
            </section>

            <HopFlow 
              statuses={netStatuses} 
              attackMode={netAttackMode} 
              targetNode={netTargetNode} 
              onNodeClick={handleNodeClick}
              receiverName={targetPeer?.name}
            />

            {/* ─── Network Grid ─── */}
            <div className="networkGrid">
              <PeerList selfInfo={selfInfo} peers={peers} onRefresh={refreshAll} />
              <InboxPanel messages={inboxMessages} onClear={async () => { await clearInbox(); await refreshAll(); }} />
            </div>

            <PacketJourney 
              events={netEvents} 
              onNodeClick={handleNodeClick}
              receiverName={targetPeer?.name}
            />

            {/* ─── Metrics + Log ─── */}
            <div className="split">
              <section>
                <ErrorRateBar value={metrics.latestErrorRate} />
              </section>
              <LiveLog events={events} />
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LOCAL SIMULATION TAB                                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {activeTab === "simulation" && (
          <>
            <form className="sendRow" onSubmit={async (e) => {
              e.preventDefault();
              if (!message.trim()) return;
              setBusy(true);
              const { sendMessage } = await import("./api/client.js");
              await sendMessage(message.trim());
              await refreshAll();
              setBusy(false);
            }}>
              <input
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type a message to send through local simulation…"
                aria-label="Message"
                className="sendInput"
              />
              <button type="submit" className="sendBtn" disabled={busy || !message.trim()}>
                <Send size={18} style={{ marginRight: "4px" }} />
                {busy ? "Sending…" : "Send Securely"}
              </button>
            </form>

            <MetricCards metrics={metrics} statuses={statuses} attackMode={simAttackMode} />
            
            <HopFlow 
              statuses={statuses} 
              attackMode={simAttackMode} 
              targetNode={targetNode} 
              onNodeClick={handleNodeClick}
            />

            <div className="split">
              <section>
                <ErrorRateBar value={metrics.latestErrorRate} />
                <AttackControls
                  currentMode={simAttackMode}
                  targetNode={targetNode}
                  onChange={refreshAll}
                />
              </section>
              <LiveLog events={events} />
            </div>
            <PacketJourney 
              events={events} 
              attackMode={simAttackMode} 
              onNodeClick={handleNodeClick}
            />
          </>
        )}
      </main>

      {showAnimationModal && activeAnimationNode && (
        <QuantumAnimationModal
          node={activeAnimationNode}
          events={activeTab === "network" ? netEvents : events}
          attackMode={activeTab === "network" ? netAttackMode : simAttackMode}
          targetNode={activeTab === "network" ? netTargetNode : targetNode}
          onClose={() => setShowAnimationModal(false)}
        />
      )}
    </div>
  );
}
