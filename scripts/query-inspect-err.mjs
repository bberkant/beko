async function run() {
  const url = 'https://vega-api.amasyaetas.com/api/inspect-db';
  try {
    const res = await fetch(url);
    console.log(`Status: ${res.status}`);
    const json = await res.json();
    console.log("JSON response:", JSON.stringify(json, null, 2));
  } catch (err) {
    console.error("Fetch failed:", err.message);
  }
}

run();
