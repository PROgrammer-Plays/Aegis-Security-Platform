# Network Security Detector - Enhanced Version

A multi-engine network security detection system with threat intelligence, intrusion detection, and anomaly detection capabilities.

## 🚀 What's New in This Version

### ✅ Fixed Issues
1. **Threat Intelligence Engine**: Now properly queries IPQS and VirusTotal APIs and fuses results
2. **Separated Test Data**: Test flows moved to `test_data.py` for cleaner code organization
3. **Configuration Management**: All settings centralized in `config.py`
4. **Enhanced Logging**: Comprehensive logging to both file and console
5. **Input Validation**: Added validation for flow data
6. **Retry Logic**: Automatic retry for failed backend API calls
7. **Better Error Handling**: Graceful degradation when models or APIs are unavailable

### 🎯 Maintained Compatibility
- **100% backward compatible** with the original script
- Same command-line interface
- Same output format
- Same model loading behavior

## 📁 File Structure

```
detector/
├── detector.py          # Main detection engine (enhanced)
├── config.py           # Configuration management
├── test_data.py        # Test flows and data
├── requirements.txt    # Python dependencies
├── .env               # Environment variables (create this)
├── detector.log       # Log file (auto-generated)
│
├── ids_randomforest_final.joblib      # IDS model (required)
├── ids_model_features.json            # IDS features (required)
├── traffic_engine_autoencoder_final.h5 # Traffic model (required)
└── traffic_engine_scaler_final.joblib  # Traffic scaler (required)
```

## 🔧 Setup Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Create Environment File
Create a `.env` file in the same directory as `detector.py`:

```env
# Backend API
BACKEND_API_URL=http://localhost:5000/api/alerts

# API Keys (optional but recommended)
IPQS_API_KEY=your_ipqualityscore_key_here
VIRUSTOTAL_API_KEY=your_virustotal_key_here

# Detection Thresholds (optional - defaults provided)
ANOMALY_THRESHOLD=0.00076731
IPQS_FRAUD_THRESHOLD=75
VT_MALICIOUS_THRESHOLD=1

# API Settings (optional)
API_TIMEOUT=5
MAX_RETRIES=3

# Logging (optional)
LOG_LEVEL=INFO
LOG_FILE=detector.log
```

### 3. Ensure Models Are Present
Make sure these files are in the same directory:
- `ids_randomforest_final.joblib`
- `ids_model_features.json`
- `traffic_engine_autoencoder_final.h5`
- `traffic_engine_scaler_final.joblib`

## 🎮 Usage

### Traffic Anomaly Detection
```bash
# Test with anomalous flow
python detector.py traffic anomaly

# Test with normal flow
python detector.py traffic normal
```

### IDS Attack Detection
```bash
# Test with simulated attack
python detector.py ids attack

# Test with benign flow
python detector.py ids benign
```

### Threat Intelligence
```bash
# Analyze an IP address
python detector.py threatintel 8.8.8.8

# Test with potentially malicious IP
python detector.py threatintel 198.51.100.1
```

## 📊 Output Examples

### Successful Detection
```
✅ IDS Model loaded.
✅ Traffic Engine loaded.
Analyzing a GUARANTEED ANOMALY flow...
--- Analyzing Network Flow with Traffic Engine ---
  - Calculated Error: 0.00125678
  - Anomaly Threshold: 0.00076731
  - 🚨 ANOMALY DETECTED!
--- ✅ Success! Alert sent. ---
```

### Threat Intelligence Detection
```
Analyzing IP address: 198.51.100.1
--- Analyzing IP with Threat Intelligence: 198.51.100.1 ---
  - 🚨 MALICIOUS IP DETECTED!
  - Threat Score: 95
  - Indicators: IPQS Fraud Score: 95/100
--- ✅ Success! Alert sent. ---
```

### No Threats Detected
```
Analyzing a GUARANTEED NORMAL flow...
--- Analyzing Network Flow with Traffic Engine ---
  - Calculated Error: 0.00025431
  - Anomaly Threshold: 0.00076731
  - ✅ Flow is normal.

✅ No threats detected. System operating normally.
```

## 🔍 How Each Engine Works

### 1. Threat Intelligence Engine
- **Input**: IP address
- **Process**: 
  1. Queries IPQualityScore for fraud score and anonymization detection
  2. Queries VirusTotal for malware/malicious activity
  3. Fuses results with weighted scoring
- **Threshold**: Combined threat score ≥ 75
- **Output**: Alert with severity (Critical/High/Medium) and detailed findings

### 2. IDS Engine (RandomForest)
- **Input**: Network flow features
- **Process**: 
  1. Aligns features with trained model
  2. Classifies as attack or benign
- **Output**: Alert if attack detected

### 3. Traffic Engine (Autoencoder)
- **Input**: Network flow features
- **Process**:
  1. Scales features using trained scaler
  2. Reconstructs flow using autoencoder
  3. Calculates Mean Squared Error (MSE)
  4. Compares against learned threshold
- **Threshold**: MSE > 0.00076731 (configurable)
- **Output**: Alert if anomalous

## 🔐 Security Best Practices

1. **Protect API Keys**
   - Never commit `.env` file to version control
   - Add `.env` to `.gitignore`
   - Rotate keys regularly

2. **Backend API**
   - Use HTTPS in production
   - Implement authentication
   - Rate limit incoming alerts

3. **Model Updates**
   - Regularly retrain models with new data
   - Version control your models
   - Test thoroughly before deployment

## 📝 Logging

Logs are written to both console and `detector.log` file with the following levels:
- **INFO**: Normal operations, successful detections
- **WARNING**: Potential issues, missing models
- **ERROR**: API failures, processing errors
- **DEBUG**: Detailed diagnostic information

To change log level:
```env
LOG_LEVEL=DEBUG  # or INFO, WARNING, ERROR
```

## 🧪 Testing

The script includes comprehensive test data in `test_data.py`:
- `NORMAL_FLOW`: Guaranteed benign traffic
- `ANOMALY_FLOW`: Guaranteed anomalous traffic
- `ATTACK_FLOW`: Simulated network attack
- `BENIGN_FLOW`: Normal IDS test case

## ⚙️ Configuration Options

All configurations are in `config.py` and can be overridden via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `BACKEND_API_URL` | `http://localhost:5000/api/alerts` | Backend API endpoint |
| `ANOMALY_THRESHOLD` | `0.00076731` | Traffic engine threshold |
| `IPQS_FRAUD_THRESHOLD` | `75` | IPQS fraud score threshold |
| `VT_MALICIOUS_THRESHOLD` | `1` | VirusTotal detection threshold |
| `API_TIMEOUT` | `5` | API request timeout (seconds) |
| `MAX_RETRIES` | `3` | Max retry attempts for failed requests |
| `LOG_LEVEL` | `INFO` | Logging verbosity |

## 🐛 Troubleshooting

### Models Not Loading
- Ensure model files are in the same directory as `detector.py`
- Check file permissions
- Verify TensorFlow version compatibility

### API Keys Not Working
- Verify keys are correct in `.env` file
- Check API rate limits
- Ensure `.env` is in the same directory as `detector.py`

### Backend Connection Failed
- Verify backend is running at specified URL
- Check firewall settings
- Review backend logs

### Import Errors
```bash
# If you get import errors for config or test_data
# Make sure all three files are in the same directory:
# - detector.py
# - config.py
# - test_data.py
```

## 📈 Future Enhancements

- [ ] Add webhook support for alerts
- [ ] Implement alert deduplication
- [ ] Add support for custom models
- [ ] Create web dashboard
- [ ] Add real-time monitoring
- [ ] Implement alert severity adjustment
- [ ] Add support for additional threat intel sources

## 🤝 Contributing

When contributing, please:
1. Maintain backward compatibility
2. Add tests for new features
3. Update documentation
4. Follow existing code style
5. Add logging for new operations

## 📄 License

[Your License Here]

## 🆘 Support

For issues or questions:
1. Check the troubleshooting section
2. Review logs in `detector.log`
3. Enable DEBUG logging for detailed diagnostics

---

**Version**: 2.0 (Enhanced)  
**Last Updated**: January 2026  
**Compatibility**: Python 3.8+
