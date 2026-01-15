// src/components/AlertDetails.js (Enhanced - Handles All Alert Types)
import React from 'react';
import './AlertDetails.css';

const AlertDetails = ({ alert }) => {
  // Helper function to render a single detail
  const renderDetail = (label, value) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="detail-item">
        <span className="detail-label">{label}:</span>
        <span className="detail-value">
          {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : 
           typeof value === 'number' ? value.toFixed(6).replace(/\.?0+$/, '') :
           value}
        </span>
      </div>
    );
  };

  // Render different content based on engine type
  const renderEngineSpecificDetails = () => {
    switch (alert.engine) {
      case 'Threat Intelligence':
        return renderThreatIntelligence();
      case 'Traffic Engine':
        return renderTrafficEngine();
      case 'IDS':
        return renderIDS();
      case 'UEBA':
        return renderUEBA();
      case 'Artifact Engine':
        return renderArtifact();
      default:
        return <p>Unknown engine type</p>;
    }
  };

  // === THREAT INTELLIGENCE RENDERING ===
  const renderThreatIntelligence = () => {
    const ipqs = alert.details?.ipqs_report;
    const vt = alert.details?.virustotal_report?.data?.attributes;

    return (
      <>
        <div className="intel-section">
          <h5>🎯 Executive Summary</h5>
          {renderDetail('IP Address', alert.details.ip_address)}
          {renderDetail('Threat Score', alert.details.threat_score)}
          {alert.details.summary_reasons && alert.details.summary_reasons.length > 0 && (
            <div className="detail-item">
              <span className="detail-label">Threat Indicators:</span>
              <div className="threat-indicators">
                {alert.details.summary_reasons.map((reason, idx) => (
                  <span key={idx} className="threat-indicator">{reason}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {ipqs && (
          <div className="intel-section">
            <h5>🔍 IPQualityScore Analysis</h5>
            <div className="details-grid">
              {renderDetail('Fraud Score', ipqs.fraud_score)}
              {renderDetail('Bot Status', ipqs.bot_status)}
              {renderDetail('Country', ipqs.country_code)}
              {renderDetail('City', ipqs.city)}
              {renderDetail('ISP', ipqs.ISP)}
              {renderDetail('Organization', ipqs.organization)}
              {renderDetail('Is Proxy', ipqs.proxy)}
              {renderDetail('Is VPN', ipqs.vpn)}
              {renderDetail('Is Tor Node', ipqs.tor)}
              {renderDetail('Recent Abuse', ipqs.recent_abuse)}
              {renderDetail('Mobile', ipqs.mobile)}
            </div>
          </div>
        )}

        {vt && (
          <div className="intel-section">
            <h5>🦠 VirusTotal Analysis</h5>
            <div className="details-grid">
              {renderDetail('ASN Owner', vt.as_owner)}
              {renderDetail('Network', vt.network)}
              {vt.last_analysis_date && renderDetail(
                'Last Analysis', 
                new Date(vt.last_analysis_date * 1000).toLocaleString()
              )}
              {vt.last_analysis_stats && (
                <div className="detail-item full-width">
                  <span className="detail-label">Detection Results:</span>
                  <div className="vt-stats">
                    <span className="vt-stat malicious">
                      {vt.last_analysis_stats.malicious || 0} Malicious
                    </span>
                    <span className="vt-stat suspicious">
                      {vt.last_analysis_stats.suspicious || 0} Suspicious
                    </span>
                    <span className="vt-stat harmless">
                      {vt.last_analysis_stats.harmless || 0} Harmless
                    </span>
                    <span className="vt-stat undetected">
                      {vt.last_analysis_stats.undetected || 0} Undetected
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </>
    );
  };

  // === TRAFFIC ENGINE RENDERING ===
  const renderTrafficEngine = () => {
    const details = alert.details;
    const flowDetails = details.flow_details || {};

    return (
      <>
        <div className="intel-section">
          <h5>📊 Anomaly Detection Results</h5>
          <div className="anomaly-metrics">
            <div className="metric-card critical">
              <div className="metric-label">Reconstruction Error</div>
              <div className="metric-value">
                {details.reconstruction_error?.toFixed(8) || 'N/A'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Anomaly Threshold</div>
              <div className="metric-value">
                {details.anomaly_threshold?.toFixed(8) || 'N/A'}
              </div>
            </div>
            <div className="metric-card warning">
              <div className="metric-label">Deviation</div>
              <div className="metric-value">
                {details.reconstruction_error && details.anomaly_threshold
                  ? `${((details.reconstruction_error / details.anomaly_threshold) * 100).toFixed(0)}%`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div className="intel-section">
          <h5>🌐 Network Flow Characteristics</h5>
          <div className="details-grid">
            {renderDetail('Protocol', flowDetails.Protocol === 6 ? 'TCP (6)' : flowDetails.Protocol === 17 ? 'UDP (17)' : flowDetails.Protocol)}
            {renderDetail('Flow Duration', `${flowDetails.FlowDuration || 0} ms`)}
            {renderDetail('Total Forward Packets', flowDetails.TotalFwdPackets)}
            {renderDetail('Total Backward Packets', flowDetails.TotalBackwardPackets)}
            {renderDetail('Fwd Packets Length', `${flowDetails.FwdPacketsLengthTotal || 0} bytes`)}
            {renderDetail('Bwd Packets Length', `${flowDetails.BwdPacketsLengthTotal || 0} bytes`)}
            {renderDetail('Avg Packet Size', flowDetails.AvgPacketSize?.toFixed(2))}
            {renderDetail('Flow Bytes/s', flowDetails.FlowBytess?.toFixed(2))}
            {renderDetail('Flow Packets/s', flowDetails.FlowPacketss?.toFixed(2))}
          </div>
        </div>

        {(flowDetails.SYNFlagCount > 0 || flowDetails.ACKFlagCount > 0 || flowDetails.FINFlagCount > 0) && (
          <div className="intel-section">
            <h5>🚩 TCP Flags Analysis</h5>
            <div className="details-grid">
              {flowDetails.SYNFlagCount > 0 && renderDetail('SYN Flags', flowDetails.SYNFlagCount)}
              {flowDetails.ACKFlagCount > 0 && renderDetail('ACK Flags', flowDetails.ACKFlagCount)}
              {flowDetails.FINFlagCount > 0 && renderDetail('FIN Flags', flowDetails.FINFlagCount)}
              {flowDetails.RSTFlagCount > 0 && renderDetail('RST Flags', flowDetails.RSTFlagCount)}
              {flowDetails.PSHFlagCount > 0 && renderDetail('PSH Flags', flowDetails.PSHFlagCount)}
              {flowDetails.URGFlagCount > 0 && renderDetail('URG Flags', flowDetails.URGFlagCount)}
            </div>
          </div>
        )}

        {(flowDetails.PacketLengthVariance || flowDetails.PacketLengthStd) && (
          <div className="intel-section">
            <h5>📈 Statistical Analysis</h5>
            <div className="details-grid">
              {renderDetail('Packet Length Variance', flowDetails.PacketLengthVariance)}
              {renderDetail('Packet Length Std Dev', flowDetails.PacketLengthStd?.toFixed(2))}
              {renderDetail('Packet Length Mean', flowDetails.PacketLengthMean?.toFixed(2))}
              {renderDetail('Packet Length Max', flowDetails.PacketLengthMax)}
              {renderDetail('Packet Length Min', flowDetails.PacketLengthMin)}
            </div>
          </div>
        )}
      </>
    );
  };

  // === IDS RENDERING ===
  const renderIDS = () => {
    const details = alert.details;

    return (
      <>
        <div className="intel-section">
          <h5>🛡️ Intrusion Detection Details</h5>
          <div className="alert-box warning">
            <p><strong>Attack Pattern Detected</strong></p>
            <p>The IDS machine learning model has identified this network flow as malicious based on learned attack patterns.</p>
          </div>
        </div>

        <div className="intel-section">
          <h5>📋 Flow Characteristics</h5>
          <div className="details-grid">
            {renderDetail('Flow Duration', `${details.flow_duration || 0} ms`)}
            {renderDetail('Forward Packets Total', details.fwd_pkts_tot)}
            {renderDetail('Backward Packets Total', details.bwd_pkts_tot)}
            {renderDetail('SYN Flag Count', details.flow_SYN_flag_count)}
            {renderDetail('ACK Flag Count', details.flow_ACK_flag_count)}
            {renderDetail('PSH Flag Count', details.flow_PSH_flag_count)}
            {renderDetail('RST Flag Count', details.flow_RST_flag_count)}
            {renderDetail('URG Flag Count', details.flow_URG_flag_count)}
            {renderDetail('FIN Flag Count', details.flow_FIN_flag_count)}
          </div>
        </div>

        {details.flow_SYN_flag_count > 10 && (
          <div className="intel-section">
            <div className="alert-box critical">
              <h5>⚠️ Potential SYN Flood Attack</h5>
              <p>High number of SYN flags detected ({details.flow_SYN_flag_count}). This may indicate a SYN flood attack attempt.</p>
            </div>
          </div>
        )}

        {Object.keys(details).length > 10 && (
          <div className="intel-section">
            <h5>🔢 Additional Flow Metrics</h5>
            <div className="details-grid">
              {Object.entries(details)
                .filter(([key]) => !['flow_duration', 'fwd_pkts_tot', 'bwd_pkts_tot'].includes(key))
                .map(([key, value]) => renderDetail(
                  key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                  value
                ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // === UEBA RENDERING (NEW) ===
  const renderUEBA = () => {
    const details = alert.details;
    const userProfile = details.user_profile || {};
    const featureContributions = details.feature_contributions || {};
    const topAnomalousFeatures = details.top_anomalous_features || [];

    return (
      <>
        <div className="intel-section">
          <h5>👤 User Profile Analysis</h5>
          <div className="alert-box critical">
            <p><strong>Insider Threat Detected</strong></p>
            <p>This user's behavior significantly deviates from established normal patterns, indicating potential insider threat activity.</p>
          </div>
        </div>

        <div className="intel-section">
          <h5>📊 Behavioral Anomaly Metrics</h5>
          <div className="anomaly-metrics">
            <div className="metric-card critical">
              <div className="metric-label">Reconstruction Error</div>
              <div className="metric-value">
                {details.reconstruction_error?.toFixed(6) || 'N/A'}
              </div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Anomaly Threshold</div>
              <div className="metric-value">
                {details.anomaly_threshold?.toFixed(6) || 'N/A'}
              </div>
            </div>
            <div className="metric-card warning">
              <div className="metric-label">Severity Multiplier</div>
              <div className="metric-value">
                {details.reconstruction_error && details.anomaly_threshold
                  ? `${(details.reconstruction_error / details.anomaly_threshold).toFixed(1)}x`
                  : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        <div className="intel-section">
          <h5>🔍 User Activity Profile</h5>
          <div className="details-grid">
            {renderDetail('User ID', userProfile.user_id)}
            {renderDetail('Avg Session Hours', userProfile.avg_session_hours?.toFixed(2))}
            {renderDetail('After Hours Logins', userProfile.after_hours_login_count)}
            {renderDetail('USB Connections', userProfile.total_usb_connections)}
            {renderDetail('Email Volume', userProfile.total_email_volume ? `${(userProfile.total_email_volume / 1e6).toFixed(2)} MB` : 'N/A')}
            {renderDetail('HTTP Volume', userProfile.total_http_volume ? `${(userProfile.total_http_volume / 1e6).toFixed(2)} MB` : 'N/A')}
            {renderDetail('Files Accessed', userProfile.total_files_accessed)}
          </div>
        </div>

        {topAnomalousFeatures.length > 0 && (
          <div className="intel-section">
            <h5>⚠️ Top Anomalous Behaviors</h5>
            <div className="threat-indicators">
              {topAnomalousFeatures.map((feature, idx) => {
                const contribution = featureContributions[feature];
                return (
                  <div key={idx} className="threat-indicator">
                    <strong>{feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong>
                    {contribution && (
                      <span className="detail-chip" style={{marginLeft: '8px', fontSize: '0.75rem'}}>
                        Deviation: {contribution.deviation?.toFixed(4)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="alert-box warning" style={{marginTop: '1rem'}}>
              <p><strong>Investigation Recommendations:</strong></p>
              <ul style={{margin: '0.5rem 0 0 1.5rem', lineHeight: '1.6'}}>
                <li>Review user's recent file access logs for unauthorized data exfiltration</li>
                <li>Check for unusual USB device connections or external storage usage</li>
                <li>Analyze after-hours login patterns for suspicious timing</li>
                <li>Correlate with email and web activity for potential data leakage</li>
                <li>Interview user to verify legitimate business justification</li>
              </ul>
            </div>
          </div>
        )}

        {Object.keys(featureContributions).length > 0 && (
          <div className="intel-section">
            <h5>📈 Detailed Feature Analysis</h5>
            <div className="details-grid">
              {Object.entries(featureContributions).map(([feature, stats]) => (
                <div key={feature} className="detail-item full-width">
                  <span className="detail-label">
                    {feature.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                  </span>
                  <div style={{display: 'flex', gap: '1rem', marginTop: '0.25rem'}}>
                    <span className="detail-chip">Original: {stats.original?.toFixed(4)}</span>
                    <span className="detail-chip">Expected: {stats.reconstructed?.toFixed(4)}</span>
                    <span className="detail-chip" style={{
                      background: stats.deviation > 0.1 ? '#fee2e2' : '#f3f4f6',
                      color: stats.deviation > 0.1 ? '#991b1b' : '#374151'
                    }}>
                      Deviation: {stats.deviation?.toFixed(4)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </>
    );
  };

  // === ARTIFACT ENGINE RENDERING (NEW) ===
  const renderArtifact = () => {
    const details = alert.details;
    const confidence = details.confidence || {};

    return (
      <>
        <div className="intel-section">
          <h5>🦠 Malware Detection Results</h5>
          <div className="alert-box critical">
            <p><strong>Malicious File Detected</strong></p>
            <p>The Artifact Engine XGBoost classifier has identified this file as malware based on its structural features and behavioral characteristics.</p>
          </div>
        </div>

        <div className="intel-section">
          <h5>📄 File Information</h5>
          <div className="details-grid">
            {renderDetail('File Name', details.file_name)}
            {renderDetail('File Hash', details.file_hash)}
            {renderDetail('Prediction', details.prediction === 1 ? 'Malware (1)' : 'Benign (0)')}
          </div>
        </div>

        <div className="intel-section">
          <h5>📊 Classification Confidence</h5>
          <div className="anomaly-metrics">
            <div className="metric-card">
              <div className="metric-label">Benign Probability</div>
              <div className="metric-value">
                {confidence.benign ? `${(confidence.benign * 100).toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            <div className="metric-card critical">
              <div className="metric-label">Malware Probability</div>
              <div className="metric-value">
                {confidence.malware ? `${(confidence.malware * 100).toFixed(2)}%` : 'N/A'}
              </div>
            </div>
            <div className="metric-card warning">
              <div className="metric-label">Model Confidence</div>
              <div className="metric-value">
                {confidence.malware > 0.5 ? 
                  `${((confidence.malware - 0.5) * 200).toFixed(0)}%` : 
                  `${((0.5 - confidence.benign) * 200).toFixed(0)}%`}
              </div>
            </div>
          </div>
        </div>

        <div className="intel-section">
          <h5>⚠️ Security Recommendations</h5>
          <div className="alert-box warning">
            <p><strong>Immediate Actions Required:</strong></p>
            <ul style={{margin: '0.5rem 0 0 1.5rem', lineHeight: '1.6'}}>
              <li>Quarantine the file immediately to prevent execution</li>
              <li>Scan the system for additional malware artifacts</li>
              <li>Review file source and download history</li>
              <li>Check for network communication attempts (C2 beaconing)</li>
              <li>Analyze file behavior in sandboxed environment</li>
              <li>Submit to threat intelligence platforms for further analysis</li>
            </ul>
          </div>
        </div>

        {details.artifact_features && Object.keys(details.artifact_features).length > 0 && (
          <div className="intel-section">
            <h5>🔬 Structural Analysis</h5>
            <p style={{fontSize: '0.875rem', color: '#6b7280', marginBottom: '1rem'}}>
              This file was analyzed using {Object.keys(details.artifact_features).length} structural features 
              including byte entropy, PE headers, import functions, and section characteristics.
            </p>
            <div className="alert-box" style={{background: '#f9fafb'}}>
              <p><strong>Analysis Methodology:</strong></p>
              <p style={{fontSize: '0.875rem', marginTop: '0.5rem'}}>
                The XGBoost classifier examines PE (Portable Executable) file structure without executing the file, 
                making it safe for analysis and effective against polymorphic malware that changes its hash signatures.
              </p>
            </div>
          </div>
        )}
      </>
    );
  };

  return (
    <div className="alert-details-content">
      <div className="details-header">
        <h4>
          {alert.engine === 'Threat Intelligence' && '🔍 Threat Intelligence Report'}
          {alert.engine === 'Traffic Engine' && '📊 Traffic Anomaly Analysis'}
          {alert.engine === 'IDS' && '🛡️ Intrusion Detection Report'}
          {alert.engine === 'UEBA' && '👤 User Behavior Analysis Report'}
          {alert.engine === 'Artifact Engine' && '🦠 Malware Analysis Report'}
        </h4>
        <span className={`alert-id`}>Alert ID: {alert._id}</span>
      </div>

      {renderEngineSpecificDetails()}

      {/* Raw Data Toggle */}
      <details className="raw-data-toggle">
        <summary>🔧 Show Raw JSON Data</summary>
        <pre>{JSON.stringify(alert, null, 2)}</pre>
      </details>
    </div>
  );
};

export default AlertDetails;
