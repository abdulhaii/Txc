import { Operator } from '../types';

export function calculate(first: number, second: number, operator: Operator): number | 'Error' {
  if (!operator) return second;
  
  let result: number;
  switch (operator) {
    case '+':
      result = first + second;
      break;
    case '-':
      result = first - second;
      break;
    case '×':
      result = first * second;
      break;
    case '÷':
      if (second === 0) return 'Error';
      result = first / second;
      break;
    default:
      return second;
  }

  // Handle floating point precision issues (e.g. 0.1 + 0.2)
  const precision = 12;
  const rounded = parseFloat(result.toPrecision(precision));
  return Number.isFinite(rounded) ? rounded : 'Error';
}

export function formatDisplayNumber(valueStr: string): string {
  if (valueStr === 'Error' || valueStr === 'خطأ') return valueStr;
  if (!valueStr) return '0';
  
  const isNegative = valueStr.startsWith('-');
  const rawNum = isNegative ? valueStr.slice(1) : valueStr;

  const parts = rawNum.split('.');
  const integerPart = parts[0] || '0';
  const decimalPart = parts.length > 1 ? `.${parts[1]}` : '';

  // Format integer part with locale grouping
  const formattedInteger = Number(integerPart).toLocaleString('en-US');
  
  // If parsing as Number loses leading zeroes or anything for just "0", handle carefully:
  const finalInteger = integerPart === '' ? '0' : formattedInteger;

  return `${isNegative ? '-' : ''}${finalInteger}${decimalPart}`;
}
