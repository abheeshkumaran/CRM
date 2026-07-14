
function sanitizePhone(phone) {
    let rawPhone = "";
    if (typeof phone === 'number') {
        rawPhone = phone.toLocaleString('fullwide', { useGrouping: false });
    } else {
        rawPhone = String(phone).trim();
        if (/[eE][+-]?\d+/.test(rawPhone)) {
            const num = Number(rawPhone);
            if (!isNaN(num)) {
                rawPhone = num.toLocaleString('fullwide', { useGrouping: false });
            }
        }
    }
    return (rawPhone.startsWith('+') ? '+' : '') + rawPhone.replace(/\D/g, '');
}

const testCases = [
    { name: "Raw Number (12 digits)", input: 919072114251, expected: "919072114251" },
    { name: "Scientific String (12 digits)", input: "9.19072114251E+11", expected: "919072114251" },
    { name: "Truncated Scientific String (8 digits precision)", input: "9.1907211E+11", expected: "919072110000" }, // This shows what happens if damage is already done
    { name: "Normal String", input: "919072114251", expected: "919072114251" },
    { name: "Plus Prefix String", input: "+919072114251", expected: "+919072114251" }
];

console.log("Verification Results:");
testCases.forEach(tc => {
    const result = sanitizePhone(tc.input);
    const success = result === tc.expected;
    console.log(`[${success ? "PASS" : "FAIL"}] ${tc.name}:`);
    console.log(`  Input: ${tc.input} (${typeof tc.input})`);
    console.log(`  Result: ${result}`);
    console.log(`  Expected: ${tc.expected}`);
});
