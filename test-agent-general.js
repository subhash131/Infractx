const main = async () => {
    const ports = [3000, 3001, 3002, 3003, 3004, 3005];
    const hosts = ['127.0.0.1', '::1'];
    
    for (const port of ports) {
        for (const host of hosts) {
            const url = `http://${host}:${port}/api/ai/doc/agent`;
            console.log(`Trying ${url}...`);
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout per attempt
                
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userMessage: "Hello",
                        selectedText: "",
                        docContext: "",
                        cursorPosition: 0
                    }),
                    signal: controller.signal
                });
                clearTimeout(timeoutId);

                if (!response.ok) {
                    console.error(`Connected to ${url} but got HTTP error: ${response.status}`);
                    const text = await response.text();
                    console.error("Response body:", text);
                    continue; 
                }

                const data = await response.json();
                console.log(`✅ SUCCESS: Connected to ${url}`);
                console.log("Response Data:", JSON.stringify(data, null, 2));

                if (data.response?.metadata?.intent === 'general') {
                    console.log("✅ Intent correctly classified as 'general'");
                } else {
                    console.log(`⚠️ Intent mismatch: ${data.response?.metadata?.intent}`);
                }
                return; 

            } catch (error) {
                console.log(`Failed ${url}: ${error.code || error.message}`);
            }
        }
    }
    console.error("❌ Could not connect to any port/host combination.");
}
main();
