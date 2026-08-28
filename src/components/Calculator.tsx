import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Equal,
  ChevronLeft,
  ChevronRight,
  MousePointerClick
} from 'lucide-react';
import { Operator, HistoryItem } from '../types';
import { calculate, formatDisplayNumber } from '../utils/calculator';

export const Calculator: React.FC = () => {
  const [displayValue, setDisplayValue] = useState<string>('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<Operator>(null);
  const [waitingForOperand, setWaitingForOperand] = useState<boolean>(false);
  const [cursorPosition, setCursorPosition] = useState<number>(1);
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
  const inputRef = useRef<HTMLInputElement>(null);

  // Save history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('calc_history', JSON.stringify(history));
    } catch {
      // ignore
    }
  }, [history]);

  // Flash active key state for feedback (lighting effect)
  const triggerKeyFlash = (keyId: string) => {
    setActiveKey(keyId);
    setTimeout(() => {
      setActiveKey((prev) => (prev === keyId ? null : prev));
    }, 220);
  };

  // Helper to safely set cursor in input
  const setInputSelection = useCallback((start: number, end: number = start) => {
    setCursorPosition(start);
    requestAnimationFrame(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        inputRef.current.setSelectionRange(start, end);
      }
    });
  }, []);

  // Update cursor position on selection changes
  const handleSelect = () => {
    if (inputRef.current) {
      setCursorPosition(inputRef.current.selectionStart ?? displayValue.length);
    }
  };

  // Handle direct input change from keyboard typing or paste
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Allow only digits, dot, and leading minus
    const sanitized = val.replace(/[^0-9.-]/g, '');
    const newPos = e.target.selectionStart ?? sanitized.length;
    
    if (sanitized === '' || sanitized === '-') {
      setDisplayValue(sanitized === '-' ? '-0' : '0');
      setInputSelection(sanitized === '-' ? 2 : 1);
    } else {
      setDisplayValue(sanitized);
      setInputSelection(newPos);
    }
  };

  // Handle digit input at current cursor position without length restrictions
  const inputDigit = useCallback((digit: string) => {
    triggerKeyFlash(`btn-${digit}`);
    
    if (waitingForOperand) {
      setDisplayValue(digit);
      setWaitingForOperand(false);
      setInputSelection(digit.length);
      return;
    }

    const start = inputRef.current?.selectionStart ?? cursorPosition;
    const end = inputRef.current?.selectionEnd ?? cursorPosition;

    if (displayValue === '0' && start === 1 && end === 1 && digit !== '.') {
      setDisplayValue(digit);
      setInputSelection(1);
    } else {
      const before = displayValue.slice(0, start);
      const after = displayValue.slice(end);
      const nextVal = before + digit + after;
      setDisplayValue(nextVal);
      setInputSelection(start + digit.length);
    }
  }, [displayValue, waitingForOperand, cursorPosition, setInputSelection]);

  // Handle decimal dot at cursor position
  const inputDecimal = useCallback(() => {
    triggerKeyFlash('btn-dot');
    if (waitingForOperand) {
      setDisplayValue('0.');
      setWaitingForOperand(false);
      setInputSelection(2);
      return;
    }

    const start = inputRef.current?.selectionStart ?? cursorPosition;
    const end = inputRef.current?.selectionEnd ?? cursorPosition;

    const before = displayValue.slice(0, start);
    const after = displayValue.slice(end);

    // Prevent multiple dots in same number block if desired
    if (!displayValue.includes('.') || (start <= displayValue.indexOf('.') && end > displayValue.indexOf('.'))) {
      const nextVal = before + '.' + after;
      setDisplayValue(nextVal);
      setInputSelection(start + 1);
    } else {
      setInputSelection(start);
    }
  }, [displayValue, waitingForOperand, cursorPosition, setInputSelection]);

  // Clear all
  const clearAll = useCallback(() => {
    triggerKeyFlash('btn-clear');
    setDisplayValue('0');
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setInputSelection(1);
  }, [setInputSelection]);

  // Backspace: Delete character before cursor or delete active selection
  const handleBackspace = useCallback(() => {
    triggerKeyFlash('btn-backspace');
    if (waitingForOperand) return;

    const start = inputRef.current?.selectionStart ?? cursorPosition;
    const end = inputRef.current?.selectionEnd ?? cursorPosition;

    if (start !== end) {
      // Range selected -> delete range
      const before = displayValue.slice(0, start);
      const after = displayValue.slice(end);
      const nextVal = before + after || '0';
      setDisplayValue(nextVal);
      setInputSelection(Math.min(start, nextVal.length));
    } else if (start > 0) {
      // Single character before cursor
      const before = displayValue.slice(0, start - 1);
      const after = displayValue.slice(start);
      const nextVal = before + after;
      const finalVal = nextVal === '' || nextVal === '-' ? '0' : nextVal;
      setDisplayValue(finalVal);
      setInputSelection(Math.max(0, start - 1));
    }
  }, [displayValue, waitingForOperand, cursorPosition, setInputSelection]);

  // Move cursor left/right
  const moveCursor = useCallback((delta: number) => {
    const current = inputRef.current?.selectionStart ?? cursorPosition;
    const nextPos = Math.max(0, Math.min(displayValue.length, current + delta));
    setInputSelection(nextPos);
  }, [cursorPosition, displayValue.length, setInputSelection]);

  // Toggle positive/negative sign
  const toggleSign = useCallback(() => {
    triggerKeyFlash('btn-sign');
    const currentValue = parseFloat(displayValue);
    if (currentValue === 0) return;
    const nextVal = displayValue.startsWith('-') ? displayValue.slice(1) : '-' + displayValue;
    setDisplayValue(nextVal);
    const start = inputRef.current?.selectionStart ?? cursorPosition;
    const offset = displayValue.startsWith('-') ? -1 : 1;
    setInputSelection(Math.max(0, Math.min(nextVal.length, start + offset)));
  }, [displayValue, cursorPosition, setInputSelection]);

  // Percentage calculation
  const inputPercent = useCallback(() => {
    triggerKeyFlash('btn-percent');
    const currentValue = parseFloat(displayValue);
    if (isNaN(currentValue)) return;

    let newValue: number;
    if (previousValue !== null && (operator === '+' || operator === '-')) {
      newValue = (previousValue * currentValue) / 100;
    } else {
      newValue = currentValue / 100;
    }

    const precisionResult = parseFloat(newValue.toPrecision(12)).toString();
    setDisplayValue(precisionResult);
    setInputSelection(precisionResult.length);
  }, [displayValue, previousValue, operator, setInputSelection]);

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
        setInputSelection(5);
        return;
      }

      setPreviousValue(result);
      const resStr = result.toString();
      setDisplayValue(resStr);

      const expression = `${previousValue} ${operator} ${inputValue}`;
      setHistory(prev => [
        {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          expression,
          result: resStr,
          timestamp: new Date()
        },
        ...prev.slice(0, 19)
      ]);
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [displayValue, previousValue, operator, setInputSelection]);

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
      ...prev.slice(0, 29)
    ]);

    setDisplayValue(resultStr);
    setPreviousValue(null);
    setOperator(null);
    setWaitingForOperand(true);
    setInputSelection(resultStr.length);
  }, [displayValue, previousValue, operator, setInputSelection]);

  // Copy result
  const copyResult = () => {
    navigator.clipboard.writeText(displayValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // If user is focused directly inside input, let standard input keys work naturally
      if (document.activeElement === inputRef.current) {
        if (event.key === 'Enter' || event.key === '=') {
          event.preventDefault();
          handleEquals();
        } else if (event.key === 'Escape') {
          event.preventDefault();
          clearAll();
        } else if (event.key === '+' || event.key === '-') {
          event.preventDefault();
          performOperation(event.key as Operator);
        } else if (event.key === '*') {
          event.preventDefault();
          performOperation('×');
        } else if (event.key === '/') {
          event.preventDefault();
          performOperation('÷');
        } else if (event.key === '%') {
          event.preventDefault();
          inputPercent();
        }
        return;
      }

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
      } else if (key === 'ArrowLeft') {
        event.preventDefault();
        moveCursor(-1);
      } else if (key === 'ArrowRight') {
        event.preventDefault();
        moveCursor(1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputDigit, inputDecimal, performOperation, handleEquals, handleBackspace, clearAll, inputPercent, moveCursor]);

  // Dynamic font sizing based on length of display value
  const getDisplayFontSize = (text: string) => {
    const length = text.length;
    if (length > 20) return 'text-xl sm:text-2xl';
    if (length > 14) return 'text-2xl sm:text-3xl';
    if (length > 8) return 'text-3xl sm:text-4xl';
    return 'text-4xl sm:text-5xl';
  };

  // Prevent default on mouse down for keypad buttons so input doesn't lose focus / selection
  const handleButtonMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  // Helper for glowing blue number buttons on click/press with smooth fade out
  const getNumberBtnClass = (digit: string) => {
    const isActive = activeKey === `btn-${digit}`;
    return `h-14 rounded-2xl font-medium text-xl flex items-center justify-center transition-all duration-300 ease-out select-none cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.85)] scale-[0.96]'
        : 'bg-[#252528] text-stone-100 hover:bg-[#303035] active:bg-blue-600 active:text-white active:ring-2 active:ring-blue-400 active:shadow-[0_0_24px_rgba(59,130,246,0.85)] active:scale-[0.96]'
    }`;
  };

  const getDotBtnClass = () => {
    const isActive = activeKey === 'btn-dot';
    return `h-14 rounded-2xl font-medium text-2xl flex items-center justify-center transition-all duration-300 ease-out select-none cursor-pointer ${
      isActive
        ? 'bg-blue-600 text-white ring-2 ring-blue-400 shadow-[0_0_24px_rgba(59,130,246,0.85)] scale-[0.96]'
        : 'bg-[#252528] text-stone-100 hover:bg-[#303035] active:bg-blue-600 active:text-white active:ring-2 active:ring-blue-400 active:shadow-[0_0_24px_rgba(59,130,246,0.85)] active:scale-[0.96]'
    }`;
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
            <span className="text-xs font-semibold tracking-wider text-stone-400 uppercase">حاسبة تفاعلية</span>
            <span className="text-[10px] bg-stone-800 text-amber-400/90 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <MousePointerClick className="w-3 h-3" />
              مؤشر تفاعلي
            </span>
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
                        setInputSelection(item.result.length);
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

        {/* Interactive Display Screen with Direct Cursor Selection */}
        <div 
          id="calculator-display-container" 
          onClick={() => inputRef.current?.focus()}
          className="group relative px-3 py-3 mb-3 text-right bg-stone-950/70 border border-stone-800/90 rounded-2xl focus-within:border-amber-500/50 focus-within:ring-1 focus-within:ring-amber-500/30 transition-all cursor-text"
        >
          {/* Active Expression Preview */}
          <div id="display-expression" className="h-5 text-xs font-mono text-stone-400 font-medium tracking-wide flex justify-between items-center">
            <span className="text-[10px] text-stone-500 font-sans">
              انقر لتحديد موضع المؤشر 👆
            </span>
            {previousValue !== null && operator ? (
              <span>{formatDisplayNumber(previousValue.toString())} {operator}</span>
            ) : (
              <span>&nbsp;</span>
            )}
          </div>

          {/* Main Editable Output Field with Visible Blinking Caret & Infinite Length */}
          <div className="relative w-full flex items-center justify-end overflow-hidden pt-1 pb-0.5">
            <input
              id="display-input"
              ref={inputRef}
              type="text"
              dir="ltr"
              value={displayValue}
              onChange={handleInputChange}
              onSelect={handleSelect}
              onKeyUp={handleSelect}
              onClick={handleSelect}
              autoFocus
              className={`w-full bg-transparent text-right font-semibold font-mono tracking-tight text-stone-50 outline-none caret-amber-400 selection:bg-blue-600/60 selection:text-white ${getDisplayFontSize(displayValue)}`}
              placeholder="0"
            />
          </div>

          {/* Cursor Navigation Pill Controls for Mobile and Precision */}
          <div className="flex items-center justify-between pt-2 mt-1 border-t border-stone-800/50 text-[11px] text-stone-400">
            <div className="flex items-center gap-1 font-mono text-stone-500 text-[10px]">
              <span>الخانة:</span>
              <span className="text-amber-400 font-bold">{cursorPosition}</span>
              <span>/</span>
              <span>{displayValue.length}</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                id="btn-cursor-left"
                onMouseDown={handleButtonMouseDown}
                onClick={() => moveCursor(-1)}
                title="تحريك المؤشر يساراً"
                className="p-1 rounded bg-stone-850 hover:bg-stone-750 text-stone-300 active:scale-95 transition-all flex items-center gap-0.5 text-[10px] px-1.5"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>يسار</span>
              </button>
              <button
                type="button"
                id="btn-cursor-right"
                onMouseDown={handleButtonMouseDown}
                onClick={() => moveCursor(1)}
                title="تحريك المؤشر يميناً"
                className="p-1 rounded bg-stone-850 hover:bg-stone-750 text-stone-300 active:scale-95 transition-all flex items-center gap-0.5 text-[10px] px-1.5"
              >
                <span>يمين</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Keypad Grid */}
        <div id="calculator-keypad" className="grid grid-cols-4 gap-2.5">
          {/* Row 1 */}
          <button
            id="btn-clear"
            onMouseDown={handleButtonMouseDown}
            onClick={clearAll}
            className={`h-14 rounded-2xl font-semibold text-base transition-all duration-100 flex items-center justify-center bg-stone-800 text-amber-400 hover:bg-stone-700 active:scale-95 cursor-pointer ${
              activeKey === 'btn-clear' ? 'ring-2 ring-amber-400/50 bg-stone-700' : ''
            }`}
          >
            {displayValue !== '0' || previousValue !== null ? 'C' : 'AC'}
          </button>

          <button
            id="btn-sign"
            onMouseDown={handleButtonMouseDown}
            onClick={toggleSign}
            className={`h-14 rounded-2xl font-medium text-base transition-all duration-100 flex items-center justify-center bg-stone-800 text-stone-300 hover:bg-stone-700 active:scale-95 cursor-pointer ${
              activeKey === 'btn-sign' ? 'ring-2 ring-stone-400/50 bg-stone-700' : ''
            }`}
          >
            +/-
          </button>

          <button
            id="btn-percent"
            onMouseDown={handleButtonMouseDown}
            onClick={inputPercent}
            className={`h-14 rounded-2xl font-medium text-base transition-all duration-100 flex items-center justify-center bg-stone-800 text-stone-300 hover:bg-stone-700 active:scale-95 cursor-pointer ${
              activeKey === 'btn-percent' ? 'ring-2 ring-stone-400/50 bg-stone-700' : ''
            }`}
          >
            <Percent className="w-5 h-5" />
          </button>

          <button
            id="btn-divide"
            onMouseDown={handleButtonMouseDown}
            onClick={() => performOperation('÷')}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-600 text-stone-100 hover:bg-amber-500 active:scale-95 cursor-pointer ${
              operator === '÷' && waitingForOperand ? 'ring-2 ring-amber-200 bg-amber-500' : ''
            } ${activeKey === 'btn-divide' ? 'ring-2 ring-amber-200' : ''}`}
          >
            <Divide className="w-5 h-5" />
          </button>

          {/* Row 2 */}
          <button
            id="btn-7"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('7')}
            className={getNumberBtnClass('7')}
          >
            7
          </button>

          <button
            id="btn-8"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('8')}
            className={getNumberBtnClass('8')}
          >
            8
          </button>

          <button
            id="btn-9"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('9')}
            className={getNumberBtnClass('9')}
          >
            9
          </button>

          <button
            id="btn-multiply"
            onMouseDown={handleButtonMouseDown}
            onClick={() => performOperation('×')}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-600 text-stone-100 hover:bg-amber-500 active:scale-95 cursor-pointer ${
              operator === '×' && waitingForOperand ? 'ring-2 ring-amber-200 bg-amber-500' : ''
            } ${activeKey === 'btn-multiply' ? 'ring-2 ring-amber-200' : ''}`}
          >
            <X className="w-5 h-5" />
          </button>

          {/* Row 3 */}
          <button
            id="btn-4"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('4')}
            className={getNumberBtnClass('4')}
          >
            4
          </button>

          <button
            id="btn-5"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('5')}
            className={getNumberBtnClass('5')}
          >
            5
          </button>

          <button
            id="btn-6"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('6')}
            className={getNumberBtnClass('6')}
          >
            6
          </button>

          <button
            id="btn-minus"
            onMouseDown={handleButtonMouseDown}
            onClick={() => performOperation('-')}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-600 text-stone-100 hover:bg-amber-500 active:scale-95 cursor-pointer ${
              operator === '-' && waitingForOperand ? 'ring-2 ring-amber-200 bg-amber-500' : ''
            } ${activeKey === 'btn-minus' ? 'ring-2 ring-amber-200' : ''}`}
          >
            <Minus className="w-5 h-5" />
          </button>

          {/* Row 4 */}
          <button
            id="btn-1"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('1')}
            className={getNumberBtnClass('1')}
          >
            1
          </button>

          <button
            id="btn-2"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('2')}
            className={getNumberBtnClass('2')}
          >
            2
          </button>

          <button
            id="btn-3"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('3')}
            className={getNumberBtnClass('3')}
          >
            3
          </button>

          <button
            id="btn-plus"
            onMouseDown={handleButtonMouseDown}
            onClick={() => performOperation('+')}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-600 text-stone-100 hover:bg-amber-500 active:scale-95 cursor-pointer ${
              operator === '+' && waitingForOperand ? 'ring-2 ring-amber-200 bg-amber-500' : ''
            } ${activeKey === 'btn-plus' ? 'ring-2 ring-amber-200' : ''}`}
          >
            <Plus className="w-5 h-5" />
          </button>

          {/* Row 5 */}
          <button
            id="btn-0"
            onMouseDown={handleButtonMouseDown}
            onClick={() => inputDigit('0')}
            className={getNumberBtnClass('0')}
          >
            0
          </button>

          <button
            id="btn-dot"
            onMouseDown={handleButtonMouseDown}
            onClick={inputDecimal}
            className={getDotBtnClass()}
          >
            .
          </button>

          <button
            id="btn-backspace"
            onMouseDown={handleButtonMouseDown}
            onClick={handleBackspace}
            title="حذف الرقم عند المؤشر (Backspace)"
            className={`h-14 rounded-2xl font-medium text-base transition-all duration-100 flex items-center justify-center bg-[#252528] hover:bg-[#303035] text-stone-300 active:scale-95 cursor-pointer ${
              activeKey === 'btn-backspace' ? 'ring-2 ring-stone-400/50 bg-[#303035]' : ''
            }`}
          >
            <Delete className="w-5 h-5" />
          </button>

          <button
            id="btn-equal"
            onMouseDown={handleButtonMouseDown}
            onClick={handleEquals}
            className={`h-14 rounded-2xl font-semibold text-xl transition-all duration-100 flex items-center justify-center bg-amber-500 text-stone-950 hover:bg-amber-400 active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer ${
              activeKey === 'btn-equal' ? 'ring-2 ring-white' : ''
            }`}
          >
            <Equal className="w-6 h-6" />
          </button>
        </div>

        {/* Keyboard shortcut guide */}
        <div id="calculator-footer-tip" className="mt-4 pt-3 border-t border-stone-800/60 text-center">
          <p className="text-[11px] text-stone-500">
            يمكنك النقر على أي مكان في الشاشة لتحديد المؤشر وإضافة أو حذف أي رقم بدقة
          </p>
        </div>
      </div>
    </div>
  );
};

