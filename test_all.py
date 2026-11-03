import subprocess
import sys
import os

def run_backend_tests():
    """Запуск тестов бэкенда"""
    print("\n" + "="*60)
    print("ЗАПУСК ТЕСТОВ БЭКЕНДА")
    print("="*60 + "\n")
    
    os.chdir('backend')
    result = subprocess.run([sys.executable, 'test_system.py'], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print("ОШИБКИ:")
        print(result.stderr)
    os.chdir('..')
    return result.returncode == 0

def run_frontend_tests():
    """Запуск тестов фронтенда"""
    print("\n" + "="*60)
    print("ЗАПУСК ТЕСТОВ ФРОНТЕНДА")
    print("="*60 + "\n")
    
    os.chdir('frontend')
    result = subprocess.run(['node', 'test_frontend.js'], capture_output=True, text=True)
    print(result.stdout)
    if result.returncode != 0:
        print("ОШИБКИ:")
        print(result.stderr)
    os.chdir('..')
    return result.returncode == 0

if __name__ == '__main__':
    print("="*60)
    print("КОМПЛЕКСНАЯ ПРОВЕРКА СИСТЕМЫ")
    print("Проект: Цифровое месторождение")
    print("="*60)
    
    backend_ok = run_backend_tests()
    frontend_ok = run_frontend_tests()
    
    print("\n" + "="*60)
    print("ИТОГОВЫЙ РЕЗУЛЬТАТ")
    print("="*60)
    print(f"Бэкенд: {'✅ OK' if backend_ok else '❌ ОШИБКИ'}")
    print(f"Фронтенд: {'✅ OK' if frontend_ok else '❌ ОШИБКИ'}")
    
    if backend_ok and frontend_ok:
        print("\n🎉 ВСЕ КОМПОНЕНТЫ РАБОТАЮТ КОРРЕКТНО")
        sys.exit(0)
    else:
        print("\n⚠️  ОБНАРУЖЕНЫ ПРОБЛЕМЫ")
        sys.exit(1)
