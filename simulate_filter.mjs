import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = "SELECT id, check_type, amount, due_date, status, debtor, creditor, kesideci, ozel_alan, document_type, bank_name FROM ebs_checks;";
  const output = execSync(`npx supabase db query --linked --output-format json "${query}"`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 100 });
  const checks = JSON.parse(output).rows;

  console.log('Total checks loaded from DB:', checks.length);

  const activeTab = 'kesilen';
  const selectedSidebarFilter = 'all'; // "Kesilen Tüm Çekler"
  const dateFilterType = 'today'; // "Keşide Tarihi : Bugün"
  const documentTypeFilter = 'all';
  const searchTerm = '';
  
  const cleanStatus = (status) => {
    if (!status) return '';
    return status
      .replace(/İ/g, 'i')
      .replace(/I/g, 'ı')
      .toLowerCase();
  };

  const getLocalDateString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayObj = new Date();
  const todayStr = getLocalDateString(todayObj);

  const isWithinDateFilter = (checkDateStr) => {
    if (!checkDateStr) return false;
    const cleanDateStr = checkDateStr.substring(0, 10);
    if (dateFilterType === 'today') {
      return cleanDateStr === todayStr;
    }
    return true;
  };

  const filtered = checks.filter(c => {
    if (c.check_type !== activeTab) return false;
    
    // Sol Menü Durum Filtresi
    if (selectedSidebarFilter !== 'all') {
      // not 'all'
    }

    // Tarih Filtresi
    if (!isWithinDateFilter(c.due_date)) return false;

    return true;
  });

  console.log('Filtered checks (matching React filter):');
  filtered.forEach(c => {
    console.log(`ID: ${c.id}, Date: ${c.due_date}, Amount: ${c.amount}, Creditor: ${c.creditor}, Status: ${c.status}`);
  });

} catch (error) {
  console.error('Error:', error);
}
