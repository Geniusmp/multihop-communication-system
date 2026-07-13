import React from "react";
import { ShieldCheck, ShieldAlert, Send, Inbox, Cpu, ShieldAlert as AlertIcon } from "lucide-react";

export default function MetricCards({ metrics, statuses, attackMode }) {
  const activeHops = Object.values(statuses).filter((node) => node.status === "active").length;
  const isAttack = attackMode && attackMode !== "normal";

  const items = [
    { label: "Sent", value: metrics.messagesSent, color: "blue", Icon: Send },
    { label: "Received", value: metrics.messagesReceived, color: "teal", Icon: Inbox },
    { label: "Active Hops", value: activeHops, color: "blue", Icon: Cpu },
    { label: "Attacks Blocked", value: metrics.attacksBlocked, color: "red", Icon: AlertIcon },
  ];

  return (
    <section className="metrics">
      {items.map((item) => {
        const Icon = item.Icon;
        return (
          <article className={`metric ${item.color}`} key={item.label}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", width: "100%" }}>
              <span>{item.label}</span>
              <Icon size={14} style={{ opacity: 0.5, color: "var(--neon-cyan)" }} />
            </div>
            <strong>{item.value}</strong>
          </article>
        );
      })}
      
      <article className={`metric mode ${isAttack ? "danger" : "safe"}`}>
        <span>Network Mode</span>
        <div className="modeIndicator">
          {isAttack ? (
            <ShieldAlert size={20} style={{ color: "var(--neon-red)" }} />
          ) : (
            <ShieldCheck size={20} style={{ color: "var(--neon-emerald)" }} />
          )}
          <strong>{(attackMode || "normal").toUpperCase()}</strong>
        </div>
      </article>
    </section>
  );
}
