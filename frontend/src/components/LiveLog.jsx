import React from "react";
import { Activity, Terminal } from "lucide-react";

export default function LiveLog({ events }) {
  return (
    <section className="panel logPanel">
      <div className="panelHeader">
        <div className="panelHeaderLeft">
          <Terminal size={16} className="panelHeaderIcon" />
          <h2>Live Log</h2>
        </div>
        <span className="stepStatus" style={{ fontSize: "11px", fontWeight: "700", color: "var(--neon-cyan)", fontFamily: "var(--font-cyber)" }}>
          {events.length} events
        </span>
      </div>
      {events.length === 0 ? (
        <div className="journeyEmpty" style={{ padding: "40px 16px" }}>
          <Activity size={24} style={{ color: "var(--neon-cyan)", opacity: 0.5, marginBottom: "8px" }} />
          <p style={{ fontSize: "12px", color: "#516279" }}>Waiting for events...</p>
        </div>
      ) : (
        <div className="logList">
          {[...events].reverse().map((event, index) => (
            <article className={`logItem ${event.status}`} key={`${event.time}-${index}`}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span>NODE: {event.source}</span>
                <time>{new Date(event.time).toLocaleTimeString()}</time>
              </div>
              <p style={{ marginTop: "4px", fontSize: "12.5px" }}>{event.message}</p>
              {event.detectionReason && (
                <small style={{ color: "var(--neon-red)", fontWeight: "600", display: "block", marginTop: "2px" }}>
                  ALERT: {event.detectionReason}
                </small>
              )}
              {event.routeSteps?.length > 0 && (
                <details className="logDetails">
                  <summary>Trace detail stdout</summary>
                  <ol>
                    {event.routeSteps.map((step, stepIndex) => (
                      <li key={`${event.time}-${step.node}-${stepIndex}`}>
                        <strong>{step.node}</strong>
                        <p>{step.detail}</p>
                      </li>
                    ))}
                  </ol>
                </details>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
