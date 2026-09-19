import * as Lucide from 'lucide-react';

const targets = ['QrCode', 'DollarSign', 'Calculator', 'Percent', 'Store', 'CheckSquare', 'Banknote', 'HandCoins', 'Receipt'];

targets.forEach(t => {
  console.log(`${t} exists:`, typeof Lucide[t] !== 'undefined');
});
