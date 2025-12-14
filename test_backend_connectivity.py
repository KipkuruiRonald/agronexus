#!/usr/bin/env python3
"""
Backend Connectivity Test for AgroNexus
Tests if the backend is running and responding properly
"""

import requests
import json
import sys
import time

def test_backend_health():
    """Test backend health endpoint"""
    try:
        print("🔍 Testing backend health endpoint...")
        response = requests.get("http://localhost:8000/api/health", timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Backend is healthy: {data}")
            return True
        else:
            print(f"❌ Backend returned status {response.status_code}")
            return False
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to backend at http://localhost:8000")
        print("💡 Make sure the backend is running: python -m uvicorn main:app --host 0.0.0.0 --port 8000")
        return False
    except requests.exceptions.Timeout:
        print("❌ Backend connection timed out")
        return False
    except Exception as e:
        print(f"❌ Backend test failed: {str(e)}")
        return False

def test_api_endpoints():
    """Test basic API endpoints"""
    endpoints_to_test = [
        ("/", "Root endpoint"),
        ("/api/health", "Health check")
    ]
    
    for endpoint, description in endpoints_to_test:
        try:
            print(f"🔍 Testing {description} ({endpoint})...")
            response = requests.get(f"http://localhost:8000{endpoint}", timeout=5)
            
            if response.status_code == 200:
                print(f"✅ {description} working")
            else:
                print(f"⚠️  {description} returned status {response.status_code}")
                
        except Exception as e:
            print(f"❌ {description} failed: {str(e)}")

def test_cors():
    """Test CORS configuration"""
    try:
        print("🔍 Testing CORS configuration...")
        headers = {
            "Origin": "http://localhost:8080",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "content-type"
        }
        
        response = requests.options("http://localhost:8000/api/health", headers=headers, timeout=5)
        
        cors_origin = response.headers.get("Access-Control-Allow-Origin")
        if cors_origin:
            print(f"✅ CORS configured: {cors_origin}")
            return True
        else:
            print("⚠️  CORS might not be properly configured")
            return False
            
    except Exception as e:
        print(f"❌ CORS test failed: {str(e)}")
        return False

def main():
    print("🚀 AgroNexus Backend Connectivity Test")
    print("=" * 50)
    
    # Wait a moment for services to potentially start
    print("⏳ Waiting 2 seconds for services to stabilize...")
    time.sleep(2)
    
    # Test backend health
    backend_healthy = test_backend_health()
    
    if backend_healthy:
        print("\n📡 Testing additional endpoints...")
        test_api_endpoints()
        
        print("\n🌐 Testing CORS configuration...")
        test_cors()
        
        print("\n🎉 Backend connectivity test completed!")
        print("\n💡 Next steps:")
        print("   1. Start frontend: npm run dev")
        print("   2. Open: http://localhost:8080")
        print("   3. Test authentication and API calls")
        
        return 0
    else:
        print("\n❌ Backend connectivity test failed!")
        print("\n🔧 Troubleshooting:")
        print("   1. Make sure you're in the backend directory")
        print("   2. Check if .env file exists with Supabase credentials")
        print("   3. Run: python -m uvicorn main:app --host 0.0.0.0 --port 8000")
        print("   4. Check if port 8000 is available")
        
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
