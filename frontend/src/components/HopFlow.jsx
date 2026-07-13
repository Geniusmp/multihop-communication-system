import React from "react";
import { ArrowRight, Lock, ShieldAlert, Target, Monitor, Server, Laptop, Shield } from "lucide-react";

const route = ["sender", "node1", "node2", "node3", "receiver"];

const displayNames = {
  sender: "Sender",
  node1: "Node 1",
  node2: "Node 2",
  node3: "Node 3",
  receiver: "Receiver",
};

const nodeIcons = {
  sender: Monitor,
  node1: Server,
  node2: Server,
  node3: Server,
  receiver: Laptop,
};

export default function HopFlow({ statuses, attackMode, targetNode, onNodeClick, receiverName }) {
  const isAttack = attackMode && attackMode !== "normal";

  const getDisplayName = (n) => {
    if (n === "receiver") return receiverName || "Receiver";
    return displayNames[n] || n;
  };

  return (
    <section className="panel">
      <div className="panelHeader">
        <div className="panelHeaderLeft">
          <Shield size={16} className="panelHeaderIcon" />
          <h2>Network Topology</h2>
        </div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <span className="infoBadge">
            💡 Click any node to view animation
          </span>
          {isAttack && (
            <span className="attackBadge" style={{ background: "rgba(255,51,102,0.08)", color: "var(--neon-red)", border: "1px solid rgba(255,51,102,0.2)", padding: "4px 10px", borderRadius: "6px", fontSize: "11px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "4px" }}>
              <Target size={12} />
              Target: {getDisplayName(targetNode)}
            </span>
          )}
        </div>
      </div>
      <div className="hopFlow">
        {route.map((node, index) => {
          const status = statuses[node]?.status || "active";
          const isBlocked = status === "blocked";
          const isTargeted = isAttack && node === targetNode;
          const nodeName = getDisplayName(node);
          const NodeIconComponent = nodeIcons[node] || Server;

          return (
            <div className="hopGroup" key={node}>
              <div 
                className={`hop clickable ${status} ${isTargeted ? 'blocked' : ''}`}
                onClick={() => onNodeClick && onNodeClick(node)}
                title="Click to view step-by-step transmission animation"
              >
                <div className="hopIcon">
                  {isBlocked || isTargeted ? (
                    <ShieldAlert size={20} style={{ color: "var(--neon-red)" }} />
                  ) : (
                    <NodeIconComponent size={20} style={{ color: "var(--neon-cyan)" }} />
                  )}
                </div>
                <span>{nodeName}</span>
                <small>
                  {isBlocked
                    ? "Blocked"
                    : isTargeted
                      ? "Compromised"
                      : statuses[node]?.nextHop
                        ? `→ ${getDisplayName(statuses[node].nextHop)}`
                        : "End"}
                </small>
                <div className="hop-animate-btn">Animate →</div>
              </div>
              
              {index < route.length - 1 && (
                <div className={`connector ${isBlocked ? "blocked" : ""}`} aria-hidden="true">
                  <ArrowRight size={14} style={{ opacity: 0 }} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
