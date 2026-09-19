import { supabase } from '../src/lib/supabase.js';

async function run() {
  try {
    // 1. Get all cards
    const { data: cards, error: cardsError } = await supabase.from('credit_cards').select('id, card_name, last4');
    if (cardsError) throw cardsError;
    console.log("=== CARDS ===");
    console.log(cards);

    // 2. Get all statements
    const { data: statements, error: statementsError } = await supabase.from('statements').select('id, card_id, period, statement_date, file_name, file_path');
    if (statementsError) throw statementsError;
    console.log("\n=== STATEMENTS ===");
    console.log(statements);

    // 3. Get total transaction counts
    const { data: transactionsCount, error: txError } = await supabase.from('transactions').select('id, card_id, statement_id', { count: 'exact', head: true });
    if (txError) throw txError;
    console.log(`\nTotal Transactions in DB: ${txError ? 0 : transactionsCount?.length || 0}`);

    // Let's select first 5 transactions
    const { data: txs, error: txsError } = await supabase.from('transactions').select('*').limit(5);
    if (txsError) throw txsError;
    console.log("\n=== FIRST 5 TRANSACTIONS ===");
    console.log(txs);

  } catch (err) {
    console.error(err);
  }
}

run();
