import { ArrowRight, Lock, ShieldAlert, Target } from "lucide-react";

const route = ["sender", "node1", "node2", "node3", "receiver"];

const displayNames = {
  sender: "Sender",
  node1: "Node 1",
  node2: "Node 2",
  node3: "Node 3",
  receiver: "Receiver",
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
        <h2>Network Topology</h2>
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <span className="infoBadge pulse">
            💡 Click any node to view animation
          </span>
          {isAttack && (
            <span className="attackBadge">
              <Target size={14} />
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

          return (
            <div className="hopGroup" key={node}>
              <div 
                className={`hop clickable ${status} ${isTargeted ? 'blocked' : ''}`}
                onClick={() => onNodeClick && onNodeClick(node)}
                title="Click to view step-by-step transmission animation"
              >
                <div className="hopIcon">
                  {isBlocked || isTargeted ? <ShieldAlert size={20} /> : <Lock size={18} />}
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
                <div className={`connector ${isBlocked ? "blocked" : ""}`}>
                  <ArrowRight size={18} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
