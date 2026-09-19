import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const envPath = './.env.local';
let supabaseUrl = '';
let supabaseKey = '';

if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const urlMatch = envContent.match(/VITE_SUPABASE_URL\s*=\s*(.*)/);
  const keyMatch = envContent.match(/VITE_SUPABASE_PUBLISHABLE_KEY\s*=\s*(.*)/);
  if (urlMatch) supabaseUrl = urlMatch[1].trim();
  if (keyMatch) supabaseKey = keyMatch[1].trim();
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function searchEvluce() {
  const { data } = await supabase.from('vega_efatura_cache').select('invoices').eq('company', 'etik').single();
  const invoices = data?.invoices || [];
  console.log(`Total invoices for etik: ${invoices.length}`);

  // Search for invoiceNo starting with EVF
  const evf = invoices.filter(i => i.invoiceNo && i.invoiceNo.includes('EVF'));
  console.log(`EVF matches: ${evf.length}`, evf.slice(0, 3));

  // Search for evlüce / evluce in cariName
  const byName = invoices.filter(i => (i.cariName && (i.cariName.toLowerCase().includes('evl') || i.cariName.toLowerCase().includes('evü'))));
  console.log(`byName matches: ${byName.length}`, byName.slice(0, 3));

  // Search for 3600051133 (VKN)
  const byVkn = invoices.filter(i => (i.vkn && i.vkn.includes('3600051133')) || String(i.cariCode).includes('3600051133'));
  console.log(`byVkn matches: ${byVkn.length}`);

  // Check direction of EVF invoices if found
  if (evf.length > 0) {
    console.log('Directions of EVF invoices:', evf.map(i => ({ no: i.invoiceNo, dir: i.direction, date: i.date, name: i.cariName })));
  }
}

async function testSoap() {
  const loginXml = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <Login xmlns="http://tempuri.org/">
      <_Login_Request>
        <UserName>admin_EAS057</UserName>
        <Password>4fq8BICN</Password>
        <Application_Name>Vega e-Fatura</Application_Name>
        <Application_Version>5.4.12</Application_Version>
      </_Login_Request>
    </Login>
  </soap:Body>
</soap:Envelope>`;

  console.log('Logging in to Vega SOAP...');
  const res = await fetch('https://integration.vegayazilim.com.tr/integration.asmx', {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml; charset=utf-8',
      'SOAPAction': 'http://tempuri.org/Login'
    },
    body: loginXml
  });

  const text = await res.text();
  console.log('Login response status:', res.status);
  const sessionIdMatch = text.match(/<Session_ID>(.*?)<\/Session_ID>/);
  const securityKeyMatch = text.match(/<Security_Key>(.*?)<\/Security_Key>/);
  const ipNumberMatch = text.match(/<IP_Number>(.*?)<\/IP_Number>/);

  console.log('Session ID:', sessionIdMatch?.[1]);
  console.log('Security Key:', securityKeyMatch?.[1]);
  console.log('IP Number:', ipNumberMatch?.[1]);
}

searchEvluce().catch(console.error);
testSoap().catch(console.error);
