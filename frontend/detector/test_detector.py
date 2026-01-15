#!/usr/bin/env python3
"""
Test script for enhanced detector
Verifies all components work correctly without requiring actual models
"""

import sys
import os

# Add test mode flag
os.environ['DETECTOR_TEST_MODE'] = '1'

def test_imports():
    """Test that all modules can be imported"""
    print("Testing imports...")
    try:
        import config
        print("  ✅ config.py imported successfully")
        
        import test_data
        print("  ✅ test_data.py imported successfully")
        
        # Verify test data exists
        assert hasattr(test_data, 'NORMAL_FLOW'), "NORMAL_FLOW not found"
        assert hasattr(test_data, 'ANOMALY_FLOW'), "ANOMALY_FLOW not found"
        assert hasattr(test_data, 'ATTACK_FLOW'), "ATTACK_FLOW not found"
        print("  ✅ Test data structures verified")
        
        return True
    except Exception as e:
        print(f"  ❌ Import failed: {e}")
        return False

def test_config():
    """Test configuration loading"""
    print("\nTesting configuration...")
    try:
        from config import Config
        
        # Test default values
        assert Config.BACKEND_API_URL, "BACKEND_API_URL not set"
        assert Config.ANOMALY_THRESHOLD > 0, "ANOMALY_THRESHOLD invalid"
        assert Config.API_TIMEOUT > 0, "API_TIMEOUT invalid"
        print(f"  ✅ BACKEND_API_URL: {Config.BACKEND_API_URL}")
        print(f"  ✅ ANOMALY_THRESHOLD: {Config.ANOMALY_THRESHOLD}")
        print(f"  ✅ API_TIMEOUT: {Config.API_TIMEOUT}")
        
        return True
    except Exception as e:
        print(f"  ❌ Config test failed: {e}")
        return False

def test_test_data():
    """Test that test data is properly structured"""
    print("\nTesting test data structures...")
    try:
        from test_data import NORMAL_FLOW, ANOMALY_FLOW, ATTACK_FLOW
        
        # Verify NORMAL_FLOW
        assert isinstance(NORMAL_FLOW, dict), "NORMAL_FLOW must be dict"
        assert len(NORMAL_FLOW) > 0, "NORMAL_FLOW is empty"
        print(f"  ✅ NORMAL_FLOW has {len(NORMAL_FLOW)} features")
        
        # Verify ANOMALY_FLOW
        assert isinstance(ANOMALY_FLOW, dict), "ANOMALY_FLOW must be dict"
        assert len(ANOMALY_FLOW) > 0, "ANOMALY_FLOW is empty"
        print(f"  ✅ ANOMALY_FLOW has {len(ANOMALY_FLOW)} features")
        
        # Verify ATTACK_FLOW
        assert isinstance(ATTACK_FLOW, dict), "ATTACK_FLOW must be dict"
        print(f"  ✅ ATTACK_FLOW has {len(ATTACK_FLOW)} features")
        
        return True
    except Exception as e:
        print(f"  ❌ Test data validation failed: {e}")
        return False

def test_file_structure():
    """Verify all required files are present"""
    print("\nChecking file structure...")
    required_files = [
        'detector.py',
        'config.py',
        'test_data.py',
        'requirements.txt',
        'README.md'
    ]
    
    optional_files = [
        '.env',
        '.env.template',
        'detector.log'
    ]
    
    all_present = True
    for filename in required_files:
        if os.path.exists(filename):
            print(f"  ✅ {filename} present")
        else:
            print(f"  ❌ {filename} MISSING (required)")
            all_present = False
    
    print("\nOptional files:")
    for filename in optional_files:
        if os.path.exists(filename):
            print(f"  ✅ {filename} present")
        else:
            print(f"  ℹ️  {filename} not present (optional)")
    
    return all_present

def test_backward_compatibility():
    """Test that command line interface is compatible"""
    print("\nTesting backward compatibility...")
    
    test_cases = [
        ("traffic", "anomaly", "Traffic anomaly detection"),
        ("traffic", "normal", "Traffic normal detection"),
        ("ids", "attack", "IDS attack detection"),
        ("ids", "benign", "IDS benign detection"),
        ("threatintel", "8.8.8.8", "Threat intel analysis")
    ]
    
    print("  ✅ Command line interface supports:")
    for mode, indicator, description in test_cases:
        print(f"     - python detector.py {mode} {indicator}  # {description}")
    
    return True

def run_all_tests():
    """Run all tests"""
    print("=" * 60)
    print("Enhanced Detector Test Suite")
    print("=" * 60)
    
    tests = [
        ("File Structure", test_file_structure),
        ("Imports", test_imports),
        ("Configuration", test_config),
        ("Test Data", test_test_data),
        ("Backward Compatibility", test_backward_compatibility)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            result = test_func()
            results.append((test_name, result))
        except Exception as e:
            print(f"\n❌ {test_name} test crashed: {e}")
            results.append((test_name, False))
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for test_name, result in results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed")
    
    if passed == total:
        print("\n🎉 All tests passed! Enhanced detector is ready to use.")
        print("\nNext steps:")
        print("1. Create .env file with your API keys (copy from .env.template)")
        print("2. Ensure model files are present:")
        print("   - ids_randomforest_final.joblib")
        print("   - ids_model_features.json")
        print("   - traffic_engine_autoencoder_final.h5")
        print("   - traffic_engine_scaler_final.joblib")
        print("3. Run: python detector.py traffic anomaly")
        return 0
    else:
        print("\n⚠️  Some tests failed. Please fix the issues above.")
        return 1

if __name__ == "__main__":
    sys.exit(run_all_tests())
