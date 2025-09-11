#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
실패한 데이터 수집 재시도 스크립트

사용법:
    python retry_failed_collection.py --summary-file collection_summary_20250911_141654.json
    python retry_failed_collection.py --summary-file collection_summary_20250911_141654.json --items oil
    python retry_failed_collection.py --summary-file collection_summary_20250911_141654.json --max-retries 3
"""

import json
import argparse
import sys
import os
from datetime import datetime
import time
from pathlib import Path

# bulk_data_collector에서 클래스 가져오기
try:
    from bulk_data_collector import BulkDataCollector
except ImportError:
    print("❌ bulk_data_collector.py를 찾을 수 없습니다.")
    sys.exit(1)


def load_failed_requests(summary_file):
    """수집 요약 파일에서 실패한 요청들을 로드"""
    try:
        with open(summary_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        return data.get('failed_requests', [])
    except FileNotFoundError:
        print(f"❌ 요약 파일을 찾을 수 없습니다: {summary_file}")
        return []
    except json.JSONDecodeError:
        print(f"❌ JSON 파일 형식이 잘못되었습니다: {summary_file}")
        return []


def filter_failed_requests(failed_requests, target_items=None):
    """특정 품목의 실패 요청만 필터링"""
    if not target_items:
        return failed_requests
    
    # 품목 그룹 매핑
    item_groups = {
        'semiconductor': ['semiconductor_8541', 'semiconductor_8542'],
        'oil': ['oil'],
        'copper': ['copper'],
        'plastic': ['plastic_3901', 'plastic_3902', 'plastic_3903']
    }
    
    # 대상 품목들을 개별 품목으로 확장
    expanded_items = []
    for item in target_items:
        if item in item_groups:
            expanded_items.extend(item_groups[item])
        else:
            expanded_items.append(item)
    
    return [req for req in failed_requests if req.get('item') in expanded_items]


def retry_failed_collection(failed_requests, max_retries=2, delay=2.0):
    """실패한 요청들을 재시도"""
    if not failed_requests:
        print("📝 재시도할 실패 요청이 없습니다.")
        return
    
    print(f"🔄 {len(failed_requests)}개의 실패한 요청을 재시도합니다...")
    
    # BulkDataCollector 인스턴스 생성
    collector = BulkDataCollector()
    
    # 결과 저장
    retry_results = {
        'retry_date': datetime.now().isoformat(),
        'original_failures': len(failed_requests),
        'successful_retries': [],
        'still_failed': [],
        'max_retries': max_retries
    }
    
    for i, failed_req in enumerate(failed_requests, 1):
        year = failed_req.get('year')
        item = failed_req.get('item')
        reporter_name = failed_req.get('reporter_name')
        partner_name = failed_req.get('partner_name')
        
        print(f"\n[{i}/{len(failed_requests)}] 재시도: {year}년 {item} {reporter_name}→{partner_name}")
        
        # 국가 코드 찾기 (MAJOR_TRADE_PAIRS에서 검색)
        from bulk_data_collector import MAJOR_TRADE_PAIRS
        
        reporter_code = None
        partner_code = None
        
        for rep_code, part_code, rep_name, part_name in MAJOR_TRADE_PAIRS:
            if rep_name == reporter_name:
                reporter_code = rep_code
            if rep_name == partner_name:
                partner_code = rep_code
            if part_name == reporter_name:
                reporter_code = part_code
            if part_name == partner_name:
                partner_code = part_code
        
        if not reporter_code or not partner_code:
            print(f"   ❌ 국가 코드를 찾을 수 없습니다: {reporter_name}, {partner_name}")
            retry_results['still_failed'].append(failed_req)
            continue
        
        # 재시도 로직
        success = False
        for attempt in range(max_retries):
            try:
                print(f"   🔄 시도 {attempt + 1}/{max_retries}...")
                
                # 데이터 수집 시도
                result = collector.collect_single_data(
                    year=year,
                    item=item,
                    reporter_code=reporter_code,
                    partner_code=partner_code,
                    reporter_name=reporter_name,
                    partner_name=partner_name
                )
                
                if result['success']:
                    print(f"   ✅ 성공! 레코드: {result.get('records', 0)}")
                    retry_results['successful_retries'].append({
                        'year': year,
                        'item': item,
                        'reporter_name': reporter_name,
                        'partner_name': partner_name,
                        'records': result.get('records', 0),
                        'trade_value': result.get('trade_value', 0),
                        'attempt': attempt + 1
                    })
                    success = True
                    break
                else:
                    print(f"   ⚠️  시도 {attempt + 1} 실패: {result.get('error', 'Unknown error')}")
                    
            except Exception as e:
                print(f"   ❌ 시도 {attempt + 1} 예외 발생: {str(e)}")
            
            # 재시도 전 대기
            if attempt < max_retries - 1:
                time.sleep(delay)
        
        if not success:
            print(f"   ❌ 모든 재시도 실패")
            retry_results['still_failed'].append(failed_req)
        
        # 요청 간 대기
        if i < len(failed_requests):
            time.sleep(delay)
    
    # 결과 저장
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    result_file = f"./data/output/retry_results_{timestamp}.json"
    
    with open(result_file, 'w', encoding='utf-8') as f:
        json.dump(retry_results, f, ensure_ascii=False, indent=2)
    
    # 결과 요약
    successful = len(retry_results['successful_retries'])
    still_failed = len(retry_results['still_failed'])
    
    print(f"\n🎉 재시도 완료!")
    print(f"   ✅ 성공: {successful}개")
    print(f"   ❌ 여전히 실패: {still_failed}개")
    print(f"   📊 성공률: {successful/(successful+still_failed)*100:.1f}%")
    print(f"   📁 결과 파일: {result_file}")
    
    return retry_results


def main():
    parser = argparse.ArgumentParser(description="실패한 데이터 수집 재시도")
    parser.add_argument("--summary-file", required=True, 
                       help="수집 요약 JSON 파일 경로")
    parser.add_argument("--items", nargs="+", 
                       choices=['semiconductor', 'oil', 'copper', 'plastic'],
                       help="재시도할 품목들 (기본값: 모든 품목)")
    parser.add_argument("--max-retries", type=int, default=2,
                       help="최대 재시도 횟수 (기본값: 2)")
    parser.add_argument("--delay", type=float, default=2.0,
                       help="요청 간 대기 시간 (초, 기본값: 2.0)")
    
    args = parser.parse_args()
    
    # 실패한 요청들 로드
    failed_requests = load_failed_requests(args.summary_file)
    if not failed_requests:
        print("📝 실패한 요청이 없습니다.")
        return
    
    print(f"📋 총 {len(failed_requests)}개의 실패한 요청을 찾았습니다.")
    
    # 품목별 필터링
    if args.items:
        failed_requests = filter_failed_requests(failed_requests, args.items)
        print(f"🎯 {args.items} 품목으로 필터링: {len(failed_requests)}개")
    
    if not failed_requests:
        print("📝 필터링 후 재시도할 요청이 없습니다.")
        return
    
    # 재시도 실행
    retry_failed_collection(failed_requests, args.max_retries, args.delay)


if __name__ == "__main__":
    main()
