const normalizeString = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD') // Decompose combining characters
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritical marks (accents, dots, etc.)
    .toLowerCase()
    .replace(/[\s\.]/g, ''); // Remove spaces and periods
};

const b1 = normalizeString('ZİRAAT');
const b2 = normalizeString('Ö. ZİRAAT');
const t1 = normalizeString('ZİRAAT');
const t2 = normalizeString('Ö.ZİRAAT');

console.log('ZİRAAT:', b1, b1.length);
console.log('Ö. ZİRAAT:', b2, b2.length);
console.log('Ö.ZİRAAT:', t2, t2.length);
console.log('b1 === ziraat:', b1 === 'ziraat');
console.log('b2 === oziraat:', b2 === 'oziraat');
console.log('ziraat includes oziraat:', b1.includes(t2));
console.log('oziraat includes ziraat:', b2.includes(t1));
