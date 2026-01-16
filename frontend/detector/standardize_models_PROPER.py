# standardize_models.py - PROPER MLOps Model Packaging
# Run from detector/ folder

import os
import json
import shutil
import numpy as np
import joblib
from pathlib import Path

# === Configuration ===
BASE_DIR = Path(__file__).parent  # detector/
OUTPUT_DIR = BASE_DIR / "production_models"

# Define source files (in detector folder structure)
SOURCES = {
    "ids_engine": {
        "type": "sklearn",
        "algorithm": "RandomForest",
        "model": "models/ids/ids_randomforest_final.joblib",
        "features": "models/ids/ids_model_features.json",
        "vectors": {
            "benign": "tests/data/ids_benign_vector.txt",
            "attack": "tests/data/ids_attack_vector.txt"
        },
        "labels": {
            "0": "Benign",
            "1": "Network Intrusion"
        },
        "threshold": None,  # Supervised - uses probabilities
        "description": "Supervised learning for known attack detection"
    },
    
    "traffic_engine": {
        "type": "tensorflow",
        "algorithm": "Autoencoder",
        "model": "models/traffic/traffic_engine_autoencoder_final.h5",
        "scaler": "models/traffic/traffic_engine_scaler_final.joblib",
        "features": "models/traffic/traffic_engine_features.json",
        "vectors": {
            "benign": "tests/data/traffic_benign_vector.txt",
            "attack": "tests/data/traffic_attack_vector.txt"
        },
        "labels": {
            "0": "Normal Flow",
            "1": "Anomalous Flow"
        },
        "threshold": 0.00076731,
        "description": "Unsupervised anomaly detection for zero-day attacks"
    },
    
    "artifact_engine": {
        "type": "sklearn_pipeline",
        "algorithm": "XGBoost",
        "model": "models/artifact/artifact_engine_xgb_pipeline.joblib",
        "features": "models/artifact/artifact_engine_features.json",
        "vectors": {
            "benign": "tests/data/real_benign_vector.txt",
            "attack": "tests/data/real_malware_vector.txt"
        },
        "labels": {
            "0": "Benign File",
            "1": "Malicious Artifact"
        },
        "threshold": None,  # Pipeline includes scaling
        "description": "Static malware analysis using PE file features"
    },
    
    "ueba_engine": {
        "type": "tensorflow",
        "algorithm": "Autoencoder",
        "model": "models/ueba/insider_threat_model.h5",
        "scaler": "models/ueba/ueba_scaler.joblib",
        "features": "models/ueba/ueba_engine_features.json",
        "vectors": {
            "benign": "tests/data/ueba_normal_vector.txt",
            "attack": "tests/data/ueba_anomaly_vector.txt"
        },
        "labels": {
            "0": "Normal Behavior",
            "1": "Insider Threat"
        },
        "threshold": 0.10,
        "description": "User behavior anomaly detection for insider threats"
    }
}

def create_model_package(engine_name, config):
    """Create a professional model package with self-testing capability"""
    print(f"\n{'='*70}")
    print(f"📦 Packaging: {engine_name}")
    print(f"{'='*70}")
    
    package_dir = OUTPUT_DIR / engine_name
    package_dir.mkdir(parents=True, exist_ok=True)
    
    # 1. Copy Model
    model_src = BASE_DIR / config['model']
    model_dst = package_dir / ("model.h5" if config['type'] == 'tensorflow' else "model.joblib")
    
    if not model_src.exists():
        print(f"❌ Model not found: {model_src}")
        return False
    
    shutil.copy2(model_src, model_dst)
    size = model_dst.stat().st_size / (1024 * 1024)
    print(f"✅ Model: {model_dst.name} ({size:.2f} MB)")
    
    # 2. Copy Scaler (if exists)
    if 'scaler' in config:
        scaler_src = BASE_DIR / config['scaler']
        scaler_dst = package_dir / "scaler.joblib"
        
        if scaler_src.exists():
            shutil.copy2(scaler_src, scaler_dst)
            size = scaler_dst.stat().st_size / 1024
            print(f"✅ Scaler: scaler.joblib ({size:.1f} KB)")
        else:
            print(f"⚠️  Scaler not found (may not be required)")
    
    # 3. Load Features
    features_src = BASE_DIR / config['features']
    if not features_src.exists():
        print(f"❌ Features not found: {features_src}")
        return False
    
    with open(features_src, 'r') as f:
        feature_list = json.load(f)
    
    # 4. Create COMPLETE config.json
    config_data = {
        "metadata": {
            "engine_name": engine_name,
            "algorithm": config['algorithm'],
            "description": config['description'],
            "version": "1.0.0"
        },
        "model": {
            "engine_type": config['type'],
            "input_features": feature_list,
            "feature_count": len(feature_list),
            "labels": config['labels'],
            "threshold": config['threshold'],
            "requires_scaling": 'scaler' in config
        },
        "files": {
            "model": model_dst.name,
            "scaler": "scaler.joblib" if 'scaler' in config else None,
            "config": "config.json",
            "reference": "reference.json"
        }
    }
    
    with open(package_dir / "config.json", 'w') as f:
        json.dump(config_data, f, indent=2)
    
    print(f"✅ Config: config.json ({len(feature_list)} features)")
    
    # 5. Create SMART reference.json with expected results
    try:
        benign_vec = np.loadtxt(BASE_DIR / config['vectors']['benign']).flatten()
        attack_vec = np.loadtxt(BASE_DIR / config['vectors']['attack']).flatten()
        
        # Create feature-labeled vectors
        benign_dict = dict(zip(feature_list, benign_vec.tolist()))
        attack_dict = dict(zip(feature_list, attack_vec.tolist()))
        
        reference_data = {
            "test_cases": {
                "benign": {
                    "input": benign_dict,
                    "expected_label": config['labels']['0'],
                    "expected_is_anomaly": False,
                    "description": "Known good sample that should NOT trigger detection"
                },
                "attack": {
                    "input": attack_dict,
                    "expected_label": config['labels']['1'],
                    "expected_is_anomaly": True,
                    "description": "Known bad sample that SHOULD trigger detection"
                }
            },
            "metadata": {
                "vector_shape": benign_vec.shape[0],
                "created_from": {
                    "benign": str(config['vectors']['benign']),
                    "attack": str(config['vectors']['attack'])
                }
            }
        }
        
        with open(package_dir / "reference.json", 'w') as f:
            json.dump(reference_data, f, indent=2)
        
        print(f"✅ Reference: reference.json (2 test cases)")
        print(f"   Benign shape: {benign_vec.shape}")
        print(f"   Attack shape: {attack_vec.shape}")
        
    except Exception as e:
        print(f"⚠️  Could not create reference: {e}")
    
    print(f"{'='*70}")
    print(f"✅ Package complete: {package_dir}")
    print(f"{'='*70}")
    
    return True

if __name__ == "__main__":
    print("\n" + "="*70)
    print("  🏭 PROFESSIONAL MLOps MODEL STANDARDIZATION")
    print("="*70)
    print(f"\nBase Directory: {BASE_DIR}")
    print(f"Output Directory: {OUTPUT_DIR}")
    
    # Clean output
    if OUTPUT_DIR.exists():
        print(f"\n🗑️  Removing old production_models/...")
        shutil.rmtree(OUTPUT_DIR)
    
    OUTPUT_DIR.mkdir(parents=True)
    
    # Package each engine
    print(f"\n{'='*70}")
    print("  PACKAGING ENGINES")
    print(f"{'='*70}")
    
    results = {}
    for engine_name, config in SOURCES.items():
        results[engine_name] = create_model_package(engine_name, config)
    
    # Summary
    print(f"\n{'='*70}")
    print("  📊 SUMMARY")
    print(f"{'='*70}\n")
    
    successful = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"✅ Successfully packaged: {successful}/{total}")
    
    if successful == total:
        print(f"\n🎉 ALL ENGINES PACKAGED!")
        print(f"\n📁 Location: {OUTPUT_DIR}")
        print(f"\nEach package contains:")
        print(f"  • model.h5 or model.joblib")
        print(f"  • config.json (complete metadata)")
        print(f"  • reference.json (self-test cases)")
        print(f"  • scaler.joblib (if needed)")
        print(f"\nNext: Use ModelManager class to load and self-test")
    else:
        print(f"\n⚠️  {total - successful} engine(s) failed")
    
    print(f"\n{'='*70}\n")
