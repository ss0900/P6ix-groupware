# backend/operation/services/quote_service.py
"""
견적서 계산 서비스
- 라운딩 (절사/반올림/올림)
- VAT 모드별 계산
- 한글 금액 변환
"""
from decimal import Decimal
import math


def apply_rounding(amount: int, rounding_type: str, rounding_unit: int) -> int:
    """
    금액에 라운딩 적용
    
    Args:
        amount: 원본 금액
        rounding_type: 'floor' (절사), 'round' (반올림), 'ceil' (올림)
        rounding_unit: 라운딩 단위 (1, 10, 100, 1000 등)
    
    Returns:
        라운딩된 금액
    """
    if rounding_unit <= 1:
        return amount
    
    if rounding_type == 'floor':
        # 절사 (내림)
        return (amount // rounding_unit) * rounding_unit
    elif rounding_type == 'round':
        # 반올림
        return round(amount / rounding_unit) * rounding_unit
    elif rounding_type == 'ceil':
        # 올림
        return math.ceil(amount / rounding_unit) * rounding_unit
    else:
        return amount


def calculate_quote_totals(quote) -> dict:
    """
    견적서 합계 계산 (라운딩/VAT 모드 적용)
    
    Args:
        quote: Quote 인스턴스
    
    Returns:
        dict with subtotal, tax_amount, total_amount, total_amount_korean
    """
    items = quote.items.all()
    
    # 기본 합계 계산 (할인행 포함)
    raw_subtotal = sum(item.amount for item in items)
    
    # 라운딩 적용
    rounding_type = getattr(quote, 'rounding_type', 'floor')
    rounding_unit = getattr(quote, 'rounding_unit', 1000)
    tax_mode = getattr(quote, 'tax_mode', 'exclusive')
    tax_rate = float(getattr(quote, 'tax_rate', 10))
    
    if tax_mode == 'exempt':
        # 면세
        subtotal = apply_rounding(int(raw_subtotal), rounding_type, rounding_unit)
        tax_amount = 0
        total_amount = subtotal
    elif tax_mode == 'inclusive':
        # VAT 포함 (역산)
        # total = subtotal + tax = subtotal * (1 + tax_rate/100)
        # subtotal = total / (1 + tax_rate/100)
        total_before_rounding = int(raw_subtotal)
        subtotal_before_rounding = int(total_before_rounding / (1 + tax_rate / 100))
        tax_before_rounding = total_before_rounding - subtotal_before_rounding
        
        subtotal = apply_rounding(subtotal_before_rounding, rounding_type, rounding_unit)
        tax_amount = apply_rounding(tax_before_rounding, rounding_type, rounding_unit)
        total_amount = subtotal + tax_amount
    else:
        # VAT 별도 (기본)
        subtotal = apply_rounding(int(raw_subtotal), rounding_type, rounding_unit)
        tax_amount = apply_rounding(int(subtotal * tax_rate / 100), rounding_type, rounding_unit)
        total_amount = subtotal + tax_amount
    
    # 한글 금액 변환
    total_amount_korean = number_to_korean(total_amount)
    
    return {
        'subtotal': subtotal,
        'tax_amount': tax_amount,
        'total_amount': total_amount,
        'total_amount_korean': total_amount_korean,
    }


def number_to_korean(amount: int) -> str:
    """
    숫자를 한글 금액으로 변환
    
    Args:
        amount: 금액 (원 단위)
    
    Returns:
        한글 금액 문자열 (예: "금 구백삼십육만원정")
    """
    if amount == 0:
        return "금 영원정"
    
    if amount < 0:
        return f"(-)금 {_convert_positive_to_korean(abs(amount))}원정"
    
    return f"금 {_convert_positive_to_korean(amount)}원정"


def _convert_positive_to_korean(n: int) -> str:
    """양수를 한글로 변환하는 헬퍼 함수"""
    units = ['', '만', '억', '조', '경']
    digits = ['', '일', '이', '삼', '사', '오', '육', '칠', '팔', '구']
    sub_units = ['', '십', '백', '천']
    
    if n == 0:
        return '영'
    
    result = []
    unit_idx = 0
    
    while n > 0:
        chunk = n % 10000
        n //= 10000
        
        if chunk > 0:
            chunk_str = _convert_chunk_to_korean(chunk, digits, sub_units)
            if units[unit_idx]:
                chunk_str += units[unit_idx]
            result.append(chunk_str)
        
        unit_idx += 1
    
    return ''.join(reversed(result))


def _convert_chunk_to_korean(chunk: int, digits: list, sub_units: list) -> str:
    """4자리 청크를 한글로 변환"""
    result = []
    sub_unit_idx = 0
    
    while chunk > 0:
        digit = chunk % 10
        chunk //= 10
        
        if digit > 0:
            # 일의 자리가 아닌 경우 '일'은 생략 (예: 십, 백, 천)
            if digit == 1 and sub_unit_idx > 0:
                result.append(sub_units[sub_unit_idx])
            else:
                result.append(digits[digit] + sub_units[sub_unit_idx])
        
        sub_unit_idx += 1
    
    return ''.join(reversed(result))
