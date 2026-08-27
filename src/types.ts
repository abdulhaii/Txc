export type Operator = '+' | '-' | '×' | '÷' | null;

export interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}
