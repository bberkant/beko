import * as Lucide from 'lucide-react';

const targets = ['Contactless', 'Nfc', 'Receipt', 'Terminal', 'Tablet', 'Pocket', 'Keyround', 'Laptop', 'Banknote', 'HandCoins', 'Wallet', 'BadgePercent', 'Landmark', 'CreditCard'];

targets.forEach(t => {
  console.log(`${t} exists:`, typeof Lucide[t] !== 'undefined');
});
