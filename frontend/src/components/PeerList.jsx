import React, { useState } from "react";
import { Wifi, WifiOff, Monitor, RefreshCw, Radio, Compass } from "lucide-react";

export default function PeerList({ selfInfo, peers, onRefresh }) {
  const [refreshing, setRefreshing] = useState(false);

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 600);
  }

  return (
    <section className="panel peerPanel">
      <div className="panelHeader">
        <div className="panelHeaderLeft">
          <Compass size={16} className="panelHeaderIcon" />
          <h2>Network Peers</h2>
        </div>
        <button
          type="button"
          className="iconButton"
          onClick={handleRefresh}
          aria-label="Refresh peers"
          title="Refresh peer list"
          style={{ width: "32px", height: "32px", borderRadius: "6px" }}
        >
          <RefreshCw size={13} className={refreshing ? "spin" : ""} />
        </button>
      </div>

      {/* Self card */}
      {selfInfo && (
        <div className="peerSelf" title="Online">
          <Monitor size={15} style={{ color: "var(--neon-emerald)", flexShrink: 0 }} />
          <div className="peerInfo">
            <strong>
              {selfInfo.name} 
              <span className="peerSelfBadge">You</span>
            </strong>
            <code>{selfInfo.ip}:{selfInfo.port}</code>
          </div>
          <span className="peerDot online" title="Online" />
        </div>
      )}

      {/* Peer list */}
      <div className="peerList">
        {peers.length === 0 ? (
          <div className="peerEmpty">
            <WifiOff size={24} style={{ marginBottom: "6px", color: "var(--neon-red)", opacity: 0.7 }} />
            <p>No peers found on this network.</p>
            <small style={{ fontSize: "11px", color: "#516279" }}>
              Run QuantumHop on other laptops connected to the same hotspot/Wi-Fi.
            </small>
          </div>
        ) : (
          peers.map((peer) => (
            <div className="peerCard" key={peer.ip} title="Online">
              <Wifi size={15} style={{ color: "var(--neon-cyan)", flexShrink: 0 }} />
              <div className="peerInfo">
                <strong>{peer.name}</strong>
                <code>{peer.ip}:{peer.port}</code>
              </div>
              <span className="peerDot online" title="Online" />
            </div>
          ))
        )}
      </div>
    </section>
  );
}
