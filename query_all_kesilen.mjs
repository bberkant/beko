import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = "SELECT id, check_no, amount, due_date, status, debtor, creditor FROM ebs_checks WHERE check_type = 'kesilen';";
  const output = execSync(`npx supabase db query --linked --output-format json "${query}"`, { encoding: 'utf-8' });
  
  // Find first { and parse from there
  const jsonStart = output.indexOf('{');
  if (jsonStart === -1) {
    throw new Error('No JSON object found in output');
  }
  const jsonStr = output.substring(jsonStart);
  const parsed = JSON.parse(jsonStr);
  const data = parsed.rows || [];

  console.log(`Total kesilen checks in DB: ${data.length}`);
  const statusCounts = {};
  data.forEach(c => {
    statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
  });
  console.log('Status counts:', statusCounts);

  const cleanStatus = (status) => {
    if (!status) return '';
    let cleaned = status;
    cleaned = cleaned
      .replace(/Ã–/g, 'Ö')
      .replace(/Ãœ/g, 'Ü')
      .replace(/Ä°/g, 'İ')
      .replace(/Ã‡/g, 'Ç')
      .replace(/Ãž/g, 'Ş')
      .replace(/Äž/g, 'Ğ')
      .replace(/Ä±/g, 'ı');
    cleaned = cleaned
      .replace(/Ã¶/g, 'ö')
      .replace(/ã¶/g, 'ö')
      .replace(/ã–/g, 'ö')
      .replace(/ãœ/g, 'ü')
      .replace(/ã¼/g, 'ü')
      .replace(/ä°/g, 'i')
      .replace(/ä±/g, 'ı')
      .replace(/ã§/g, 'ç')
      .replace(/ãŸ/g, 'ş')
      .replace(/äÿ/g, 'ğ')
      .replace(/ã°/g, 'ı');
    cleaned = cleaned
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase();
    return cleaned;
  };

  const activeStatuses = data.filter(c => {
    const st = cleanStatus(c.status);
    return !st.includes('ödendi') && !st.includes('tahsil') && !st.includes('ödenen') && !st.includes('ciro') && !st.includes('odendi') && !st.includes('odenen');
  });
  console.log(`Total active (unpaid/not ciro) kesilen checks: ${activeStatuses.length}`);

  // Print first 40 active kesilen checks
  console.log('Sample active kesilen checks:');
  activeStatuses.slice(0, 40).forEach((c, idx) => {
    console.log(`${idx + 1}. Due: ${c.due_date} | Debtor: ${c.debtor} | Creditor: ${c.creditor} | Amount: ${c.amount} | Status: ${c.status} (cleaned: ${cleanStatus(c.status)})`);
  });
} catch (error) {
  console.error('Error running query:', error.message);
}
