async function runAssistantTests() {
  const tests = [
    {
      title: 'A. Best smartphone under ₹20,000',
      message: 'Find me the best smartphone under ₹20,000.',
    },
    {
      title: 'B. Wireless earbuds under ₹2,000',
      message: 'Recommend wireless earbuds under ₹2,000.',
    },
    {
      title: 'C. Compare two smartphones',
      message: 'Compare the OnePlus Nord CE 4 5G with the iQOO Z9s 5G.',
    },
    {
      title: 'D. Search for car-care products',
      message: 'Show me your best car-care cleaning products under ₹1,000.',
    },
    {
      title: 'E. Budget smartphone follow-up under ₹15,000',
      message: 'What is the best 5G phone under ₹15,000?',
    },
  ];

  for (const t of tests) {
    console.log(`\n======================================================`);
    console.log(`TEST: ${t.title}`);
    console.log(`QUERY: "${t.message}"`);
    console.log(`======================================================`);

    const start = Date.now();
    try {
      const res = await fetch('http://localhost:5173/.netlify/functions/shopping-assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: t.message, conversationHistory: [] }),
      });
      const data = await res.json();
      const elapsed = ((Date.now() - start) / 1000).toFixed(2);

      console.log(`Status: ${res.status} | Model: ${data.modelUsed} | Time: ${elapsed}s`);
      console.log(`Products Returned (${data.products?.length || 0}):`);
      (data.products || []).forEach((p) => {
        console.log(`  - [${p.id}] ${p.name} -> ₹${p.price.toLocaleString('en-IN')} (${p.category})`);
      });

      if (data.comparison) {
        console.log(`\nComparison Title: "${data.comparison.title}"`);
        console.log(`Comparison Products:`, data.comparison.products?.map((p) => `${p.name} (₹${p.price})`));
        console.log(`Comparison Verdict:`, data.comparison.verdict);
      }

      console.log(`\nReply Preview:\n${data.reply.substring(0, 240)}...\n`);
    } catch (err) {
      console.error('Error running test:', err.message);
    }
  }
}

runAssistantTests();
