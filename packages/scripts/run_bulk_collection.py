#!/usr/bin/env python3
"""
대량 데이터 수집 배치 실행기

이 스크립트는 미리 정의된 시나리오에 따라 대량 데이터 수집을 실행합니다.
사용자가 쉽게 선택할 수 있는 옵션들을 제공합니다.

사용법:
    python run_bulk_collection.py
    python run_bulk_collection.py --scenario full
    python run_bulk_collection.py --scenario recent --years 2022-2024
"""

import argparse
import subprocess
import sys
import os
from datetime import datetime

# 미리 정의된 수집 시나리오
SCENARIOS = {
    "full": {
        "name": "전체 수집 (2018-2024, 모든 품목)",
        "start_year": 2018,
        "end_year": 2024,
        "items": ["semiconductor", "oil", "copper", "plastic"],
        "delay": 1.5
    },
    "recent": {
        "name": "최근 데이터 (2022-2024, 모든 품목)",
        "start_year": 2022,
        "end_year": 2024,
        "items": ["semiconductor", "oil", "copper", "plastic"],
        "delay": 1.0
    },
    "semiconductor_focus": {
        "name": "반도체 중심 (2018-2024, 반도체만)",
        "start_year": 2018,
        "end_year": 2024,
        "items": ["semiconductor"],
        "delay": 0.5
    },
    "energy_materials": {
        "name": "에너지 및 원자재 (2018-2024, 원유+구리)",
        "start_year": 2018,
        "end_year": 2024,
        "items": ["oil", "copper"],
        "delay": 1.0
    },
    "test": {
        "name": "테스트 수집 (2023-2024, 반도체만)",
        "start_year": 2023,
        "end_year": 2024,
        "items": ["semiconductor"],
        "delay": 0.5
    }
}

def print_banner():
    """배너 출력"""
    print("=" * 60)
    print("🚀 UN Comtrade 대량 데이터 수집기")
    print("   2018-2024년 글로벌 무역 데이터 수집")
    print("=" * 60)

def print_scenarios():
    """사용 가능한 시나리오 출력"""
    print("\n📋 사용 가능한 수집 시나리오:")
    print("-" * 50)
    
    for key, scenario in SCENARIOS.items():
        years = f"{scenario['start_year']}-{scenario['end_year']}"
        items = ", ".join(scenario['items'])
        print(f"  {key:18} : {scenario['name']}")
        print(f"  {'':18}   연도: {years}, 품목: {items}")
        print(f"  {'':18}   지연: {scenario['delay']}초")
        print()

def estimate_collection_time(scenario):
    """수집 예상 시간 계산"""
    years = scenario['end_year'] - scenario['start_year'] + 1
    items = len(scenario['items'])
    trade_pairs = 10  # MAJOR_TRADE_PAIRS 개수
    
    total_requests = years * items * trade_pairs
    total_time_seconds = total_requests * scenario['delay']
    
    hours = int(total_time_seconds // 3600)
    minutes = int((total_time_seconds % 3600) // 60)
    
    return total_requests, hours, minutes

def confirm_execution(scenario_key, scenario):
    """실행 확인"""
    print(f"\n🎯 선택된 시나리오: {scenario_key}")
    print(f"   {scenario['name']}")
    
    total_requests, hours, minutes = estimate_collection_time(scenario)
    
    print(f"\n📊 예상 수집 정보:")
    print(f"   - 총 요청 수: {total_requests:,}개")
    print(f"   - 예상 소요 시간: {hours}시간 {minutes}분")
    print(f"   - 품목: {', '.join(scenario['items'])}")
    print(f"   - 연도 범위: {scenario['start_year']}-{scenario['end_year']}")
    
    print(f"\n⚠️  주의사항:")
    print(f"   - API 제한으로 인해 일부 요청이 실패할 수 있습니다")
    print(f"   - 네트워크 상태에 따라 시간이 더 걸릴 수 있습니다")
    print(f"   - 수집 중 중단하려면 Ctrl+C를 누르세요")
    
    while True:
        response = input(f"\n🤔 정말로 실행하시겠습니까? (y/n): ").lower().strip()
        if response in ['y', 'yes', '예', 'ㅇ']:
            return True
        elif response in ['n', 'no', '아니오', 'ㄴ']:
            return False
        else:
            print("   y(예) 또는 n(아니오)로 답해주세요.")

def run_bulk_collection(scenario):
    """대량 수집 실행"""
    try:
        print(f"\n🚀 대량 데이터 수집 시작...")
        print(f"   시작 시간: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        
        # bulk_data_collector.py 실행 (가상환경의 Python 사용)
        venv_python = os.path.join(os.getcwd(), "venv", "Scripts", "python.exe")
        python_executable = venv_python if os.path.exists(venv_python) else sys.executable
        
        cmd = [
            python_executable, "bulk_data_collector.py",
            "--start-year", str(scenario['start_year']),
            "--end-year", str(scenario['end_year']),
            "--items"] + scenario['items'] + [
            "--delay", str(scenario['delay'])
        ]
        
        print(f"   실행 명령어: {' '.join(cmd)}")
        print("-" * 60)
        
        # 서브프로세스로 실행
        result = subprocess.run(cmd, cwd=os.getcwd())
        
        if result.returncode == 0:
            print(f"\n✅ 대량 수집이 성공적으로 완료되었습니다!")
        else:
            print(f"\n❌ 대량 수집 중 오류가 발생했습니다. (종료 코드: {result.returncode})")
            
        return result.returncode == 0
        
    except KeyboardInterrupt:
        print(f"\n\n⏹️  사용자에 의해 수집이 중단되었습니다.")
        return False
    except Exception as e:
        print(f"\n❌ 실행 중 오류 발생: {e}")
        return False

def interactive_mode():
    """대화형 모드"""
    print_banner()
    print_scenarios()
    
    while True:
        print("🎮 옵션을 선택하세요:")
        print("   1. 시나리오 선택")
        print("   2. 사용자 정의 설정")
        print("   3. 종료")
        
        choice = input("\n선택 (1-3): ").strip()
        
        if choice == "1":
            # 시나리오 선택
            print(f"\n📋 시나리오를 선택하세요:")
            for i, (key, scenario) in enumerate(SCENARIOS.items(), 1):
                print(f"   {i}. {key} - {scenario['name']}")
            
            try:
                scenario_choice = input(f"\n선택 (1-{len(SCENARIOS)}): ").strip()
                scenario_index = int(scenario_choice) - 1
                
                if 0 <= scenario_index < len(SCENARIOS):
                    scenario_key = list(SCENARIOS.keys())[scenario_index]
                    scenario = SCENARIOS[scenario_key]
                    
                    if confirm_execution(scenario_key, scenario):
                        success = run_bulk_collection(scenario)
                        if success:
                            print(f"\n🎉 모든 작업이 완료되었습니다!")
                        break
                    else:
                        print(f"\n취소되었습니다.")
                        continue
                else:
                    print(f"❌ 잘못된 선택입니다.")
                    continue
                    
            except ValueError:
                print(f"❌ 숫자를 입력해주세요.")
                continue
                
        elif choice == "2":
            # 사용자 정의 설정
            print(f"\n🛠️  사용자 정의 설정:")
            
            try:
                start_year = int(input("   시작 연도 (2018-2024): "))
                end_year = int(input("   종료 연도 (2018-2024): "))
                
                if not (2018 <= start_year <= 2024) or not (2018 <= end_year <= 2024):
                    print("❌ 연도는 2018-2024 범위여야 합니다.")
                    continue
                
                if start_year > end_year:
                    print("❌ 시작 연도가 종료 연도보다 클 수 없습니다.")
                    continue
                
                print("   품목 선택 (쉼표로 구분):")
                print("   - semiconductor (반도체)")
                print("   - oil (원유)")
                print("   - copper (구리)")
                print("   - plastic (플라스틱)")
                
                items_input = input("   품목들: ").strip()
                items = [item.strip() for item in items_input.split(',')]
                
                valid_items = ["semiconductor", "oil", "copper", "plastic"]
                items = [item for item in items if item in valid_items]
                
                if not items:
                    print("❌ 유효한 품목을 선택해주세요.")
                    continue
                
                delay = float(input("   API 지연 시간 (초, 권장: 1.0): ") or "1.0")
                
                # 사용자 정의 시나리오 생성
                custom_scenario = {
                    "name": f"사용자 정의 ({start_year}-{end_year})",
                    "start_year": start_year,
                    "end_year": end_year,
                    "items": items,
                    "delay": delay
                }
                
                if confirm_execution("custom", custom_scenario):
                    success = run_bulk_collection(custom_scenario)
                    if success:
                        print(f"\n🎉 모든 작업이 완료되었습니다!")
                    break
                else:
                    print(f"\n취소되었습니다.")
                    continue
                    
            except ValueError:
                print(f"❌ 올바른 값을 입력해주세요.")
                continue
                
        elif choice == "3":
            print(f"\n👋 프로그램을 종료합니다.")
            break
            
        else:
            print(f"❌ 1, 2, 3 중에서 선택해주세요.")

def main():
    """메인 함수"""
    parser = argparse.ArgumentParser(
        description="대량 데이터 수집 배치 실행기",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
사용 예시:
  python run_bulk_collection.py                    # 대화형 모드
  python run_bulk_collection.py --scenario full   # 전체 수집
  python run_bulk_collection.py --scenario test   # 테스트 수집

시나리오:
  full              : 2018-2024, 모든 품목
  recent            : 2022-2024, 모든 품목  
  semiconductor_focus : 2018-2024, 반도체만
  energy_materials  : 2018-2024, 원유+구리
  test              : 2023-2024, 반도체만
        """
    )
    
    parser.add_argument("--scenario", choices=list(SCENARIOS.keys()),
                       help="실행할 시나리오 선택")
    parser.add_argument("--no-confirm", action="store_true",
                       help="실행 확인 없이 바로 실행")
    
    args = parser.parse_args()
    
    if args.scenario:
        # 명령행 모드
        scenario = SCENARIOS[args.scenario]
        
        if not args.no_confirm:
            if not confirm_execution(args.scenario, scenario):
                print("취소되었습니다.")
                sys.exit(0)
        
        success = run_bulk_collection(scenario)
        sys.exit(0 if success else 1)
    else:
        # 대화형 모드
        interactive_mode()

if __name__ == "__main__":
    main()
