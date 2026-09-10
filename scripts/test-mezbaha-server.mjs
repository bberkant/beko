async function testVegaApi() {
  const baseUrl = 'https://vega-api.amasyaetas.com';
  console.log(`Testing connection to Mezbaha Server API: ${baseUrl}`);

  const endpoints = [
    '/api/cariler',
    '/api/personel',
    '/api/son-islemler',
    '/api/etik/efaturalar?direction=giden&limit=5',
    '/api/etik/efaturalar?direction=gelen&limit=5',
    '/api/marif/efaturalar?direction=giden&limit=5',
    '/api/marif/efaturalar?direction=gelen&limit=5',
    '/api/kesim/records?limit=5',
    '/api/debug-db'
  ];

  for (const ep of endpoints) {
    const url = `${baseUrl}${ep}`;
    console.log(`\nTesting ${url}...`);
    try {
      const start = Date.now();
      const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
      const duration = Date.now() - start;
      console.log(`  Status: ${res.status} ${res.statusText} (${duration}ms)`);
      if (res.ok) {
        const data = await res.json();
        const count = Array.isArray(data) ? data.length : (typeof data === 'object' ? Object.keys(data).length : 'data');
        console.log(`  Success! Response count/size:`, count);
      } else {
        const text = await res.text();
        console.log(`  Error body:`, text.substring(0, 200));
      }
    } catch (err) {
      console.log(`  FAILED: ${err.message}`);
    }
  }
}

testVegaApi().catch(console.error);
