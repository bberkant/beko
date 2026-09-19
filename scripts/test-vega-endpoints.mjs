const routes = [
  '/api/cariler',
  '/api/personel',
  '/api/stok',
  '/api/son-islemler',
  '/api/fatura',
  '/api/efatura',
  '/api/earsiv',
  '/api/invoices',
  '/api/faturalar'
];

async function run() {
  console.log("Probing Vega API endpoints...");
  for (const route of routes) {
    const url = `https://vega-api.amasyaetas.com${route}`;
    try {
      const res = await fetch(url);
      console.log(`Route: ${route} | Status: ${res.status} (${res.statusText})`);
      if (res.ok) {
        const json = await res.json().catch(() => null);
        if (json) {
          console.log(`  -> Success! Found array/object with ${Array.isArray(json) ? json.length + ' items' : 'data'}`);
          if (Array.isArray(json) && json.length > 0) {
            console.log(`  -> Sample keys:`, Object.keys(json[0]));
          }
        }
      }
    } catch (err) {
      console.log(`Route: ${route} | Error: ${err.message}`);
    }
  }
}

run();
