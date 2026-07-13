import React from "react";
import { Activity, AlertTriangle, ShieldCheck } from "lucide-react";

export default function ErrorRateBar({ value }) {
  const percent = Math.round(value * 100);
  const isHigh = percent > 15;

  return (
    <section className="panel">
      <div className="panelHeader">
        <div className="panelHeaderLeft">
          <Activity size={16} className="panelHeaderIcon" />
          <h2>BB84 Error Rate</h2>
        </div>
        <strong style={{ 
          fontSize: "18px", 
          fontFamily: "var(--font-cyber)", 
          color: isHigh ? "var(--neon-red)" : "var(--neon-emerald)",
          textShadow: isHigh ? "0 0 10px rgba(255,51,102,0.4)" : "0 0 10px rgba(5,242,194,0.4)" 
        }}>
          {percent}%
        </strong>
      </div>

      <div style={{ position: "relative", marginBottom: "8px" }}>
        <div className="barTrack">
          <div className="barFill" style={{ width: `${Math.min(percent, 100)}%` }} />
        </div>
        
        {/* Limit Marker Line */}
        <div style={{ 
          position: "absolute", 
          left: "15%", 
          top: "-5px", 
          bottom: "-5px", 
          width: "2px", 
          background: "var(--neon-red)", 
          boxShadow: "0 0 8px var(--neon-red)",
          zIndex: 5 
        }} title="BB84 Adversary Detection Limit (15%)" />
        
        <span style={{ 
          position: "absolute", 
          left: "17%", 
          top: "16px", 
          fontSize: "8.5px", 
          fontWeight: "700", 
          color: "var(--neon-red)", 
          fontFamily: "var(--font-cyber)"
        }}>
          LIMIT 15%
        </span>
      </div>

      <div style={{ display: "flex", gap: "6px", alignItems: "flex-start", marginTop: "24px" }}>
        {isHigh ? (
          <AlertTriangle size={14} style={{ color: "var(--neon-red)", flexShrink: 0, marginTop: "2px" }} />
        ) : (
          <ShieldCheck size={14} style={{ color: "var(--neon-emerald)", flexShrink: 0, marginTop: "2px" }} />
        )}
        <p style={{ fontSize: "12px", color: isHigh ? "#ff8fa3" : "#8c9ba5" }}>
          {isHigh
            ? "⚠️ High error rate — possible eavesdropping detected"
            : percent === 0
              ? "No errors detected — quantum channel is secure"
              : "Within acceptable range — quantum channel appears clean"}
        </p>
      </div>
    </section>
  );
}
