const normalizeString = (str) => {
  if (!str) return '';
  return str
    .toString()
    .trim()
    .toLowerCase()
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[\s\.]/g, ''); 
};

console.log('ZİRAAT normalized:', normalizeString('ZİRAAT'));
console.log('Ö. ZİRAAT normalized:', normalizeString('Ö. ZİRAAT'));
console.log('Ö.ZİRAAT normalized:', normalizeString('Ö.ZİRAAT'));
console.log('isBankMatch ZİRAAT & Ö.ZİRAAT:', normalizeString('ZİRAAT').includes(normalizeString('Ö.ZİRAAT')) || normalizeString('Ö.ZİRAAT').includes(normalizeString('ZİRAAT')));
