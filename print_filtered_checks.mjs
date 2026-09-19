import { execSync } from 'child_process';

process.env.SUPABASE_ACCESS_TOKEN = 'sbp_06914e53d784b70c455ff2be8fcee686b4850954';

try {
  const query = "SELECT id, check_type, amount, due_date, status, debtor, creditor, kesideci, ozel_alan, document_type, bank_name FROM ebs_checks;";
  const output = execSync(`npx supabase db query --linked --output-format json "${query}"`, { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 100 });
  const checks = JSON.parse(output).rows;

  console.log('Total checks:', checks.length);

  const activeTab = 'kesilen';
  const selectedSidebarFilter = 'all';
  const dateFilterType = 'today';
  const documentTypeFilter = 'all';
  const searchTerm = '';
  const columnFilters = {
    due_date: '', remaining_days: '', debtor: '', kesideci: '', creditor: '',
    check_no: '', bank_name: '', bank_branch: '', keside_yeri: '', issue_date: '',
    tahsildar_banka: '', status: '', amount: '', ciro_edilen: '', ozel_alan: ''
  };

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
    
    switch (dateFilterType) {
      case 'all':
        return true;
      case 'today':
        return cleanDateStr === todayStr;
      default:
        return true;
    }
  };

  const targetIds = ['8c835a8f-a1e1-4266-8636-cc6799122e00', '2c0fef28-7c7a-484d-9437-64be2671b6ad'];

  checks.forEach(c => {
    if (!targetIds.includes(c.id)) return;

    console.log(`\n--- Tracing check ${c.id} (${c.creditor}, ${c.amount}) ---`);
    console.log(`check_type match: ${c.check_type === activeTab} (c.check_type=${c.check_type}, activeTab=${activeTab})`);
    
    const checkStatus = cleanStatus(c.status);
    const isPaid = checkStatus.includes('ödendi') || 
                   checkStatus.includes('ödenen') || 
                   checkStatus.includes('tahsil edildi') || 
                   checkStatus.includes('tahsilat') || 
                   checkStatus.includes('ciro');
                   
    const isPaidFilterSelected = selectedSidebarFilter === 'all';
    console.log(`isPaid: ${isPaid}, isPaidFilterSelected: ${isPaidFilterSelected}`);
    if (isPaid && !isPaidFilterSelected) {
      console.log('Filtered out by isPaid && !isPaidFilterSelected');
    }

    const inDateFilter = isWithinDateFilter(c.due_date);
    console.log(`isWithinDateFilter match: ${inDateFilter} (due_date=${c.due_date}, todayStr=${todayStr})`);
  });

} catch (error) {
  console.error('Error:', error);
}
