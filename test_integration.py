#!/usr/bin/env python3
"""
Integration Test Script for AgroNexus UI-Backend
This script tests the API endpoints to verify integration is working
"""

import requests
import json
import sys
import os

def test_backend_health():
    """Test if backend is running and healthy"""
    try:
        response = requests.get('http://localhost:8000/api/health', timeout=5)
        print("✅ Backend Health Check:", response.json())
        return response.status_code == 200
    except requests.exceptions.RequestException as e:
        print("❌ Backend Health Check Failed:", str(e))
        return False

def test_register_user():
    """Test user registration"""
    try:
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "buyer",
            "full_name": "Test User",
            "phone": None,
            "address": "Test Location",
            "profile_image_url": None
        }
        
        response = requests.post(
            'http://localhost:8000/api/auth/register',
            json=user_data,
            timeout=5
        )
        
        if response.status_code == 200:
            print("✅ User Registration Successful:", response.json())
            return response.json().get('token')
        else:
            print("❌ User Registration Failed:", response.status_code, response.json())
            return None
    except requests.exceptions.RequestException as e:
        print("❌ User Registration Error:", str(e))
        return None

def test_login_user():
    """Test user login"""
    try:
        login_data = {
            "email": "test@example.com",
            "password": "testpassword123"
        }
        
        response = requests.post(
            'http://localhost:8000/api/auth/login',
            json=login_data,
            timeout=5
        )
        
        if response.status_code == 200:
            print("✅ User Login Successful:", response.json())
            return response.json().get('token')
        else:
            print("❌ User Login Failed:", response.status_code, response.json())
            return None
    except requests.exceptions.RequestException as e:
        print("❌ User Login Error:", str(e))
        return None

def test_get_user_profile(token):
    """Test getting user profile with auth"""
    try:
        headers = {
            'Authorization': f'Bearer {token}'
        }
        
        response = requests.get(
            'http://localhost:8000/api/auth/me',
            headers=headers,
            timeout=5
        )
        
        if response.status_code == 200:
            print("✅ Get User Profile Successful:", response.json())
            return True
        else:
            print("❌ Get User Profile Failed:", response.status_code, response.json())
            return False
    except requests.exceptions.RequestException as e:
        print("❌ Get User Profile Error:", str(e))
        return False

def main():
    """Run all integration tests"""
    print("🚀 Starting AgroNexus UI-Backend Integration Tests")
    print("=" * 50)
    
    # Test 1: Backend Health
    print("\n1. Testing Backend Health...")
    if not test_backend_health():
        print("❌ Backend is not running or not accessible")
        print("Please start the backend with: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload")
        sys.exit(1)
    
    # Test 2: User Registration
    print("\n2. Testing User Registration...")
    token = test_register_user()
    
    # Test 3: User Login
    print("\n3. Testing User Login...")
    if not token:
        token = test_login_user()
    
    # Test 4: Authenticated Request
    print("\n4. Testing Authenticated Request...")
    if token:
        test_get_user_profile(token)
    
    print("\n" + "=" * 50)
    print("✅ Integration tests completed!")
    print("\nNext steps:")
    print("1. Start the backend: python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload")
    print("2. Start the frontend: npm run dev")
    print("3. Open http://localhost:8080 in your browser")

if __name__ == "__main__":
    main()
