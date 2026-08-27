import React from 'react';
import { Calculator } from './components/Calculator';

export default function App() {
  return (
    <main 
      id="main-app" 
      dir="rtl"
      className="min-h-screen bg-stone-950 text-stone-100 flex flex-col justify-center items-center p-4 sm:p-6 antialiased selection:bg-amber-500 selection:text-stone-950"
    >
      <div className="w-full max-w-md flex flex-col items-center">
        <Calculator />
      </div>
    </main>
  );
}
