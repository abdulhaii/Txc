import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Delete, 
  RotateCcw, 
  Copy, 
  Check, 
  History as HistoryIcon, 
  Trash2, 
  Percent, 
  Divide, 
  X, 
  Minus, 
  Plus, 
  Equal 
} from 'lucide-react';
import { Operator, HistoryItem } from '../types';
import { calculate, formatDisplayNumber } from '../utils/calculator';

export const Calculator: React.FC = () => {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>(() => {
    try {
      const saved = localStorage.getItem('calc_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch {
      // ignore
    }
    return [];
  });
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('calc_history', JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // Flash active key state for keyboard feedback
  const triggerKeyFlash = (keyId: string) => {
    setActiveKey(keyId);
    setTimeout(() => {
      setActiveKey(null);
    }, 150);
  };

  // Handle digit input
  const inputDigit = useCallback((digit: string) => {
    triggerKeyFlash(`btn-${digit}`);
    if (waitingForOperand) {
      setDisplayValue(digit);
      setWaitingForOperand(false);
    } else {
      if (displayValue === '0' && digit !== '.') {
        setDisplayValue(digit);
      } else if (displayValue.replace('-', '').length < 14) {
        setDisplayValue(displayValue + digit);
      }
    }
  }, [displayValue, waitingForOperand]);

  // Handle decimal dot
  const inputDecimal = useCallback(() => {
    triggerKeyFlash('btn-dot');
    if (waitingForOperand) {
      setDisplayValue('0.');
      setWaitingForOperand(false);
      return;
    }

    if (!displayValue.includes('.')) {
      setDisplayValue(displayValue + '.');
    }
  }, [displayValue, waitingForOperand]);

  // Clear all
  const clearAll = useCallback(() => {
    triggerKeyFlash('btn-clear');
    setDisplayValue('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
  }, []);

  // Backspace / Delete last character
  const handleBackspace = useCallback(() => {
    triggerKeyFlash('btn-backspace');
    if (waitingForOperand) return;

    if (displayValue.length === 1 || (displayValue.length === 2 && displayValue.startsWith('-'))) {
      setDisplayValue('0');
    } else {
      setDisplayValue(displayValue.slice(0, -1));
    }
  }, [displayValue, waitingForOperand]);

  // Toggle positive/negative sign
  const toggleSign = useCallback(() => {
    triggerKeyFlash('btn-sign');
    const currentValue = parseFloat(displayValue);
    if (currentValue === 0) return;
    setDisplayValue(displayValue.startsWith('-') ? displayValue.slice(1) : '-' + displayValue);
  }, [displayValue]);

  // Percentage calculation
  const inputPercent = useCallback(() => {
    triggerKeyFlash('btn-percent');
    const currentValue = parseFloat(displayValue);
    if (isNaN(currentValue)) return;

    let newValue: number;
    if (previousValue !== null && (operator === '+' || operator === '-')) {
      // Percentage of previous value (e.g., 100 + 10% = 100 + 10)
      newValue = (previousValue * currentValue) / 100;
    } else {
      newValue = currentValue / 100;
    }

    const precisionResult = parseFloat(newValue.toPrecision(12)).toString();
    setDisplayValue(precisionResult);
  }, [displayValue, previousValue, operator]);

  // Handle operator (+, -, *, /)
  const performOperation = useCallback((nextOperator: Operator) => {
    const keyMap: Record<string, string> = { '+': 'plus', '-': 'minus', '×': 'multiply', '÷': 'divide' };
    if (nextOperator) {
      triggerKeyFlash(`btn-${keyMap[nextOperator]}`);
    }

    const inputValue = parseFloat(displayValue);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operator) {
      const result = calculate(previousValue, inputValue, operator);

      if (result === 'Error') {
        setDisplayValue('Error');
        setPreviousValue(null);
        setOperator(null);
        setWaitingForOperand(true);
        return;
      }

      setPreviousValue(result);
      setDisplayValue(result.toString());

      // If completing calculation with operator chaining
      const expression = `${previousValue} ${operator} ${inputValue}`;
      setHistory(prev => [
        {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          expression,
          result: result.toString(),
          timestamp: new Date()
        },
        ...prev.slice(0, 19)
      ]);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [displayValue, previousValue, operator]);

  // Handle Equals (=)
  const handleEquals = useCallback(() => {
    triggerKeyFlash('btn-equal');
    if (previousValue === null || operator === null) return;

    const inputValue = parseFloat(displayValue);
    const result = calculate(previousValue, inputValue, operator);

    if (result === 'Error') {
      setDisplayValue('خطأ');
      setPreviousValue(null);
      setOperator(null);
      setWaitingForOperand(true);
      return;
    }

    const expression = `${previousValue} ${operator} ${inputValue}`;
    const resultStr = result.toString();

    setHistory(prev => [
      {
        id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
        expression,
        result: resultStr,
        timestamp: new Date()
      },
      ...prev.slice(0, 29) // Keep last 30 entries
    ]);

    setDisplayValue(resultStr);
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
  }, [displayValue, previousValue, operator]);

  // Copy result
  const copyResult = () => {
    navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Prevent default for calculator keys so page doesn't scroll
      const { key } = event;

      if (/^[0-9]$/.test(key)) {
        event.preventDefault();
        inputDigit(key);
      } else if (key === '.') {
        event.preventDefault();
        inputDecimal();
      } else if (key === '+' || key === '-') {
        event.preventDefault();
        performOperation(key as Operator);
      } else if (key === '*') {
        event.preventDefault();
        performOperation('×');
      } else if (key === '/') {
        event.preventDefault();
        performOperation('÷');
      } else if (key === 'Enter' || key === '=') {
        event.preventDefault();
        handleEquals();
      } else if (key === 'Backspace') {
        event.preventDefault();
        handleBackspace();
      } else if (key === 'Escape') {
        event.preventDefault();
        clearAll();
      } else if (key === '%') {
        event.preventDefault();
        inputPercent();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputDigit, inputDecimal, performOperation, handleEquals, handleBackspace, clearAll, inputPercent]);

  // Dynamic font sizing based on length of display value
  const getDisplayFontSize = (text: string) => {
    const length = text.length;
    if (length > 12) return 'text-2xl sm:text-3xl';
    if (length > 8) return 'text-3xl sm:text-4xl';
    return 'text-4xl sm:text-5xl';
  };

  return (
    <div id="calculator-wrapper" className="w-full max-w-sm mx-auto select-none">
      {/* Calculator Shell */}
      <div 
        id="calculator-card" 
        className="bg-stone-900 text-stone-100 rounded-3xl p-5 shadow-2xl border border-stone-800 backdrop-blur-sm"
      >
        {/* Top bar: Header & Action Icons */}
        <div id="calculator-header" className="flex items-center justify-between pb-3 mb-2 border-b border-stone-800/80">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">حاسبة</span>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Copy Button */}
            <button
              id="btn-copy-result"
              onClick={copyResult}
              title="نسخ النتيجة"
              className="p-1.5 rounded-lg text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            >
              {copied ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>

            {/* History Toggle Button */}
            <button
              id="btn-toggle-history"
              onClick={() => setShowHistory(!showHistory)}
              title="سجل الحسابات"
              className={`p-1.5 rounded-lg transition-colors ${
                showHistory 
                  ? 'bg-amber-500/20 text-amber-400' 
                  : 'text-stone-400 hover:text-stone-100 hover:bg-stone-800'
              }`}
            >
              <HistoryIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* History Drawer Overlay */}
        <AnimatePresence>
          {showHistory && (
            <motion.div
              id="history-panel"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden bg-stone-950/90 rounded-2xl p-3 mb-4 border border-stone-800"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-stone-400">السجل الأخير</span>
                {history.length > 0 && (
                  <button
                    id="btn-clear-history"
                    onClick={() => setHistory([])}
                    className="text-[11px] flex items-center gap-1 text-red-400 hover:text-red-300 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    مسح السجل
                  </button>
                )}
              </div>

              <div className="max-h-40 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {history.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-4">لا توجد عمليات سابقة</p>
                ) : (
                  history.map((item) => (
                    <div
                      key={item.id}
                      id={`history-item-${item.id}`}
                      onClick={() => {
                        setDisplayValue(item.result);
                        setWaitingForOperand(true);
                      }}
                      className="group cursor-pointer p-2 rounded-lg bg-stone-900/60 hover:bg-stone-800/80 transition-colors flex justify-between items-center text-xs"
                    >
                      <span className="text-stone-400 group-hover:text-stone-300 transition-colors font-mono">
                        {item.expression} =
                      </span>
                      <span className="font-semibold text-stone-100 font-mono text-sm">
                        {item.result}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Display Screen */}
        <div id="calculator-display-container" className="px-2 py-4 mb-4 text-right">
          {/* Active Expression Preview */}
          <div id="display-expression" className="h-6 text-sm font-mono text-stone-400 font-medium tracking-wide">
            {previousValue !== null && operator ? (
              <span>{formatDisplayNumber(previousValue.toString())} {operator}</span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>

          {/* Main Output */}
          <div 
            id="display-value" 
            className={`font-semibold font-mono tracking-tight text-stone-50 overflow-x-auto overflow-y-hidden whitespace-nowrap custom-scrollbar py-1 ${getDisplayFontSize(displayValue)}`}
          >
            {formatDisplayNumber(displayValue)}
          </div>
        </div>

        {/* Keypad Grid */}
        <div id="calculator-keypad" className="grid grid-cols-4 gap-2.5">
          {/* Row 1 */}
          <button
            id="btn-clear"
            onClick={clearAll}
            className={`h-14 rounded-2xl font-semibold text-base transition-all duration-100 flex items-center justify-center bg-stone-800 text-amber-400 hover:bg-stone-700 active:scale-95 ${
              activeKey === 'btn-clear' ? 'ring-2 ring-amber-400/50 bg-stone-700' : ''
            }`}
          >
            {displayValue !== '0' || previousValue !== null ? 'C' : 'AC'}
          </button>

          <button
            id="btn-sign"
            onClick={toggleSign}
            className={`h-14 rounded-2xl font-medium text-base transition-all duration-100 flex items-center justify-center bg-stone-800 text-stone-300 hover:bg-stone-700 active:scale-95 ${
              activeKey === 'btn-sign' ? 'ring-2 ring-stone-400/50 bg-stone-700' : ''
            }`}
          >
            +/-
          </button>

          <button
            id="btn-percent"
            onClick={inputPercent}
            className={`h-14 rounded-2xl font-medium text-base transition-all duration-100 flex items-center justify-center bg-stone-800 text-stone-300 hover:bg-stone-700 active:scale-95 ${
              activeKey === 'btn-percent' ? 'ring-2 ring-stone-400/50 bg-stone-700' : ''
            }`}
          >
            <Percent className="w-5 h-5" />
          </button>

          <button
            id="btn-divide"
            onClick={() => performOperation('÷')}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-600 text-stone-100 hover:bg-amber-500 active:scale-95 ${
              operator === '÷' && waitingForOperand ? 'ring-2 ring-amber-200 bg-amber-500' : ''
            } ${activeKey === 'btn-divide' ? 'ring-2 ring-amber-200' : ''}`}
          >
            <Divide className="w-5 h-5" />
          </button>

          {/* Row 2 */}
          <button
            id="btn-7"
            onClick={() => inputDigit('7')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-stone-850 hover:bg-stone-750 text-stone-100 active:scale-95 bg-[#252528] hover:bg-[#303035] ${
              activeKey === 'btn-7' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            7
          </button>

          <button
            id="btn-8"
            onClick={() => inputDigit('8')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-8' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            8
          </button>

          <button
            id="btn-9"
            onClick={() => inputDigit('9')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-9' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            9
          </button>

          <button
            id="btn-multiply"
            onClick={() => performOperation('×')}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-600 text-stone-100 hover:bg-amber-500 active:scale-95 ${
              operator === '×' && waitingForOperand ? 'ring-2 ring-amber-200 bg-amber-500' : ''
            } ${activeKey === 'btn-multiply' ? 'ring-2 ring-amber-200' : ''}`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Row 3 */}
          <button
            id="btn-4"
            onClick={() => inputDigit('4')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-4' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            4
          </button>

          <button
            id="btn-5"
            onClick={() => inputDigit('5')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-5' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            5
          </button>

          <button
            id="btn-6"
            onClick={() => inputDigit('6')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-6' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            6
          </button>

          <button
            id="btn-minus"
            onClick={() => performOperation('-')}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-600 text-stone-100 hover:bg-amber-500 active:scale-95 ${
              operator === '-' && waitingForOperand ? 'ring-2 ring-amber-200 bg-amber-500' : ''
            } ${activeKey === 'btn-minus' ? 'ring-2 ring-amber-200' : ''}`}
          >
            <Minus className="w-5 h-5" />
          </button>

          {/* Row 4 */}
          <button
            id="btn-1"
            onClick={() => inputDigit('1')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-1' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            1
          </button>

          <button
            id="btn-2"
            onClick={() => inputDigit('2')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-2' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            2
          </button>

          <button
            id="btn-3"
            onClick={() => inputDigit('3')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-3' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            3
          </button>

          <button
            id="btn-plus"
            onClick={() => performOperation('+')}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-600 text-stone-100 hover:bg-amber-500 active:scale-95 ${
              operator === '+' && waitingForOperand ? 'ring-2 ring-amber-200 bg-amber-500' : ''
            } ${activeKey === 'btn-plus' ? 'ring-2 ring-amber-200' : ''}`}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Row 5 */}
          <button
            id="btn-0"
            onClick={() => inputDigit('0')}
            className={`h-14 rounded-2xl font-medium text-xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-0' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            0
          </button>

          <button
            id="btn-dot"
            onClick={inputDecimal}
            className={`h-14 rounded-2xl font-medium text-2xl transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-100 active:scale-95 ${
              activeKey === 'btn-dot' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            .
          </button>

          <button
            id="btn-backspace"
            onClick={handleBackspace}
            title="حذف الرقم الأخير (Backspace)"
            className={`h-14 rounded-2xl font-medium text-base transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-300 active:scale-95 ${
              activeKey === 'btn-backspace' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            <Delete className="w-5 h-5" />
          </button>

          <button
            id="btn-equal"
            onClick={handleEquals}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95 shadow-md shadow-amber-500/20 ${
              activeKey === 'btn-equal' ? 'ring-2 ring-white' : ''
            }`}
          >
            <Equal className="w-6 h-6" />
          </button>
        </div>

        {/* Keyboard shortcut guide */}
        <div id="calculator-footer-tip" className="mt-4 pt-3 border-t border-stone-800/60 text-center">
          <p className="text-[11px] text-stone-500">
            يدعم لوحة المفاتيح: الأرقام، <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px]">Enter</kbd>، <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px]">Esc</kbd>، <kbd className="px-1.5 py-0.5 rounded bg-stone-800 text-stone-300 font-mono text-[10px]">Backspace</kbd>
          </p>
        </div>
      </div>
    </div>
  );
};
