@echo off
echo Setting up AgroNexus Django Backend Development Environment
echo ============================================================

echo Installing Django and dependencies...
python -m pip install --upgrade pip
pip install -r requirements-dev.txt

echo Creating virtual environment variables...
echo DJANGO_SETTINGS_MODULE=agro_backend.settings > .env
echo PYTHONPATH=agro_backend >> .env

echo Verifying Django installation...
cd agro_backend
python manage.py check --deploy
cd ..

echo Setup completed successfully!
echo.
echo Next steps:
echo 1. Restart VSCode
echo 2. Open the Command Palette (Ctrl+Shift+P)
echo 3. Select "Python: Select Interpreter"
echo 4. Choose the Python interpreter that has Django installed
echo 5. The import errors should now be resolved
echo.
echo To run the Django development server:
echo   cd agro_backend
echo   python manage.py runserver
echo.
pause
