import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

const nonTakasKeywords = ['HATIR', 'KRŞ', 'KARŞILIK', 'TAZMİNAT', 'BORÇ', 'ÖMER DEMİR', 'BURAK BESİCİLİK', 'ALİ ARAN', 'TAKASTA OLMAYAN'];

const getBankColumn = (debtor, bankName) => {
  const d = (debtor || '').toUpperCase().trim();
  const b = (bankName || '').toUpperCase().trim();
  if (d === 'E.AKBANK') return 'E.AKBANK';
  if (d === 'M.AKBANK') return 'M.AKBANK';
  if (d.includes('DENİZ') || d.includes('DENIZ')) return 'DENİZ';
  if (d === 'E.ZİRAAT' || d === 'M.ZİRAAT' || d === 'Ö.ZİRAAT' || d === 'ZİRAAT' || d.includes('ZİRAAT') || d.includes('ZIRAAT')) return 'E.ZİRAAT';
  if (d.includes('ALBARAKA')) return 'E.ALBARAKA';
  if (d.includes('İŞ') || d.includes('IS') || d.includes('İŞBANK') || d.includes('ISBANK')) return 'İŞBANK';
  if (d === 'M.GARANTİ' || d === 'M.GARANTI') return 'M.GARANTİ';
  if (d === 'E.GARANTİ' || d === 'E.GARANTI') return 'E.GARANTİ';
  if (d.includes('TAKSİT') || b.includes('TAKSİT')) return 'TAKSİT';
  return null;
};

const isNonTakasCheck = (c) => {
  const creditor = (c.creditor || '').toUpperCase();
  const debtor = (c.debtor || '').toUpperCase();
  const note = (c.ozel_alan || '').toUpperCase();
  
  if (note === 'TAKASTA') {
    const column = getBankColumn(c.debtor, c.bank_name);
    return !column;
  }
  
  const matchesKeyword = nonTakasKeywords.some(keyword => 
    creditor.includes(keyword) || debtor.includes(keyword) || note.includes(keyword)
  );

  const column = getBankColumn(c.debtor, c.bank_name);
  
  return matchesKeyword || !column;
};

const cleanStatus = (s) => (s || '').toLowerCase().trim();

try {
  const orgId = '13b8da90-27d1-440d-a8f4-eb50dadd6391';
  const todayStr = '2026-08-04'; // today from user's additional metadata
  
  const query = `SELECT id, check_type, due_date, debtor, creditor, bank_name, amount, status, ozel_alan FROM ebs_checks WHERE organization_id = '${orgId}' AND check_type = 'kesilen' ORDER BY due_date ASC;`;
  
  const output = execSync(`npx supabase db query --linked --output-format json "${query}"`, { encoding: 'utf-8' });
  const result = JSON.parse(output);
  const checks = result.rows;
  
  console.log(`Total kesilen checks: ${checks.length}`);
  
  const activeUnpaid = checks.filter(c => 
    ['tahsilde', 'beklemede', 'ödenmedi'].includes(cleanStatus(c.status)) &&
    c.due_date && c.due_date.substring(0, 10) <= todayStr
  );
  
  console.log(`Active unpaid checks <= ${todayStr}: ${activeUnpaid.length}`);
  
  const takasChecks = activeUnpaid.filter(c => !isNonTakasCheck(c));
  console.log(`Takas checks: ${takasChecks.length}`);
  
  const columns = {
    'E.AKBANK': [],
    'DENİZ': [],
    'E.ZİRAAT': [],
    'E.ALBARAKA': [],
    'İŞBANK': [],
    'M.GARANTİ': [],
    'M.AKBANK': [],
    'E.GARANTİ': [],
    'TAKSİT': []
  };

  takasChecks.forEach(c => {
    const col = getBankColumn(c.debtor, c.bank_name);
    if (col && columns[col]) {
      columns[col].push(c);
    }
  });
  
  for (const [colName, colChecks] of Object.entries(columns)) {
    const total = colChecks.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    console.log(`\n=== COLUMN: ${colName} (Count: ${colChecks.length}, Total: ${total}) ===`);
    colChecks.forEach((c, idx) => {
      console.log(`  ${idx + 1}. Due: ${c.due_date} | Debtor: ${c.debtor} | Creditor: ${c.creditor} | Bank: ${c.bank_name} | Amount: ${c.amount} | Status: ${c.status} | Note: ${c.ozel_alan}`);
    });
  }
  
} catch (error) {
  console.error('Error running query:', error.message);
}
